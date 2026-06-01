"use client";

import { useMemo } from "react";
import { visibleSlice, topPxForDate, heightPxForDuration, fmtTz } from "@/lib/utils";
import { resolveAvatarBg } from "@/lib/studentColor";
import type { Session, Student } from "@/types";

interface SessionBlockProps {
  session: Session;
  student: Student | undefined;
  colDate: Date;
  primaryOffset: number;
  isPast: boolean;
  isNow: boolean;
  hourHeightPx?: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}

const STRIPE = "repeating-linear-gradient(90deg,currentColor 0,currentColor 3px,transparent 3px,transparent 7px)";

export function SessionBlock({
  session,
  student,
  colDate,
  primaryOffset,
  isPast,
  isNow,
  hourHeightPx,
  onMouseDown,
  onResizeMouseDown,
  onClick,
  isDragging = false,
}: SessionBlockProps) {
  const slice = useMemo(() => visibleSlice(session, colDate), [session, colDate]);
  if (!slice) return null;

  const { visStart, visEnd, fromPrev, toNext } = slice;

  const topPx = topPxForDate(visStart, primaryOffset, hourHeightPx);
  const hPx   = Math.max(
    heightPxForDuration(visStart.getTime(), visEnd.getTime(), hourHeightPx),
    20,
  );

  const surface = student
    ? {
        background: resolveAvatarBg(student.color),
        color: "#fff",
        border: "1px solid rgba(255,255,255,.55)",
      }
    : null;
  const r = `${fromPrev ? "3px" : "8px"} ${fromPrev ? "3px" : "8px"} ${toNext ? "3px" : "8px"} ${toNext ? "3px" : "8px"}`;

  return (
    <div
      className={`session-block absolute left-[3px] right-[3px] overflow-hidden cursor-pointer transition-[box-shadow,transform,opacity,filter] z-[2] hover:z-[9] hover:-translate-y-0.5 hover:brightness-105 hover:ring-2 hover:ring-white/75 ${student ? "" : "session-new"} ${isDragging ? "opacity-25" : ""}`}
      style={{
        top:          topPx,
        height:       hPx,
        borderRadius: r,
        opacity:      isDragging ? 0.25 : isPast ? 0.45 : 1,
        boxShadow:    isNow ? "0 0 0 2px #164b7a, 0 0 0 4px rgba(16,67,109,.2)" : undefined,
        ...(surface ?? {}),
      }}
      data-id={session.id}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Overflow stripe — top */}
      {fromPrev && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: STRIPE, opacity: .45, borderRadius: "3px 3px 0 0" }} />
      )}

      {/* Content */}
      <div className="px-2 pt-1 pb-1 relative">
        {fromPrev && <div className="text-[9px] font-bold opacity-75 mb-0.5">↑ {fmtTz(session.start, primaryOffset)} 시작</div>}
        <div className="truncate text-[11px] font-extrabold leading-tight drop-shadow-sm">
          {fmtTz(session.start, primaryOffset)} ~ {fmtTz(session.end, primaryOffset)} {student?.name ?? "수업"}
        </div>
        {hPx > 40 && student && (
          <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight opacity-85">
            {student.subject}
          </div>
        )}
        {toNext   && <div className="text-[9px] font-bold opacity-75 mt-0.5">↓ {fmtTz(session.end, primaryOffset)} 종료 (익일)</div>}
        {session.notes && (
          <span className="absolute top-1 right-[7px] text-[10px] opacity-70">✏</span>
        )}
      </div>

      {/* Overflow stripe — bottom */}
      {toNext && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: STRIPE, opacity: .45, borderRadius: "0 0 3px 3px" }} />
      )}

      {/* Resize handle */}
      {!toNext && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center"
          onMouseDown={onResizeMouseDown}
        >
          <div className="w-[18px] h-[2px] rounded-full bg-current opacity-35" />
        </div>
      )}
    </div>
  );
}
