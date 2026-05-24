"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import type { Focus, Session, Student, Understanding } from "@/types";

type ApiSessionRow = {
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

function apiSessionToSession(row: ApiSessionRow): Session {
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

export default function CalendarPage() {
  const { data: authSession } = useSession();
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createRange, setCreateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  function visibleRange() {
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
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCalendarData() {
      setLoadError(null);
      try {
        const { from, to } = visibleRange();
        const params = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const [studentsRes, sessionsRes] = await Promise.all([
          fetch("/api/students"),
          fetch(`/api/calendar/sessions?${params.toString()}`),
        ]);
        if (!studentsRes.ok) throw new Error("학생 목록을 불러오지 못했습니다.");
        if (!sessionsRes.ok) throw new Error("수업 목록을 불러오지 못했습니다.");

        const students = (await studentsRes.json()) as Student[];
        const sessions = (await sessionsRes.json()) as ApiSessionRow[];
        if (cancelled) return;

        const embeddedStudents = sessions
          .map((session) => session.student)
          .filter((student): student is Student => Boolean(student));
        const studentMap = new Map<number, Student>();
        students.forEach((student) => studentMap.set(student.id, student));
        embeddedStudents.forEach((student) => studentMap.set(student.id, student));

        setStudents(Array.from(studentMap.values()));
        setSessions(sessions.map(apiSessionToSession));
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "캘린더 데이터를 불러오지 못했습니다.",
          );
        }
      }
    }

    loadCalendarData();
    return () => {
      cancelled = true;
    };
  }, [curDay, curMonth, curWeekStart, setSessions, setStudents, view]);

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
          }}
        />
      )}
    </AppShell>
  );
}
