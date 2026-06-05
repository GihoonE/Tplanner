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
import { useTutorStore } from "@/store";
import type { Session } from "@/types";

type StoreSessionActions = {
  addSession: (session: Session) => void;
  upsertSession: (session: Session) => void;
  deleteSession: (id: number) => void;
  markSessionPendingUpdate: (
    id: number,
    patch: Partial<Omit<Session, "id">>,
  ) => void;
  markSessionPendingCreate: (session: Session) => void;
  markSessionPendingDelete: (id: number) => void;
  replaceSessionTempId: (tempId: number, session: Session) => void;
  clearSessionPending: (ids: number[]) => void;
  clearSessionPendingCreate: (ids: number[]) => void;
  setSessionSaveState: (state: "idle" | "saving" | "error" | "offline", error?: string | null) => void;
};

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

  const deleted = new Set(pendingDeleteIds);
  const sessionsById = new Map(state.sessions.map((session) => [session.id, session]));
  const createdSessions = pendingCreateIds
    .filter((id) => !deleted.has(id))
    .map((id) => sessionsById.get(id))
    .filter((session): session is Session => Boolean(session));

  try {
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

    const latest = useTutorStore.getState();
    const latestSessionsById = new Map(
      latest.sessions.map((session) => [session.id, session]),
    );
    const updateSessions = Object.keys(latest.pendingSessionEdits)
      .map(Number)
      .filter((id) => id > 0 && !latest.pendingSessionDeletes.includes(id))
      .map((id) => latestSessionsById.get(id))
      .filter((session): session is Session => Boolean(session));

    if (updateSessions.length > 0) {
      const response = await apiJson<BatchResponse>("/api/sessions/batch", {
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
      });
      const successfulIds: number[] = [];
      const serverSessions: Session[] = [];
      response.results.forEach((result) => {
        if (result.success && result.session && result.sessionId !== undefined) {
          successfulIds.push(result.sessionId);
          serverSessions.push(apiSessionToSession(result.session));
        }
      });
      serverSessions.forEach(latest.upsertSession);
      patchSessionCaches(queryClient, serverSessions);
      latest.clearSessionPending(successfulIds);
      if (successfulIds.length !== updateSessions.length) {
        throw new Error("일부 수업 저장에 실패했습니다.");
      }
    }

    const deleteIds = useTutorStore
      .getState()
      .pendingSessionDeletes.filter((id) => id > 0);
    if (deleteIds.length > 0) {
      const response = await apiJson<BatchResponse>("/api/sessions/batch", {
        method: "DELETE",
        body: JSON.stringify({ ids: deleteIds }),
      });
      const successfulIds = response.results
        .filter((result) => result.success && result.sessionId !== undefined)
        .map((result) => result.sessionId as number);
      useTutorStore.getState().clearSessionPending(successfulIds);
      if (successfulIds.length !== deleteIds.length) {
        throw new Error("일부 수업 삭제에 실패했습니다.");
      }
    }

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
