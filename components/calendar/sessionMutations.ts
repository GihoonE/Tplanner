import type { QueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api/client";
import {
  apiSessionToSession,
  queryKeys,
  type ApiSessionRow,
} from "@/hooks/useAppQueries";
import {
  patchSessionCaches,
  removeSessionCaches,
  replaceTempSessionCaches,
} from "@/lib/sessionCache";
import { useTutorStore, type TutorStore } from "@/store";
import type { Session } from "@/types";

type StoreSessionActions = Pick<
  TutorStore,
  | "addSession"
  | "upsertSession"
  | "deleteSession"
  | "markSessionPendingUpdate"
  | "markSessionPendingCreate"
  | "markSessionPendingDelete"
  | "replaceSessionTempId"
  | "clearSessionPending"
  | "clearSessionPendingCreate"
  | "setSessionSaveState"
>;

type BatchResult = {
  sessionId?: number;
  clientId?: number;
  success: boolean;
  error?: string;
  session?: ApiSessionRow;
};

type BatchResponse = {
  results: BatchResult[];
};

let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;

export function makeTempSessionId() {
  return -Math.floor(Date.now() + Math.random() * 100000);
}

export function cancelScheduledSessionFlush() {
  if (pendingFlushTimer === null) return;
  clearTimeout(pendingFlushTimer);
  pendingFlushTimer = null;
}

export function schedulePendingSessionFlush(
  queryClient: QueryClient,
  delayMs = 2_000,
) {
  cancelScheduledSessionFlush();
  pendingFlushTimer = setTimeout(() => {
    pendingFlushTimer = null;
    void flushPendingSessionChanges(queryClient);
  }, delayMs);
}

export function cloneSessionDraft(source: Session, start: Date, end: Date): Session {
  return {
    ...source,
    id: makeTempSessionId(),
    start,
    end,
    version: 1,
    homework: source.homework.map((item) => ({ ...item, id: makeTempSessionId() })),
  };
}

export async function batchCreateSessions(
  drafts: Session[],
  queryClient: QueryClient,
  actions: StoreSessionActions,
) {
  if (drafts.length === 0) return [];
  drafts.forEach((draft) => {
    actions.markSessionPendingCreate(draft);
    patchSessionCaches(queryClient, [draft]);
  });
  schedulePendingSessionFlush(queryClient);
  return drafts;
}

export async function batchUpdateSessions(
  updates: { source: Session; start: Date; end: Date }[],
  queryClient: QueryClient,
  actions: StoreSessionActions,
) {
  const changed = updates.filter(
    ({ source, start, end }) =>
      source.start.getTime() !== start.getTime() ||
      source.end.getTime() !== end.getTime(),
  );
  if (changed.length === 0) return [];

  const optimistic = changed.map(({ source, start, end }) => ({
    ...source,
    start,
    end,
    version: source.version + 1,
  }));
  optimistic.forEach((session) => {
    actions.markSessionPendingUpdate(session.id, {
      start: session.start,
      end: session.end,
      version: session.version,
    });
    actions.upsertSession(session);
  });
  patchSessionCaches(queryClient, optimistic);
  schedulePendingSessionFlush(queryClient);
  return optimistic;
}

export async function batchDeleteSessions(
  ids: number[],
  queryClient: QueryClient,
  actions: StoreSessionActions,
) {
  if (ids.length === 0) return [];
  ids.forEach((id) => {
    actions.markSessionPendingDelete(id);
  });
  removeSessionCaches(queryClient, ids);
  schedulePendingSessionFlush(queryClient);
  return ids;
}

function sessionPayload(session: Session, clientId?: number) {
  return {
    ...(clientId !== undefined && { clientId }),
    studentId: session.studentId,
    start: session.start.toISOString(),
    end: session.end.toISOString(),
    place: session.place,
    notes: session.notes,
    understanding: session.understanding,
    focus: session.focus,
    homework: session.homework.map((item) => ({
      text: item.text,
      done: item.done,
    })),
  };
}

export async function flushPendingSessionChanges(queryClient: QueryClient) {
  cancelScheduledSessionFlush();
  const state = useTutorStore.getState();
  const pendingCreateIds = state.pendingSessionCreates.map((session) => session.id);
  const pendingDeleteIds = [...state.pendingSessionDeletes];
  const pendingUpdateIds = Object.keys(state.pendingSessionEdits).map(Number);
  const hasPending =
    pendingCreateIds.length > 0 ||
    pendingDeleteIds.length > 0 ||
    pendingUpdateIds.length > 0;
  if (!hasPending) return true;

  state.setSessionSaveState("saving");

  // Snapshot current sessions BEFORE any mutations so we can roll back failures.
  const snapshotById = new Map(
    state.sessions.map((session) => [session.id, session]),
  );

  const deleted = new Set(pendingDeleteIds);
  const sessionsById = new Map(state.sessions.map((session) => [session.id, session]));
  const createdSessions = pendingCreateIds
    .filter((id) => !deleted.has(id))
    .map((id) => sessionsById.get(id))
    .filter((session): session is Session => Boolean(session));

  try {
    // ── Phase 1: creates (must finish before updates reference their IDs) ──────
    if (createdSessions.length > 0) {
      const response = await apiJson<BatchResponse>("/api/sessions/batch", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: crypto.randomUUID(),
          sessions: createdSessions.map((session) =>
            sessionPayload(session, session.id),
          ),
        }),
      });

      const created: Session[] = [];
      const failedTempIds: number[] = [];
      response.results.forEach((result) => {
        if (result.success && result.session && result.clientId !== undefined) {
          const session = apiSessionToSession(result.session);
          created.push(session);
          state.replaceSessionTempId(result.clientId, session);
          replaceTempSessionCaches(queryClient, result.clientId, session);
        } else if (result.clientId !== undefined) {
          failedTempIds.push(result.clientId);
        }
      });
      if (failedTempIds.length > 0) {
        failedTempIds.forEach(state.deleteSession);
        removeSessionCaches(queryClient, failedTempIds);
      }
      state.clearSessionPendingCreate(createdSessions.map((session) => session.id));
      state.clearSessionPending(createdSessions.map((session) => session.id));
      patchSessionCaches(queryClient, created);
    } else if (pendingCreateIds.length > 0) {
      state.clearSessionPendingCreate(pendingCreateIds);
      state.clearSessionPending(pendingCreateIds);
    }

    // ── Phase 2: updates + deletes in parallel (no ordering dependency) ───────
    const latest = useTutorStore.getState();
    const latestSessionsById = new Map(
      latest.sessions.map((session) => [session.id, session]),
    );
    const updateSessions = Object.keys(latest.pendingSessionEdits)
      .map(Number)
      .filter((id) => id > 0 && !latest.pendingSessionDeletes.includes(id))
      .map((id) => latestSessionsById.get(id))
      .filter((session): session is Session => Boolean(session));

    const deleteIds = latest.pendingSessionDeletes.filter((id) => id > 0);

    const [updateResponse, deleteResponse] = await Promise.all([
      updateSessions.length > 0
        ? apiJson<BatchResponse>("/api/sessions/batch", {
            method: "PATCH",
            body: JSON.stringify({
              sessions: updateSessions.map((session) => ({
                id: session.id,
                start: session.start.toISOString(),
                end: session.end.toISOString(),
                place: session.place,
                notes: session.notes,
                understanding: session.understanding,
                focus: session.focus,
              })),
            }),
          })
        : Promise.resolve(null),
      deleteIds.length > 0
        ? apiJson<BatchResponse>("/api/sessions/batch", {
            method: "DELETE",
            body: JSON.stringify({ ids: deleteIds }),
          })
        : Promise.resolve(null),
    ]);

    // ── Handle update results ─────────────────────────────────────────────────
    if (updateResponse) {
      const successfulIds: number[] = [];
      const serverSessions: Session[] = [];
      const failedIds: number[] = [];

      updateResponse.results.forEach((result) => {
        if (result.success && result.session && result.sessionId !== undefined) {
          successfulIds.push(result.sessionId);
          serverSessions.push(apiSessionToSession(result.session));
        } else if (result.sessionId !== undefined) {
          failedIds.push(result.sessionId);
        }
      });

      serverSessions.forEach(latest.upsertSession);
      patchSessionCaches(queryClient, serverSessions);
      latest.clearSessionPending(successfulIds);

      // Roll back only the sessions whose updates failed.
      failedIds.forEach((id) => {
        const original = snapshotById.get(id);
        if (original) latest.upsertSession(original);
      });
      if (failedIds.length > 0) {
        patchSessionCaches(queryClient, failedIds.map((id) => snapshotById.get(id)).filter(Boolean) as Session[]);
        throw new Error("일부 수업 저장에 실패했습니다.");
      }
    }

    // ── Handle delete results ─────────────────────────────────────────────────
    if (deleteResponse) {
      const successfulIds = deleteResponse.results
        .filter((result) => result.success && result.sessionId !== undefined)
        .map((result) => result.sessionId as number);
      const failedDeleteIds = deleteIds.filter((id) => !successfulIds.includes(id));

      useTutorStore.getState().clearSessionPending(successfulIds);

      // On delete failure: refetch from server to restore the sessions in the UI.
      if (failedDeleteIds.length > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
        throw new Error("일부 수업 삭제에 실패했습니다.");
      }
    }

    // Clean up any temp-id deletes that never hit the server.
    const tempDeleteIds = useTutorStore
      .getState()
      .pendingSessionDeletes.filter((id) => id < 0);
    if (tempDeleteIds.length > 0) {
      useTutorStore.getState().clearSessionPending(tempDeleteIds);
    }

    useTutorStore.getState().setSessionSaveState("idle");
    void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    return true;
  } catch (error) {
    useTutorStore
      .getState()
      .setSessionSaveState(
        "error",
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    return false;
  }
}
