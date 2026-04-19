"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  defaultStartMonthValue,
  StartMonthPicker,
} from "@/components/students/StartMonthPicker";
import { StudentColorPicker } from "@/components/students/StudentColorPicker";
import type { Student, StudentColor, StudentStatus } from "@/types";

const STATUS_OPTS: { v: StudentStatus; label: string }[] = [
  { v: "active", label: "활성" },
  { v: "warning", label: "주의" },
  { v: "inactive", label: "휴식" },
];

function firstChar(s: string) {
  const t = s.trim();
  if (!t) return "?";
  return [...t][0] ?? "?";
}

export function AddStudentModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean; //modal open/close
  onClose: () => void; //non-parm func
  onAdded: (student: Student) => void; //param: student
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [color, setColor] = useState<StudentColor>("s-blue");
  const [avatarChar, setAvatarChar] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [startDate, setStartDate] = useState(defaultStartMonthValue);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // [open]: open 값이 바뀔 때마다 이 함수 실행해라
  useEffect(() => {
    if (!open) return;
    setName("");
    setSubject("");
    setGrade("");
    setSchool("");
    setColor("s-blue");
    setAvatarChar("");
    setStatus("active");
    setStartDate(defaultStartMonthValue());
    setLocalError(null);
    setSaving(false);
  }, [open]);

  // 모달 닫혔으면 아무것도 렌더링하지마라
  if (!open) return null;

  //React.FormEvent: form submit event object
  async function handleSubmit(e: React.FormEvent) {
    // prevent refresh or redirection after submission
    e.preventDefault();
    const n = name.trim();
    const sub = subject.trim();
    const gr = grade.trim();
    const sc = school.trim();
    if (!n || !sub || !gr || !sc) {
      setLocalError("이름, 과목, 학년, 학교는 필수입니다.");
      return;
    }
    const char = (avatarChar.trim() || firstChar(n)).slice(0, 1);

    setSaving(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          subject: sub,
          grade: gr,
          school: sc,
          color,
          avatarChar: char,
          status,
          startDate,
        }),
      });

      // catch(() => ({})): 에러나면 대신 {} 반환
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "학생 추가에 실패했습니다.",
        );
      }
      // Omit: data를 student 타입인데 다음 3가지 필드가 빠진 형태로 간주하겠다.
      const row = data as Omit<
        Student,
        "lastSessionAt" | "lastSessionContent" | "thisMonthSessionCount"
      >;
      onAdded({
        ...row,
        lastSessionAt: null,
        lastSessionContent: null,
        thisMonthSessionCount: 0,
      });
      onClose();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "학생 추가에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] max-h-[92vh] overflow-y-auto mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-sky-400 to-sky-500" />
        <div className="px-6 pt-5 pb-2">
          <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
            학생 추가
          </h2>
          <p className="text-[12px] text-slate-400 mt-1">
            기본 정보를 입력한 뒤 저장하세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3.5">
          {localError && (
            <div className="text-[12px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {localError}
            </div>
          )}

          <label className="block">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              이름 <span className="text-red-400">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] text-slate-800 outline-none focus:border-sky-400 transition-colors"
              placeholder="예: 김민준"
              autoComplete="name"
            />
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                과목 <span className="text-red-400">*</span>
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400"
                placeholder="수학"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                학년 <span className="text-red-400">*</span>
              </span>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400"
                placeholder="고2"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              학교 <span className="text-red-400">*</span>
            </span>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400"
              placeholder="한국고등학교"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              아바타 글자
            </span>
            <input
              value={avatarChar}
              onChange={(e) => setAvatarChar(e.target.value.slice(0, 1))}
              className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400"
              placeholder="비우면 이름 첫 글자"
              maxLength={1}
            />
          </label>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
              색상
            </span>
            <StudentColorPicker
              value={color}
              onChange={setColor}
              disabled={saving}
            />
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
              상태
            </span>
            <div className="flex gap-1.5">
              {STATUS_OPTS.map(({ v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatus(v)}
                  className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                    status === v
                      ? "bg-sky-500 text-white border-sky-500"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="block">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              수업 시작 (월)
            </span>
            <StartMonthPicker
              className="mt-1"
              value={startDate}
              onChange={setStartDate}
              disabled={saving}
            />
          </div>

          {/* <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                총 수업
              </span>
              <input
                type="number"
                min={0}
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                숙제 완료율 (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={hwCompletionRate}
                onChange={(e) => setHwCompletionRate(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400"
              />
            </label>
          </div> */}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="flex-1"
              disabled={saving}
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={saving}
            >
              {saving ? "저장 중…" : "추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
