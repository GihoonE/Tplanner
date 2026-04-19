"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { resolveAvatarBg, resolveColorText, resolveColorTop } from "@/lib/studentColor";
import {
  formatFullDate,
  formatSessionDurationHours,
  fmtTz,
  getPrimaryOffset,
} from "@/lib/utils";
import { useTzData } from "@/store";
import { SessionTimePicker } from "@/components/records/SessionTimePicker";
import type {
  HomeworkItem,
  Session,
  Student,
  Understanding,
  Focus,
} from "@/types";

const U_OPTS: { v: Understanding; e: string; l: string }[] = [
  { v: "good", e: "😊", l: "잘 이해함" },
  { v: "normal", e: "😐", l: "보통" },
  { v: "hard", e: "😕", l: "어려워함" },
];
const F_OPTS: { v: Focus; e: string; l: string }[] = [
  { v: "high", e: "🔥", l: "매우 집중" },
  { v: "normal", e: "👍", l: "집중" },
  { v: "low", e: "😴", l: "산만" },
];

function defaultStartEnd(): [Date, Date] {
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(10, 0, 0, 0);
  return [start, end];
}

type ApiSessionRow = {
  id: number;
  studentId: number | null;
  start: string;
  end: string;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  homework: { id: number; text: string; done: boolean }[];
};

function apiRowToSession(row: ApiSessionRow): Session {
  return {
    id: row.id,
    studentId: row.studentId,
    start: new Date(row.start),
    end: new Date(row.end),
    place: row.place,
    notes: row.notes,
    understanding: row.understanding as Understanding,
    focus: row.focus as Focus,
    homework: row.homework,
  };
}

type NewSessionRecordModalProps = {
  open: boolean;
  onClose: () => void;
  students: Student[];
  onCreated: (session: Session) => void;
};

