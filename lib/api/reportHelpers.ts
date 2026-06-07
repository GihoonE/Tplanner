// Shared logic for report POST and PATCH routes.
import { prisma } from "@/lib/db";

// Parses a date field that supports three states:
//   undefined  → field was not sent (PATCH "leave unchanged")
//   null / ""  → explicitly clear the field
//   string     → ISO date string to parse
export function parseReportDate(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    return { error: `${field}는 ISO 날짜 문자열이어야 합니다.` };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `${field}는 유효한 날짜여야 합니다.` };
  }
  return { value: date };
}

// Parses the sessionIds array from the request body.
//   undefined → field not sent (PATCH "leave unchanged")
//   null      → present but invalid (caller should return 400)
//   number[]  → valid, deduplicated positive integers
export function normalizeSessionIds(value: unknown): number[] | null | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return null;
  const ids = value.filter(
    (id): id is number => Number.isInteger(id) && Number(id) > 0,
  );
  return ids.length === value.length ? Array.from(new Set(ids)) : null;
}

// Returns the validated sessions if all IDs belong to studentId/instructorId,
// or null if any session is not owned / not found.
export async function validateReportSessions(
  studentId: number,
  sessionIds: number[],
  instructorId: string,
) {
  if (sessionIds.length === 0) return [];
  const sessions = await prisma.lessonSession.findMany({
    where: {
      id: { in: sessionIds },
      studentId,
      student: { instructorId },
    },
    select: { id: true, start: true, end: true },
    orderBy: { start: "asc" },
  });
  if (sessions.length !== sessionIds.length) return null;
  return sessions;
}

// Derives period start/end from the first/last session.
// Optional overrides take precedence (used by POST where the client may supply explicit dates).
export function periodFromSessions(
  sessions: { start: Date; end: Date }[],
  periodStart?: Date | null,
  periodEnd?: Date | null,
) {
  return {
    periodStart: periodStart ?? sessions[0]?.start ?? null,
    periodEnd: periodEnd ?? sessions[sessions.length - 1]?.end ?? null,
  };
}
