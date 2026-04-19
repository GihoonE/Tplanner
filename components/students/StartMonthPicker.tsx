"use client";

import { useEffect, useRef, useState } from "react";

function parseYM(s: string): { y: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || !Number.isFinite(y)) return null;
  return { y, m: mo - 1 };
}

function toValue(y: number, monthIndex: number) {
  return `${y}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function defaultStartMonthValue() {
  const d = new Date();
  return toValue(d.getFullYear(), d.getMonth());
}

function formatStartMonthLabel(v: string) {
  const p = parseYM(v);
  if (!p) return v.trim() || "—";
  return `${p.y}년 ${p.m + 1}월`;
}

type StartMonthPickerProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
};

export function StartMonthPicker({
  value,
  onChange,
  disabled,
  className = "",
}: StartMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const parsed = parseYM(value) ?? parseYM(defaultStartMonthValue())!;
  const [viewYear, setViewYear] = useState(parsed.y);

  useEffect(() => {
    const p = parseYM(value);
    if (p) setViewYear(p.y);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const sel = parseYM(value);

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
        className="field-base box-border w-full text-left transition-colors hover:border-sky-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="font-medium text-slate-800">
          {formatStartMonthLabel(value)}
        </span>
        <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
          클릭하여 변경
        </span>
      </button>

      {open && (
        <div className="mt-1 rounded-2xl border border-slate-200 bg-white shadow-xl p-3">
          <div className="flex items-center justify-between mb-2 px-0.5">
            <button
              type="button"
              className="text-slate-500 hover:text-sky-600 text-sm font-bold px-2 py-1"
              onClick={() => setViewYear((y) => y - 1)}
            >
              ‹
            </button>
            <span className="text-[13px] font-extrabold text-slate-800">
              {viewYear}년
            </span>
            <button
              type="button"
              className="text-slate-500 hover:text-sky-600 text-sm font-bold px-2 py-1"
              onClick={() => setViewYear((y) => y + 1)}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const mo = i + 1;
              const selected =
                sel != null && sel.y === viewYear && sel.m === i;
              return (
                <button
                  key={mo}
                  type="button"
                  onClick={() => {
                    onChange(toValue(viewYear, i));
                    setOpen(false);
                  }}
                  className={`py-2.5 rounded-lg text-[12px] font-bold transition-colors
                    ${
                      selected
                        ? "bg-sky-500 text-white hover:bg-sky-500"
                        : "border border-slate-100 text-slate-700 hover:border-sky-200 hover:bg-sky-50"
                    }`}
                >
                  {mo}월
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
