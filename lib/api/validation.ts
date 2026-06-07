import {
  isValidStudentColor,
  normalizeStoredStudentColor,
} from "@/lib/studentColor";
import type { Focus, Understanding } from "@/types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parsePositiveInt(value: string, field: string) {
  if (!/^\d+$/.test(value)) {
    return invalid(`${field}는 양의 정수여야 합니다.`);
  }
  const num = Number(value);
  if (!Number.isSafeInteger(num) || num < 1) {
    return invalid(`${field}는 양의 정수여야 합니다.`);
  }
  return valid(num);
}

export function parseRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return invalid(`${field}는 비어 있을 수 없습니다.`);
  }
  return valid(value.trim());
}

export function parseOptionalString(value: unknown, field: string) {
  if (value == null) return valid(undefined);
  if (typeof value !== "string") {
    return invalid(`${field}는 문자열이어야 합니다.`);
  }
  return valid(value);
}

export function parseOptionalRequiredString(value: unknown, field: string) {
  if (value == null) return valid(undefined);
  return parseRequiredString(value, field);
}

export function parseMonthString(value: unknown, field: string) {
  const parsed = parseRequiredString(value, field);
  if (!parsed.ok) return parsed;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(parsed.value)) {
    return invalid(`${field}는 YYYY-MM 형식이어야 합니다.`);
  }
  return parsed;
}

export function parseOptionalMonthString(value: unknown, field: string) {
  if (value == null) return valid(undefined);
  return parseMonthString(value, field);
}

export function parseBoundedInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    return invalid(`${field}는 ${min} 이상 ${max} 이하의 정수여야 합니다.`);
  }
  return valid(num);
}

export function parseOptionalBoundedInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
) {
  if (value == null) return valid(undefined);
  return parseBoundedInteger(value, field, min, max);
}

export function parseDate(value: unknown, field: string) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return invalid(`${field}는 유효한 날짜여야 합니다.`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return invalid(`${field}는 유효한 날짜여야 합니다.`);
  }
  return valid(date);
}

export function parseOptionalDate(value: unknown, field: string) {
  if (value == null) return valid(undefined);
  return parseDate(value, field);
}

export function parseStudentStatus(value: unknown) {
  if (value === "active" || value === "inactive") return valid(value);
  return invalid("상태는 active 또는 inactive여야 합니다.");
}

export function parseOptionalStudentStatus(value: unknown) {
  if (value == null) return valid(undefined);
  return parseStudentStatus(value);
}

export function parseStudentColor(value: unknown) {
  if (typeof value !== "string" || !isValidStudentColor(value)) {
    return invalid("유효하지 않은 색상입니다. (프리셋 또는 #RRGGBB)");
  }
  return valid(normalizeStoredStudentColor(value));
}

export function parseOptionalStudentColor(value: unknown) {
  if (value == null) return valid(undefined);
  return parseStudentColor(value);
}

export function parseUnderstanding(value: unknown) {
  if (
    value === "" ||
    value === "good" ||
    value === "normal" ||
    value === "hard"
  ) {
    return valid(value satisfies Understanding);
  }
  return invalid("understanding은 good, normal, hard 또는 빈 문자열이어야 합니다.");
}

export function parseOptionalUnderstanding(value: unknown) {
  if (value == null) return valid(undefined);
  return parseUnderstanding(value);
}

export function parseFocus(value: unknown) {
  if (value === "" || value === "high" || value === "normal" || value === "low") {
    return valid(value satisfies Focus);
  }
  return invalid("focus는 high, normal, low 또는 빈 문자열이어야 합니다.");
}

export function parseOptionalFocus(value: unknown) {
  if (value == null) return valid(undefined);
  return parseFocus(value);
}

export function parseRouteId(value: string) {
  return parsePositiveInt(value, "id");
}

function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function invalid(error: string): ValidationResult<never> {
  return { ok: false, error };
}
