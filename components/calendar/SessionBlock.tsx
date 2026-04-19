"use client";

import { useMemo } from "react";
import { useTutorStore } from "@/store";
import { visibleSlice, topPxForDate, heightPxForDuration, fmtTz } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { HOUR_HEIGHT_PX } from "@/lib/constants";
import { resolveSessionSurfaceStyle } from "@/lib/studentColor";
import type { Session, Student } from "@/types";

interface SessionBlockProps {
  session: Session;
  student: Student | undefined;
  colDate: Date;
  primaryOffset: number;
  isPast: boolean;
  isNow: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

const STRIPE = "repeating-linear-gradient(90deg,currentColor 0,currentColor 3px,transparent 3px,transparent 7px)";

export function SessionBlock({
  session,
  student,
  colDate,
  primaryOffset,
  isPast,
  isNow,
  onMouseDown,
  onResizeMouseDown,
  onClick,
}: SessionBlockProps) {
  const slice = useMemo(() => visibleSlice(session, colDate), [session, colDate]);
  if (!slice) return null;

  const { visStart, visEnd, fromPrev, toNext } = slice;

  const topPx = topPxForDate(visStart, primaryOffset);
  const hPx   = Math.max(heightPxForDuration(visStart.getTime(), visEnd.getTime()), 24);

  const surface = student ? resolveSessionSurfaceStyle(student.color) : null;
  const r = `${fromPrev ? "3px" : "8px"} ${fromPrev ? "3px" : "8px"} ${toNext ? "3px" : "8px"} ${toNext ? "3px" : "8px"}`;

  return (
    <div
      className={`absolute left-[3px] right-[3px] overflow-hidden cursor-pointer transition-[box-shadow,transform,opacity] z-[2] hover:z-[5] ${student ? "" : "session-new"}`}
      style={{
        top:          topPx,
        height:       hPx,
        borderRadius: r,
        opacity:      isPast ? 0.45 : 1,
        boxShadow:    isNow ? "0 0 0 2px #0ea5e9, 0 0 0 4px rgba(14,165,233,.2)" : undefined,
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
      <div className="px-2 pt-[5px] pb-1 relative">
        {fromPrev && <div className="text-[9px] font-bold opacity-65 mb-0.5">↑ {fmtTz(session.start, primaryOffset)} 시작</div>}
        {student && <div className="text-[9px] font-bold uppercase tracking-wide opacity-70 leading-none">{student.subject}</div>}
        {hPx > 34 && student && <div className="text-[12px] font-bold mt-0.5 leading-tight">{student.name}</div>}
        {hPx > 52 && <div className="text-[10px] font-medium mt-0.5 opacity-75">{fmtTz(session.start, primaryOffset)}–{fmtTz(session.end, primaryOffset)}</div>}
        {toNext   && <div className="text-[9px] font-bold opacity-65 mt-0.5">↓ {fmtTz(session.end, primaryOffset)} 종료 (익일)</div>}
        {session.notes && (
          <span className="absolute top-[5px] right-[7px] text-[10px] opacity-70">✏</span>
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
