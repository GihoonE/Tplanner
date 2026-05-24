"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { resolveAvatarBg } from "@/lib/studentColor";
import { fmtTz } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { useTzData } from "@/store";

type ParentHomework = { id: number; text: string; done: boolean };

type ParentSession = {
  id: number;
  start: string;
  end: string;
  place: string;
  notes: string;
  understanding: string;
  focus: string;
  homework: ParentHomework[];
};

type ParentStudent = {
  id: number;
  name: string;
  subject: string;
  grade: string;
  school: string;
  color: string;
  avatarChar: string;
  status: string;
  stats: {
    thisMonthSessionCount: number;
    pendingHomeworkCount: number;
    homeworkCompletionRate: number;
    reportCount: number;
    nextSessionAt: string | null;
  };
  nextSession: ParentSession | null;
  recentSessions: ParentSession[];
  pendingHomeworkSessions: {
    session: ParentSession;
    homework: ParentHomework[];
  }[];
  reports: {
    id: number;
    title: string;
    status: string;
    periodStart: string | null;
    periodEnd: string | null;
    summary: string;
    updatedAt: string;
  }[];
};

function toDate(value: string) {
  return new Date(value);
}

function monthDay(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function statusText(status: string) {
  if (status === "sent") return "전송완료";
  if (status === "draft") return "초안";
  return status;
}

export default function ParentPage() {
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);
  const tzData = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);

  async function loadParentData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/students");
      if (!res.ok) throw new Error("자녀 정보를 불러오지 못했습니다.");
      const data = (await res.json()) as ParentStudent[];
      setStudents(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "자녀 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParentData();
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedId) ?? students[0],
    [selectedId, students],
  );

  async function acceptInvitation() {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setAcceptMessage("초대 코드를 입력해 주세요.");
      return;
    }

    setAccepting(true);
    setAcceptMessage(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "초대 코드 연결에 실패했습니다.");
      setInviteCode("");
      setAcceptMessage("학생 연결이 완료되었습니다.");
      await loadParentData();
    } catch (e) {
      setAcceptMessage(
        e instanceof Error ? e.message : "초대 코드 연결에 실패했습니다.",
      );
    } finally {
      setAccepting(false);
    }
  }

  return (
    <AppShell>
      <div className="h-[54px] flex items-center gap-3 border-b border-slate-100 bg-white px-6 flex-shrink-0">
        <div className="flex-1">
          <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
            자녀 학습 현황
          </span>
          <span className="ml-3 text-[12px] text-slate-400">
            수업 기록, 숙제, 리포트를 한 곳에서 확인합니다
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="초대 코드"
            maxLength={8}
            className="h-9 w-[132px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-bold uppercase tracking-wide text-slate-700 outline-none focus:border-sky-300 focus:bg-white"
          />
          <button
            type="button"
            onClick={acceptInvitation}
            disabled={accepting}
            className="h-9 rounded-xl bg-sky-500 px-4 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60"
          >
            {accepting ? "연결 중" : "연결하기"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
            {error}
          </div>
        )}
        {acceptMessage && (
          <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[13px] font-semibold text-sky-700">
            {acceptMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-[13px] font-semibold text-slate-400">
            학습 현황을 불러오는 중이에요
          </div>
        ) : students.length === 0 ? (
          <div className="mx-auto mt-12 max-w-[520px] rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-[18px] font-black text-sky-600">
              T
            </div>
            <h1 className="text-[22px] font-black tracking-tight text-slate-950">
              아직 연결된 학생이 없습니다
            </h1>
            <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
              선생님에게 받은 8자리 초대 코드를 입력하면 자녀의 수업 현황을 볼 수 있습니다.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="AB12CD34"
                maxLength={8}
                className="h-11 w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-4 text-center text-[14px] font-black uppercase tracking-widest text-slate-800 outline-none focus:border-sky-300 focus:bg-white"
              />
              <button
                type="button"
                onClick={acceptInvitation}
                disabled={accepting}
                className="h-11 rounded-xl bg-sky-500 px-5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                연결하기
              </button>
            </div>
          </div>
        ) : selectedStudent ? (
          <>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedId(student.id)}
                  className={`flex min-w-[170px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                    selectedStudent.id === student.id
                      ? "border-sky-200 bg-sky-50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-sky-100"
                  }`}
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white"
                    style={{ background: resolveAvatarBg(student.color) }}
                  >
                    {student.avatarChar}
                  </div>
                  <div>
                    <div className="text-[13px] font-extrabold text-slate-900">
                      {student.name}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      {student.subject} · {student.grade}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-4 gap-3">
              {[
                {
                  label: "이번 달 수업",
                  value: selectedStudent.stats.thisMonthSessionCount,
                  note: "수업",
                },
                {
                  label: "미완료 숙제",
                  value: selectedStudent.stats.pendingHomeworkCount,
                  note: "개",
                },
                {
                  label: "숙제 성취도",
                  value: selectedStudent.stats.homeworkCompletionRate,
                  note: "%",
                },
                {
                  label: "최근 리포트",
                  value: selectedStudent.stats.reportCount,
                  note: "개",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="mb-1 text-[11px] font-semibold text-slate-400">
                    {stat.label}
                  </div>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900">
                    {stat.value}
                    <span className="ml-1 text-[12px] font-bold text-slate-400">
                      {stat.note}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1.25fr_.9fr] gap-4">
              <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-bold text-slate-700">
                      수업 기록
                    </div>
                    <div className="text-[11px] font-medium text-slate-300">
                      다음 수업과 지난 수업 기록
                    </div>
                  </div>
                  {selectedStudent.nextSession && (
                    <Badge variant="sky">
                      다음 {monthDay(toDate(selectedStudent.nextSession.start))}
                    </Badge>
                  )}
                </div>

                {selectedStudent.nextSession && (
                  <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-sky-500">
                      다음 수업
                    </div>
                    <div className="mt-1 text-[15px] font-extrabold text-slate-900">
                      {monthDay(toDate(selectedStudent.nextSession.start))}{" "}
                      {fmtTz(toDate(selectedStudent.nextSession.start), primaryOffset)} ~{" "}
                      {fmtTz(toDate(selectedStudent.nextSession.end), primaryOffset)}
                    </div>
                    <div className="mt-1 text-[12px] font-medium text-slate-500">
                      {selectedStudent.nextSession.place || "장소 미정"}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {selectedStudent.recentSessions.length === 0 ? (
                    <p className="text-[12px] text-slate-300">
                      지난 수업 기록이 없습니다.
                    </p>
                  ) : (
                    selectedStudent.recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <div className="text-[13px] font-extrabold text-slate-900">
                            {monthDay(toDate(session.start))}{" "}
                            {fmtTz(toDate(session.start), primaryOffset)} ~{" "}
                            {fmtTz(toDate(session.end), primaryOffset)}
                          </div>
                          <Badge variant="gray">완료</Badge>
                        </div>
                        <p className="line-clamp-2 text-[12px] leading-5 text-slate-500">
                          {session.notes || "수업 기록이 아직 작성되지 않았습니다."}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-1 text-[13px] font-bold text-slate-700">
                    숙제 현황
                  </div>
                  <div className="mb-4 text-[11px] font-medium text-slate-300">
                    세션별 미완료 숙제
                  </div>
                  {selectedStudent.pendingHomeworkSessions.length === 0 ? (
                    <p className="text-[12px] text-slate-300">
                      미완료 숙제가 없습니다.
                    </p>
                  ) : (
                    selectedStudent.pendingHomeworkSessions.map((item) => (
                      <div
                        key={item.session.id}
                        className="border-b border-slate-100 py-3 last:border-0"
                      >
                        <div className="mb-1 text-[12px] font-bold text-slate-800">
                          {monthDay(toDate(item.session.start))} 수업
                        </div>
                        <ul className="ml-4 list-disc space-y-0.5 text-[12px] text-slate-500">
                          {item.homework.map((homework) => (
                            <li key={homework.id}>{homework.text}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </section>

                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-1 text-[13px] font-bold text-slate-700">
                    리포트
                  </div>
                  <div className="mb-4 text-[11px] font-medium text-slate-300">
                    선생님이 발급한 리포트
                  </div>
                  {selectedStudent.reports.length === 0 ? (
                    <p className="text-[12px] text-slate-300">
                      아직 발급된 리포트가 없습니다.
                    </p>
                  ) : (
                    selectedStudent.reports.map((report) => (
                      <div
                        key={report.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 mb-2 last:mb-0"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[13px] font-extrabold text-slate-900">
                            {report.title}
                          </div>
                          <Badge variant={report.status === "sent" ? "green" : "gray"}>
                            {statusText(report.status)}
                          </Badge>
                        </div>
                        <p className="line-clamp-2 text-[12px] leading-5 text-slate-500">
                          {report.summary || "리포트 요약이 없습니다."}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
