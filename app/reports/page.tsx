"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fmtTz, formatMonthDay, getPrimaryOffset } from "@/lib/utils";
import { useTzData } from "@/store";
import {
  apiSessionToSession,
  queryKeys,
  useReportsQuery,
  useSessionsQuery,
  useStudentsQuery,
  type ApiSessionRow,
} from "@/hooks/useAppQueries";
import type { Focus, Report, Session, Student, Understanding } from "@/types";

type SessionDraft = {
  notes: string;
  understanding: Understanding;
  focus: Focus;
};

type ReportMode = "list" | "sessions" | "prepare" | "draft" | "edit";

type ReportDraft = {
  summary: string;
  strengths: string;
  improvements: string;
  nextPlan: string;
};

type ApiReportRow = Report & {
  sessions?: {
    id: number;
    start: string;
    end: string;
    notes: string;
    place: string;
    understanding: string;
    focus: string;
  }[];
};

const UNDERSTANDING_OPTIONS: { value: Understanding; label: string }[] = [
  { value: "", label: "미기록" },
  { value: "good", label: "잘 이해" },
  { value: "normal", label: "보통" },
  { value: "hard", label: "어려움" },
];

const FOCUS_OPTIONS: { value: Focus; label: string }[] = [
  { value: "", label: "미기록" },
  { value: "high", label: "높음" },
  { value: "normal", label: "보통" },
  { value: "low", label: "낮음" },
];