export function NewSessionRecordModal({
  open,
  onClose,
  students,
  onCreated,
}: NewSessionRecordModalProps) {
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);
  const tzLabel = tzData[0]?.label ?? "KST";

  const [studentId, setStudentId] = useState<number | "">("");
  const [start, setStart] = useState<Date>(() => defaultStartEnd()[0]);
  const [end, setEnd] = useState<Date>(() => defaultStartEnd()[1]);
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [understanding, setUnderstanding] = useState<Understanding>("");
  const [focus, setFocus] = useState<Focus>("");
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [hwInput, setHwInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const [s, e] = defaultStartEnd();
    setStart(s);
    setEnd(e);
    setStudentId("");
    setPlace("");
    setNotes("");
    setUnderstanding("");
    setFocus("");
    setHomework([]);
    setHwInput("");
    setError(null);
    setSaving(false);
  }, [open, students]);

  const student =
    studentId === "" ? undefined : students.find((x) => x.id === studentId);
  const color = student?.color ?? "s-blue";

  if (!open) return null;

  function addHw() {
    if (!hwInput.trim()) return;
    setHomework((prev) => [
      ...prev,
      { id: Date.now(), text: hwInput.trim(), done: false },
    ]);
    setHwInput("");
  }

  async function handleSubmit() {
    if (studentId === "" || typeof studentId !== "number") {
      setError("학생을 선택하세요.");
      return;
    }
    if (end.getTime() <= start.getTime()) {
      setError("종료 시각은 시작보다 늦어야 합니다.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          start: start.toISOString(),
          end: end.toISOString(),
          place,
          notes,
          understanding,
          focus,
          homework: homework.map((h) => ({ text: h.text, done: h.done })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "저장에 실패했습니다.",
        );
      }
      onCreated(apiRowToSession(body as ApiSessionRow));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-scale-in flex max-h-[92vh] w-[650px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div
          className="h-1 w-full flex-shrink-0"
          style={{
            background: `linear-gradient(90deg,${resolveColorTop(color)},${resolveColorTop(color)}77)`,
          }}
        />

        <div className="flex items-start gap-3 px-6 pt-5">
          <div
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[17px] font-bold text-white"
            style={{
              background: resolveAvatarBg(color),
              boxShadow: "0 2px 8px rgba(0,0,0,.12)",
            }}
          >
            {student?.avatarChar ?? "＋"}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="mb-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: resolveColorText(color) }}
            >
              새 수업 기록
            </div>
            <div className="text-[20px] font-extrabold tracking-tight text-slate-900">
              {student?.name ?? "학생 선택"}
            </div>
            <div className="mt-0.5 text-[12px] text-slate-400">
              {formatFullDate(start)} · {fmtTz(start, primaryOffset)} -{" "}
              {fmtTz(end, primaryOffset)} (
              {formatSessionDurationHours(start, end)}시간)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-400 transition-colors hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {students.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400">
              등록된 학생이 없습니다. 학생 관리에서 먼저 추가하세요.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <FieldLabel>학생</FieldLabel>
                <select
                  value={studentId === "" ? "" : String(studentId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStudentId(v === "" ? "" : parseInt(v, 10));
                  }}
                  className="field-base w-full cursor-pointer"
                >
                  <option value="">선택…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.grade} · {s.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex min-h-0 flex-col">
                  <FieldLabel>날짜</FieldLabel>
                  <input
                    readOnly
                    value={`${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, "0")}.${String(start.getDate()).padStart(2, "0")}`}
                    className="field-base min-h-[4.5rem] w-full flex-1 text-slate-400"
                  />
                </div>
                <div className="flex min-h-0 flex-col">
                  <FieldLabel>수업 시간 ({tzLabel})</FieldLabel>
                  <SessionTimePicker
                    start={start}
                    end={end}
                    primaryOffset={primaryOffset}
                    tzLabel={tzLabel}
                    onCommit={(s, e) => {
                      setStart(s);
                      setEnd(e);
                    }}
                  />
                </div>
                <div className="flex min-h-0 flex-col">
                  <FieldLabel>장소</FieldLabel>
                  <input
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="장소"
                    className="field-base min-h-[4.5rem] w-full flex-1"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>수업 메모</FieldLabel>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="오늘 수업 내용…"
                  className="field-base w-full resize-none leading-relaxed"
                />
              </div>

              <div>
                <FieldLabel>이해도</FieldLabel>
                <MoodRow
                  opts={U_OPTS}
                  value={understanding}
                  onChange={setUnderstanding}
                />
              </div>
              <div>
                <FieldLabel>집중도</FieldLabel>
                <MoodRow opts={F_OPTS} value={focus} onChange={setFocus} />
              </div>

              <div>
                <FieldLabel>숙제 (선택)</FieldLabel>
                <div className="mb-2 flex flex-col gap-1">
                  {homework.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[13px]"
                    >
                      <span className="flex-1 text-slate-700">{h.text}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setHomework((prev) =>
                            prev.filter((x) => x.id !== h.id),
                          )
                        }
                        className="px-1 text-xs text-slate-300 transition-colors hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={hwInput}
                    onChange={(e) => setHwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addHw();
                    }}
                    placeholder="숙제 내용…"
                    className="field-base flex-1"
                  />
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    onClick={addHw}
                  >
                    + 추가
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-[13px] font-medium text-red-500">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 border-t border-slate-100 px-6 py-4">
          <Button
            type="button"
            variant="primary"
            disabled={saving || students.length === 0 || studentId === ""}
            onClick={() => void handleSubmit()}
          >
            {saving ? "저장 중…" : "수업 추가"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {children}
    </div>
  );
}

function MoodRow<T extends string>({
  opts,
  value,
  onChange,
}: {
  opts: { v: T; e: string; l: string }[];
  value: string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-xl border-[1.5px] px-1 py-2 text-[12px] font-semibold transition-all
            ${value === o.v ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500 hover:border-sky-300 hover:text-sky-600"}`}
        >
          <span className="mb-0.5 block text-[18px]">{o.e}</span>
          {o.l}
        </button>
      ))}
    </div>
  );
}
