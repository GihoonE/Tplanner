"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { SessionBlock } from "./SessionBlock";
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
import {
  extraHourLabel,
  formatFullDate,
  getPrimaryOffset,
  primaryMinToKst,
  sessionsForDay,
  snapTo15,
  topPxForDate,
  topPxForWallClockDate,
  heightPxForDuration,
  visibleSlice,
  wallClockDateInTimeZone,
  sessionStatusInPrimaryTimezone,
} from "@/lib/utils";
import { HOUR_HEIGHT_PX } from "@/lib/constants";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_MINUTES = 24 * 60;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function startFromPrimaryMinute(
  date: Date,
  primaryMin: number,
  primaryOffset: number,
) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(primaryMin - (primaryOffset - 9) * 60);
  return start;
}

type DropPreviewBlock = {
  key: string;
  top: number;
  height: number;
};

export function DayView({
  onCreateRange,
  canRescheduleSessions = false,
}: {
  onCreateRange?: (range: { start: Date; end: Date }) => void;
  canRescheduleSessions?: boolean;
}) {
  const queryClient = useQueryClient();
  const sessions = useSessions();
  const tzData = useTzData();
  const now = useNow();
  const students = useTutorStore((s) => s.students);
  const curDay = useTutorStore((s) => s.curDay);
  const openModal = useTutorStore((s) => s.openModal);
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
  const [hourHeightPx, setHourHeightPx] = useState(HOUR_HEIGHT_PX);
  const [hoverTopPx, setHoverTopPx] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragPreviewFrameRef = useRef<number | null>(null);
  const dragPreviewPositionRef = useRef({
    x: 0,
    y: 0,
    grabX: 0,
    grabY: 0,
  });
  const creating = useRef<{ sMin: number; eMin: number } | null>(null);
  const suppressSessionClickRef = useRef(false);
  const [dragPreview, setDragPreview] =
    useState<SessionDragPreviewState | null>(null);
  const [draggingSessionId, setDraggingSessionId] = useState<number | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [copyBuffer, setCopyBuffer] = useState<typeof sessions | null>(null);
  const [hoverPasteStartMin, setHoverPasteStartMin] = useState<number | null>(null);
  const [dropPreviewBlocks, setDropPreviewBlocks] = useState<DropPreviewBlock[]>([]);

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
  const isToday =
    curDay.getFullYear() === primaryNow.getFullYear() &&
    curDay.getMonth() === primaryNow.getMonth() &&
    curDay.getDate() === primaryNow.getDate();
  const nowTop = topPxForWallClockDate(primaryNow, hourHeightPx);
  const gridHeightPx = hourHeightPx * 24;

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
    targetStartMin: number,
  ) {
    const sorted = [...sources].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    const anchor = sorted[0];
    if (!anchor) return [];
    const targetStart = startFromPrimaryMinute(
      curDay,
      targetStartMin,
      primaryOffset,
    );

    return sorted.map((source) => {
      const start = new Date(
        targetStart.getTime() + source.start.getTime() - anchor.start.getTime(),
      );
      const end = new Date(start.getTime() + source.end.getTime() - source.start.getTime());
      return { source, start, end };
    });
  }

  function previewBlocksForTarget(
    sources: typeof sessions,
    targetStartMin: number | null,
  ): DropPreviewBlock[] {
    if (targetStartMin === null) return [];
    return buildSessionsAtTarget(sources, targetStartMin)
      .map(({ source, start, end }) => {
        const slice = visibleSlice({ start, end }, curDay);
        if (!slice) return null;
        return {
          key: String(source.id),
          top: topPxForDate(slice.visStart, primaryOffset, hourHeightPx),
          height: Math.max(
            20,
            heightPxForDuration(
              slice.visStart.getTime(),
              slice.visEnd.getTime(),
              hourHeightPx,
            ),
          ),
        };
      })
      .filter((block): block is DropPreviewBlock => Boolean(block));
  }

  async function pasteCopiedSessions() {
    if (!copyBuffer || copyBuffer.length === 0 || hoverPasteStartMin === null) {
      return;
    }
    try {
      const planned = buildSessionsAtTarget(copyBuffer, hoverPasteStartMin);
      const created = await batchCreateSessions(
        planned.map(({ source, start, end }) =>
          cloneSessionDraft(source, start, end),
        ),
        queryClient,
        sessionActions,
      );
      setSelectedSessionIds(created.map((session) => session.id));
    } catch (error) {
      console.error("[DayView] paste copied sessions failed", error);
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
      console.error("[DayView] delete selected sessions failed", error);
    }
  }

  function copySelectedSessions() {
    const selected = sortedSelectedSessions();
    if (selected.length < 2) return;
    setCopyBuffer(selected);
  }

  function clearSelectionAndBuffer() {
    setCopyBuffer(null);
    setSelectedSessionIds([]);
    setHoverPasteStartMin(null);
    setDropPreviewBlocks([]);
  }

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

  const onGridMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const top = Math.max(0, Math.min(gridHeightPx, e.clientY - rect.top));
    const startMin = Math.max(
      0,
      Math.min(
        DAY_MINUTES - 15,
        snapTo15(Math.floor(top / (hourHeightPx / 60))),
      ),
    );
    setHoverTopPx(top);
    setHoverPasteStartMin(startMin);
  }, [gridHeightPx, hourHeightPx]);

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
        if (!copyBuffer || hoverPasteStartMin === null) return;
        e.preventDefault();
        void pasteCopiedSessions();
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
      e: React.MouseEvent,
      session: (typeof sessions)[number],
      student: ReturnType<typeof studentsById.get>,
    ) => {
      if (!canRescheduleSessions || e.button !== 0) {
        e.stopPropagation();
        return;
      }
      if (!gridRef.current || !ghostRef.current) return;

      const rect = (e.currentTarget as Element).getBoundingClientRect();
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
      let startMin: number | null = null;
      let lastDropKey: string | null = null;
      e.stopPropagation();
      e.preventDefault();
      window.getSelection()?.removeAllRanges();

      function updateDrop(moveEvent: MouseEvent) {
        if (!gridRef.current) return;
        const rect = gridRef.current.getBoundingClientRect();
        const relY = moveEvent.clientY - rect.top;
        startMin = Math.max(
          0,
          Math.min(
            DAY_MINUTES - 15,
            snapTo15(Math.floor(relY / (hourHeightPx / 60))),
          ),
        );
        const nextDropKey = String(startMin);
        if (nextDropKey !== lastDropKey) {
          lastDropKey = nextDropKey;
          setDropPreviewBlocks(previewBlocksForTarget(dragSources, startMin));
        }
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
        if (isGroupDrag) {
          setSelectedSessionIds(dragSources.map((item) => item.id));
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
            variant: "block",
          });
        }
        moveDragPreview(moveEvent.clientX, moveEvent.clientY, grabX, grabY);
        moveEvent.preventDefault();
        updateDrop(moveEvent);
      }

      async function onUp(upEvent: MouseEvent) {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        setDropPreviewBlocks([]);
        setDragPreview(null);
        setDraggingSessionId(null);
        if (dragPreviewFrameRef.current !== null) {
          window.cancelAnimationFrame(dragPreviewFrameRef.current);
          dragPreviewFrameRef.current = null;
        }
        if (!dragging) return;
        updateDrop(upEvent);
        setDropPreviewBlocks([]);
        if (startMin === null) return;

        const planned = buildSessionsAtTarget(dragSources, startMin);

        try {
          await batchUpdateSessions(planned, queryClient, sessionActions);
        } catch (error) {
          console.error("[DayView] session reschedule failed", error);
        }
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [
      canRescheduleSessions,
      curDay,
      hourHeightPx,
      primaryOffset,
      queryClient,
      selectedSessionIds,
      sessionActions,
      sessions,
      moveDragPreview,
    ],
  );

  function handleSessionClick(
    e: React.MouseEvent,
    session: (typeof sessions)[number],
  ) {
    e.stopPropagation();
    if (suppressSessionClickRef.current) {
      suppressSessionClickRef.current = false;
      return;
    }

    if (e.shiftKey) {
      e.preventDefault();
      setCopyBuffer(null);
      setSelectedSessionIds((currentIds) =>
        currentIds.includes(session.id)
          ? currentIds.filter((id) => id !== session.id)
          : [...currentIds, session.id],
      );
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

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ "--hour-h": `${hourHeightPx}px` } as React.CSSProperties}
    >
      {(selectedSessionIds.length > 0 || copyBuffer) && (
        <div className="fixed bottom-[86px] left-3 z-[220] w-[192px] rounded-2xl border border-slate-200 bg-white/95 p-3 text-[11px] shadow-[0_16px_45px_rgba(15,23,42,.14)] backdrop-blur">
          <div className="font-extrabold text-slate-800">
            {copyBuffer
              ? `${copyBuffer.length}개 복사됨`
              : `${selectedSessionIds.length}개 선택됨`}
          </div>
          <div className="mt-1 leading-relaxed text-slate-500">
            {copyBuffer ? "시간 위에서 Cmd/Ctrl+V" : "Cmd/Ctrl+C 복사"}
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
          onMouseMove={onGridMouseMove}
          onMouseLeave={() => {
            setHoverTopPx(null);
            setHoverPasteStartMin(null);
          }}
          onMouseDown={onGridMouseDown}
          className="relative min-w-0 flex-1 overflow-hidden bg-white select-none"
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
            const groupDragging =
              draggingSessionId !== null &&
              selectedSessionIds.length > 1 &&
              selectedSessionIds.includes(draggingSessionId) &&
              selectedSessionIds.includes(session.id);
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
                isDragging={draggingSessionId === session.id || groupDragging}
                isSelected={selectedSessionIds.includes(session.id)}
                onClick={(e) => handleSessionClick(e, session)}
                onMouseDown={(e) => {
                  handleSessionMouseDown(e, session, student);
                }}
                onResizeMouseDown={(e) => {
                  e.stopPropagation();
                }}
              />
            );
          })}

          {isToday && <div className="now-line" style={{ top: nowTop }} />}
          {hoverTopPx !== null && (
            <div className="time-hover-line" style={{ top: hoverTopPx }} />
          )}
          {dropPreviewBlocks.map((block) => (
            <div
              key={block.key}
              className="pointer-events-none absolute left-[3px] right-[3px] rounded-lg border-2 border-dashed border-sky-500 bg-sky-500/10"
              style={{
                top: block.top,
                height: block.height,
              }}
            />
          ))}

          <div ref={ghostRef} className="drag-ghost" style={{ position: "absolute" }} />
          <SessionDragPreview
            preview={dragPreview}
            primaryOffset={primaryOffset}
            previewRef={dragPreviewRef}
          />

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
