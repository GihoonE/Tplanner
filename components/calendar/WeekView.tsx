"use client";

import { useMemo, useRef, useCallback } from "react";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { SessionBlock } from "./SessionBlock";
import {
  addDays, sameDay, sessionsForDay, fmtTz, topPxForDate,
  snapTo15, primaryMinToKst, extraHourLabel,
} from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { DAYS_KO, HOUR_HEIGHT_PX } from "@/lib/constants";
import type { Session } from "@/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView() {
  const sessions       = useSessions();
  const tzData         = useTzData();
  const now            = useNow();
  const students       = useTutorStore((s) => s.students);
  const curWeekStart   = useTutorStore((s) => s.curWeekStart);
  const openModal      = useTutorStore((s) => s.openModal);
  const addSession     = useTutorStore((s) => s.addSession);

  const primaryOffset  = getPrimaryOffset(tzData);
  const extraTz        = tzData.filter((t) => t.on && !t.primary);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(curWeekStart, i)),
    [curWeekStart]
  );

  // ── Drag-to-create refs ────────────────────────────────────────────────────
  const creating = useRef<{ di: number; sMin: number; eMin: number } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const colsRef  = useRef<HTMLDivElement>(null);

  const onColMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, di: number) => {
      if ((e.target as HTMLElement).closest(".session-block")) return;
      const col = (e.currentTarget as HTMLElement);
      const rect = col.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const sMin = snapTo15(Math.floor(relY / (HOUR_HEIGHT_PX / 60)));
      creating.current = { di, sMin, eMin: sMin + 60 };
      e.preventDefault();

      function onMove(me: MouseEvent) {
        if (!creating.current || !colsRef.current || !ghostRef.current) return;
        const colEl = colsRef.current.children[creating.current.di] as HTMLElement;
        const r = colEl.getBoundingClientRect();
        const ry = me.clientY - r.top;
        creating.current.eMin = Math.max(
          creating.current.sMin + 30,
          snapTo15(Math.ceil(ry / (HOUR_HEIGHT_PX / 60)))
        );
        const colsRect = colsRef.current.getBoundingClientRect();
        const ghost = ghostRef.current;
        ghost.style.display = "block";
        ghost.style.left    = `${r.left - colsRect.left + 3}px`;
        ghost.style.width   = `${r.width - 6}px`;
        ghost.style.top     = `${creating.current.sMin * (HOUR_HEIGHT_PX / 60)}px`;
        ghost.style.height  = `${(creating.current.eMin - creating.current.sMin) * (HOUR_HEIGHT_PX / 60)}px`;
      }

      function onUp() {
        if (ghostRef.current) ghostRef.current.style.display = "none";
        if (creating.current && creating.current.eMin - creating.current.sMin >= 30) {
          const date = addDays(curWeekStart, creating.current.di);
          const { h: sh, m: sm } = primaryMinToKst(creating.current.sMin, primaryOffset);
          const { h: eh, m: em } = primaryMinToKst(creating.current.eMin, primaryOffset);
          const start = new Date(date); start.setHours(sh, sm, 0, 0);
          const end   = new Date(date); end.setHours(eh, em, 0, 0);
          if (end <= start) end.setDate(end.getDate() + 1);
          const newS: Session = {
            id: Date.now(), studentId: null, start, end,
            place: "", notes: "", understanding: "", focus: "", homework: [],
          };
          addSession(newS);
          openModal(newS.id, "new");
        }
        creating.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [curWeekStart, primaryOffset, addSession, openModal]
  );

  const nowTop = topPxForDate(now, primaryOffset);
  const todayIndex = days.findIndex((d) => sameDay(d, now));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Day header row ── */}
      <div className="flex border-b border-slate-100 bg-white flex-shrink-0">
        {/* Gutter header */}
        <div
          className="flex-shrink-0 border-r border-slate-100 flex"
          style={{ width: 64 + extraTz.length * 44 }}
        >
          <div className="w-16 flex items-center justify-center border-r border-slate-100">
            <span className="text-[9px] font-bold text-sky-600">{tzData[0].label}</span>
          </div>
          {extraTz.map((t) => (
            <div key={t.id} className="w-11 flex items-center justify-center border-r border-slate-100 bg-sky-50">
              <span className="text-[9px] font-bold text-sky-500">{t.label}</span>
            </div>
          ))}
        </div>

        {/* Day columns header */}
        <div className="flex-1 grid" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
          {days.map((d, i) => {
            const tod = sameDay(d, now);
            return (
              <button
                key={i}
                className="py-2.5 px-2 text-center border-l border-slate-200 first:border-l-0 hover:bg-sky-50 transition-colors"
                onClick={() => {
                  useTutorStore.getState().jumpToDate(d);
                  useTutorStore.getState().setCalView("day");
                }}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {DAYS_KO[d.getDay()]}
                </div>
                <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] font-bold mx-auto transition-all ${
                  tod ? "bg-sky-500 text-white shadow-[0_2px_8px_rgba(14,165,233,.35)]" : "text-slate-700"
                }`}>
                  {d.getDate()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto flex" style={{ scrollbarWidth: "thin" }}>
        {/* Gutter: primary + extra TZ columns */}
        <div className="flex flex-shrink-0 border-r border-slate-100" style={{ width: 64 + extraTz.length * 44 }}>
          {/* Primary TZ */}
          <div className="w-16 bg-white border-r border-slate-100">
            {HOURS.map((h) => (
              <div key={h} className="border-b border-slate-200 relative" style={{ height: HOUR_HEIGHT_PX }}>
                <span className="absolute top-1 right-2 text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Extra TZ columns */}
          {extraTz.map((t) => (
            <div key={t.id} className="w-11 bg-sky-50 border-r border-slate-100">
              {HOURS.map((h) => (
                <div key={h} className="border-b border-slate-200 relative" style={{ height: HOUR_HEIGHT_PX }}>
                  <span className="absolute top-1 right-1.5 text-[9px] font-semibold text-sky-500">
                    {String(extraHourLabel(h, t.offset, primaryOffset)).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={colsRef}
            className="grid h-full"
            style={{ gridTemplateColumns: "repeat(7,1fr)" }}
          >
            {days.map((d, di) => {
              const daySessions = sessionsForDay(sessions, d);
              const isToday     = sameDay(d, now);

              return (
                <div
                  key={di}
                  className={`relative border-l-2 first:border-l-0 ${isToday ? "bg-sky-500/[.03] border-sky-300" : "border-slate-200"}`}
                  onMouseDown={(e) => onColMouseDown(e, di)}
                >
                  {/* Hour cells */}
                  {HOURS.map((h) => (
                    <div key={h} className="hour-cell" />
                  ))}

                  {/* Session blocks */}
                  {daySessions.map((s) => {
                    const student = students.find((st) => st.id === s.studentId);
                    const past    = s.end < now;
                    const ongoing = s.start <= now && now < s.end;
                    return (
                      <SessionBlock
                        key={s.id}
                        session={s}
                        student={student}
                        colDate={d}
                        primaryOffset={primaryOffset}
                        isPast={past}
                        isNow={ongoing}
                        onClick={(e) => { e.stopPropagation(); openModal(s.id); }}
                        onMouseDown={(e) => { e.stopPropagation(); /* drag handled by parent */ }}
                        onResizeMouseDown={(e) => { e.stopPropagation(); }}
                      />
                    );
                  })}

                  {/* Now line */}
                  {isToday && (
                    <div className="now-line" style={{ top: nowTop }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Drag ghost */}
          <div ref={ghostRef} className="drag-ghost" style={{ position: "absolute" }} />
        </div>
      </div>
    </div>
  );
}
