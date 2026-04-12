"use client";

import { useTutorStore, useTzData, useNow } from "@/store";
import { fmtTz, formatFullDate } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { COLOR_TEXT, AVATAR_BG } from "@/lib/constants";
import { useState } from "react";
import type { HomeworkItem, Understanding, Focus } from "@/types";

const U_OPTS: { v: Understanding; e: string; l: string }[] = [
  { v: "good",   e: "😊", l: "잘 이해함" },
  { v: "normal", e: "😐", l: "보통"      },
  { v: "hard",   e: "😕", l: "어려워함"  },
];
const F_OPTS: { v: Focus; e: string; l: string }[] = [
  { v: "high",   e: "🔥", l: "매우 집중" },
  { v: "normal", e: "👍", l: "집중"      },
  { v: "low",    e: "😴", l: "산만"      },
];

export function RecordEditor() {
  const sessions      = useTutorStore((s) => s.sessions);
  const students      = useTutorStore((s) => s.students);
  const activeId      = useTutorStore((s) => s.activeRecordId);
  const upsertSession = useTutorStore((s) => s.upsertSession);
  const deleteSession = useTutorStore((s) => s.deleteSession);
  const setActive     = useTutorStore((s) => s.setActiveRecord);
  const tzData        = useTzData();
  const now           = useNow();
  const primaryOffset = getPrimaryOffset(tzData);

  const [hwInput, setHwInput] = useState("");
  const [saved, setSaved]     = useState(false);

  const session = sessions.find((s) => s.id === activeId);
  const student = students.find((s) => s.id === session?.studentId);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-300 text-[14px] font-semibold">
        수업을 선택하세요
      </div>
    );
  }

  function update<K extends keyof typeof session>(key: K, value: typeof session[K]) {
    upsertSession({ ...session!, [key]: value });
  }

  function addHw() {
    if (!hwInput.trim()) return;
    update("homework", [...session!.homework, { id: Date.now(), text: hwInput.trim(), done: false }]);
    setHwInput("");
  }

  function toggleHw(id: number) {
    update("homework", session!.homework.map((h) => h.id === id ? { ...h, done: !h.done } : h));
  }

  function removeHw(id: number) {
    update("homework", session!.homework.filter((h) => h.id !== id));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const color = student?.color ?? "s-blue";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] font-bold text-white flex-shrink-0"
          style={{ background: AVATAR_BG[color] }}>
          {student?.avatarChar ?? "?"}
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: COLOR_TEXT[color] }}>
            {student?.subject ?? "미정"}
          </div>
          <div className="text-[20px] font-extrabold text-slate-900 tracking-tight">{student?.name ?? "학생 미지정"}</div>
          <div className="text-[12px] text-slate-400 mt-0.5">
            {formatFullDate(session.start)} · {fmtTz(session.start, primaryOffset)}–{fmtTz(session.end, primaryOffset)} · {session.place || "장소 미입력"}
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full flex-shrink-0">
          🔄 캘린더와 동기화
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Time / Place row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <Label>날짜</Label>
            <input readOnly value={`${session.start.getFullYear()}.${String(session.start.getMonth()+1).padStart(2,"0")}.${String(session.start.getDate()).padStart(2,"0")}`}
              className="w-full field-base text-slate-400" />
          </div>
          <div>
            <Label>시간 ({tzData[0].label})</Label>
            <input readOnly value={`${fmtTz(session.start, primaryOffset)} – ${fmtTz(session.end, primaryOffset)}`}
              className="w-full field-base text-slate-400" />
          </div>
          <div>
            <Label>장소</Label>
            <input value={session.place} onChange={(e) => update("place", e.target.value)}
              placeholder="장소 입력..." className="w-full field-base" />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <Label sync>수업 내용 메모</Label>
          <textarea rows={5} value={session.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="오늘 수업에서 다룬 내용을 기록하세요..."
            className="w-full field-base resize-none leading-relaxed" />
        </div>

        {/* Understanding + Focus */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <Label>이해도</Label>
            <MoodRow opts={U_OPTS} value={session.understanding}
              onChange={(v: Understanding) => update("understanding", v)} />
          </div>
          <div>
            <Label>집중도</Label>
            <MoodRow opts={F_OPTS} value={session.focus}
              onChange={(v: Focus) => update("focus", v)} />
          </div>
        </div>

        {/* Homework */}
        <div>
          <Label sync>숙제</Label>
          <div className="flex flex-col gap-1.5 mb-2">
            {session.homework.map((h) => (
              <div key={h.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-lg text-[13px]">
                <button onClick={() => toggleHw(h.id)}
                  className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all
                    ${h.done ? "bg-sky-500 border-sky-500" : "border-slate-300"}`}>
                  {h.done && <span className="text-white text-[10px] font-bold">✓</span>}
                </button>
                <span className={`flex-1 ${h.done ? "line-through text-slate-300" : "text-slate-700"}`}>{h.text}</span>
                <button onClick={() => removeHw(h.id)} className="text-slate-200 hover:text-red-400 text-xs transition-colors px-1">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={hwInput} onChange={(e) => setHwInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addHw(); }}
              placeholder="숙제 내용..." className="flex-1 field-base" />
            <Button variant="soft" size="sm" onClick={addHw}>+ 추가</Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
        <Button variant="primary" onClick={handleSave}>
          {saved ? "✓ 저장됨" : "✓ 저장"}
        </Button>
        <Button variant="ghost">↓ PDF 내보내기</Button>
        <div className="flex-1" />
        <Button variant="danger" size="sm"
          onClick={() => { deleteSession(session.id); setActive(null); }}>
          삭제
        </Button>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Label({ children, sync }: { children: React.ReactNode; sync?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
      {sync && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
      {children}
      {sync && (
        <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
          🔄 캘린더 카드와 동기화
        </span>
      )}
    </div>
  );
}

function MoodRow({ opts, value, onChange }: { opts: any[]; value: string; onChange: (v: any) => void }) {
  return (
    <div className="flex gap-1.5">
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`flex-1 py-2 px-1 rounded-xl border-[1.5px] text-[11px] font-semibold text-center transition-all
            ${value === o.v ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-400 hover:border-sky-300"}`}>
          <span className="block text-[16px] mb-0.5">{o.e}</span>
          {o.l}
        </button>
      ))}
    </div>
  );
}
