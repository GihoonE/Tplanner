import type { Student, Session, TzEntry } from "@/types";

// ── Color maps ────────────────────────────────────────────────────────────────
export const COLOR_TOP: Record<string, string> = {
  "s-blue":   "#93c5fd",
  "s-teal":   "#5eead4",
  "s-purple": "#c4b5fd",
  "s-amber":  "#fde68a",
  "s-green":  "#86efac",
  "s-coral":  "#fda4af",
};

export const COLOR_TEXT: Record<string, string> = {
  "s-blue":   "#1e40af",
  "s-teal":   "#0f766e",
  "s-purple": "#6b21a8",
  "s-amber":  "#92400e",
  "s-green":  "#14532d",
  "s-coral":  "#9f1239",
};

export const AVATAR_BG: Record<string, string> = {
  "s-blue":   "linear-gradient(135deg,#38bdf8,#0ea5e9)",
  "s-teal":   "linear-gradient(135deg,#5eead4,#0d9488)",
  "s-purple": "linear-gradient(135deg,#c4b5fd,#9333ea)",
  "s-amber":  "linear-gradient(135deg,#fde68a,#f59e0b)",
  "s-green":  "linear-gradient(135deg,#86efac,#16a34a)",
  "s-coral":  "linear-gradient(135deg,#fda4af,#e11d48)",
};

// CSS class strings for session blocks (Tailwind-compatible inline styles)
export const SESSION_BLOCK_STYLE: Record<string, string> = {
  "s-blue":   "background:linear-gradient(160deg,#bae6fd,#93c5fd);color:#1e40af;border:1px solid #93c5fd",
  "s-teal":   "background:linear-gradient(160deg,#99f6e4,#5eead4);color:#0f766e;border:1px solid #5eead4",
  "s-purple": "background:linear-gradient(160deg,#e9d5ff,#c4b5fd);color:#6b21a8;border:1px solid #c4b5fd",
  "s-amber":  "background:linear-gradient(160deg,#fef3c7,#fde68a);color:#92400e;border:1px solid #fde68a",
  "s-green":  "background:linear-gradient(160deg,#bbf7d0,#86efac);color:#14532d;border:1px solid #86efac",
  "s-coral":  "background:linear-gradient(160deg,#fecdd3,#fda4af);color:#9f1239;border:1px solid #fda4af",
};

// ── Calendar ──────────────────────────────────────────────────────────────────
export const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
export const HOUR_HEIGHT_PX = 56; // pixels per hour in week/day view

// ── Timezone catalog ──────────────────────────────────────────────────────────
export const TZ_CATALOG: Omit<TzEntry, "on" | "primary">[] = [
  { id: "KST", name: "서울",   label: "KST", offset: 9,    display: "+09:00" },
  { id: "JST", name: "도쿄",   label: "JST", offset: 9,    display: "+09:00" },
  { id: "CST", name: "베이징", label: "CST", offset: 8,    display: "+08:00" },
  { id: "ICT", name: "방콕",   label: "ICT", offset: 7,    display: "+07:00" },
  { id: "IST", name: "뭄바이", label: "IST", offset: 5.5,  display: "+05:30" },
  { id: "UTC", name: "UTC",    label: "UTC", offset: 0,    display: "+00:00" },
  { id: "LON", name: "런던",   label: "GMT", offset: 0,    display: "+00:00" },
  { id: "CET", name: "파리",   label: "CET", offset: 1,    display: "+01:00" },
  { id: "EST", name: "뉴욕",   label: "EST", offset: -5,   display: "-05:00" },
  { id: "CST2",name: "시카고", label: "CST", offset: -6,   display: "-06:00" },
  { id: "MST", name: "덴버",   label: "MST", offset: -7,   display: "-07:00" },
  { id: "PST", name: "LA",     label: "PST", offset: -8,   display: "-08:00" },
];

// ── Seed data helpers ─────────────────────────────────────────────────────────
const BASE = new Date(2025, 2, 20); // March 20 2025

