"use client";

import { useEffect, useMemo, useState } from "react";
import { useTzData } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  currentMonthValue,
  MonthPicker,
  monthEnd,
  monthStart,
} from "@/components/ui/MonthPicker";
import { fmtTz, getPrimaryOffset, sessionStatusInPrimaryTimezone } from "@/lib/utils";
import type { Session, Student } from "@/types";

type RecordListProps = {
  sessions: Session[];
  students: Student[];
  activeId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  error: string | null;
  initialSearch?: string;
};

function formatMonthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function RecordList({
  sessions,
  students,
  activeId,
  onSelect,
  loading,
  error,
  initialSearch = "",
}: RecordListProps) {
  const [search, setSearch] = useState(initialSearch);
  const [fromMonth, setFromMonth] = useState(currentMonthValue);
  const [toMonth, setToMonth] = useState(currentMonthValue);
  const [now, setNow] = useState(() => new Date());
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);
  const primaryTimeZone = tzData[0]?.timeZone ?? "Asia/Seoul";

  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = monthStart(fromMonth);
    const to = monthEnd(toMonth);
    return [...sessions]
      .filter((session) => session.start >= from && session.start <= to)
      .sort(
        // b - a.start.getTime(): b가 앞에 옴 내림 차순, a가 앞에 오게 할려면 a - b
        (a, b) => b.start.getTime() - a.start.getTime(),
      )
      .filter((s) => {
        if (!q) return true;
        const st = s.studentId == null ? undefined : studentsById.get(s.studentId);
        return (
          st?.name.toLowerCase().includes(q) ||
          st?.subject.toLowerCase().includes(q) ||
          st?.grade.toLowerCase().includes(q)
        );
      });
  }, [fromMonth, search, sessions, studentsById, toMonth]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading || error) return;
    if (filtered.length === 0) return;
    if (activeId !== null && filtered.some((s) => s.id === activeId)) return;
    onSelect(filtered[0].id);
  }, [activeId, error, filtered, loading, onSelect]);

  if (loading) {
    return (
      <div className="w-[300px] flex-shrink-0 border-r border-slate-100 bg-slate-50 overflow-y-auto p-4">
        <p className="text-[13px] text-slate-400 font-medium text-center py-12">
          불러오는 중…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[300px] flex-shrink-0 border-r border-slate-100 bg-slate-50 overflow-y-auto p-4">
        <p className="text-[13px] text-red-500 font-medium text-center py-8 px-2">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="w-[300px] flex-shrink-0 border-r border-slate-100 bg-slate-50 overflow-y-auto p-4">
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">
          🔍
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 과목, 학년로 검색..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 outline-none focus:border-sky-400 transition-colors"
        />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            시작
          </span>
          <MonthPicker
            value={fromMonth}
            max={toMonth}
            helperText=""
            buttonClassName="h-9 rounded-lg px-2 text-[12px] font-semibold"
            onChange={(next) => {
              setFromMonth(next);
              if (next > toMonth) setToMonth(next);
            }}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            종료
          </span>
          <MonthPicker
            value={toMonth}
            min={fromMonth}
            helperText=""
            buttonClassName="h-9 rounded-lg px-2 text-[12px] font-semibold"
            onChange={(next) => {
              setToMonth(next);
              if (next < fromMonth) setFromMonth(next);
            }}
          />
        </label>
      </div>
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">
        전체 수업 기록 ({filtered.length})
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-[13px] font-medium text-slate-400">
          해당 기간의 수업 기록이 없습니다.
        </p>
      )}

      {filtered.map((s) => {
        const st = s.studentId == null ? undefined : studentsById.get(s.studentId);
        const isActive = s.id === activeId;
        const hasNotes = s.notes.trim().length > 0;
        const sessionStatus = sessionStatusInPrimaryTimezone(
          s,
          now,
          primaryOffset,
          primaryTimeZone,
        );

        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`bg-white rounded-2xl border p-4 mb-2.5 cursor-pointer transition-all shadow-sm hover:-translate-y-px hover:shadow-md
              ${isActive ? "border-sky-400 shadow-[0_0_0_3px_rgba(16,67,109,.1)]" : "border-slate-100 hover:border-sky-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {st ? (
                <Avatar char={st.avatarChar} color={st.color} size="sm" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-slate-900 truncate">
                  {st?.name ?? "미정"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {st?.subject} · {st?.grade}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex-shrink-0">
                {s.start.getMonth() + 1}/{s.start.getDate()}
              </div>
            </div>

            <p
              className={`text-[12px] leading-snug mb-2.5 line-clamp-2 ${hasNotes ? "text-slate-500" : "text-slate-300 italic"}`}
            >
              {hasNotes ? s.notes : "기록 없음 — 클릭해서 작성하기"}
            </p>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">
                {formatMonthDay(s.start)} {fmtTz(s.start, primaryOffset)} ~{" "}
                {fmtTz(s.end, primaryOffset)}
              </span>
              {s.understanding === "good" && (
                <Badge variant="green">잘이해</Badge>
              )}
              {s.understanding === "normal" && (
                <Badge variant="gray">보통</Badge>
              )}
              {s.understanding === "hard" && (
                <Badge variant="red">어려움</Badge>
              )}
              {s.homework.length > 0 && (
                <Badge variant="gray">숙제 {s.homework.length}개</Badge>
              )}
              <Badge
                variant={
                  sessionStatus === "completed"
                    ? "gray"
                    : sessionStatus === "ongoing"
                      ? "sky"
                      : "amber"
                }
              >
                {sessionStatus === "completed"
                  ? "완료"
                  : sessionStatus === "ongoing"
                    ? "진행중"
                    : "예정"}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
