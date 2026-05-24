"use client";

import { useTzData } from "@/store";
import {
  fmtTz,
  formatFullDate,
  formatSessionDurationHours,
  getPrimaryOffset,
} from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { resolveAvatarBg, resolveColorText } from "@/lib/studentColor";
import { SessionTimePicker } from "@/components/records/SessionTimePicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useEffect, useState, type ReactNode } from "react";
import type {
  Understanding,
  Focus,
  Session,
  Student,
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

type RecordEditorProps = {
  session: Session | null;
  student: Student | undefined;
  onSessionChange: (s: Session) => void;
  onDeleted: (id: number) => void;
  readOnly?: boolean;
};

type HomeworkFromApi = {
  id: number;
  sessionId: number;
  text: string;
  done: boolean;
};

export function RecordEditor({
  session,
  student,
  onSessionChange,
  onDeleted,
  readOnly = false,
}: RecordEditorProps) {
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);

  const [hwInput, setHwInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** 삭제 확인 모달: null이면 닫힘, 숫자면 해당 id 삭제 대기 */
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (pendingDeleteId == null) return;
    if (session?.id !== pendingDeleteId) setPendingDeleteId(null);
  }, [session?.id, pendingDeleteId]);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-300 text-[14px] font-semibold">
        수업을 선택하세요
      </div>
    );
  }

  const sess = session;

  function updateField<K extends keyof Session>(key: K, value: Session[K]) {
    if (readOnly) return;
    onSessionChange({ ...sess, [key]: value });
  }

  async function addHw() {
    if (readOnly) return;
    if (!hwInput.trim()) return;
    const text = hwInput.trim();
    setSaveError(null);
    try {
      const res = await fetch("/api/homeworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sess.id,
          text,
          done: false,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "숙제 추가에 실패했습니다.",
        );
      }
      const homework = (await res.json()) as HomeworkFromApi;
      updateField("homework", [
        ...sess.homework,
        { id: homework.id, text: homework.text, done: homework.done },
      ]);
      setHwInput("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "숙제 추가에 실패했습니다.");
    }
  }

  async function toggleHw(id: number) {
    if (readOnly) return;
    const target = sess.homework.find((h) => h.id === id);
    if (!target) return;
    const optimistic = sess.homework.map((h) =>
      h.id === id ? { ...h, done: !h.done } : h,
    );
    updateField("homework", optimistic);
    setSaveError(null);
    try {
      const res = await fetch(`/api/homeworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !target.done }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "숙제 수정에 실패했습니다.",
        );
      }
      const homework = (await res.json()) as HomeworkFromApi;
      updateField(
        "homework",
        optimistic.map((h) =>
          h.id === id
            ? { id: homework.id, text: homework.text, done: homework.done }
            : h,
        ),
      );
    } catch (e) {
      updateField("homework", sess.homework);
      setSaveError(e instanceof Error ? e.message : "숙제 수정에 실패했습니다.");
    }
  }

  async function removeHw(id: number) {
    if (readOnly) return;
    const previous = sess.homework;
    updateField(
      "homework",
      previous.filter((h) => h.id !== id),
    );
    setSaveError(null);
    try {
      const res = await fetch(`/api/homeworks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "숙제 삭제에 실패했습니다.",
        );
      }
    } catch (e) {
      updateField("homework", previous);
      setSaveError(e instanceof Error ? e.message : "숙제 삭제에 실패했습니다.");
    }
  }

  async function handleSave() {
    if (readOnly) return;
    setSaveError(null);
    try {
      const res = await fetch(`/api/sessions/${sess.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place: sess.place,
          notes: sess.notes,
          understanding: sess.understanding,
          focus: sess.focus,
          start: sess.start.toISOString(),
          end: sess.end.toISOString(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "저장에 실패했습니다.",
        );
      }
      const row = (await res.json()) as {
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
      onSessionChange({
        id: row.id,
        studentId: row.studentId,
        start: new Date(row.start),
        end: new Date(row.end),
        place: row.place,
        notes: row.notes,
        understanding: row.understanding as Understanding,
        focus: row.focus as Focus,
        homework: row.homework,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    }
  }

  async function executeDelete() {
    if (readOnly) return;
    const id = pendingDeleteId;
    if (id == null) return;
    setDeleting(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string" ? body.error : "삭제에 실패했습니다.",
        );
      }
      setPendingDeleteId(null);
      onDeleted(id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  const color = student?.color ?? "s-blue";

  return (
    <>
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] font-bold text-white flex-shrink-0"
          style={{ background: resolveAvatarBg(color) }}
        >
          {student?.avatarChar ?? "?"}
        </div>
        <div className="flex-1">
          <div
            className="text-[11px] font-bold uppercase tracking-wide mb-0.5"
            style={{ color: resolveColorText(color) }}
          >
            {student?.subject ?? "미정"}
          </div>
          <div className="text-[20px] font-extrabold text-slate-900 tracking-tight">
            {student?.name ?? "학생 미지정"}
          </div>
          <div className="text-[12px] text-slate-400 mt-0.5">
            {formatFullDate(sess.start)} · {fmtTz(sess.start, primaryOffset)} -{" "}
            {fmtTz(sess.end, primaryOffset)} (
            {formatSessionDurationHours(sess.start, sess.end)}시간) ·{" "}
            {sess.place || "장소 미입력"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-3 gap-3 mb-5 items-stretch">
          <div className="flex min-h-0 flex-col">
            <Label>날짜</Label>
            <div className="box-border flex min-h-[5rem] w-full flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-600">
              {`${sess.start.getFullYear()}.${String(sess.start.getMonth() + 1).padStart(2, "0")}.${String(sess.start.getDate()).padStart(2, "0")}`}
            </div>
          </div>
          <div className="flex min-h-0 flex-col">
            <Label>수업 시간 ({tzData[0].label})</Label>
            {readOnly ? (
              <div className="box-border flex min-h-[5rem] w-full flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-600">
                {fmtTz(sess.start, primaryOffset)} -{" "}
                {fmtTz(sess.end, primaryOffset)} (
                {formatSessionDurationHours(sess.start, sess.end)}시간)
              </div>
            ) : (
              <SessionTimePicker
                start={sess.start}
                end={sess.end}
                primaryOffset={primaryOffset}
                tzLabel={tzData[0].label}
                onCommit={(nextStart, nextEnd) => {
                  onSessionChange({
                    ...sess,
                    start: nextStart,
                    end: nextEnd,
                  });
                }}
              />
            )}
          </div>
          <div className="flex min-h-0 flex-col">
            <Label>장소</Label>
            {readOnly ? (
              <div className="box-border flex min-h-[5rem] w-full flex-1 items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-600">
                {sess.place || "장소 미입력"}
              </div>
            ) : (
              <input
                value={sess.place}
                onChange={(e) => updateField("place", e.target.value)}
                placeholder="장소 입력..."
                className="field-base box-border min-h-[5rem] w-full flex-1"
              />
            )}
          </div>
        </div>

        <div className="mb-5">
          <Label sync>수업 내용 메모</Label>
          {readOnly ? (
            <div className="min-h-[130px] whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-600">
              {sess.notes || "수업 기록이 아직 작성되지 않았습니다."}
            </div>
          ) : (
            <textarea
              rows={5}
              value={sess.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="오늘 수업에서 다룬 내용을 기록하세요..."
              className="w-full field-base resize-none leading-relaxed"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <Label>이해도</Label>
            <MoodRow
              opts={U_OPTS}
              value={sess.understanding}
              onChange={(v: Understanding) => updateField("understanding", v)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>집중도</Label>
            <MoodRow
              opts={F_OPTS}
              value={sess.focus}
              onChange={(v: Focus) => updateField("focus", v)}
              disabled={readOnly}
            />
          </div>
        </div>

        <div>
          <Label sync>숙제</Label>
          <div className="flex flex-col gap-1.5 mb-2">
            {sess.homework.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-lg text-[13px]"
              >
                <button
                  type="button"
                  onClick={() => toggleHw(h.id)}
                  disabled={readOnly}
                  className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all
                    ${h.done ? "bg-sky-500 border-sky-500" : "border-slate-300"}`}
                >
                  {h.done && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </button>
                <span
                  className={`flex-1 ${h.done ? "line-through text-slate-300" : "text-slate-700"}`}
                >
                  {h.text}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeHw(h.id)}
                    className="text-slate-200 hover:text-red-400 text-xs transition-colors px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <input
                value={hwInput}
                onChange={(e) => setHwInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addHw();
                }}
                placeholder="숙제 내용..."
                className="flex-1 field-base"
              />
              <Button variant="soft" size="sm" onClick={addHw}>
                + 추가
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-6 py-4 border-t border-slate-100 flex-shrink-0">
        {saveError && (
          <p className="text-[12px] text-red-500 font-medium">{saveError}</p>
        )}
        {readOnly ? (
          <p className="text-[12px] font-semibold text-slate-400">
            학부모 계정은 수업 기록을 조회만 할 수 있습니다.
          </p>
        ) : (
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void handleSave()}>
              {saved ? "✓ 저장됨" : "✓ 저장"}
            </Button>

            <div className="flex-1" />
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={() => setPendingDeleteId(sess.id)}
            >
              삭제
            </Button>
          </div>
        )}
      </div>
    </div>

    <ConfirmDialog
      open={pendingDeleteId !== null}
      title="수업 기록 삭제"
      description="이 수업 기록을 삭제할까요? 삭제하면 복구할 수 없습니다."
      confirmLabel="삭제"
      cancelLabel="취소"
      danger
      loading={deleting}
      onCancel={() => !deleting && setPendingDeleteId(null)}
      onConfirm={executeDelete}
    />
    </>
  );
}

function Label({ children, sync }: { children: ReactNode; sync?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
      {sync && (
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
      )}
      {children}
      {sync && (
        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
          저장 시 반영
        </span>
      )}
    </div>
  );
}

function MoodRow<T extends string>({
  opts,
  value,
  onChange,
  disabled = false,
}: {
  opts: { v: T; e: string; l: string }[];
  value: string;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => !disabled && onChange(o.v)}
          disabled={disabled}
          className={`flex-1 py-2 px-1 rounded-xl border-[1.5px] text-[11px] font-semibold text-center transition-all
            ${value === o.v ? "border-sky-500 bg-sky-50 text-sky-700" : `border-slate-200 text-slate-400 ${disabled ? "cursor-default" : "hover:border-sky-300"}`}`}
        >
          <span className="block text-[16px] mb-0.5">{o.e}</span>
          {o.l}
        </button>
      ))}
    </div>
  );
}
