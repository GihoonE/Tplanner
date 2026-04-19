"use client";

import { useEffect, useRef, useState } from "react";
import { DAYS_KO } from "@/lib/constants";
import {
  addDays,
  fmtTz,
  formatSessionDurationHours,
  sameDay,
} from "@/lib/utils";

type Step = "calendar" | "start" | "end";

type SessionTimePickerProps = {
  start: Date;
  end: Date;
  primaryOffset: number;
  tzLabel: string;
  onCommit: (start: Date, end: Date) => void;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60000);
}

function sameSlot(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate() &&
    a.getHours() === b.getHours() &&
    a.getMinutes() === b.getMinutes()
  );
}

/** KST 벽시계 기준 슬롯 (앱의 Session Date 규칙과 동일) */
function slotOnDay(y: number, m: number, day: number, h: number, mi: number): Date {
  return new Date(y, m, day, h, mi, 0, 0);
}

function buildMonthCells(viewMonth: Date): { date: Date; inMonth: boolean }[] {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const result: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < first.getDay(); i++) {
    result.push({ date: addDays(first, i - first.getDay()), inMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    result.push({
      date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d),
      inMonth: true,
    });
  }
  while (result.length < 42) {
    const prev = result[result.length - 1]!.date;
    result.push({ date: addDays(prev, 1), inMonth: false });
  }
  return result;
}

function startSlotsForDay(y: number, m: number, d: number): Date[] {
  const out: Date[] = [];
  for (let h = 0; h < 24; h++) {
    for (const mi of [0, 15, 30, 45]) {
      out.push(slotOnDay(y, m, d, h, mi));
    }
  }
  return out;
}

function endSlotsAfter(start: Date, maxSteps = 96): Date[] {
  const out: Date[] = [];
  for (let i = 1; i <= maxSteps; i++) {
    const e = addMinutes(start, i * 15);
    if (e.getTime() <= start.getTime()) break;
    out.push(e);
  }
  return out;
}

export function SessionTimePicker({
  start,
  end,
  primaryOffset,
  tzLabel,
  onCommit,
}: SessionTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("calendar");
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(start));
  const [pickedY, setPickedY] = useState(start.getFullYear());
  const [pickedM, setPickedM] = useState(start.getMonth());
  const [pickedD, setPickedD] = useState(start.getDate());
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function openPicker() {
    setViewMonth(startOfMonth(start));
    setPickedY(start.getFullYear());
    setPickedM(start.getMonth());
    setPickedD(start.getDate());
    setTempStart(null);
    setStep("calendar");
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  const summary = `${fmtTz(start, primaryOffset)} - ${fmtTz(end, primaryOffset)} (${formatSessionDurationHours(start, end)}시간)`;

  const cells = buildMonthCells(viewMonth);

  return (
    <div ref={rootRef} className="relative flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={openPicker}
        className="field-base box-border flex min-h-[5rem] w-full flex-1 flex-col justify-center border-slate-200 text-left transition-colors hover:border-sky-300 cursor-pointer"
      >
        <span className="font-medium text-slate-800">{summary}</span>
        <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
          {tzLabel} 기준 · 클릭하여 변경
        </span>
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 top-full mt-1 w-[min(100%,320px)] rounded-2xl border border-slate-200 bg-white shadow-xl p-3"
          role="dialog"
          aria-label="수업 시간 선택"
        >
          {step === "calendar" && (
            <>
              <div className="flex items-center justify-between mb-2 px-0.5">
                <button
                  type="button"
                  className="text-slate-500 hover:text-sky-600 text-sm font-bold px-2 py-1"
                  onClick={() => setViewMonth((v) => shiftMonth(v, -1))}
                >
                  ‹
                </button>
                <span className="text-[13px] font-extrabold text-slate-800">
                  {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
                </span>
                <button
                  type="button"
                  className="text-slate-500 hover:text-sky-600 text-sm font-bold px-2 py-1"
                  onClick={() => setViewMonth((v) => shiftMonth(v, 1))}
                >
                  ›
                </button>
              </div>
              <div
                className="grid text-center text-[10px] font-bold text-slate-400 mb-1"
                style={{ gridTemplateColumns: "repeat(7,1fr)" }}
              >
                {DAYS_KO.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: "repeat(7,1fr)" }}
              >
                {cells.map(({ date, inMonth }, i) => {
                  const sel =
                    date.getFullYear() === pickedY &&
                    date.getMonth() === pickedM &&
                    date.getDate() === pickedD;
                  const isSessionDay = sameDay(date, start);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!inMonth}
                      onClick={() => {
                        if (!inMonth) return;
                        setPickedY(date.getFullYear());
                        setPickedM(date.getMonth());
                        setPickedD(date.getDate());
                        setStep("start");
                      }}
                      className={`aspect-square max-h-9 rounded-lg text-[12px] font-bold transition-colors
                        ${!inMonth ? "text-slate-200 cursor-default" : "text-slate-700 hover:bg-sky-50"}
                        ${inMonth && sel ? "bg-sky-500 text-white hover:bg-sky-500" : ""}
                        ${inMonth && !sel && isSessionDay ? "ring-1 ring-sky-300" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="mt-2 w-full text-[12px] font-semibold text-slate-500 py-1.5 hover:text-slate-800"
                onClick={closePicker}
              >
                취소
              </button>
            </>
          )}

          {step === "start" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-[12px] font-bold text-sky-600"
                  onClick={() => setStep("calendar")}
                >
                  ← 달력
                </button>
                <span className="text-[12px] font-bold text-slate-700">
                  {pickedM + 1}/{pickedD} 시작
                </span>
                <span className="w-12" />
              </div>
              <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-3 gap-1">
                {startSlotsForDay(pickedY, pickedM, pickedD).map((t) => (
                  <button
                    key={t.getTime()}
                    type="button"
                    onClick={() => {
                      setTempStart(t);
                      setStep("end");
                    }}
                    className={`py-2 rounded-lg text-[11px] font-semibold border transition-colors
                      ${sameSlot(t, start)
                        ? "border-sky-400 bg-sky-50 text-sky-800"
                        : "border-slate-100 text-slate-600 hover:border-sky-200"}`}
                  >
                    {fmtTz(t, primaryOffset)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 w-full text-[12px] font-semibold text-slate-500 py-1.5"
                onClick={closePicker}
              >
                취소
              </button>
            </>
          )}

          {step === "end" && tempStart && (
            <>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-[12px] font-bold text-sky-600"
                  onClick={() => setStep("start")}
                >
                  ← 시작
                </button>
                <span className="text-[11px] font-bold text-slate-600 text-center flex-1 px-1">
                  종료 · 15분 단위
                </span>
                <span className="w-10" />
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                시작 {fmtTz(tempStart, primaryOffset)}
              </p>
              <div className="max-h-52 overflow-y-auto pr-1 grid grid-cols-3 gap-1">
                {endSlotsAfter(tempStart).map((t) => (
                  <button
                    key={t.getTime()}
                    type="button"
                    onClick={() => {
                      onCommit(tempStart, t);
                      closePicker();
                    }}
                    className={`py-2 rounded-lg text-[11px] font-semibold border border-slate-100 text-slate-600 hover:border-sky-300 hover:bg-sky-50`}
                  >
                    {fmtTz(t, primaryOffset)}
                    <span className="block text-[9px] text-slate-400 font-normal mt-0.5">
                      ({formatSessionDurationHours(tempStart, t)}시간)
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 w-full text-[12px] font-semibold text-slate-500 py-1.5"
                onClick={closePicker}
              >
                취소
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
