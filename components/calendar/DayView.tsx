"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { SessionBlock } from "./SessionBlock";
import {
  extraHourLabel,
  formatFullDate,
  getPrimaryOffset,
  primaryMinToKst,
  sessionsForDay,
  snapTo15,
  topPxForWallClockDate,
  wallClockDateInTimeZone,
  sessionStatusInPrimaryTimezone,
} from "@/lib/utils";
import { HOUR_HEIGHT_PX } from "@/lib/constants";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_MINUTES = 24 * 60;

export function DayView({
  onCreateRange,
}: {
  onCreateRange?: (range: { start: Date; end: Date }) => void;
}) {
  const sessions = useSessions();
  const tzData = useTzData();
  const now = useNow();
  const students = useTutorStore((s) => s.students);
  const curDay = useTutorStore((s) => s.curDay);
  const openModal = useTutorStore((s) => s.openModal);
  const [hourHeightPx, setHourHeightPx] = useState(HOUR_HEIGHT_PX);
  const bodyRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const creating = useRef<{ sMin: number; eMin: number } | null>(null);

  const primaryOffset = getPrimaryOffset(tzData);
  const primaryTimeZone = tzData[0]?.timeZone ?? "Asia/Seoul";
  const primaryNow = wallClockDateInTimeZone(now, tzData[0]?.timeZone ?? "Asia/Seoul");
  const extraTz = tzData.filter((t) => t.on && !t.primary);
  const daySessions = useMemo(
    () =>
      sessionsForDay(sessions, curDay).sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      ),
    [curDay, sessions],
  );
  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const isToday =
    curDay.getFullYear() === primaryNow.getFullYear() &&
    curDay.getMonth() === primaryNow.getMonth() &&
    curDay.getDate() === primaryNow.getDate();
  const nowTop = topPxForWallClockDate(primaryNow, hourHeightPx);
  const gridHeightPx = hourHeightPx * 24;

  useEffect(() => {
    if (!bodyRef.current) return;
    const update = () => {
      if (!bodyRef.current) return;
      setHourHeightPx(Math.max(HOUR_HEIGHT_PX, bodyRef.current.clientHeight / 24));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bodyRef.current);
    return () => observer.disconnect();
  }, []);

  const onGridMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onCreateRange) return;
      const createRange = onCreateRange;
      if ((e.target as HTMLElement).closest(".session-block")) return;
      const grid = e.currentTarget;
      const rect = grid.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const sMin = Math.max(
        0,
        Math.min(DAY_MINUTES - 15, snapTo15(Math.floor(relY / (hourHeightPx / 60)))),
      );
      creating.current = { sMin, eMin: sMin + 60 };
      e.preventDefault();

      function onMove(me: MouseEvent) {
        if (!creating.current || !gridRef.current || !ghostRef.current) return;
        const r = gridRef.current.getBoundingClientRect();
        const ry = me.clientY - r.top;
        creating.current.eMin = Math.min(
          DAY_MINUTES,
          Math.max(
            creating.current.sMin + 30,
            snapTo15(Math.ceil(ry / (hourHeightPx / 60))),
          ),
        );
        const ghost = ghostRef.current;
        ghost.style.display = "block";
        ghost.style.left = "3px";
        ghost.style.right = "3px";
        ghost.style.top = `${creating.current.sMin * (hourHeightPx / 60)}px`;
        ghost.style.height = `${
          (creating.current.eMin - creating.current.sMin) * (hourHeightPx / 60)
        }px`;
      }

      function onUp() {
        if (ghostRef.current) ghostRef.current.style.display = "none";
        if (creating.current && creating.current.eMin - creating.current.sMin >= 30) {
          const { h: sh, m: sm } = primaryMinToKst(
            creating.current.sMin,
            primaryOffset,
          );
          const { h: eh, m: em } = primaryMinToKst(
            creating.current.eMin,
            primaryOffset,
          );
          const start = new Date(curDay);
          start.setHours(sh, sm, 0, 0);
          const end = new Date(curDay);
          end.setHours(eh, em, 0, 0);
          if (end <= start) end.setDate(end.getDate() + 1);
          createRange({ start, end });
        }
        creating.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [curDay, hourHeightPx, onCreateRange, primaryOffset],
  );

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ "--hour-h": `${hourHeightPx}px` } as React.CSSProperties}
    >
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              일간 일정
            </div>
            <div className="mt-0.5 text-[17px] font-extrabold tracking-tight text-slate-900">
              {formatFullDate(curDay)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-extrabold text-sky-600">
              {daySessions.length}
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              수업
            </div>
          </div>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto flex"
        style={{ scrollbarWidth: "thin" }}
      >
        <div
          className="flex flex-shrink-0 border-r border-slate-100"
          style={{ width: 64 + extraTz.length * 44 }}
        >
          <div className="w-16 bg-white border-r border-slate-100">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-slate-200 relative"
                style={{ height: hourHeightPx }}
              >
                <span className="absolute top-1 right-2 text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {extraTz.map((t) => (
            <div key={t.id} className="w-11 bg-sky-50 border-r border-slate-100">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-b border-slate-200 relative"
                  style={{ height: hourHeightPx }}
                >
                  <span className="absolute top-1 right-1.5 text-[9px] font-semibold text-sky-500">
                    {String(extraHourLabel(h, t.offset, primaryOffset)).padStart(
                      2,
                      "0",
                    )}:00
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          ref={gridRef}
          onMouseDown={onGridMouseDown}
          className="relative min-w-0 flex-1 overflow-hidden bg-white"
          style={{ minHeight: gridHeightPx }}
        >
          {HOURS.map((h) => (
            <div key={h} className="hour-cell" />
          ))}

          {daySessions.map((session) => {
            const student =
              session.studentId == null
                ? undefined
                : studentsById.get(session.studentId);
            const status = sessionStatusInPrimaryTimezone(
              session,
              now,
              primaryOffset,
              primaryTimeZone,
            );
            const past = status === "completed";
            const ongoing = status === "ongoing";
            return (
              <SessionBlock
                key={session.id}
                session={session}
                student={student}
                colDate={curDay}
                primaryOffset={primaryOffset}
                hourHeightPx={hourHeightPx}
                isPast={past}
                isNow={ongoing}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(session.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onResizeMouseDown={(e) => {
                  e.stopPropagation();
                }}
              />
            );
          })}

          {isToday && <div className="now-line" style={{ top: nowTop }} />}

          <div ref={ghostRef} className="drag-ghost" style={{ position: "absolute" }} />

          {/* {daySessions.length === 0 && (
            <div className="pointer-events-none absolute inset-x-4 top-6 rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-center text-[13px] font-semibold text-slate-400">
              이 날짜에는 등록된 수업이 없습니다.
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