function apiReportToReport(row: ApiReportRow): Report {
  return {
    id: row.id,
    studentId: row.studentId,
    title: row.title,
    status: row.status,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    summary: row.summary,
    strengths: row.strengths,
    improvements: row.improvements,
    nextPlan: row.nextPlan,
    sessionIds: row.sessionIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isSameMonth(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthStart(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function monthEnd(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function titleFromStudentAndMonth(student: Student, date: Date) {
  return `${student.name} ${date.getFullYear()}년 ${date.getMonth() + 1}월 리포트`;
}

function formatReportPeriod(report: Report) {
  if (!report.periodStart && !report.periodEnd) return "기간 미지정";
  const start = report.periodStart
    ? formatMonthDay(new Date(report.periodStart))
    : "";
  const end = report.periodEnd ? formatMonthDay(new Date(report.periodEnd)) : "";
  if (start && end && start !== end) return `${start}-${end}`;
  return start || end || "기간 미지정";
}

function statusLabel(status: string) {
  return status === "sent" ? "완료" : "초안";
}

function draftFromSession(session: Session): SessionDraft {
  return {
    notes: session.notes,
    understanding: session.understanding,
    focus: session.focus,
  };
}

function understandingBadge(value: Understanding) {
  if (value === "good") return <Badge variant="green">잘이해</Badge>;
  if (value === "normal") return <Badge variant="gray">보통</Badge>;
  if (value === "hard") return <Badge variant="red">어려움</Badge>;
  return <Badge variant="gray">이해도 미기록</Badge>;
}

function focusLabel(value: Focus) {
  if (value === "high") return "집중 높음";
  if (value === "normal") return "집중 보통";
  if (value === "low") return "집중 낮음";
  return "집중도 미기록";
}

function sessionTitle(session: Session, primaryOffset: number) {
  return `${formatMonthDay(session.start)} ${fmtTz(session.start, primaryOffset)}-${fmtTz(session.end, primaryOffset)}`;
}

function compareStudentsByReportOrder(a: Student, b: Student) {
  const statusA = a.status === "active" ? 0 : 1;
  const statusB = b.status === "active" ? 0 : 1;
  return statusA !== statusB
    ? statusA - statusB
    : a.name.localeCompare(b.name, "ko");
}

export default function ReportsPage() {
  const { data: authSession } = useSession();
  const readOnly = authSession?.user?.role === "parent";
  const queryClient = useQueryClient();
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);
  const studentsQuery = useStudentsQuery();
  const sessionsQuery = useSessionsQuery();
  const reportsQuery = useReportsQuery();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [drafts, setDrafts] = useState<Record<number, SessionDraft>>({});
  const [search, setSearch] = useState("");
  const loadState =
    studentsQuery.isLoading || sessionsQuery.isLoading || reportsQuery.isLoading
      ? "loading"
      : studentsQuery.isError || sessionsQuery.isError || reportsQuery.isError
        ? "error"
        : "ready";
  const loadError =
    studentsQuery.error instanceof Error
      ? studentsQuery.error.message
      : sessionsQuery.error instanceof Error
        ? sessionsQuery.error.message
        : reportsQuery.error instanceof Error
          ? reportsQuery.error.message
          : null;
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [mode, setMode] = useState<ReportMode>("list");
  const [reportOptions, setReportOptions] = useState({
    summary: true,
    understanding: true,
    homework: true,
    nextPlan: true,
  });
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [reportStatus, setReportStatus] = useState<"draft" | "sent">("draft");
  const now = useMemo(() => new Date(), []);
  const [fromMonth, setFromMonth] = useState(() => monthValue(new Date()));
  const [toMonth, setToMonth] = useState(() => monthValue(new Date()));

  useEffect(() => {
    if (!studentsQuery.data) return;
    const firstStudentByReportOrder = [...studentsQuery.data].sort(
      compareStudentsByReportOrder,
    )[0];
    setStudents(studentsQuery.data);
    setSelectedStudentId((current) => current ?? firstStudentByReportOrder?.id ?? null);
  }, [studentsQuery.data]);

  useEffect(() => {
    if (sessionsQuery.data) setSessions(sessionsQuery.data);
  }, [sessionsQuery.data]);

  useEffect(() => {
    if (reportsQuery.data) {
      setReports(reportsQuery.data);
    }
  }, [reportsQuery.data]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? students.filter(
          (student) =>
            student.name.toLowerCase().includes(q) ||
            student.subject.toLowerCase().includes(q) ||
            student.grade.toLowerCase().includes(q),
        )
      : students;

    return [...filtered].sort(compareStudentsByReportOrder);
  }, [search, students]);

  const selectedStudent =
    selectedStudentId == null
      ? null
      : students.find((student) => student.id === selectedStudentId) ?? null;

  const sessionsByStudent = useMemo(() => {
    const map = new Map<number, Session[]>();
    sessions.forEach((session) => {
      if (session.studentId == null) return;
      const current = map.get(session.studentId) ?? [];
      current.push(session);
      map.set(session.studentId, current);
    });
    map.forEach((value, key) => {
      map.set(
        key,
        [...value].sort((a, b) => b.start.getTime() - a.start.getTime()),
      );
    });
    return map;
  }, [sessions]);

  const selectedStudentSessions =
    selectedStudentId == null
      ? []
      : sessionsByStudent.get(selectedStudentId) ?? [];

  const filteredStudentSessions = useMemo(() => {
    const from = monthStart(fromMonth);
    const to = monthEnd(toMonth);
    return selectedStudentSessions.filter(
      (session) => session.start >= from && session.start <= to,
    );
  }, [fromMonth, selectedStudentSessions, toMonth]);

  const checkedSessions = filteredStudentSessions.filter((session) =>
    selectedSessionIds.has(session.id),
  );

  const selectedStudentReports = useMemo(() => {
    if (selectedStudentId == null) return [];
    return reports
      .filter((report) => report.studentId === selectedStudentId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [reports, selectedStudentId]);

  const selectedReport =
    selectedReportId == null
      ? null
      : reports.find((report) => report.id === selectedReportId) ?? null;

  function selectStudent(studentId: number) {
    setSelectedStudentId(studentId);
    setSelectedSessionIds(new Set());
    setSelectedReportId(null);
    setMode("list");
    setReportDraft(null);
    setReportTitle("");
    setReportStatus("draft");
    setSaveError(null);
    setReportError(null);
  }

  function openCreateMode() {
    if (readOnly) return;
    if (!selectedStudent) return;
    setSelectedReportId(null);
    setSelectedSessionIds(new Set());
    setReportDraft(null);
    setReportTitle(titleFromStudentAndMonth(selectedStudent, new Date()));
    setReportStatus("draft");
    setReportError(null);
    setMode("sessions");
  }

  function openListMode() {
    setSelectedReportId(null);
    setSelectedSessionIds(new Set());
    setReportDraft(null);
    setReportTitle("");
    setReportStatus("draft");
    setReportError(null);
    setMode("list");
  }

  function openEditMode(report: Report) {
    setSelectedReportId(report.id);
    setSelectedSessionIds(new Set(report.sessionIds));
    setReportDraft({
      summary: report.summary,
      strengths: report.strengths,
      improvements: report.improvements,
      nextPlan: report.nextPlan,
    });
    setReportTitle(report.title);
    setReportStatus(report.status === "sent" ? "sent" : "draft");
    setReportError(null);
    setMode("edit");
  }

  function toggleSession(sessionId: number) {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function updateDraft(session: Session, patch: Partial<SessionDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [session.id]: {
        ...(prev[session.id] ?? draftFromSession(session)),
        ...patch,
      },
    }));
  }

  function getDraft(session: Session) {
    return drafts[session.id] ?? draftFromSession(session);
  }

  async function saveSession(session: Session) {
    const draft = getDraft(session);
    setSavingId(session.id);
    setSaveError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: draft.notes,
          understanding: draft.understanding,
          focus: draft.focus,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "수업 저장에 실패했습니다.",
        );
      }
      const updated = apiSessionToSession(body as ApiSessionRow);
      setSessions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      queryClient.setQueryData<Session[]>(queryKeys.sessions, (prev) =>
        prev?.map((item) => (item.id === updated.id ? updated : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["calendarSessions"] });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "수업 저장에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  function openPrepareMode() {
    if (checkedSessions.length === 0) return;
    setMode("prepare");
    setReportDraft(null);
    setReportError(null);
  }

  async function createDraft() {
    if (!selectedStudent || checkedSessions.length === 0) return;
    setGeneratingReport(true);
    setReportError(null);
    try {
      const res = await fetch("/api/reports/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          sessionIds: checkedSessions.map((session) => session.id),
          options: reportOptions,
          primaryOffset,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "리포트 초안 생성에 실패했습니다.",
        );
      }
      setReportDraft(body.draft as ReportDraft);
      if (!reportTitle && selectedStudent) {
        setReportTitle(titleFromStudentAndMonth(selectedStudent, new Date()));
      }
      setMode("draft");
    } catch (e) {
      setReportError(
        e instanceof Error ? e.message : "리포트 초안 생성에 실패했습니다.",
      );
    } finally {
      setGeneratingReport(false);
    }
  }

  function updateReportDraft(key: keyof ReportDraft, value: string) {
    setReportDraft((prev) =>
      prev
        ? {
            ...prev,
            [key]: value,
          }
        : prev,
    );
  }

  async function saveGeneratedReport() {
    if (!selectedStudent || !reportDraft || checkedSessions.length === 0) return;
    setSavingReport(true);
    setReportError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          title: reportTitle || titleFromStudentAndMonth(selectedStudent, new Date()),
          status: reportStatus,
          summary: reportDraft.summary,
          strengths: reportDraft.strengths,
          improvements: reportDraft.improvements,
          nextPlan: reportDraft.nextPlan,
          sessionIds: checkedSessions.map((session) => session.id),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "리포트 저장에 실패했습니다.",
        );
      }
      const saved = apiReportToReport(body as ApiReportRow);
      setReports((prev) => [saved, ...prev]);
      queryClient.setQueryData<Report[]>(queryKeys.reports, (prev) => [
        saved,
        ...(prev ?? []),
      ]);
      openListMode();
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "리포트 저장에 실패했습니다.");
    } finally {
      setSavingReport(false);
    }
  }

  async function saveEditedReport() {
    if (!selectedReport || !reportDraft) return;
    setSavingReport(true);
    setReportError(null);
    try {
      const res = await fetch(`/api/reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle,
          status: reportStatus,
          summary: reportDraft.summary,
          strengths: reportDraft.strengths,
          improvements: reportDraft.improvements,
          nextPlan: reportDraft.nextPlan,
          sessionIds: Array.from(selectedSessionIds),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "리포트 수정에 실패했습니다.",
        );
      }
      const updated = apiReportToReport(body as ApiReportRow);
      setReports((prev) =>
        prev.map((report) => (report.id === updated.id ? updated : report)),
      );
      queryClient.setQueryData<Report[]>(queryKeys.reports, (prev) =>
        prev?.map((report) => (report.id === updated.id ? updated : report)),
      );
      setSelectedReportId(updated.id);
      setReportTitle(updated.title);
      setReportStatus(updated.status === "sent" ? "sent" : "draft");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "리포트 수정에 실패했습니다.");
    } finally {
      setSavingReport(false);
    }
  }

  return (
    <AppShell>
      <div className="h-[54px] flex items-center px-5 gap-2.5 bg-white border-b border-slate-100 flex-shrink-0">
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight flex-1">
          리포트
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50">
        <div className="min-w-0 flex-[1.1] overflow-y-auto border-r border-slate-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">
                🔍
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="학생 이름, 과목, 학년으로 검색..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 outline-none focus:border-sky-400"
              />
            </div>
            <div className="text-[12px] font-semibold text-slate-400">
              학생 {filteredStudents.length}명
            </div>
          </div>

          {loadState === "loading" && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center text-[13px] text-slate-400">
              학생과 수업 기록을 불러오는 중이에요
            </div>
          )}
          {loadState === "error" && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-[13px] font-semibold text-red-600">
              {loadError}
            </div>
          )}

          {loadState !== "loading" && loadState !== "error" && (
            <div className={`grid gap-3 ${readOnly ? "grid-cols-2" : "grid-cols-4"}`}>
              {filteredStudents.map((student) => {
                const studentSessions = sessionsByStudent.get(student.id) ?? [];
                const latest = studentSessions[0];
                const thisMonthCount = studentSessions.filter((session) =>
                  isSameMonth(session.start, now),
                ).length;
                const pendingHomeworkCount = studentSessions.reduce(
                  (total, session) =>
                    total +
                    session.homework.filter((homework) => !homework.done).length,
                  0,
                );
                const active = student.id === selectedStudentId;

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => selectStudent(student.id)}
                    className={`min-w-0 rounded-xl border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-px hover:shadow-md ${
                      active
                        ? "border-sky-300 shadow-[0_0_0_3px_rgba(16,67,109,.1)]"
                        : "border-slate-100 hover:border-sky-200"
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Avatar
                        char={student.avatarChar}
                        color={student.color}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-extrabold text-slate-900">
                          {student.name}
                        </div>
                        <div className="truncate text-[11px] text-slate-400">
                          {student.grade} · {student.subject}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">최근 수업</span>
                        <span className="font-semibold text-slate-700">
                          {latest ? formatMonthDay(latest.start) : "없음"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">이번 달</span>
                        <span className="font-semibold text-slate-700">
                          {thisMonthCount}회
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">미완료 숙제</span>
                        <span className="font-semibold text-slate-700">
                          {pendingHomeworkCount}개
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-[0.9] flex-col bg-slate-50">
          <div className="border-b border-slate-100 bg-white p-5">
            {selectedStudent ? (
              mode === "list" || mode === "edit" ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    char={selectedStudent.avatarChar}
                    color={selectedStudent.color}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-extrabold tracking-tight text-slate-900">
                      {selectedStudent.name} 리포트
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-400">
                      {selectedStudent.grade} · {selectedStudent.school} ·{" "}
                      {selectedStudent.subject}
                    </div>
                  </div>
                  {mode === "list" ? (
                    !readOnly && (
                      <Button variant="primary" size="sm" onClick={openCreateMode}>
                        리포트 생성
                      </Button>
                    )
                  ) : (
                    <Button variant="ghost" size="sm" onClick={openListMode}>
                      목록으로
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      char={selectedStudent.avatarChar}
                      color={selectedStudent.color}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[17px] font-extrabold tracking-tight text-slate-900">
                        {selectedStudent.name}
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-400">
                        {selectedStudent.grade} · {selectedStudent.school} ·{" "}
                        {selectedStudent.subject}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-extrabold text-sky-600">
                        {checkedSessions.length}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        선택 세션
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        From
                      </span>
                      <input
                        type="month"
                        value={fromMonth}
                        max={toMonth}
                        onChange={(e) => {
                          const next = e.target.value;
                          setFromMonth(next);
                          if (next > toMonth) setToMonth(next);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        To
                      </span>
                      <input
                        type="month"
                        value={toMonth}
                        min={fromMonth}
                        onChange={(e) => {
                          const next = e.target.value;
                          setToMonth(next);
                          if (next < fromMonth) setFromMonth(next);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                      />
                    </label>
                    <div className="col-span-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
                      <span>표시 중인 수업 {filteredStudentSessions.length}개</span>
                      <button
                        type="button"
                        onClick={openListMode}
                        className="font-bold text-slate-500 hover:text-sky-600"
                      >
                        목록으로
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-[13px] text-slate-400">
                학생을 선택하면 최근 수업 기록을 확인할 수 있어요.
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {mode === "list" && selectedStudent && (
              <div className="flex flex-col gap-3">
                {selectedStudentReports.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-white p-8 text-center">
                    <div className="text-[14px] font-extrabold text-slate-800">
                      아직 저장된 리포트가 없습니다.
                    </div>
                    <div className="mt-1 text-[12px] text-slate-400">
                      {readOnly
                        ? "아직 발급된 리포트가 없습니다."
                        : "리포트 생성 버튼으로 수업 기록을 골라 첫 리포트를 만들 수 있어요."}
                    </div>
                    {!readOnly && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-4"
                        onClick={openCreateMode}
                      >
                        리포트 생성
                      </Button>
                    )}
                  </div>
                ) : (
                  selectedStudentReports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => openEditMode(report)}
                      className="rounded-xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-px hover:border-sky-200 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-extrabold text-slate-900">
                            {report.title}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-400">
                            {formatReportPeriod(report)} · 수업{" "}
                            {report.sessionIds.length}개
                          </div>
                        </div>
                        <Badge variant={report.status === "sent" ? "green" : "gray"}>
                          {statusLabel(report.status)}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 whitespace-pre-line text-[12px] leading-relaxed text-slate-500">
                        {report.summary || "요약 없음"}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}

            {mode === "sessions" && selectedStudent && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                <div>
                  <div className="text-[13px] font-extrabold text-slate-900">
                    리포트에 포함할 수업 선택
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    선택 세션 {checkedSessions.length}개
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={checkedSessions.length === 0}
                  className={
                    checkedSessions.length === 0
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={openPrepareMode}
                >
                  리포트 생성
                </Button>
              </div>
            )}

            {mode === "sessions" &&
              selectedStudent &&
              filteredStudentSessions.length === 0 && (
                <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-[13px] text-slate-400">
                  선택한 기간에 수업 기록이 없습니다.
                </div>
              )}

            {mode === "sessions" && saveError && (
              <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                {saveError}
              </div>
            )}

            {mode === "sessions" && (
              <div className="flex flex-col gap-3">
                {filteredStudentSessions.map((session) => {
                  const draft = getDraft(session);
                  const checked = selectedSessionIds.has(session.id);
                  const dirty =
                    draft.notes !== session.notes ||
                    draft.understanding !== session.understanding ||
                    draft.focus !== session.focus;

                  return (
                    <div
                      key={session.id}
                      className={`rounded-xl border bg-white p-4 shadow-sm ${
                        checked ? "border-sky-300" : "border-slate-100"
                      }`}
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSession(session.id)}
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors ${
                            checked
                              ? "border-sky-500 bg-sky-500 text-white"
                              : "border-slate-300 bg-white text-transparent hover:border-sky-300"
                          }`}
                        >
                          ✓
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-[14px] font-extrabold text-slate-900">
                              {formatMonthDay(session.start)} ·{" "}
                              {fmtTz(session.start, primaryOffset)}-
                              {fmtTz(session.end, primaryOffset)}
                            </div>
                            {understandingBadge(session.understanding)}
                            <Badge variant="gray">
                              {focusLabel(session.focus)}
                            </Badge>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {session.place || "장소 미기록"} · 숙제{" "}
                            {session.homework.length}개
                          </div>
                        </div>
                      </div>

                      <div className="mb-2.5 grid grid-cols-2 gap-2.5">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            이해도
                          </span>
                          <select
                            value={draft.understanding}
                            onChange={(e) =>
                              updateDraft(session, {
                                understanding: e.target.value as Understanding,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                          >
                            {UNDERSTANDING_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            집중도
                          </span>
                          <select
                            value={draft.focus}
                            onChange={(e) =>
                              updateDraft(session, {
                                focus: e.target.value as Focus,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                          >
                            {FOCUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <textarea
                        value={draft.notes}
                        onChange={(e) =>
                          updateDraft(session, { notes: e.target.value })
                        }
                        placeholder="수업 기록을 입력하세요..."
                        className="min-h-[92px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-700 outline-none transition-colors focus:border-sky-400 focus:bg-white"
                      />

                      {session.homework.length > 0 && (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            숙제
                          </div>
                          <ul className="ml-4 list-disc space-y-0.5 text-[12px] text-slate-600">
                            {session.homework.map((homework) => (
                              <li
                                key={homework.id}
                                className={
                                  homework.done
                                    ? "text-slate-300 line-through"
                                    : ""
                                }
                              >
                                {homework.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-slate-300">
                          {checked
                            ? "보고서에 포함됨"
                            : "보고서에 포함할 수업 선택"}
                        </div>
                        <Button
                          variant={dirty ? "primary" : "ghost"}
                          size="sm"
                          disabled={!dirty || savingId === session.id}
                          className={
                            !dirty || savingId === session.id
                              ? "pointer-events-none opacity-50"
                              : undefined
                          }
                          onClick={() => saveSession(session)}
                        >
                          {savingId === session.id ? "저장 중..." : "수정 저장"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {mode === "prepare" && selectedStudent && (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      리포트 생성 준비
                    </div>
                    <div className="mt-1 text-[18px] font-extrabold tracking-tight text-slate-900">
                      {selectedStudent.name} 리포트
                    </div>
                    <div className="mt-1 text-[12px] text-slate-400">
                      선택한 수업 {checkedSessions.length}개를 바탕으로 초안을 만듭니다.
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("sessions")}
                  >
                    뒤로
                  </Button>
                </div>

                <label className="mb-5 block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    리포트 제목
                  </span>
                  <input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder={titleFromStudentAndMonth(
                      selectedStudent,
                      new Date(),
                    )}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
                  />
                </label>

                <div className="mb-5 rounded-xl bg-slate-50 p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    선택한 수업
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {checkedSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[12px]"
                      >
                        <span className="font-semibold text-slate-700">
                          {sessionTitle(session, primaryOffset)}
                        </span>
                        <span className="truncate text-slate-400">
                          {session.notes || "기록 없음"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    포함할 내용
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["summary", "수업 요약"],
                      ["understanding", "이해도/집중도 변화"],
                      ["homework", "숙제 및 보완점"],
                      ["nextPlan", "다음 수업 계획"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={
                            reportOptions[key as keyof typeof reportOptions]
                          }
                          onChange={(e) =>
                            setReportOptions((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {reportError && (
                  <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                    {reportError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("sessions")}
                  >
                    세션 다시 선택
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={generatingReport}
                    className={
                      generatingReport ? "pointer-events-none opacity-50" : undefined
                    }
                    onClick={createDraft}
                  >
                    {generatingReport ? "생성 중..." : "리포트 초안 생성"}
                  </Button>
                </div>
              </div>
            )}

            {mode === "draft" && selectedStudent && reportDraft && (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      리포트 초안
                    </div>
                    <input
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-[18px] font-extrabold tracking-tight text-slate-900 outline-none transition-colors focus:border-sky-300 focus:bg-white focus:px-2"
                    />
                    <div className="mt-1 text-[12px] text-slate-400">
                      선택 수업 {checkedSessions.length}개 · 생성된 초안을 검토하고 직접 다듬을 수 있습니다.
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("prepare")}
                  >
                    옵션 수정
                  </Button>
                </div>

                <div className="mb-4 flex justify-end">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      상태
                    </span>
                    <select
                      value={reportStatus}
                      onChange={(e) =>
                        setReportStatus(e.target.value === "sent" ? "sent" : "draft")
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                    >
                      <option value="draft">초안</option>
                      <option value="sent">완료</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  {reportError && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      {reportError}
                    </div>
                  )}
                  {reportOptions.summary && (
                    <ReportTextarea
                      label="학습 요약"
                      value={reportDraft.summary}
                      onChange={(value) => updateReportDraft("summary", value)}
                    />
                  )}
                  {reportOptions.understanding && (
                    <ReportTextarea
                      label="잘한 점"
                      value={reportDraft.strengths}
                      onChange={(value) => updateReportDraft("strengths", value)}
                    />
                  )}
                  {reportOptions.homework && (
                    <ReportTextarea
                      label="보완할 점"
                      value={reportDraft.improvements}
                      onChange={(value) =>
                        updateReportDraft("improvements", value)
                      }
                    />
                  )}
                  {reportOptions.nextPlan && (
                    <ReportTextarea
                      label="다음 계획"
                      value={reportDraft.nextPlan}
                      onChange={(value) => updateReportDraft("nextPlan", value)}
                    />
                  )}
                </div>

                <div className="mt-5 flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("sessions")}
                  >
                    세션 선택으로 돌아가기
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={generatingReport}
                      className={
                        generatingReport
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      onClick={createDraft}
                    >
                      {generatingReport ? "생성 중..." : "다시 생성"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={savingReport}
                      className={
                        savingReport ? "pointer-events-none opacity-50" : undefined
                      }
                      onClick={saveGeneratedReport}
                    >
                      {savingReport ? "저장 중..." : "리포트 저장"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {mode === "edit" && selectedReport && reportDraft && (
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {readOnly ? "리포트 조회" : "리포트 수정"}
                    </div>
                    {readOnly ? (
                      <div className="mt-1 py-1 text-[18px] font-extrabold tracking-tight text-slate-900">
                        {reportTitle}
                      </div>
                    ) : (
                      <input
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-[18px] font-extrabold tracking-tight text-slate-900 outline-none transition-colors focus:border-sky-300 focus:bg-white focus:px-2"
                      />
                    )}
                    <div className="mt-1 text-[12px] text-slate-400">
                      {formatReportPeriod(selectedReport)} · 포함 수업{" "}
                      {selectedReport.sessionIds.length}개
                    </div>
                  </div>
                  <Badge variant={reportStatus === "sent" ? "green" : "gray"}>
                    {statusLabel(reportStatus)}
                  </Badge>
                </div>

                {!readOnly && (
                <div className="mb-4 flex justify-end">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      상태
                    </span>
                    <select
                      value={reportStatus}
                      onChange={(e) =>
                        setReportStatus(e.target.value === "sent" ? "sent" : "draft")
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-sky-400"
                    >
                      <option value="draft">초안</option>
                      <option value="sent">완료</option>
                    </select>
                  </label>
                </div>
                )}

                <div className="space-y-3">
                  {reportError && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      {reportError}
                    </div>
                  )}
                  <ReportTextarea
                    label="학습 요약"
                    value={reportDraft.summary}
                    onChange={(value) => updateReportDraft("summary", value)}
                    readOnly={readOnly}
                  />
                  <ReportTextarea
                    label="잘한 점"
                    value={reportDraft.strengths}
                    onChange={(value) => updateReportDraft("strengths", value)}
                    readOnly={readOnly}
                  />
                  <ReportTextarea
                    label="보완할 점"
                    value={reportDraft.improvements}
                    onChange={(value) => updateReportDraft("improvements", value)}
                    readOnly={readOnly}
                  />
                  <ReportTextarea
                    label="다음 계획"
                    value={reportDraft.nextPlan}
                    onChange={(value) => updateReportDraft("nextPlan", value)}
                    readOnly={readOnly}
                  />
                </div>

                <div className="mt-5 flex justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={openListMode}>
                    목록으로
                  </Button>
                  {!readOnly && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={savingReport}
                      className={
                        savingReport ? "pointer-events-none opacity-50" : undefined
                      }
                      onClick={saveEditedReport}
                    >
                      {savingReport ? "저장 중..." : "수정 저장"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ReportTextarea({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="block">
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <div className="min-h-[110px] whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-700">
          {value || "작성된 내용이 없습니다."}
        </div>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-relaxed text-slate-700 outline-none transition-colors focus:border-sky-400 focus:bg-white"
      />
    </label>
  );
}
