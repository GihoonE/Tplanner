"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { SessionBlock } from "./SessionBlock";
import {
  addDays, sameDay, sessionsForDay, fmtTz, topPxForDate,
  snapTo15, primaryMinToKst, extraHourLabel,
} from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { DAYS_KO, HOUR_HEIGHT_PX } from "@/lib/constants";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_WINDOW = 8;
const MIN_DAY_WIDTH_PX = 112;
const DAY_MINUTES = 24 * 60;

function weekKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function WeekView({
  onCreateRange,
}: {
  onCreateRange?: (range: { start: Date; end: Date }) => void;
}) {
  const sessions       = useSessions();
  const tzData         = useTzData();
  const now            = useNow();
  const students       = useTutorStore((s) => s.students);
  const curWeekStart   = useTutorStore((s) => s.curWeekStart);
  const openModal      = useTutorStore((s) => s.openModal);
  const [hourHeightPx, setHourHeightPx] = useState(HOUR_HEIGHT_PX);
  const [dayWidthPx, setDayWidthPx] = useState(MIN_DAY_WIDTH_PX);
  const [anchorWeekStart, setAnchorWeekStart] = useState(() => new Date(curWeekStart));

  const primaryOffset  = getPrimaryOffset(tzData);
  const extraTz        = tzData.filter((t) => t.on && !t.primary);
  const gutterWidthPx  = 64 + extraTz.length * 44;

  const weekStarts = useMemo(
    () =>
      Array.from({ length: WEEK_WINDOW * 2 + 1 }, (_, i) =>
        addDays(anchorWeekStart, (i - WEEK_WINDOW) * 7),
      ),
    [anchorWeekStart],
  );
  const days = useMemo(
    () => weekStarts.flatMap((week) => Array.from({ length: 7 }, (_, i) => addDays(week, i))),
    [weekStarts]
  );

  // ── Drag-to-create refs ────────────────────────────────────────────────────
  const creating = useRef<{ di: number; date: Date; sMin: number; eMin: number } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const colsRef  = useRef<HTMLDivElement>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const scrollUpdateRef = useRef(false);
  const skipScrollToRef = useRef(false);
  const syncingScrollRef = useRef(false);

  useEffect(() => {
    if (!bodyRef.current) return;
    const update = () => {
      if (!bodyRef.current) return;
      setHourHeightPx(Math.max(HOUR_HEIGHT_PX, bodyRef.current.clientHeight / 24));
      setDayWidthPx(Math.max(MIN_DAY_WIDTH_PX, (bodyRef.current.clientWidth - gutterWidthPx) / 7));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bodyRef.current);
    return () => observer.disconnect();
  }, [gutterWidthPx]);

  useEffect(() => {
    if (scrollUpdateRef.current) {
      scrollUpdateRef.current = false;
      return;
    }
    setAnchorWeekStart(new Date(curWeekStart));
  }, [curWeekStart]);

  useEffect(() => {
    if (skipScrollToRef.current) {
      skipScrollToRef.current = false;
      return;
    }
    const scroller = bodyRef.current;
    if (!scroller) return;
    const weekIndex = weekStarts.findIndex((week) => weekKey(week) === weekKey(curWeekStart));
    if (weekIndex < 0) return;
    scroller.scrollTo({
      left: weekIndex * dayWidthPx * 7,
      behavior: "smooth",
    });
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = weekIndex * dayWidthPx * 7;
    }
  }, [anchorWeekStart, curWeekStart, dayWidthPx, weekStarts]);

  const onColMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, di: number) => {
      if (!onCreateRange) return;
      const createRange = onCreateRange;
      if ((e.target as HTMLElement).closest(".session-block")) return;
      const col = (e.currentTarget as HTMLElement);
      const rect = col.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const sMin = Math.max(
        0,
        Math.min(DAY_MINUTES - 15, snapTo15(Math.floor(relY / (hourHeightPx / 60)))),
      );
      creating.current = { di, date: days[di], sMin, eMin: sMin + 60 };
      e.preventDefault();

      function onMove(me: MouseEvent) {
        if (!creating.current || !colsRef.current || !ghostRef.current) return;
        const colEl = colsRef.current.children[creating.current.di] as HTMLElement;
        const r = colEl.getBoundingClientRect();
        const ry = me.clientY - r.top;
        creating.current.eMin = Math.min(
          DAY_MINUTES,
          Math.max(
            creating.current.sMin + 30,
            snapTo15(Math.ceil(ry / (hourHeightPx / 60))),
          ),
        );
        const colsRect = colsRef.current.getBoundingClientRect();
        const ghost = ghostRef.current;
        ghost.style.display = "block";
        ghost.style.left    = `${colsRef.current.offsetLeft + r.left - colsRect.left + 3}px`;
        ghost.style.width   = `${r.width - 6}px`;
        ghost.style.top     = `${creating.current.sMin * (hourHeightPx / 60)}px`;
        ghost.style.height  = `${(creating.current.eMin - creating.current.sMin) * (hourHeightPx / 60)}px`;
      }

      function onUp() {
        if (ghostRef.current) ghostRef.current.style.display = "none";
        if (creating.current && creating.current.eMin - creating.current.sMin >= 30) {
          const date = creating.current.date;
          const { h: sh, m: sm } = primaryMinToKst(creating.current.sMin, primaryOffset);
          const { h: eh, m: em } = primaryMinToKst(creating.current.eMin, primaryOffset);
          const start = new Date(date); start.setHours(sh, sm, 0, 0);
          const end   = new Date(date); end.setHours(eh, em, 0, 0);
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
    [days, primaryOffset, hourHeightPx, onCreateRange]
  );

  const nowTop = topPxForDate(now, primaryOffset, hourHeightPx);
  const todayIndex = days.findIndex((d) => sameDay(d, now));
  const gridHeightPx = hourHeightPx * 24;
  const totalDayWidthPx = days.length * dayWidthPx;

  function syncHeaderScroll(left: number) {
    if (!headerScrollRef.current) return;
    syncingScrollRef.current = true;
    headerScrollRef.current.scrollLeft = left;
    requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  }

  function handleBodyScroll() {
    const scroller = bodyRef.current;
    if (!scroller) return;
    syncHeaderScroll(scroller.scrollLeft);

    const centerLeft = scroller.scrollLeft + Math.max(0, scroller.clientWidth - gutterWidthPx) / 2;
    const weekIndex = Math.max(
      0,
      Math.min(weekStarts.length - 1, Math.floor(centerLeft / (dayWidthPx * 7))),
    );
    const visibleWeek = weekStarts[weekIndex];
    if (!visibleWeek || weekKey(visibleWeek) === weekKey(curWeekStart)) return;
    scrollUpdateRef.current = true;
    skipScrollToRef.current = true;
    useTutorStore.getState().jumpToDate(visibleWeek);
  }

  function handleHeaderScroll() {
    if (syncingScrollRef.current || !headerScrollRef.current || !bodyRef.current) return;
    bodyRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ "--hour-h": `${hourHeightPx}px` } as React.CSSProperties}
    >
      {/* ── Day header row ── */}
      <div
        ref={headerScrollRef}
        onScroll={handleHeaderScroll}
        className="flex-shrink-0 overflow-x-hidden border-b border-slate-100 bg-white"
      >
        <div className="flex" style={{ width: gutterWidthPx + totalDayWidthPx }}>
          {/* Gutter header */}
          <div
            className="sticky left-0 z-10 flex flex-shrink-0 border-r border-slate-100 bg-white"
            style={{ width: gutterWidthPx }}
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
          <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidthPx}px)` }}>
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
                  tod ? "bg-sky-500 text-white shadow-[0_2px_8px_rgba(16,67,109,.35)]" : "text-slate-700"
                }`}>
                  {d.getDate()}
                </div>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div
        ref={bodyRef}
        onScroll={handleBodyScroll}
        className="flex-1 overflow-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="relative flex" style={{ width: gutterWidthPx + totalDayWidthPx, minHeight: gridHeightPx }}>
          {/* Gutter: primary + extra TZ columns */}
          <div
            className="sticky left-0 z-10 flex flex-shrink-0 border-r border-slate-100"
            style={{ width: gutterWidthPx, height: gridHeightPx }}
          >
            {/* Primary TZ */}
            <div className="w-16 bg-white border-r border-slate-100">
              {HOURS.map((h) => (
                <div key={h} className="border-b border-slate-200 relative" style={{ height: hourHeightPx }}>
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
                  <div key={h} className="border-b border-slate-200 relative" style={{ height: hourHeightPx }}>
                    <span className="absolute top-1 right-1.5 text-[9px] font-semibold text-sky-500">
                      {String(extraHourLabel(h, t.offset, primaryOffset)).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            ref={colsRef}
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${days.length}, ${dayWidthPx}px)`,
              width: totalDayWidthPx,
              height: gridHeightPx,
            }}
          >
            {days.map((d, di) => {
              const daySessions = sessionsForDay(sessions, d).sort(
                (a, b) => a.start.getTime() - b.start.getTime(),
              );
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
                        hourHeightPx={hourHeightPx}
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