function ds(base: Date, offsetDays: number, h: number, m = 0): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(h, m, 0, 0);
  return d;
}

export const SEED_STUDENTS: Student[] = [
  { id: 1, name: "박민준", subject: "수학", grade: "고2", school: "한국고등학교",  color: "s-blue",   avatarChar: "박", status: "active",   startDate: "2024-09", totalSessions: 42, hwCompletionRate: 78 },
  { id: 2, name: "이서연", subject: "영어", grade: "고1", school: "서울중학교",    color: "s-teal",   avatarChar: "이", status: "active",   startDate: "2025-01", totalSessions: 18, hwCompletionRate: 92 },
  { id: 3, name: "최예린", subject: "물리", grade: "중3", school: "강남중학교",    color: "s-purple", avatarChar: "최", status: "warning",  startDate: "2024-11", totalSessions: 24, hwCompletionRate: 55 },
  { id: 4, name: "정하윤", subject: "수학", grade: "고3", school: "대치고등학교",  color: "s-amber",  avatarChar: "정", status: "active",   startDate: "2024-08", totalSessions: 56, hwCompletionRate: 88 },
  { id: 5, name: "김도현", subject: "영어", grade: "중2", school: "목동중학교",    color: "s-green",  avatarChar: "김", status: "inactive", startDate: "2024-12", totalSessions: 12, hwCompletionRate: 60 },
];

export const SEED_SESSIONS: Session[] = [
  {
    id: 1, studentId: 1,
    start: ds(BASE, 0, 9), end: ds(BASE, 0, 11),
    place: "강남구 자택",
    notes: "극한 ε-δ 정의 그래프로 시각화. 연습문제 5개 중 4개 정답.",
    understanding: "good", focus: "high",
    homework: [
      { id: 1, text: "수학 교재 p.56-60", done: false },
      { id: 2, text: "연속함수 정리",       done: true  },
    ],
  },
  {
    id: 2, studentId: 2,
    start: ds(BASE, 0, 14), end: ds(BASE, 0, 15, 30),
    place: "온라인 Zoom",
    notes: "독해 실전 문제 3세트 풀이. 어휘 실수 줄어들고 있음.",
    understanding: "good", focus: "high",
    homework: [{ id: 3, text: "어휘 50개 암기", done: false }],
  },
  {
    id: 3, studentId: 3,
    start: ds(BASE, 0, 17), end: ds(BASE, 0, 18),
    place: "강남구 자택",
    notes: "", understanding: "normal", focus: "normal", homework: [],
  },
  {
    id: 4, studentId: 4,
    start: ds(BASE, -1, 10), end: ds(BASE, -1, 12),
    place: "목동 학원",
    notes: "수열 심화 — 등차수열 완벽 이해, 등비수열 연습 필요.",
    understanding: "good", focus: "high",
    homework: [{ id: 4, text: "등비수열 문제 10개", done: false }],
  },
  {
    id: 5, studentId: 1,
    start: ds(BASE, -1, 15), end: ds(BASE, -1, 17),
    place: "온라인",
    notes: "미적분 복습.", understanding: "normal", focus: "normal", homework: [],
  },
  {
    id: 6, studentId: 5,
    start: ds(BASE, 1, 11), end: ds(BASE, 1, 13),
    place: "강남구 자택",
    notes: "", understanding: "", focus: "", homework: [],
  },
  {
    id: 7, studentId: 2,
    start: ds(BASE, 2, 14), end: ds(BASE, 2, 15, 30),
    place: "온라인",
    notes: "", understanding: "", focus: "", homework: [],
  },
  {
    // Cross-midnight session: Wed 23:00 → Thu 01:30
    id: 8, studentId: 3,
    start: ds(BASE, 2, 23, 0), end: ds(BASE, 3, 1, 30),
    place: "온라인 Zoom",
    notes: "자정 넘어가는 심화 수업.",
    understanding: "good", focus: "high",
    homework: [{ id: 8, text: "물리 교재 p.88 정리", done: false }],
  },
];
