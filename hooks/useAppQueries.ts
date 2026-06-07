import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Focus, Report, Session, Student, Understanding } from "@/types";

export type ApiSessionRow = {
  id: number;
  studentId: number | null;
  start: string;
  end: string;
  place?: string;
  notes?: string;
  understanding?: string;
  focus?: string;
  homework?: { id: number; text: string; done: boolean }[];
  version?: number;
  student?: Student | null;
};

export type AppPreference = {
  primaryTimezone: string;
  extraTimezones: {
    timeZone: string;
    on: boolean;
  }[];
};

export const queryKeys = {
  preferences: ["preferences"] as const,
  students: ["students"] as const,
  studentsList: (status: StudentListStatus = "active") =>
    ["students", status] as const,
  sessions: ["sessions"] as const,
  reports: ["reports"] as const,
  calendarSessions: (from: string, to: string) =>
    ["calendarSessions", from, to] as const,
};

export type StudentListStatus = "active" | "inactive" | "all";

export function apiSessionToSession(row: ApiSessionRow): Session {
  return {
    id: row.id,
    studentId: row.studentId,
    start: new Date(row.start),
    end: new Date(row.end),
    place: row.place ?? "",
    notes: row.notes ?? "",
    understanding: (row.understanding ?? "") as Understanding,
    focus: (row.focus ?? "") as Focus,
    homework: row.homework ?? [],
    version: row.version ?? 1,
  };
}

export function usePreferenceQuery() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => apiGet<AppPreference>("/api/preferences"),
    staleTime: 60_000,
  });
}

export function useStudentsQuery(status: StudentListStatus = "active") {
  return useQuery({
    queryKey: queryKeys.studentsList(status),
    queryFn: () => apiGet<Student[]>(`/api/students?status=${status}`),
    staleTime: 60_000,
  });
}

export function useSessionsQuery(opts?: { from?: Date; to?: Date; staleTime?: number }) {
  const fromIso = opts?.from?.toISOString();
  const toIso   = opts?.to?.toISOString();
  return useQuery({
    // Include the date range in the key so ranged and unranged queries cache separately.
    queryKey: fromIso && toIso
      ? (["sessions", fromIso, toIso] as const)
      : queryKeys.sessions,
    queryFn: async () => {
      const url = fromIso && toIso
        ? `/api/sessions?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
        : "/api/sessions";
      const rows = await apiGet<ApiSessionRow[]>(url);
      return rows.map(apiSessionToSession);
    },
    staleTime: opts?.staleTime ?? 60_000,
  });
}

export function useReportsQuery() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => apiGet<Report[]>("/api/reports"),
    staleTime: 60_000,
  });
}

export function useCalendarSessionsQuery(from: Date, to: Date) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  return useQuery({
    queryKey: queryKeys.calendarSessions(fromIso, toIso),
    queryFn: async () => {
      const params = new URLSearchParams({ from: fromIso, to: toIso });
      const rows = await apiGet<ApiSessionRow[]>(
        `/api/calendar/sessions?${params.toString()}`,
      );
      return rows;
    },
  });
}
