import type { QueryClient } from "@tanstack/react-query";
import { apiSessionToSession, queryKeys } from "@/hooks/useAppQueries";
import type { ApiSessionRow } from "@/hooks/useAppQueries";
import type { Session } from "@/types";

export const SESSION_DRAG_THRESHOLD_PX = 6;

export function sameSessionTime(a: Session, start: Date, end: Date) {
  return a.start.getTime() === start.getTime() && a.end.getTime() === end.getTime();
}

export async function rescheduleSession(
  session: Session,
  start: Date,
  end: Date,
  queryClient: QueryClient,
  upsertSession: (session: Session) => void,
) {
  if (sameSessionTime(session, start, end)) return;

  const res = await fetch(`/api/sessions/${session.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: start.toISOString(),
      end: end.toISOString(),
    }),
  });

  if (!res.ok) throw new Error("수업 시간 변경 실패");

  const updated = apiSessionToSession((await res.json()) as ApiSessionRow);
  upsertSession(updated);
  queryClient.setQueryData(queryKeys.sessions, (prev) =>
    Array.isArray(prev)
      ? prev.map((item) => (item.id === updated.id ? updated : item))
      : prev,
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
  void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
}
