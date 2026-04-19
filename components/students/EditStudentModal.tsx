"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StartMonthPicker } from "@/components/students/StartMonthPicker";
import { StudentColorPicker } from "@/components/students/StudentColorPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

function monthFromStartDate(s: string) {
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
  return s;
}

export function EditStudentModal({
  student,
  onClose,
  onSaved,
  onDeleted,
}: {
  student: Student | null;
  onClose: () => void;
  onSaved: (s: Student) => void;
  onDeleted: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [color, setColor] = useState<StudentColor>("s-blue");
  const [avatarChar, setAvatarChar] = useState("");
  const [status, setStatus] = useState<StudentStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [totalSessions, setTotalSessions] = useState("0");
  const [hwCompletionRate, setHwCompletionRate] = useState("0");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!student) return;
    setName(student.name);
    setSubject(student.subject);
    setGrade(student.grade);
    setSchool(student.school);
    setColor(student.color);
    setAvatarChar(student.avatarChar);
    setStatus(student.status);
    setStartDate(monthFromStartDate(student.startDate));
    setTotalSessions(String(student.totalSessions));
    setHwCompletionRate(String(student.hwCompletionRate));
    setLocalError(null);
    setSaving(false);
    setDeleting(false);
    setDeleteConfirmOpen(false);
  }, [student]);

  if (!student) return null;

  async function handleSubmit(e: React.FormEvent) {
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
    const ts = Math.max(0, parseInt(totalSessions, 10) || 0);
    const hw = Math.min(100, Math.max(0, parseInt(hwCompletionRate, 10) || 0));

    setSaving(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
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
          totalSessions: ts,
          hwCompletionRate: hw,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "저장에 실패했습니다.",
        );
      }
      const row = data as Student;
      onSaved({
        ...student,
        ...row,
      });
      onClose();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function executeStudentDelete() {
    setDeleting(true);
    setLocalError(null);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "삭제에 실패했습니다.",
        );
      }
      setDeleteConfirmOpen(false);
      onDeleted(student.id);
      onClose();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "삭제에 실패했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !deleting) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] max-h-[92vh] overflow-y-auto mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full rounded-t-2xl bg-gradient-to-r from-violet-400 to-sky-500" />
        <div className="px-6 pt-5 pb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
              학생 정보 변경
            </h2>
            <p className="text-[12px] text-slate-400 mt-1">
              내용을 수정한 뒤 저장하거나 삭제할 수 있어요.
            </p>
          </div>
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
              disabled={saving || deleting}
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
              disabled={saving || deleting}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
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
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="flex-1"
              disabled={saving || deleting}
              onClick={onClose}
            >
              닫기
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1"
              disabled={saving || deleting}
            >
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="danger"
              size="md"
              className="w-full"
              disabled={saving || deleting}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              학생 삭제
            </Button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      open={deleteConfirmOpen}
      title="학생 삭제"
      description={
        <>
          <span className="font-semibold text-slate-800">
            {`"${student.name}"`}
          </span>{" "}
          학생을 삭제할까요?
          <br />
          <span className="mt-2 block text-[12px] text-slate-500">
            이 학생의 수업·숙제 기록도 함께 삭제되며 복구할 수 없습니다.
          </span>
        </>
      }
      confirmLabel="삭제"
      cancelLabel="취소"
      danger
      loading={deleting}
      onCancel={() => !deleting && setDeleteConfirmOpen(false)}
      onConfirm={executeStudentDelete}
    />
    </>
  );
}
