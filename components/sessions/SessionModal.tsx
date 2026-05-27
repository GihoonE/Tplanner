"use client";

import { useTutorStore, useNow, useTzData } from "@/store";
import { fmtTz, formatFullDate, sessionStatusInPrimaryTimezone } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { resolveAvatarBg, resolveColorText, resolveColorTop } from "@/lib/studentColor";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import type { HomeworkItem, Session, Understanding, Focus } from "@/types";

// API 응답 형식 (start/end는 ISO string)
type SessionFromApi = {
  id: number;
  studentId: number | null;
  start: string;
  end: string;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  homework: HomeworkItem[];
};

// Date 변환된 세션 (UI에서 사용)
type SessionWithDates = Session;

type HomeworkFromApi = {
  id: number;
  sessionId: number;
  text: string;
  done: boolean;
};

// ── Understanding / Focus options ──────────────────────────────────────────────
const U_OPTS: { v: Understanding; e: string; l: string }[] = [
  { v: "good", e: "😊", l: "잘 이해" },
  { v: "normal", e: "😐", l: "보통" },
  { v: "hard", e: "😕", l: "어려움" },
];
const F_OPTS: { v: Focus; e: string; l: string }[] = [
  { v: "high", e: "🔥", l: "집중" },
  { v: "normal", e: "👍", l: "보통" },
  { v: "low", e: "😴", l: "산만" },
];

function toSessionWithDates(data: SessionFromApi): SessionWithDates {
  return {
    ...data,
    start: new Date(data.start),
    end: new Date(data.end),
    understanding: data.understanding as Understanding,
    focus: data.focus as Focus,
  };
}

