import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/client";
import type { Focus, Report, Session, Student, Understanding } from "@/types";

export type ApiSessionRow = {
  id: number;
  studentId: number | null;
  start: string;
  end: string;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  homework: { id: number; text: string; done: boolean }[];
  student?: Student | null;
};

export type AppPreference = {
  primaryTimezone: string;
};

export const queryKeys = {
  preferences: ["preferences"] as const,
  students: ["students"] as const,
  sessions: ["sessions"] as const,
  reports: ["reports"] as const,
  calendarSessions: (from: string, to: string) =>
    ["calendarSessions", from, to] as const,
};

export function apiSessionToSession(row: ApiSessionRow): Session {
  return {
    id: row.id,
    studentId: row.studentId,
    start: new Date(row.start),
    end: new Date(row.end),
    place: row.place,
    notes: row.notes,
    understanding: row.understanding as Understanding,
    focus: row.focus as Focus,
    homework: row.homework,
  };
}

export function usePreferenceQuery() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => apiGet<AppPreference>("/api/preferences"),
  });
}

export function useStudentsQuery() {
  return useQuery({
    queryKey: queryKeys.students,
    queryFn: () => apiGet<Student[]>("/api/students"),
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => {
      const rows = await apiGet<ApiSessionRow[]>("/api/sessions");
      return rows.map(apiSessionToSession);
    },
  });
}

export function useReportsQuery() {
  return useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => apiGet<Report[]>("/api/reports"),
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
