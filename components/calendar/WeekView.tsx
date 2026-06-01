"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { SessionBlock } from "./SessionBlock";
import {
  SessionDragPreview,
  type SessionDragPreviewState,
} from "./SessionDragPreview";
import { sessionEditorAnchorFromElement } from "./sessionEditorAnchor";
import {
  rescheduleSession,
  SESSION_DRAG_THRESHOLD_PX,
} from "./sessionReschedule";
import {
  addDays, sameDay, sessionsForDay,
  snapTo15, primaryMinToKst, extraHourLabel, wallClockDateInTimeZone,
  topPxForWallClockDate, sessionStatusInPrimaryTimezone,
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
  canRescheduleSessions = false,
}: {
  onCreateRange?: (range: { start: Date; end: Date }) => void;
  canRescheduleSessions?: boolean;
}) {
  const queryClient = useQueryClient();
  const sessions       = useSessions();
  const tzData         = useTzData();
  const now            = useNow();
  const students       = useTutorStore((s) => s.students);
  const curWeekStart   = useTutorStore((s) => s.curWeekStart);
  const openModal      = useTutorStore((s) => s.openModal);
  const upsertSession  = useTutorStore((s) => s.upsertSession);
  const [hourHeightPx, setHourHeightPx] = useState(HOUR_HEIGHT_PX);
  const [dayWidthPx, setDayWidthPx] = useState(MIN_DAY_WIDTH_PX);
  const [anchorWeekStart, setAnchorWeekStart] = useState(() => new Date(curWeekStart));
  const [hoverGuide, setHoverGuide] = useState<{top: number; di: number;} | null>(null);

  const primaryOffset  = getPrimaryOffset(tzData);
  const primaryTimeZone = tzData[0]?.timeZone ?? "Asia/Seoul";
  const primaryNow     = wallClockDateInTimeZone(now, tzData[0]?.timeZone ?? "Asia/Seoul");
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
  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    days.forEach((day) => {
      map.set(
        weekKey(day),
        sessionsForDay(sessions, day).sort(
          (a, b) => a.start.getTime() - b.start.getTime(),
        ),
      );
    });
    return map;
  }, [days, sessions]);

  // ── Drag-to-create refs ────────────────────────────────────────────────────
  const creating = useRef<{ di: number; date: Date; sMin: number; eMin: number } | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const colsRef  = useRef<HTMLDivElement>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const scrollUpdateRef = useRef(false);
  const skipScrollToRef = useRef(false);
  const syncingScrollRef = useRef(false);
  const suppressSessionClickRef = useRef(false);
  const [dragPreview, setDragPreview] =
    useState<SessionDragPreviewState | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<number | null>(null);

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

  const nowTop = topPxForWallClockDate(primaryNow, hourHeightPx);
  const gridHeightPx = hourHeightPx * 24;
  const totalDayWidthPx = days.length * dayWidthPx;
  const handleColsMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!colsRef.current) return;

      const rect = colsRef.current.getBoundingClientRect();

      const top = Math.max(0, Math.min(gridHeightPx, e.clientY - rect.top));
      const x = e.clientX - rect.left;
      const di = Math.floor(x / dayWidthPx);

      if (di < 0 || di >= days.length) {
        setHoverGuide(null);
        return;
      }

      setHoverGuide({ top, di });
    },
    [gridHeightPx, dayWidthPx, days.length],
  );

  const handleSessionMouseDown = useCallback(
    (
      e: React.MouseEvent,
      session: (typeof sessions)[number],
      student: ReturnType<typeof studentsById.get>,
    ) => {
      if (!canRescheduleSessions || e.button !== 0) {
        e.stopPropagation();
        return;
      }
      if (!colsRef.current || !ghostRef.current) return;

      const rect = (e.currentTarget as Element).getBoundingClientRect();
      const originX = e.clientX;
      const originY = e.clientY;
      const durationMs = session.end.getTime() - session.start.getTime();
      let dragging = false;
      let drop: { date: Date; startMin: number } | null = null;
      e.stopPropagation();

      function updateDrop(moveEvent: MouseEvent) {
        if (!colsRef.current || !ghostRef.current) return;
        const colsRect = colsRef.current.getBoundingClientRect();
        const x = moveEvent.clientX - colsRect.left;
        const di = Math.max(
          0,
          Math.min(days.length - 1, Math.floor(x / dayWidthPx)),
        );
        const colEl = colsRef.current.children[di] as HTMLElement | undefined;
        if (!colEl) return;
        const colRect = colEl.getBoundingClientRect();
        const relY = moveEvent.clientY - colRect.top;
        const startMin = Math.max(
          0,
          Math.min(
            DAY_MINUTES - 15,
            snapTo15(Math.floor(relY / (hourHeightPx / 60))),
          ),
        );
        drop = { date: days[di], startMin };

        const ghost = ghostRef.current;
        ghost.style.display = "block";
        ghost.style.left = `${colsRef.current.offsetLeft + colRect.left - colsRect.left + 3}px`;
        ghost.style.width = `${colRect.width - 6}px`;
        ghost.style.top = `${startMin * (hourHeightPx / 60)}px`;
        ghost.style.height = `${Math.max(
          20,
          (durationMs / 60000) * (hourHeightPx / 60),
        )}px`;
      }

      function onMove(moveEvent: MouseEvent) {
        const dx = moveEvent.clientX - originX;
        const dy = moveEvent.clientY - originY;
        if (
          !dragging &&
          Math.hypot(dx, dy) < SESSION_DRAG_THRESHOLD_PX
        ) {
          return;
        }
        dragging = true;
        suppressSessionClickRef.current = true;
        setDraggingSessionId(session.id);
        setDragPreview({
          session,
          student,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          width: rect.width,
          height: rect.height,
          grabX: originX - rect.left,
          grabY: originY - rect.top,
          variant: "block",
        });
        moveEvent.preventDefault();
        updateDrop(moveEvent);
      }

      async function onUp(upEvent: MouseEvent) {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (ghostRef.current) ghostRef.current.style.display = "none";
        setDragPreview(null);
        setDraggingSessionId(null);
        if (!dragging) return;
        updateDrop(upEvent);
        if (!drop) return;

        const { h, m } = primaryMinToKst(drop.startMin, primaryOffset);
        const start = new Date(drop.date);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + durationMs);

        try {
          await rescheduleSession(
            session,
            start,
            end,
            queryClient,
            upsertSession,
          );
        } catch (error) {
          console.error("[WeekView] session reschedule failed", error);
        }
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [
      canRescheduleSessions,
      dayWidthPx,
      days,
      hourHeightPx,
      primaryOffset,
      queryClient,
      upsertSession,
    ],
  );

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
            const tod = sameDay(d, primaryNow);
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
                      {String(extraHourLabel(h, t.offset, primaryOffset)).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            ref={colsRef}
            onMouseMove={handleColsMouseMove}
            onMouseLeave = {() => setHoverGuide(null)}
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${days.length}, ${dayWidthPx}px)`,
              width: totalDayWidthPx,
              height: gridHeightPx,
            }}
          >
            {days.map((d, di) => {
              const daySessions = sessionsByDay.get(weekKey(d)) ?? [];
              const isToday     = sameDay(d, primaryNow);

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
                    const student =
                      s.studentId == null ? undefined : studentsById.get(s.studentId);
                    const status = sessionStatusInPrimaryTimezone(
                      s,
                      now,
                      primaryOffset,
                      primaryTimeZone,
                    );
                    const past    = status === "completed";
                    const ongoing = status === "ongoing";
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
                        isDragging={draggingSessionId === s.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (suppressSessionClickRef.current) {
                            suppressSessionClickRef.current = false;
                            return;
                          }
                          openModal(
                            s.id,
                            "detail",
                            sessionEditorAnchorFromElement(e.currentTarget),
                          );
                        }}
                        onMouseDown={(e) => handleSessionMouseDown(e, s, student)}
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
            {hoverGuide !== null && (
              <div
                className="time-hover-line"
                style={{
                  top: hoverGuide.top,
                  left: hoverGuide.di * dayWidthPx,
                  width: dayWidthPx,
                }}
              />
            )}
          </div>

          {/* Drag ghost */}
          <div ref={ghostRef} className="drag-ghost" style={{ position: "absolute" }} />
          <SessionDragPreview
            preview={dragPreview}
            primaryOffset={primaryOffset}
          />
        </div>
      </div>
    </div>
  );
}