export function SessionModal({ readOnly = false }: { readOnly?: boolean }) {
  const [session, setSession] = useState<SessionWithDates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hwInput, setHwInput] = useState("");

  const modalOpen = useTutorStore((s) => s.modalOpen);
  const modalSessionId = useTutorStore((s) => s.modalSessionId);
  const modalTab = useTutorStore((s) => s.modalTab);
  const closeModal = useTutorStore((s) => s.closeModal);
  const setModalTab = useTutorStore((s) => s.setModalTab);
  const upsertSession = useTutorStore((s) => s.upsertSession);
  const students = useTutorStore((s) => s.students);
  const removeFromStore = useTutorStore((s) => s.deleteSession);
  const now = useNow();
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);
  const primaryTimeZone = tzData[0]?.timeZone ?? "Asia/Seoul";

  useEffect(() => {
    if (!modalOpen || !modalSessionId) {
      setSession(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/sessions/${modalSessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("조회 실패");
        return res.json();
      })
      .then((data) => setSession(toSessionWithDates(data as SessionFromApi)))
      .catch((e) => setError(e instanceof Error ? e.message : "오류"))
      .finally(() => setLoading(false));
  }, [modalOpen, modalSessionId]);

  const student = students.find((s) => s.id === session?.studentId);

  if (!modalOpen) return null;
  if (loading) {
    return (
      <div
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="bg-white rounded-2xl shadow-xl w-[520px] p-12 text-center text-slate-400">
          로딩 중...
        </div>
      </div>
    );
  }
  if (error || !session) return null;

  const status = sessionStatusInPrimaryTimezone(
    session,
    now,
    primaryOffset,
    primaryTimeZone,
  );
  const statusText = status === "completed"
    ? "✓ 완료됨"
    : status === "ongoing"
      ? "🔴 진행중"
      : "🔵 예정";

  // ── Helpers ──────────────────────────────────────────────────────────────────
  // K는 SessionWithDates의 키 중 하나여야함
  async function update<K extends keyof SessionWithDates>(
    //  각 파라미터별 변수 타입 지정
    key: K,
    value: SessionWithDates[K],
  ) {
    if (readOnly) return;
    if (!session) return;
    // ...session -> 세션의 데이터 모두 복사 후 파라미터로 넘어온 key만 새로운 값으로 덮어쓰기
    const updated = { ...session, [key]: value } as SessionWithDates;
    setSession(updated);
    try {
      // key: string, value: unknown (아무거나 다 가능)
      const body: Record<string, unknown> = {};
      if (
        key === "place" ||
        key === "notes" ||
        key === "understanding" ||
        key === "focus"
      ) {
        body[key] = value;
      }
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        // 반환된 api call을 with dates로 변환해 UI 변경
        const nextSession = toSessionWithDates(data as SessionFromApi);
        setSession(nextSession);
        upsertSession(nextSession);
      }
    } catch {
      setError("저장 실패");
    }
  }

  async function addHw() {
    if (readOnly) return;
    // trim(): 앞뒤 공백 제거
    // 공백 제거 후에 내용이 없거나 세션이 존재하지 않으면 함수 종료
    if (!hwInput.trim() || !session) return;
    const text = hwInput.trim();
    try {
      const res = await fetch("/api/homeworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          text,
          done: false,
        }),
      });
      if (!res.ok) throw new Error("숙제 추가 실패");
      const homework = (await res.json()) as HomeworkFromApi;
      setSession({
        ...session,
        homework: [...session.homework, homework],
      });
      setHwInput("");
    } catch {
      setError("숙제 추가 실패");
    }
  }

  async function toggleHw(id: number) {
    if (readOnly) return;
    if (!session) return;
    const target = session.homework.find((h) => h.id === id);
    if (!target) return;
    const previous = session;
    const optimistic = {
      ...session,
      homework: session.homework.map((h) =>
        h.id === id ? { ...h, done: !h.done } : h,
      ),
    };
    setSession(optimistic);
    try {
      const res = await fetch(`/api/homeworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !target.done }),
      });
      if (!res.ok) throw new Error("숙제 수정 실패");
      const homework = (await res.json()) as HomeworkFromApi;
      setSession({
        ...optimistic,
        homework: optimistic.homework.map((h) =>
          h.id === id
            ? { id: homework.id, text: homework.text, done: homework.done }
            : h,
        ),
      });
    } catch {
      setSession(previous);
      setError("숙제 수정 실패");
    }
  }

  async function removeHw(id: number) {
    if (readOnly) return;
    if (!session) return;
    const previous = session;
    setSession({
      ...session,
      homework: session.homework.filter((h) => h.id !== id),
    });
    try {
      const res = await fetch(`/api/homeworks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("숙제 삭제 실패");
    } catch {
      setSession(previous);
      setError("숙제 삭제 실패");
    }
  }

  const color = student?.color ?? "s-blue";

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-[520px] max-h-[92vh] flex flex-col animate-scale-in overflow-hidden">
        {/* Accent bar */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{
            background: `linear-gradient(90deg,${resolveColorTop(color)},${resolveColorTop(color)}77)`,
          }}
        />

        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] font-bold text-white flex-shrink-0"
            style={{
              background: resolveAvatarBg(color),
              boxShadow: "0 2px 8px rgba(0,0,0,.12)",
            }}
          >
            {student?.avatarChar ?? "✦"}
          </div>
          <div className="flex-1">
            <div
              className="text-[11px] font-bold uppercase tracking-wide mb-0.5"
              style={{ color: resolveColorText(color) }}
            >
              {student?.subject ?? "새 수업"}
            </div>
            <div className="text-[20px] font-extrabold text-slate-900 tracking-tight">
              {student?.name ?? "수업 정보 입력"}
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              {formatFullDate(session.start)} ·{" "}
              {fmtTz(session.start, primaryOffset)}–
              {fmtTz(session.end, primaryOffset)}
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-6 pt-4 border-b border-slate-100">
          {(["detail", "record"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setModalTab(tab)}
              className={`text-[13px] font-semibold px-3.5 py-2 border-b-2 -mb-px transition-all
                ${modalTab === tab ? "text-sky-600 border-sky-500" : "text-slate-400 border-transparent hover:text-slate-600"}`}
            >
              {tab === "detail" ? "수업 정보" : "수업 기록"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {modalTab === "detail" ? (
            <DetailTab
              session={session}
              student={student}
              statusText={statusText}
              primaryOffset={primaryOffset}
              onUpdate={update}
              readOnly={readOnly}
            />
          ) : (
            <RecordTab
              session={session}
              hwInput={hwInput}
              setHwInput={setHwInput}
              onUpdate={update}
              onAddHw={addHw}
              onToggleHw={toggleHw}
              onRemoveHw={removeHw}
              readOnly={readOnly}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100">
          {modalTab === "detail" ? (
            <>
              <Button variant="primary" onClick={() => setModalTab("record")}>
                {readOnly ? "수업 기록 보기" : "✏️ 수업 기록 작성"}
              </Button>
              <Button variant="ghost" onClick={closeModal}>
                닫기
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={closeModal}>
                {readOnly ? "닫기" : "✓ 저장 완료"}
              </Button>
              <Button variant="ghost" onClick={() => setModalTab("detail")}>
                ← 수업 정보
              </Button>
              {!readOnly && (
                <span className="text-[11px] text-slate-300 ml-1">
                  자동저장됨
                </span>
              )}
            </>
          )}
          <div className="flex-1" />
          {!readOnly && (
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (!session) return;
                try {
                  const res = await fetch(`/api/sessions/${session.id}`, {
                    method: "DELETE",
                  });
                  if (res.ok) {
                    removeFromStore(session.id);
                    closeModal();
                  } else setError("삭제 실패");
                } catch {
                  setError("삭제 실패");
                }
              }}
            >
              삭제
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail tab ────────────────────────────────────────────────────────────────
function DetailTab({
  session,
  student,
  statusText,
  primaryOffset,
  onUpdate,
  readOnly,
}: any) {
  return (
    <div>
      <Row icon="🕐" bg="bg-sky-50" label="시간">
        {fmtTz(session.start, primaryOffset)} –{" "}
        {fmtTz(session.end, primaryOffset)}
        <span className="text-slate-400 ml-1.5 font-normal">
          ({Math.round(((session.end - session.start) / 3600000) * 10) / 10}
          시간)
        </span>
      </Row>
      <Row icon="📍" bg="bg-green-50" label="장소">
        {readOnly ? (
          <span className="text-[13px] font-semibold text-slate-800">
            {session.place || "장소 미입력"}
          </span>
        ) : (
          <input
            className="bg-transparent border-none outline-none text-[13px] font-semibold text-slate-800 w-full hover:bg-slate-50 focus:bg-sky-50 focus:px-1.5 rounded transition-all cursor-pointer"
            value={session.place}
            onChange={(e) => onUpdate("place", e.target.value)}
            placeholder="장소를 입력하세요"
          />
        )}
      </Row>
      <Row icon="📊" bg="bg-amber-50" label="상태">
        {statusText}
      </Row>
      {student && (
        <Row icon="📚" bg="bg-sky-50" label="학생">
          {student.name} · {student.grade} · {student.subject}
        </Row>
      )}
      {session.notes && (
        <Row icon="📝" bg="bg-slate-50" label="메모">
          <span className="text-slate-600 font-normal leading-relaxed">
            {session.notes}
          </span>
        </Row>
      )}
    </div>
  );
}

// ── Record tab ────────────────────────────────────────────────────────────────
function RecordTab({
  session,
  hwInput,
  setHwInput,
  onUpdate,
  onAddHw,
  onToggleHw,
  onRemoveHw,
  readOnly,
}: any) {
  return (
    <div className="flex flex-col gap-5">
      {/* Notes */}
      <div>
        <FieldLabel>
          수업 내용 메모
        </FieldLabel>
        {readOnly ? (
          <div className="min-h-[110px] whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-700">
            {session.notes || "수업 기록이 아직 작성되지 않았습니다."}
          </div>
        ) : (
          <textarea
            rows={4}
            value={session.notes}
            onChange={(e) => onUpdate("notes", e.target.value)}
            placeholder="오늘 수업에서 다룬 내용, 학생 반응, 특이사항 등..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 p-3 leading-relaxed outline-none resize-none focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(16,67,109,.1)] transition-all"
          />
        )}
      </div>

      {/* Understanding */}
      <div>
        <FieldLabel>이해도</FieldLabel>
        <MoodRow
          opts={U_OPTS}
          value={session.understanding}
          onChange={(v: Understanding) => onUpdate("understanding", v)}
          disabled={readOnly}
        />
      </div>

      {/* Focus */}
      <div>
        <FieldLabel>집중도</FieldLabel>
        <MoodRow
          opts={F_OPTS}
          value={session.focus}
          onChange={(v: Focus) => onUpdate("focus", v)}
          disabled={readOnly}
        />
      </div>

      {/* Homework */}
      <div>
        <FieldLabel>
          숙제
        </FieldLabel>
        <div className="flex flex-col gap-1 mb-2">
          {session.homework.map((h: HomeworkItem) => (
            <div
              key={h.id}
              className="flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-100 rounded-lg text-[13px]"
            >
              <button
                onClick={() => onToggleHw(h.id)}
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
                  onClick={() => onRemoveHw(h.id)}
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
                if (e.key === "Enter") onAddHw();
              }}
              placeholder="숙제 내용 입력..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg text-[13px] px-3 py-2 outline-none focus:border-sky-400 transition-colors"
            />
            <Button variant="soft" size="sm" onClick={onAddHw}>
              + 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small UI helpers ───────────────────────────────────────────────────────────
function Row({
  icon,
  bg,
  label,
  children,
}: {
  icon: string;
  bg: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-0 text-[13px]">
      <div
        className={`w-8 h-8 ${bg} rounded-[9px] flex items-center justify-center text-[14px] flex-shrink-0`}
      >
        {icon}
      </div>
      <span className="text-[12px] font-semibold text-slate-400 w-14 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="font-semibold text-slate-800 flex-1 pt-0.5">
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
      {children}
    </div>
  );
}

function MoodRow({
  opts,
  value,
  onChange,
  disabled = false,
}: {
  opts: any[];
  value: string;
  onChange: (v: any) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => !disabled && onChange(o.v)}
          disabled={disabled}
          className={`flex-1 py-2 px-1 rounded-xl border-[1.5px] text-[12px] font-semibold text-slate-500 transition-all
            ${value === o.v ? "border-sky-500 bg-sky-50 text-sky-700" : `border-slate-200 ${disabled ? "cursor-default" : "hover:border-sky-300 hover:text-sky-600"}`}`}
        >
          <span className="block text-[18px] mb-0.5">{o.e}</span>
          {o.l}
        </button>
      ))}
    </div>
  );
}
