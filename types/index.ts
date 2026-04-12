// ─────────────────────────────────────────
//  Core domain types for TutorDesk
// ─────────────────────────────────────────

export type SubjectColor =
  | "s-blue"
  | "s-teal"
  | "s-purple"
  | "s-amber"
  | "s-green"
  | "s-coral";

export type Understanding = "good" | "normal" | "hard" | "";
export type Focus = "high" | "normal" | "low" | "";
export type SessionStatus = "upcoming" | "ongoing" | "completed";
export type ReportStatus = "draft" | "sent";
export type StudentStatus = "active" | "warning" | "inactive";

// ── Student ──────────────────────────────
export interface Student {
  id: number;
  name: string;
  subject: string;
  grade: string; // e.g. "고2"
  school: string;
  color: SubjectColor;
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
}

// ── Report ───────────────────────────────
export interface Report {
  id: number;
  studentId: number;
  month: string; // "2025-03"
  status: ReportStatus;
  score: number; // 0–100
  summary: string;
  strengths: string;
  improvements: string;
  nextPlan: string;
  createdAt: Date;
}

// ── Timezone entry ────────────────────────
export interface TzEntry {
  id: string; // "KST"
  name: string; // "서울"
  label: string; // "KST"
  offset: number; // UTC offset in hours (e.g. 9, -5)
  display: string; // "+09:00"
  on: boolean;
  primary: boolean;
}

// ── Calendar view ─────────────────────────
export type CalendarView = "week" | "month" | "day";

// ── Modal tabs ────────────────────────────
export type SessionModalTab = "detail" | "record" | "new";
