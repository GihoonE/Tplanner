"use client";

import type { Ref } from "react";
import { fmtTz } from "@/lib/utils";
import { resolveAvatarBg } from "@/lib/studentColor";
import type { Session, Student } from "@/types";

export type SessionDragPreviewState = {
  session: Session;
  student: Student | undefined;
  x: number;
  y: number;
  width: number;
  height: number;
  grabX: number;
  grabY: number;
  variant: "chip" | "block";
};

export function SessionDragPreview({
  preview,
  primaryOffset,
  previewRef,
}: {
  preview: SessionDragPreviewState | null;
  primaryOffset: number;
  previewRef?: Ref<HTMLDivElement>;
}) {
  if (!preview) return null;

  const { session, student } = preview;
  const surface = {
    background: resolveAvatarBg(student?.color ?? "s-blue"),
    color: "#fff",
    border: "1px solid rgba(255,255,255,.65)",
  };

  if (preview.variant === "chip") {
    return (
      <div
        ref={previewRef}
        className="pointer-events-none fixed z-[260] truncate rounded px-1.5 py-0.5 text-[10px] font-bold shadow-xl"
        style={{
          ...surface,
          left: 0,
          top: 0,
          transform: `translate3d(${preview.x - preview.grabX}px, ${preview.y - preview.grabY}px, 0)`,
          width: preview.width,
          height: preview.height,
        }}
      >
        {fmtTz(session.start, primaryOffset)} {student?.name ?? "수업"}
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className="pointer-events-none fixed z-[260] overflow-hidden rounded-lg px-2 py-1 shadow-2xl ring-2 ring-white/75"
      style={{
        ...surface,
        left: 0,
        top: 0,
        transform: `translate3d(${preview.x - preview.grabX}px, ${preview.y - preview.grabY}px, 0)`,
        width: preview.width,
        height: preview.height,
      }}
    >
      <div className="truncate text-[11px] font-extrabold leading-tight drop-shadow-sm">
        {fmtTz(session.start, primaryOffset)} ~ {fmtTz(session.end, primaryOffset)}{" "}
        {student?.name ?? "수업"}
      </div>
      {preview.height > 40 && student && (
        <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight opacity-85">
          {student.subject}
        </div>
      )}
      {session.notes && (
        <span className="absolute right-[7px] top-1 text-[10px] opacity-70">
          ✏
        </span>
      )}
    </div>
  );
}
