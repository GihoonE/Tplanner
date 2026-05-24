import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TzEntry } from "@/types";
import { DAYS_KO, HOUR_HEIGHT_PX } from "./constants";

// ── Tailwind class helper ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function getWeekStart(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

export function formatDow(d: Date): string {
  return DAYS_KO[d.getDay()];
}

export function formatMonthDay(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatFullDate(d: Date): string {
  return `${formatMonthDay(d)} ${formatDow(d)}요일`;
}

// ── Timezone-aware helpers ────────────────────────────────────────────────────
/**
 * Sessions are stored as KST wall-clock Dates (getHours() === KST hour).
 * primaryOffset is tzData[0].offset (e.g. 9 for KST, -5 for EST).
 *
 * To convert KST wall-clock → primary TZ display minutes:
 *   primaryMin = kstMin + (primaryOffset - 9) * 60
 */
export function getPrimaryOffset(tzData: TzEntry[]): number {
  return tzData[0]?.offset ?? 9;
}

/** Minutes from midnight in the PRIMARY timezone */
export function minFromMidPrimary(d: Date, primaryOffset: number): number {
  const kstMin = d.getHours() * 60 + d.getMinutes();
  return kstMin + (primaryOffset - 9) * 60;
}

/** Format a Date as HH:MM in the PRIMARY timezone */
export function fmtTz(d: Date, primaryOffset: number): string {
  const raw = minFromMidPrimary(d, primaryOffset);
  const norm = ((raw % 1440) + 1440) % 1440;
  return (
    String(Math.floor(norm / 60)).padStart(2, "0") +
    ":" +
    String(norm % 60).padStart(2, "0")
  );
}

/** 수업 길이를 소수 한 자리 시간 문자열로 (예: 1.5, 1.0) */
export function formatSessionDurationHours(start: Date, end: Date): string {
  const raw = (end.getTime() - start.getTime()) / 3600000;
  if (!Number.isFinite(raw) || raw <= 0) return "0.0";
  return (Math.round(raw * 10) / 10).toFixed(1);
}

/** Hour labels for an extra TZ column, relative to primary */
export function extraHourLabel(h: number, extraOffset: number, primaryOffset: number): number {
  return ((h + extraOffset - primaryOffset) % 24 + 24) % 24;
}

/** Current time string in an arbitrary UTC offset (relative to KST storage) */
export function nowInTz(now: Date, offset: number): string {
  const shiftMin = (offset - 9) * 60;
  const raw = now.getHours() * 60 + now.getMinutes() + shiftMin;
  const norm = ((raw % 1440) + 1440) % 1440;
  return (
    String(Math.floor(norm / 60)).padStart(2, "0") +
    ":" +
    String(norm % 60).padStart(2, "0")
  );
}

/** Convert primary-TZ display minutes back to KST wall-clock hours/minutes */
export function primaryMinToKst(
  primaryMin: number,
  primaryOffset: number
): { h: number; m: number } {
  const kstRaw = primaryMin - (primaryOffset - 9) * 60;
  const kstNorm = ((kstRaw % 1440) + 1440) % 1440;
  return { h: Math.floor(kstNorm / 60), m: kstNorm % 60 };
}

// ── Calendar pixel helpers ────────────────────────────────────────────────────
export function topPxForDate(
  d: Date,
  primaryOffset: number,
  hourHeightPx = HOUR_HEIGHT_PX,
): number {
  return minFromMidPrimary(d, primaryOffset) * (hourHeightPx / 60);
}

export function heightPxForDuration(
  startMs: number,
  endMs: number,
  hourHeightPx = HOUR_HEIGHT_PX,
): number {
  const durMin = (endMs - startMs) / 60000;
  return Math.max(durMin * (hourHeightPx / 60), 24);
}

// ── Session helpers ───────────────────────────────────────────────────────────
export function sessionStatus(
  session: { start: Date; end: Date },
  now: Date
): "upcoming" | "ongoing" | "completed" {
  if (now >= session.end) return "completed";
  if (now >= session.start) return "ongoing";
  return "upcoming";
}

/** Sessions visible in a calendar column date (includes cross-midnight overflows) */
export function sessionsForDay<T extends { start: Date; end: Date }>(
  sessions: T[],
  date: Date
): T[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return sessions.filter((s) => s.start <= dayEnd && s.end > dayStart);
}

/** Clamp a session's visible slice to a calendar column's day */
export function visibleSlice(
  session: { start: Date; end: Date },
  colDate: Date
): { visStart: Date; visEnd: Date; fromPrev: boolean; toNext: boolean } | null {
  const dayStart = new Date(colDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(colDate);
  dayEnd.setHours(23, 59, 59, 999);

  const visStart = session.start < dayStart ? dayStart : session.start;
  const visEnd   = session.end   > dayEnd   ? dayEnd   : session.end;

  if (visStart >= visEnd) return null;

  return {
    visStart,
    visEnd,
    fromPrev: session.start < dayStart,
    toNext:   session.end   > dayEnd,
  };
}

// ── Number helpers ────────────────────────────────────────────────────────────
export function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
