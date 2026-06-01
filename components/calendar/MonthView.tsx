"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import {
  apiSessionToSession,
  queryKeys,
  type ApiSessionRow,
} from "@/hooks/useAppQueries";
import {
  SessionDragPreview,
  type SessionDragPreviewState,
} from "./SessionDragPreview";
import { sessionEditorAnchorFromElement } from "./sessionEditorAnchor";
import {
  rescheduleSession,
  SESSION_DRAG_THRESHOLD_PX,
} from "./sessionReschedule";
import { addDays, sameDay, fmtTz, wallClockDateInTimeZone } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { DAYS_KO } from "@/lib/constants";
import { resolveAvatarBg } from "@/lib/studentColor";

const MONTH_WINDOW = 6;

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthCells(month: Date) {
  const first = monthStart(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const result: { date: Date; other: boolean }[] = [];

  for (let i = 0; i < first.getDay(); i++)
    result.push({ date: addDays(first, i - first.getDay()), other: true });
  for (let d = 1; d <= last.getDate(); d++)
    result.push({ date: new Date(first.getFullYear(), first.getMonth(), d), other: false });
  while (result.length < 42)
    result.push({ date: addDays(result[result.length - 1].date, 1), other: true });

  return result;
}

export function MonthView({
  canRescheduleSessions = false,
}: {
  canRescheduleSessions?: boolean;
}) {
  const queryClient = useQueryClient();
  const sessions    = useSessions();
  const tzData      = useTzData();
  const now         = useNow();
  const students    = useTutorStore((s) => s.students);
  const curMonth    = useTutorStore((s) => s.curMonth);
  const jumpToDate  = useTutorStore((s) => s.jumpToDate);
  const setCalView  = useTutorStore((s) => s.setCalView);
  const openModal   = useTutorStore((s) => s.openModal);
  const closeModal = useTutorStore((s) => s.closeModal);
  const upsertSession = useTutorStore((s) => s.upsertSession);
  const addSession = useTutorStore((s) => s.addSession);
  const [anchorMonth, setAnchorMonth] = useState(() => monthStart(curMonth));
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef(new Map<string, HTMLElement>());
  const scrollUpdateRef = useRef(false);
  const skipScrollToRef = useRef(false);
  const suppressSessionClickRef = useRef(false);
  const [dragPreview, setDragPreview] =
    useState<SessionDragPreviewState | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<number | null>(null);
  const [dropDateKey, setDropDateKey] = useState<string | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [copyBuffer, setCopyBuffer] = useState<typeof sessions | null>(null);

  const primaryOffset = getPrimaryOffset(tzData);
  const primaryNow = wallClockDateInTimeZone(now, tzData[0]?.timeZone ?? "Asia/Seoul");

  const months = useMemo(
    () =>
      Array.from({ length: MONTH_WINDOW * 2 + 1 }, (_, i) =>
        addMonths(anchorMonth, i - MONTH_WINDOW),
      ),
    [anchorMonth],
  );
  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    months.forEach((month) => {
      monthCells(month).forEach(({ date }) => {
        const key = dateKey(date);
        if (map.has(key)) return;
        map.set(
          key,
          sessions
            .filter((session) => sameDay(session.start, date))
            .sort((a, b) => a.start.getTime() - b.start.getTime()),
        );
      });
    });
    return map;
  }, [months, sessions]);

  useEffect(() => {
    if (scrollUpdateRef.current) {
      scrollUpdateRef.current = false;
      return;
    }
    setAnchorMonth(monthStart(curMonth));
  }, [curMonth]);

  useEffect(() => {
    if (skipScrollToRef.current) {
      skipScrollToRef.current = false;
      return;
    }
    const container = scrollRef.current;
    const target = monthRefs.current.get(monthKey(curMonth));
    if (!container || !target) return;
    container.scrollTo({
      top: target.offsetTop - container.offsetTop,
      behavior: "smooth",
    });
  }, [anchorMonth, curMonth]);

  useEffect(() => {
    if(selectedSessionIds.length > 1){
      closeModal();
    } 
  },[selectedSessionIds])

  async function cloneSessionToDate(
    source: (typeof sessions)[number],
    targetDateKey: string,
  ) {
    const [year, month, day] = targetDateKey.split("-").map(Number);
    const durationMs = source.end.getTime() - source.start.getTime();
    const start = new Date(source.start);
    start.setFullYear(year, month - 1, day);
    const end = new Date(start.getTime() + durationMs);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: source.studentId,
        start: start.toISOString(),
        end: end.toISOString(),
        place: source.place,
        notes: source.notes,
        understanding: source.understanding,
        focus: source.focus,
        homework: source.homework.map((item) => ({
          text: item.text,
          done: item.done,
        })),
      }),
    });
    if (!res.ok) throw new Error("수업 복사 실패");
    return apiSessionToSession((await res.json()) as ApiSessionRow);
  }

  async function pasteCopiedSessions(targetDateKey: string) {
    if (!copyBuffer || copyBuffer.length === 0) return;
    try {
      const created = await Promise.all(
        copyBuffer.map((session) => cloneSessionToDate(session, targetDateKey)),
      );
      created.forEach(addSession);
      queryClient.setQueryData(queryKeys.sessions, (prev) =>
        Array.isArray(prev) ? [...created, ...prev] : created,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
      setSelectedSessionIds(created.map((session) => session.id));
      setSelectedDateKey(targetDateKey);
      setCopyBuffer(null);
    } catch (error) {
      console.error("[MonthView] paste copied sessions failed", error);
    }
  }

  function handleCellClick(date: Date) {
    const targetDateKey = dateKey(date);
    if (copyBuffer) {
      void pasteCopiedSessions(targetDateKey);
      return;
    }
    jumpToDate(date);
    setCalView("day");
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;

    const center = container.scrollTop + container.clientHeight / 2;
    let closestDate: Date | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    months.forEach((month) => {
      const node = monthRefs.current.get(monthKey(month));
      if (!node) return;
      const mid = node.offsetTop - container.offsetTop + node.offsetHeight / 2;
      const distance = Math.abs(center - mid);
      if (distance < closestDistance) {
        closestDate = month;
        closestDistance = distance;
      }
    });

    if (!closestDate || monthKey(closestDate) === monthKey(curMonth)) return;
    scrollUpdateRef.current = true;
    skipScrollToRef.current = true;
    jumpToDate(closestDate);
  }

  function monthDateFromPoint(x: number, y: number): string | null {
    const dropTarget = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-month-date]");
    return dropTarget?.dataset.monthDate ?? null;
  }

  function handleSessionClick(
    e: React.MouseEvent<HTMLElement>,
    session: (typeof sessions)[number],
  ) {
    e.stopPropagation();
    if (suppressSessionClickRef.current) {
      suppressSessionClickRef.current = false;
      return;
    }

    const sessionDateKey = dateKey(session.start);
    if (copyBuffer) {
      void pasteCopiedSessions(sessionDateKey);
      return;
    }

    if (e.shiftKey) {
      setCopyBuffer(null);
      if (selectedDateKey && selectedDateKey !== sessionDateKey) {
        // 이미 선택한 날짜가 있고, 지금 클릭한 날짜와 다를때 초기화
        // 추후 확장 예정이지만 현재는 같은 날짜 있는 애들만 복사 붙여넣기
        setSelectedDateKey(sessionDateKey);
        setSelectedSessionIds([session.id]);
        return;
      }

      setSelectedDateKey(sessionDateKey);
      setSelectedSessionIds((currentIds) => {
        return currentIds.includes(session.id)
          ? currentIds.filter((id) => id !== session.id)
          : [...currentIds, session.id];
      });
      return;
    }

    setCopyBuffer(null);
    setSelectedDateKey(sessionDateKey);
    setSelectedSessionIds([session.id]);
    openModal(
      session.id,
      "detail",
      sessionEditorAnchorFromElement(e.currentTarget),
    );
  }

  function copySelectedSessions() {
    const selected = selectedSessionIds
      .map((id) => sessions.find((session) => session.id === id))
      .filter((session): session is (typeof sessions)[number] => Boolean(session))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    if (selected.length < 2) return;
    const firstDate = dateKey(selected[0].start);
    if (!selected.every((session) => dateKey(session.start) === firstDate)) {
      return;
    }
    setCopyBuffer(selected);
  }

  const handleSessionMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLElement>,
      session: (typeof sessions)[number],
      student: ReturnType<typeof studentsById.get>,
    ) => {
      if (!canRescheduleSessions || e.button !== 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const originX = e.clientX;
      const originY = e.clientY;
      let dragging = false;
      e.stopPropagation();

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
        setDropDateKey(monthDateFromPoint(moveEvent.clientX, moveEvent.clientY));
        setDragPreview({
          session,
          student,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          width: rect.width,
          height: rect.height,
          grabX: originX - rect.left,
          grabY: originY - rect.top,
          variant: "chip",
        });
        moveEvent.preventDefault();
      }

      async function onUp(upEvent: MouseEvent) {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setDragPreview(null);
        setDraggingSessionId(null);
        setDropDateKey(null);
        if (!dragging) return;

        const dateValue = monthDateFromPoint(upEvent.clientX, upEvent.clientY);
        if (!dateValue) return;

        const [year, month, day] = dateValue.split("-").map(Number);
        if (!year || !month || !day) return;

        const durationMs = session.end.getTime() - session.start.getTime();
        const start = new Date(session.start);
        start.setFullYear(year, month - 1, day);
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
          console.error("[MonthView] session reschedule failed", error);
        }
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [canRescheduleSessions, queryClient, upsertSession],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {(selectedSessionIds.length > 0 || copyBuffer) && (
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-4 py-2 text-[12px]">
          <span className="font-semibold text-slate-500">
            {copyBuffer
              ? `${copyBuffer.length}개 복사됨 · 붙여넣을 날짜를 클릭`
              : `${selectedSessionIds.length}개 선택됨`}
          </span>
          {!copyBuffer && selectedSessionIds.length >= 2 && (
            <button
              onClick={copySelectedSessions}
              className="rounded-lg bg-sky-600 px-3 py-1.5 font-bold text-white shadow-sm hover:bg-sky-700"
            >
              복사
            </button>
          )}
          <button
            onClick={() => {
              setCopyBuffer(null);
              setSelectedDateKey(null);
              setSelectedSessionIds([]);
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      )}
      {/* DOW header */}
      <div className="grid border-b border-slate-100 bg-white flex-shrink-0"
        style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
        {DAYS_KO.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-white"
        style={{ scrollbarWidth: "thin" }}
      >
        {months.map((month) => {
          const key = monthKey(month);
          const cells = monthCells(month);

          return (
            <section
              key={key}
              ref={(node) => {
                if (node) monthRefs.current.set(key, node);
                else monthRefs.current.delete(key);
              }}
              className="flex min-h-full flex-col border-b border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
                <div className="text-[14px] font-extrabold tracking-tight text-slate-900">
                  {month.getFullYear()}년 {month.getMonth() + 1}월
                </div>
              </div>

              <div
                className="grid flex-1 overflow-hidden"
                style={{ gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: "repeat(6,1fr)" }}
              >
                {cells.map(({ date, other }, i) => {
                  const tod = sameDay(date, primaryNow);
                  const keyForDate = dateKey(date);
                  const daySes = sessionsByDay.get(keyForDate) ?? [];
                  return (
                    <div
                      key={`${key}-${i}`}
                      data-month-date={keyForDate}
                      onClick={() => handleCellClick(date)}
                      className={`relative cursor-pointer overflow-hidden border-r border-b border-slate-100 p-2 transition-colors hover:bg-sky-50
                        ${other ? "bg-slate-50" : ""}
                        ${copyBuffer ? "hover:bg-emerald-50" : ""}
                        ${i % 7 === 6 ? "border-r-0" : ""}`}
                    >
                      <div className={`mb-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold
                        ${tod ? "bg-sky-500 text-white" : other ? "text-slate-300" : "text-slate-600"}`}>
                        {date.getDate()}
                      </div>

                      {daySes.slice(0, 3).map((s) => {
                        const st =
                          s.studentId == null ? undefined : studentsById.get(s.studentId);
                        const chip = {
                          background: resolveAvatarBg(st?.color ?? "s-blue"),
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,.55)",
                        };
                        return (
                          <div
                            key={s.id}
                            onMouseDown={(e) => handleSessionMouseDown(e, s, st)}
                            onClick={(e) => handleSessionClick(e, s)}
                            className={`mb-0.5 cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-bold shadow-sm hover:opacity-90 ${
                              draggingSessionId === s.id ? "opacity-25" : ""
                            } ${
                              selectedSessionIds.includes(s.id)
                                ? "ring-2 ring-sky-900 ring-offset-1 ring-offset-white brightness-110"
                                : ""
                            }`}
                            style={chip}
                          >
                            {fmtTz(s.start, primaryOffset)} {st?.name ?? "수업"}
                          </div>
                        );
                      })}

                      {daySes.length > 3 && (
                        <div className="cursor-pointer px-1 text-[10px] font-semibold text-sky-600 hover:underline">
                          +{daySes.length - 3}개
                        </div>
                      )}
                      {dropDateKey === keyForDate && (
                        <div className="pointer-events-none absolute left-2 right-2 top-8 h-[22px] rounded border-2 border-dashed border-sky-500 bg-sky-500/10" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <SessionDragPreview preview={dragPreview} primaryOffset={primaryOffset} />
    </div>
  );
}
