import type { TzEntry } from "@/types";

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
export const HOUR_HEIGHT_PX = 28; // pixels per hour in compact week/day view

// ── Timezone catalog ──────────────────────────────────────────────────────────
export const TZ_CATALOG: Omit<TzEntry, "on" | "primary">[] = [
  { id: "KST", name: "서울",   label: "KST", timeZone: "Asia/Seoul",       offset: 9,    display: "+09:00" },
  { id: "JST", name: "도쿄",   label: "JST", timeZone: "Asia/Tokyo",       offset: 9,    display: "+09:00" },
  { id: "CST", name: "베이징", label: "CST", timeZone: "Asia/Shanghai",    offset: 8,    display: "+08:00" },
  { id: "ICT", name: "방콕",   label: "ICT", timeZone: "Asia/Bangkok",     offset: 7,    display: "+07:00" },
  { id: "IST", name: "뭄바이", label: "IST", timeZone: "Asia/Kolkata",     offset: 5.5,  display: "+05:30" },
  { id: "UTC", name: "UTC",    label: "UTC", timeZone: "UTC",              offset: 0,    display: "+00:00" },
  { id: "LON", name: "런던",   label: "GMT", timeZone: "Europe/London",    offset: 0,    display: "+00:00" },
  { id: "CET", name: "파리",   label: "CET", timeZone: "Europe/Paris",     offset: 1,    display: "+01:00" },
  { id: "EST", name: "뉴욕",   label: "EST", timeZone: "America/New_York", offset: -5,   display: "-05:00" },
  { id: "CST2",name: "시카고", label: "CST", timeZone: "America/Chicago",  offset: -6,   display: "-06:00" },
  { id: "MST", name: "덴버",   label: "MST", timeZone: "America/Denver",   offset: -7,   display: "-07:00" },
  { id: "PST", name: "LA",     label: "PST", timeZone: "America/Los_Angeles", offset: -8, display: "-08:00" },
];
