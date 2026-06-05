"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import {
  SessionDragPreview,
  type SessionDragPreviewState,
} from "./SessionDragPreview";
import { sessionEditorAnchorFromElement } from "./sessionEditorAnchor";
import { SESSION_DRAG_THRESHOLD_PX } from "./sessionReschedule";
import {
  batchCreateSessions,
  batchDeleteSessions,
  batchUpdateSessions,
  cloneSessionDraft,
} from "./sessionMutations";
import { addDays, sameDay, fmtTz, wallClockDateInTimeZone } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { DAYS_KO } from "@/lib/constants";
import { resolveAvatarBg } from "@/lib/studentColor";

const MONTH_WINDOW = 6;
const MONTH_VISIBLE_ITEMS = 3;

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

function dateFromKey(key: string): Date | null {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
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

type MonthDragPlaceholder = {
  key: string;
  dateKey: string;
};

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
  const deleteSession = useTutorStore((s) => s.deleteSession);
  const markSessionPendingUpdate = useTutorStore((s) => s.markSessionPendingUpdate);
  const markSessionPendingCreate = useTutorStore((s) => s.markSessionPendingCreate);
  const markSessionPendingDelete = useTutorStore((s) => s.markSessionPendingDelete);
  const replaceSessionTempId = useTutorStore((s) => s.replaceSessionTempId);
  const clearSessionPending = useTutorStore((s) => s.clearSessionPending);
  const clearSessionPendingCreate = useTutorStore((s) => s.clearSessionPendingCreate);
  const setSessionSaveState = useTutorStore((s) => s.setSessionSaveState);
  const [anchorMonth, setAnchorMonth] = useState(() => monthStart(curMonth));
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragPreviewFrameRef = useRef<number | null>(null);
  const dragPreviewPositionRef = useRef({
    x: 0,
    y: 0,
    grabX: 0,
    grabY: 0,
  });
  const monthRefs = useRef(new Map<string, HTMLElement>());
  const scrollUpdateRef = useRef(false);
  const skipScrollToRef = useRef(false);
  const suppressSessionClickRef = useRef(false);
  const [dragPreview, setDragPreview] =
    useState<SessionDragPreviewState | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<number | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [copyBuffer, setCopyBuffer] = useState<typeof sessions | null>(null);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [dragPlaceholders, setDragPlaceholders] = useState<MonthDragPlaceholder[]>([]);

  const primaryOffset = getPrimaryOffset(tzData);
  const primaryNow = wallClockDateInTimeZone(now, tzData[0]?.timeZone ?? "Asia/Seoul");

  const moveDragPreview = useCallback(
    (x: number, y: number, grabX: number, grabY: number) => {
      dragPreviewPositionRef.current = { x, y, grabX, grabY };
      if (dragPreviewFrameRef.current !== null) return;
      dragPreviewFrameRef.current = window.requestAnimationFrame(() => {
        dragPreviewFrameRef.current = null;
        const node = dragPreviewRef.current;
        if (!node) return;
        const pos = dragPreviewPositionRef.current;
        node.style.transform = `translate3d(${pos.x - pos.grabX}px, ${pos.y - pos.grabY}px, 0)`;
      });
    },
    [],
  );

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
  const sessionActions = useMemo(
    () => ({
      addSession,
      upsertSession,
      deleteSession,
      markSessionPendingUpdate,
      markSessionPendingCreate,
      markSessionPendingDelete,
      replaceSessionTempId,
      clearSessionPending,
      clearSessionPendingCreate,
      setSessionSaveState,
    }),
    [
      addSession,
      clearSessionPending,
      clearSessionPendingCreate,
      deleteSession,
      markSessionPendingCreate,
      markSessionPendingDelete,
      markSessionPendingUpdate,
      replaceSessionTempId,
      setSessionSaveState,
      upsertSession,
    ],
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
    if (selectedSessionIds.length > 1) {
      closeModal();
    }
  }, [closeModal, selectedSessionIds.length]);

  function sortedSelectedSessions(ids = selectedSessionIds) {
    return ids
      .map((id) => sessions.find((session) => session.id === id))
      .filter((session): session is (typeof sessions)[number] => Boolean(session))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  function buildSessionsAtTarget(
    sources: typeof sessions,
    targetDateKey: string,
  ) {
    const targetDate = dateFromKey(targetDateKey);
    if (!targetDate) return [];

    const sorted = [...sources].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const anchor = sorted[0];
    if (!anchor) return [];

    const anchorDateStart = new Date(anchor.start);
    anchorDateStart.setHours(0, 0, 0, 0);
    const targetDateStart = new Date(targetDate);
    targetDateStart.setHours(0, 0, 0, 0);
    const dayDeltaMs = targetDateStart.getTime() - anchorDateStart.getTime();

    return sorted.map((source) => {
      const start = new Date(source.start.getTime() + dayDeltaMs);
      const end = new Date(source.end.getTime() + dayDeltaMs);
      return { source, start, end };
    });
  }

  function placeholdersForTarget(
    sources: typeof sessions,
    targetDateKey: string | null,
  ): MonthDragPlaceholder[] {
    if (!targetDateKey) return [];
    return buildSessionsAtTarget(sources, targetDateKey).map(({ source, start }) => ({
      key: String(source.id),
      dateKey: dateKey(start),
    }));
  }

  async function pasteCopiedSessions(targetDateKey: string) {
    if (!copyBuffer || copyBuffer.length === 0) return;
    try {
      const planned = buildSessionsAtTarget(copyBuffer, targetDateKey);
      const created = await batchCreateSessions(
        planned.map(({ source, start, end }) =>
          cloneSessionDraft(source, start, end),
        ),
        queryClient,
        sessionActions,
      );
      setSelectedSessionIds(created.map((session) => session.id));
    } catch (error) {
      console.error("[MonthView] paste copied sessions failed", error);
    }
  }

  async function deleteSelectedSessions() {
    if (selectedSessionIds.length === 0) return;
    const idsToDelete = [...selectedSessionIds];
    try {
      await batchDeleteSessions(idsToDelete, queryClient, sessionActions);
      setSelectedSessionIds([]);
      closeModal();
    } catch (error) {
      console.error("[MonthView] delete selected sessions failed", error);
    }
  }

  function clearSelectionAndBuffer() {
    setCopyBuffer(null);
    setSelectedSessionIds([]);
    setHoveredDateKey(null);
    setDragPlaceholders([]);
  }

  function handleCellClick(date: Date) {
    if (copyBuffer) {
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
      setHoveredDateKey(sessionDateKey);
      return;
    }

    if (e.shiftKey) {
      e.preventDefault();
      setCopyBuffer(null);
      setSelectedSessionIds((currentIds) => {
        return currentIds.includes(session.id)
          ? currentIds.filter((id) => id !== session.id)
          : [...currentIds, session.id];
      });
      return;
    }

    setCopyBuffer(null);
    setSelectedSessionIds([session.id]);
    openModal(
      session.id,
      "detail",
      sessionEditorAnchorFromElement(e.currentTarget),
    );
  }

  function copySelectedSessions() {
    const selected = sortedSelectedSessions();
    if (selected.length < 2) return;
    setCopyBuffer(selected);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "c") {
        if (selectedSessionIds.length < 2) return;
        e.preventDefault();
        copySelectedSessions();
        return;
      }

      if (key === "v") {
        if (!copyBuffer || !hoveredDateKey) return;
        e.preventDefault();
        void pasteCopiedSessions(hoveredDateKey);
        return;
      }

      if (key === "backspace") {
        if (selectedSessionIds.length === 0) return;
        e.preventDefault();
        void deleteSelectedSessions();
      }
    }

    function onPlainKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key !== "Escape") return;
      clearSelectionAndBuffer();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keydown", onPlainKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onPlainKeyDown);
    };
  });

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
      const isGroupDrag =
        selectedSessionIds.length > 1 && selectedSessionIds.includes(session.id);
      const dragSources = isGroupDrag ? sortedSelectedSessions() : [session];
      if (!isGroupDrag && !e.shiftKey) {
        setCopyBuffer(null);
        setSelectedSessionIds([session.id]);
      }
      let dragging = false;
      let previewVisible = false;
      let lastDropDateKey: string | null = null;
      e.stopPropagation();
      e.preventDefault();
      window.getSelection()?.removeAllRanges();

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
        const nextDropDateKey = monthDateFromPoint(
          moveEvent.clientX,
          moveEvent.clientY,
        );
        if (nextDropDateKey !== lastDropDateKey) {
          lastDropDateKey = nextDropDateKey;
          setDragPlaceholders(
            placeholdersForTarget(dragSources, nextDropDateKey),
          );
        }
        const grabX = originX - rect.left;
        const grabY = originY - rect.top;
        if (!previewVisible) {
          previewVisible = true;
          setDragPreview({
            session,
            student,
            x: moveEvent.clientX,
            y: moveEvent.clientY,
            width: rect.width,
            height: rect.height,
            grabX,
            grabY,
            variant: "chip",
          });
        }
        moveDragPreview(moveEvent.clientX, moveEvent.clientY, grabX, grabY);
        moveEvent.preventDefault();
      }

      async function onUp(upEvent: MouseEvent) {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setDragPreview(null);
        setDraggingSessionId(null);
        setDragPlaceholders([]);
        if (dragPreviewFrameRef.current !== null) {
          window.cancelAnimationFrame(dragPreviewFrameRef.current);
          dragPreviewFrameRef.current = null;
        }
        if (!dragging) return;

        const dateValue = monthDateFromPoint(upEvent.clientX, upEvent.clientY);
        if (!dateValue) return;

        const planned = buildSessionsAtTarget(dragSources, dateValue);

        try {
          await batchUpdateSessions(planned, queryClient, sessionActions);
        } catch (error) {
          console.error("[MonthView] session reschedule failed", error);
        }
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [
      canRescheduleSessions,
      moveDragPreview,
      queryClient,
      selectedSessionIds,
      sessionActions,
      sessions,
    ],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none">
      {(selectedSessionIds.length > 0 || copyBuffer) && (
        <div className="fixed bottom-[86px] left-3 z-[220] w-[192px] rounded-2xl border border-slate-200 bg-white/95 p-3 text-[11px] shadow-[0_16px_45px_rgba(15,23,42,.14)] backdrop-blur">
          <div className="font-extrabold text-slate-800">
            {copyBuffer
              ? `${copyBuffer.length}개 복사됨`
              : `${selectedSessionIds.length}개 선택됨`}
          </div>
          <div className="mt-1 leading-relaxed text-slate-500">
            {copyBuffer ? "날짜 위에서 Cmd/Ctrl+V" : "Cmd/Ctrl+C 복사"}
            <br />
            {selectedSessionIds.length > 0 && "Cmd/Ctrl+⌫ 삭제"}
            <br />
            Esc 취소
          </div>
          <button
            onClick={clearSelectionAndBuffer}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-50"
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
              className="flex h-full min-h-0 flex-shrink-0 flex-col border-b border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
                <div className="text-[14px] font-extrabold tracking-tight text-slate-900">
                  {month.getFullYear()}년 {month.getMonth() + 1}월
                </div>
              </div>

              <div
                className="grid min-h-0 flex-1 overflow-hidden"
                style={{
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gridTemplateRows: "repeat(6, minmax(0, 1fr))",
                }}
              >
                {cells.map(({ date, other }, i) => {
                  const tod = sameDay(date, primaryNow);
                  const keyForDate = dateKey(date);
                  const daySes = sessionsByDay.get(keyForDate) ?? [];
                  const placeholders = dragPlaceholders.filter(
                    (placeholder) => placeholder.dateKey === keyForDate,
                  );
                  const visibleSessionLimit = Math.max(
                    0,
                    MONTH_VISIBLE_ITEMS - placeholders.length,
                  );
                  const visibleSessions = daySes.slice(0, visibleSessionLimit);
                  const hiddenCount = Math.max(
                    0,
                    daySes.length - visibleSessionLimit,
                  );
                  return (
                    <div
                      key={`${key}-${i}`}
                      data-month-date={keyForDate}
                      onMouseEnter={() => setHoveredDateKey(keyForDate)}
                      onMouseLeave={() => {
                        setHoveredDateKey((current) =>
                          current === keyForDate ? null : current,
                        );
                      }}
                      onClick={() => handleCellClick(date)}
                      onMouseDown={(e) => {
                        if (e.shiftKey) {
                          e.preventDefault();
                          window.getSelection()?.removeAllRanges();
                        }
                      }}
                      className={`relative min-h-0 cursor-pointer overflow-hidden border-r border-b border-slate-100 p-2 transition-colors hover:bg-sky-50 select-none
                        ${other ? "bg-slate-50" : ""}
                        ${copyBuffer ? "hover:bg-emerald-50" : ""}
                        ${copyBuffer && hoveredDateKey === keyForDate ? "bg-emerald-50" : ""}
                        ${i % 7 === 6 ? "border-r-0" : ""}`}
                    >
                      <div className={`mb-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold
                        ${tod ? "bg-sky-500 text-white" : other ? "text-slate-300" : "text-slate-600"}`}>
                        {date.getDate()}
                      </div>

                      {placeholders.slice(0, MONTH_VISIBLE_ITEMS).map((placeholder) => (
                        <div
                          key={`placeholder-${placeholder.key}-${keyForDate}`}
                          className="pointer-events-none mb-0.5 h-[18px] rounded border-2 border-dashed border-sky-500 bg-sky-500/10"
                        />
                      ))}

                      {visibleSessions.map((s) => {
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
                              draggingSessionId === s.id ||
                              (draggingSessionId !== null &&
                                selectedSessionIds.length > 1 &&
                                selectedSessionIds.includes(draggingSessionId) &&
                                selectedSessionIds.includes(s.id))
                                ? "opacity-25"
                                : ""
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

                      {hiddenCount > 0 && (
                        <div className="cursor-pointer px-1 text-[10px] font-semibold text-sky-600 hover:underline">
                          +{hiddenCount}개
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <SessionDragPreview
        preview={dragPreview}
        primaryOffset={primaryOffset}
        previewRef={dragPreviewRef}
      />
    </div>
  );
}
