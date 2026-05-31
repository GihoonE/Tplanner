"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";
import { TzPanel } from "@/components/calendar/TzPanel";
import { useTzData } from "@/store";
import { Badge } from "@/components/ui/Badge";
import {Button} from "@/components/ui/Button";
import { fmtTz, sameDay, sessionStatusInPrimaryTimezone } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { useSessionsQuery, useStudentsQuery } from "@/hooks/useAppQueries";
import type { Session, Student } from "@/types";

function isSameMonth(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function isWithinRecentDays(date: Date, now: Date, days: number) {
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return date <= now && date >= start;
}

function firstName(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed ? (trimmed.split(/\s+/)[0] ?? null) : null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const [tzOpen, setTzOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const sessionsQuery = useSessionsQuery();
  const studentsQuery = useStudentsQuery();
  const loadState =
    sessionsQuery.isLoading || studentsQuery.isLoading
      ? "loading"
      : sessionsQuery.isError || studentsQuery.isError
        ? "error"
        : "ready";
  const loadError =
    sessionsQuery.error instanceof Error
      ? sessionsQuery.error.message
      : studentsQuery.error instanceof Error
        ? studentsQuery.error.message
        : null;
  const [now, setNow] = useState(() => new Date());
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);
  const primaryTimeZone = tzData[0]?.timeZone ?? "Asia/Seoul";

  useEffect(() => {
    if (sessionsQuery.data) setSessions(sessionsQuery.data);
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (studentsQuery.data) setStudents(studentsQuery.data);
  }, [studentsQuery.data]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const studentMap = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => sameDay(s.start, now))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [now, sessions],
  );

  const thisMonthSessions = useMemo(
    () => sessions.filter((s) => isSameMonth(s.start, now)),
    [now, sessions],
  );

  const pendingHomeworkCount = useMemo(
    () =>
      sessions.reduce(
        (total, session) =>
          total + session.homework.filter((homework) => !homework.done).length,
        0,
      ),
    [sessions],
  );

  const pendingHomeworkSessionCount = useMemo(
    () =>
      sessions.filter((session) =>
        session.homework.some((homework) => !homework.done),
      ).length,
    [sessions],
  );

  const recentSessions = useMemo(
    () =>
      sessions
        .filter((session) => isWithinRecentDays(session.start, now, 3))
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .slice(0, 5),
    [now, sessions],
  );

  const recentPendingHomeworkSessions = useMemo(
    () =>
      sessions
        .filter((session) => isWithinRecentDays(session.start, now, 3))
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .map((session) => ({
          session,
          pendingHomework: session.homework.filter((homework) => !homework.done),
        }))
        .filter((item) => item.pendingHomework.length > 0)
        .slice(0, 5),
    [now, sessions],
  );

  function openSessionRecord(sessionId: number) {
    router.push(`/records?session=${sessionId}`);
  }

  const greetingName = firstName(authSession?.user?.name);

  return (
    <AppShell>
      {/* Topbar */}
      <div className="h-[54px] flex items-center px-6 gap-3 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex-1">
          <span className="text-[15px] font-extrabold text-slate-900 tracking-tight">
            안녕하세요, {greetingName ? `${greetingName} 선생님` : "선생님"} 👋
          </span>
          <span className="ml-3 text-[12px] text-slate-400">
            오늘 {now.getMonth() + 1}월 {now.getDate()}일 {["일","월","화","수","목","금","토"][now.getDay()]}요일 — 수업 {todaySessions.length}건
          </span>
        </div>
        <Button variant="primary" size="md" onClick={() => setTzOpen(true)}>
            타임존 설정
          </Button>
      </div>
      <TzPanel open={tzOpen} onClose={() => setTzOpen(false)} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loadState === "error" && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
            {loadError}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              icon: "👤",
              label: "전체 학생",
              val: students.length,
              note: `활성 ${students.filter((student) => student.status === "active").length}명`,
              ok: true,
            },
            {
              icon: "📚",
              label: "이번 달 수업",
              val: thisMonthSessions.length,
              note: `오늘 ${todaySessions.length}건`,
              ok: true,
            },
            {
              icon: "📋",
              label: "미완료 숙제",
              val: pendingHomeworkCount,
              note: `${pendingHomeworkSessionCount}개 수업`,
              ok: pendingHomeworkCount === 0,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-[10px] bg-sky-50 flex items-center justify-center text-[16px] mb-3">{stat.icon}</div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">{stat.label}</div>
              <div className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-none mb-1">{stat.val}</div>
              <div className={`text-[12px] font-semibold ${stat.ok ? "text-green-600" : "text-amber-600"}`}>{stat.note}</div>
            </div>
          ))}
        </div>

        {/* Today's schedule */}
        <div className="mb-6">
          <div className="text-[13px] font-bold text-slate-700 mb-3">오늘 수업 일정</div>
          <div className="flex flex-col gap-2">
            {loadState === "loading" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-[13px] text-slate-300 text-center">
                수업 일정을 불러오는 중이에요
              </div>
            )}
            {loadState !== "loading" && todaySessions.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-[13px] text-slate-300 text-center">
                오늘 예정된 수업이 없어요
              </div>
            )}
            {todaySessions.map((s) => {
              const st      = s.studentId == null ? undefined : studentMap.get(s.studentId);
              const status = sessionStatusInPrimaryTimezone(
                s,
                now,
                primaryOffset,
                primaryTimeZone,
              );
              const ongoing = status === "ongoing";
              const done    = status === "completed";
              return (
                <div key={s.id}
                  className={`flex items-center gap-4 bg-white rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer
                    ${ongoing ? "border-sky-200 bg-sky-50/50" : "border-slate-100"}`}>
                  <span className="text-[12px] font-semibold text-slate-400 w-14 flex-shrink-0 tabular-nums">
                    {fmtTz(s.start, primaryOffset)}
                  </span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ongoing ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,.2)]" :
                    done    ? "bg-slate-300" : "bg-sky-400"
                  }`} />
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-slate-900">{st?.name ?? "미정"}</div>
                    <div className="text-[12px] text-slate-400">{st?.subject} · {
                      Math.round((s.end.getTime() - s.start.getTime()) / 3600000 * 10) / 10
                    }시간</div>
                  </div>
                  <Badge variant={ongoing ? "green" : done ? "gray" : "sky"}>
                    {ongoing ? "진행중" : done ? "완료" : "예정"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Pending HW */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="text-[13px] font-bold text-slate-700 mb-1">미완료 숙제</div>
            <div className="text-[11px] font-medium text-slate-300 mb-3">
              최근 3일 이내 수업 기준
            </div>
            {recentPendingHomeworkSessions.length === 0 ? (
              <p className="text-[12px] text-slate-300">최근 3일 이내 미완료 숙제가 없어요</p>
            ) : recentPendingHomeworkSessions.map(({ session, pendingHomework }) => {
              const st =
                session.studentId == null
                  ? undefined
                  : studentMap.get(session.studentId);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => openSessionRecord(session.id)}
                  className="block w-full py-2.5 text-left border-b border-slate-100 last:border-0 rounded-lg transition-colors hover:bg-slate-50"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="min-w-0 text-[13px] font-semibold text-slate-900">
                      {st?.name ?? "미정"}
                      <span className="ml-1 text-[11px] font-medium text-slate-400">
                        {st?.subject}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-[11px] text-slate-400">
                      {session.start.getMonth() + 1}/{session.start.getDate()} {fmtTz(session.start, primaryOffset)}
                    </div>
                  </div>
                  <ul className="ml-4 list-disc space-y-0.5 text-[12px] text-slate-600">
                    {pendingHomework.map((homework) => (
                      <li key={homework.id}>{homework.text}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="text-[13px] font-bold text-slate-700 mb-1">최근 활동</div>
            <div className="text-[11px] font-medium text-slate-300 mb-3">
              최근 3일 이내 수업 5개
            </div>
            {recentSessions.length === 0 ? (
              <p className="text-[12px] text-slate-300">최근 3일 이내 수업 기록이 없어요</p>
            ) : recentSessions.map((s) => {
              const st = s.studentId == null ? undefined : studentMap.get(s.studentId);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openSessionRecord(s.id)}
                  className="flex w-full items-start gap-2.5 py-2 text-left border-b border-slate-100 last:border-0 rounded-lg transition-colors hover:bg-slate-50"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-[12px] text-slate-600">
                      <strong className="text-slate-900 font-semibold">{st?.name ?? "미정"}</strong> 수업 기록
                      {s.notes.trim() ? " 저장" : " 생성"}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      {s.start.getMonth() + 1}월 {s.start.getDate()}일 {fmtTz(s.start, primaryOffset)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
