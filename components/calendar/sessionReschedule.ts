import type { QueryClient } from "@tanstack/react-query";
import { batchUpdateSessions } from "@/components/calendar/sessionMutations";
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
  actions: Parameters<typeof batchUpdateSessions>[2],
) {
  if (sameSessionTime(session, start, end)) return;
  await batchUpdateSessions([{ source: session, start, end }], queryClient, actions);
}
