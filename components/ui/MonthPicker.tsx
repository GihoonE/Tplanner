"use client";

import { useEffect, useRef, useState } from "react";

export function parseMonthValue(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month: month - 1 };
}

export function toMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function currentMonthValue() {
  const date = new Date();
  return toMonthValue(date.getFullYear(), date.getMonth());
}

export function monthStart(value: string) {
  const parsed = parseMonthValue(value) ?? parseMonthValue(currentMonthValue())!;
  return new Date(parsed.year, parsed.month, 1, 0, 0, 0, 0);
}

export function monthEnd(value: string) {
  const parsed = parseMonthValue(value) ?? parseMonthValue(currentMonthValue())!;
  return new Date(parsed.year, parsed.month + 1, 0, 23, 59, 59, 999);
}

export function formatMonthLabel(value: string) {
  const parsed = parseMonthValue(value);
  if (!parsed) return value.trim() || "-";
  return `${parsed.year}년 ${parsed.month + 1}월`;
}

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  helperText?: string;
  className?: string;
  buttonClassName?: string;
};

export function MonthPicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  helperText = "클릭하여 변경",
  className = "",
  buttonClassName = "",
}: MonthPickerProps) {
  const fallback = parseMonthValue(currentMonthValue())!;
  const parsed = parseMonthValue(value) ?? fallback;
  const selected = parseMonthValue(value);
  const minValue = min ? parseMonthValue(min) : null;
  const maxValue = max ? parseMonthValue(max) : null;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed.year);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = parseMonthValue(value);
    if (next) setViewYear(next.year);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function isDisabled(monthIndex: number) {
    const candidate = toMonthValue(viewYear, monthIndex);
    if (minValue && candidate < toMonthValue(minValue.year, minValue.month)) {
      return true;
    }
    if (maxValue && candidate > toMonthValue(maxValue.year, maxValue.month)) {
      return true;
    }
    return false;
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={`field-base box-border w-full text-left transition-colors hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
      >
        <span className="font-medium text-slate-800">
          {formatMonthLabel(value)}
        </span>
        {helperText && (
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            {helperText}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <button
              type="button"
              className="px-2 py-1 text-sm font-bold text-slate-500 hover:text-sky-600"
              onClick={() => setViewYear((year) => year - 1)}
            >
              ‹
            </button>
            <span className="text-[13px] font-extrabold text-slate-800">
              {viewYear}년
            </span>
            <button
              type="button"
              className="px-2 py-1 text-sm font-bold text-slate-500 hover:text-sky-600"
              onClick={() => setViewYear((year) => year + 1)}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const valueForMonth = toMonthValue(viewYear, monthIndex);
              const isSelected =
                selected?.year === viewYear && selected.month === monthIndex;
              const optionDisabled = isDisabled(monthIndex);
              return (
                <button
                  key={valueForMonth}
                  type="button"
                  disabled={optionDisabled}
                  onClick={() => {
                    onChange(valueForMonth);
                    setOpen(false);
                  }}
                  className={`rounded-lg py-2.5 text-[12px] font-bold transition-colors disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-200
                    ${
                      isSelected
                        ? "bg-sky-500 text-white hover:bg-sky-500"
                        : "border border-slate-100 text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    }`}
                >
                  {monthIndex + 1}월
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
