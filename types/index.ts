// ─────────────────────────────────────────
//  Core domain types for TutorDesk
// ─────────────────────────────────────────

export const STUDENT_PRESET_COLORS = [
  "s-blue",
  "s-teal",
  "s-purple",
  "s-amber",
  "s-green",
  "s-coral",
] as const;

export type SubjectColor = (typeof STUDENT_PRESET_COLORS)[number];

/** 프리셋 키(s-*) 또는 커스텀 #rrggbb */
export type StudentColor = string;

export type Understanding = "good" | "normal" | "hard" | "";
export type Focus = "high" | "normal" | "low" | "";
export type SessionStatus = "upcoming" | "ongoing" | "completed";
export type ReportStatus = "draft" | "sent";
export type StudentStatus = "active" | "inactive";

export interface SessionEditorAnchor {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ── Student ──────────────────────────────
export interface Student {
  id: number;
  name: string;
  subject: string;
  grade: string; // e.g. "고2"
  school: string;
  color: StudentColor;
  avatarChar: string; // Single Korean character for avatar
  status: StudentStatus;
  startDate: string; // "2024-09"
  totalSessions: number;
  hwCompletionRate: number; // 0–100
  /** API에서만 반환: 최근 수업 날짜 (ISO string) */
  lastSessionAt?: string | null;
  /** API에서만 반환: 이번 달 수업 수 */
  thisMonthSessionCount?: number;
  lastSessionContent?: string | null;
  parents?: {
    id: string;
    name: string | null;
    email: string | null;
    linkedAt: string;
  }[];
  instructor?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

// ── Homework item ─────────────────────────
export interface HomeworkItem {
  id: number;
  text: string;
  done: boolean;
}

// ── Session (수업) ────────────────────────
export interface Session {
  id: number;
  studentId: number | null; // null = newly created, not yet confirmed
  start: Date;
  end: Date;
  place: string;
  notes: string;
  understanding: Understanding;
  focus: Focus;
  homework: HomeworkItem[];
  version: number;
}

// ── Report ───────────────────────────────
export interface Report {
  id: number;
  studentId: number;
  title: string;
  status: ReportStatus;
  periodStart: string | null;
  periodEnd: string | null;
  summary: string;
  strengths: string;
  improvements: string;
  nextPlan: string;
  sessionIds: number[];
  createdAt: string;
  updatedAt: string;
}

// ── Timezone entry ────────────────────────
export interface TzEntry {
  id: string; // "KST"
  name: string; // "서울"
  label: string; // "KST"
  timeZone: string; // "Asia/Seoul"
  offset: number; // UTC offset in hours (e.g. 9, -5)
  display: string; // "+09:00"
  on: boolean;
  primary: boolean;
}

// ── Calendar view ─────────────────────────
export type CalendarView = "week" | "month" | "day";

// ── Modal tabs ────────────────────────────
export type SessionModalTab = "detail" | "record" | "new";

// ── Shared preference types ───────────────
export type ExtraTimezonePreference = { timeZone: string; on: boolean };
export type SessionSaveState = "idle" | "saving" | "error" | "offline";
