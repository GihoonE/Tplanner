"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarTopbar } from "@/components/calendar/CalendarTopbar";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { TzPanel } from "@/components/calendar/TzPanel";
import { SessionModal } from "@/components/sessions/SessionModal";
import { NewSessionRecordModal } from "@/components/records/NewSessionRecordModal";
import { useCalView, useTutorStore } from "@/store";
import { addDays } from "@/lib/utils";
import {
  apiSessionToSession,
  queryKeys,
  useCalendarSessionsQuery,
  useStudentsQuery,
} from "@/hooks/useAppQueries";
import type { Student } from "@/types";

export default function CalendarPage() {
  const { data: authSession } = useSession();
  const queryClient = useQueryClient();
  const readOnly = authSession?.user?.role === "parent";
  const canCreateSessions = authSession?.user?.role === "instructor";
  const view = useCalView();
  const [tzOpen, setTzOpen] = useState(false);
  const curWeekStart = useTutorStore((s) => s.curWeekStart);
  const curMonth = useTutorStore((s) => s.curMonth);
  const curDay = useTutorStore((s) => s.curDay);
  const students = useTutorStore((s) => s.students);
  const setStudents = useTutorStore((s) => s.setStudents);
  const setSessions = useTutorStore((s) => s.setSessions);
  const addSession = useTutorStore((s) => s.addSession);
  const setNow = useTutorStore((s) => s.setNow);
  const [createRange, setCreateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  const visibleRange = useMemo(() => {
    if (view === "month") {
      const first = new Date(curMonth.getFullYear(), curMonth.getMonth() - 12, 1);
      const from = addDays(first, -first.getDay());
      const last = new Date(curMonth.getFullYear(), curMonth.getMonth() + 13, 0);
      const to = addDays(last, 6 - last.getDay() + 1);
      return { from, to };
    }
    if (view === "week") {
      return { from: addDays(curWeekStart, -7 * 16), to: addDays(curWeekStart, 7 * 17) };
    }
    const from = new Date(curDay);
    from.setHours(0, 0, 0, 0);
    const to = addDays(from, 1);
    return { from, to };
  }, [curDay, curMonth, curWeekStart, view]);
  const studentsQuery = useStudentsQuery();
  const calendarSessionsQuery = useCalendarSessionsQuery(
    visibleRange.from,
    visibleRange.to,
  );
  const loadError =
    studentsQuery.error instanceof Error
      ? studentsQuery.error.message
      : calendarSessionsQuery.error instanceof Error
        ? calendarSessionsQuery.error.message
        : null;

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [setNow]);

  useEffect(() => {
    const studentRows = studentsQuery.data;
    const sessionRows = calendarSessionsQuery.data;
    if (!studentRows || !sessionRows) return;

    const embeddedStudents = sessionRows
      .map((session) => session.student)
      .filter((student): student is Student => Boolean(student));
    const studentMap = new Map<number, Student>();
    studentRows.forEach((student) => studentMap.set(student.id, student));
    embeddedStudents.forEach((student) => studentMap.set(student.id, student));

    setStudents(Array.from(studentMap.values()));
    setSessions(sessionRows.map(apiSessionToSession));
  }, [calendarSessionsQuery.data, setSessions, setStudents, studentsQuery.data]);

  return (
    <AppShell>
      <CalendarTopbar
        onTzPanel={() => setTzOpen((v) => !v)}
        readOnly={!canCreateSessions}
      />

      {/* Calendar area */}
      <div className="relative flex-1 flex overflow-hidden">
        {loadError && (
          <div className="absolute right-5 top-[70px] z-20 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600 shadow-sm">
            {loadError}
          </div>
        )}
        {view === "week"  && (
          <WeekView
            onCreateRange={canCreateSessions ? setCreateRange : undefined}
          />
        )}
        {view === "month" && <MonthView />}
        {view === "day"   && (
          <DayView
            onCreateRange={canCreateSessions ? setCreateRange : undefined}
          />
        )}
      </div>

      {/* Timezone panel */}
      <TzPanel open={tzOpen} onClose={() => setTzOpen(false)} />

      {/* Session modal */}
      <SessionModal readOnly={readOnly} />

      {canCreateSessions && (
        <NewSessionRecordModal
          open={createRange !== null}
          onClose={() => setCreateRange(null)}
          students={students}
          initialStart={createRange?.start ?? null}
          initialEnd={createRange?.end ?? null}
          onCreated={(session) => {
            addSession(session);
            queryClient.setQueryData(queryKeys.sessions, (prev) =>
              Array.isArray(prev) ? [session, ...prev] : [session],
            );
            void queryClient.invalidateQueries({ queryKey: queryKeys.students });
            void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
          }}
        />
      )}
    </AppShell>
  );
}
