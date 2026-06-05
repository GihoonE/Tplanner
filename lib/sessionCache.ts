import type { QueryClient } from "@tanstack/react-query";
import type { ApiSessionRow } from "@/hooks/useAppQueries";
import { queryKeys } from "@/hooks/useAppQueries";
import type { Session } from "@/types";

function isNewerOrSameSession(next: Session, current: Session | undefined) {
  return !current || next.version >= current.version;
}

function sessionToApiRow(session: Session, previous?: ApiSessionRow): ApiSessionRow {
  return {
    ...(previous ?? {}),
    id: session.id,
    studentId: session.studentId,
    start: session.start.toISOString(),
    end: session.end.toISOString(),
    place: session.place,
    notes: session.notes,
    understanding: session.understanding,
    focus: session.focus,
    homework: session.homework,
    version: session.version,
  };
}

export function patchSessionCaches(
  queryClient: QueryClient,
  sessions: Session[],
) {
  if (sessions.length === 0) return;
  const byId = new Map(sessions.map((session) => [session.id, session]));

  queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) => {
    const existing = prev ?? [];
    const seen = new Set<number>();
    const patched = existing.map((session) => {
      const next = byId.get(session.id);
      if (!next) return session;
      seen.add(session.id);
      return isNewerOrSameSession(next, session) ? next : session;
    });
    sessions.forEach((session) => {
      if (!seen.has(session.id)) patched.unshift(session);
    });
    return patched;
  });

  queryClient.setQueriesData<ApiSessionRow[]>(
    { queryKey: ["calendarSessions"] },
    (prev) => {
      if (!Array.isArray(prev)) return prev;
      const seen = new Set<number>();
      const patched = prev.map((row) => {
        const next = byId.get(row.id);
        if (!next) return row;
        seen.add(row.id);
        if ((next.version ?? 1) < (row.version ?? 1)) return row;
        return sessionToApiRow(next, row);
      });
      sessions.forEach((session) => {
        if (!seen.has(session.id)) patched.push(sessionToApiRow(session));
      });
      return patched;
    },
  );
}

export function replaceTempSessionCaches(
  queryClient: QueryClient,
  tempId: number,
  session: Session,
) {
  queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) =>
    Array.isArray(prev)
      ? prev.map((item) => (item.id === tempId ? session : item))
      : prev,
  );
  queryClient.setQueriesData<ApiSessionRow[]>(
    { queryKey: ["calendarSessions"] },
    (prev) =>
      Array.isArray(prev)
        ? prev.map((item) =>
            item.id === tempId ? sessionToApiRow(session, item) : item,
          )
        : prev,
  );
}

export function removeSessionCaches(queryClient: QueryClient, ids: number[]) {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) =>
    Array.isArray(prev)
      ? prev.filter((session) => !idSet.has(session.id))
      : prev,
  );
  queryClient.setQueriesData<ApiSessionRow[]>(
    { queryKey: ["calendarSessions"] },
    (prev) =>
      Array.isArray(prev)
        ? prev.filter((session) => !idSet.has(session.id))
        : prev,
  );
}
