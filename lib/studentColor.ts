import { AVATAR_BG, COLOR_TEXT, COLOR_TOP } from "@/lib/constants";
import type { SubjectColor } from "@/types";
import { STUDENT_PRESET_COLORS } from "@/types";

const PRESET = new Set<string>(STUDENT_PRESET_COLORS);

export function isPresetStudentColor(c: string): c is SubjectColor {
  return PRESET.has(c);
}

/** 저장/API용: # + 소문자 6 hex */
export function normalizeStudentHex(raw: string): string | null {
  const t = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return null;
}

export function isHexStudentColor(c: string): boolean {
  return normalizeStudentHex(c) != null;
}

export function isValidStudentColor(c: unknown): c is string {
  if (typeof c !== "string" || !c.trim()) return false;
  const t = c.trim();
  return isPresetStudentColor(t) || isHexStudentColor(t);
}

/** API/DB 저장용: hex는 정규화, 프리셋은 trim */
export function normalizeStoredStudentColor(c: string): string {
  const t = c.trim();
  const h = normalizeStudentHex(t);
  if (h) return h;
  if (isPresetStudentColor(t)) return t;
  return t;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeStudentHex(hex);
  if (!h) return null;
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** 0–1: t=0 → a, t=1 → b */
function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) {
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

function relLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(rgb.r);
  const G = lin(rgb.g);
  const B = lin(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function resolveColorTop(c: string): string {
  if (isPresetStudentColor(c)) return COLOR_TOP[c];
  const h = normalizeStudentHex(c);
  return h ?? COLOR_TOP["s-blue"];
}

export function resolveColorText(c: string): string {
  if (isPresetStudentColor(c)) return COLOR_TEXT[c];
  const h = normalizeStudentHex(c);
  if (!h) return COLOR_TEXT["s-blue"];
  return relLuminance(h) > 0.55 ? "#0f172a" : "#f8fafc";
}

export function resolveAvatarBg(c: string): string {
  if (isPresetStudentColor(c)) return AVATAR_BG[c];
  const h = normalizeStudentHex(c);
  if (!h) return AVATAR_BG["s-blue"];
  const rgb = hexToRgb(h);
  if (!rgb) return AVATAR_BG["s-blue"];
  const lighter = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.22);
  return `linear-gradient(135deg,${lighter},${h})`;
}

/** 캘린더 블록·월간 칩용 (globals .session-* 와 동일 톤) */
export function resolveSessionSurfaceStyle(c: string): {
  background: string;
  color: string;
  border: string;
} {
  if (isPresetStudentColor(c)) {
    const top = COLOR_TOP[c];
    const text = COLOR_TEXT[c];
    const light = mixRgb(hexToRgb(top)!, { r: 255, g: 255, b: 255 }, 0.28);
    return {
      background: `linear-gradient(160deg,${light},${top})`,
      color: text,
      border: `1px solid ${top}`,
    };
  }
  const h = normalizeStudentHex(c);
  if (!h) {
    return resolveSessionSurfaceStyle("s-blue");
  }
  const rgb = hexToRgb(h)!;
  const light = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.32);
  const text = resolveColorText(h);
  return {
    background: `linear-gradient(160deg,${light},${h})`,
    color: text,
    border: `1px solid ${h}`,
  };
}
