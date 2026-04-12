"use client";

import { useState } from "react";
import { useTutorStore, useSessions } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { fmtTz } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { useTzData, useNow } from "@/store";

export function RecordList() {
  const [search, setSearch] = useState("");
  const sessions = useSessions();
  const students = useTutorStore((s) => s.students);
  const activeId = useTutorStore((s) => s.activeRecordId);
  const setActive = useTutorStore((s) => s.setActiveRecord);
  const tzData = useTzData();
  const now = useNow();
  const primaryOffset = getPrimaryOffset(tzData);

  // b - a.start.getTime(): b가 앞에 옴 내림 차순, a가 앞에 오게 할려면 a - b
  const sorted = [...sessions].sort(
    (a, b) => b.start.getTime() - a.start.getTime(),
  );
  const filtered = sorted.filter((s) => {
    if (!search.trim()) return true;
    const st = students.find((x) => x.id === s.studentId);
    const q = search.trim().toLowerCase();
    return (
      st?.name.toLowerCase().includes(q) ||
      st?.subject.toLowerCase().includes(q) ||
      st?.grade.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-[300px] flex-shrink-0 border-r border-slate-100 bg-slate-50 overflow-y-auto p-4">
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">
          🔍
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름, 과목, 학년로 검색..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 outline-none focus:border-sky-400 transition-colors"
        />
      </div>
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">
        전체 수업 기록 ({filtered.length})
      </div>

      {filtered.map((s) => {
        const st = students.find((x) => x.id === s.studentId);
        const isActive = s.id === activeId;
        const hasNotes = s.notes.trim().length > 0;
        const isDone = s.end < now;

        return (
          <div
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`bg-white rounded-2xl border p-4 mb-2.5 cursor-pointer transition-all shadow-sm hover:-translate-y-px hover:shadow-md
              ${isActive ? "border-sky-400 shadow-[0_0_0_3px_rgba(14,165,233,.1)]" : "border-slate-100 hover:border-sky-200"}`}
          >
            {/* Top row */}
            <div className="flex items-center gap-2 mb-2">
              {st ? (
                <Avatar char={st.avatarChar} color={st.color} size="sm" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-slate-900 truncate">
                  {st?.name ?? "미정"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {st?.subject} · {st?.grade}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex-shrink-0">
                {s.start.getMonth() + 1}/{s.start.getDate()}
              </div>
            </div>

            {/* Preview */}
            <p
              className={`text-[12px] leading-snug mb-2.5 line-clamp-2 ${hasNotes ? "text-slate-500" : "text-slate-300 italic"}`}
            >
              {hasNotes ? s.notes : "기록 없음 — 클릭해서 작성하기"}
            </p>

            {/* Chips */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-600 border border-sky-100 px-2 py-0.5 rounded-full">
                {fmtTz(s.start, primaryOffset)}–{fmtTz(s.end, primaryOffset)}
              </span>
              {s.understanding === "good" && (
                <Badge variant="green">잘이해</Badge>
              )}
              {s.understanding === "normal" && (
                <Badge variant="gray">보통</Badge>
              )}
              {s.understanding === "hard" && (
                <Badge variant="red">어려움</Badge>
              )}
              {s.homework.length > 0 && (
                <Badge variant="gray">숙제 {s.homework.length}개</Badge>
              )}
              <Badge variant={isDone ? "gray" : "amber"}>
                {isDone ? "완료" : "예정"}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
