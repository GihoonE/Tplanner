"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useTutorStore, useSessions, useNow, useTzData } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { fmtTz, sameDay } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";

export default function DashboardPage() {
  const sessions  = useSessions();
  const students  = useTutorStore((s) => s.students);
  const now       = useNow();
  const tzData    = useTzData();
  const primaryOffset = getPrimaryOffset(tzData);

  const todaySessions = sessions.filter((s) => sameDay(s.start, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const pendingHw = sessions.flatMap((s) => s.homework.filter((h) => !h.done))
    .slice(0, 4);

  const recentActivity = sessions
    .filter((s) => s.notes.trim())
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .slice(0, 4);

  return (
    <AppShell>
      {/* Topbar */}
      <div className="h-[54px] flex items-center px-6 gap-3 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex-1">
          <span className="text-[15px] font-extrabold text-slate-900 tracking-tight">
            안녕하세요, 김선생님 👋
          </span>
          <span className="ml-3 text-[12px] text-slate-400">
            오늘 {now.getMonth() + 1}월 {now.getDate()}일 {["일","월","화","수","목","금","토"][now.getDay()]}요일 — 수업 {todaySessions.length}건
          </span>
        </div>
        <button className="text-[13px] font-bold px-4 py-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-[0_2px_8px_rgba(14,165,233,.3)]">
          + 수업 기록
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { icon: "👤", label: "전체 학생",     val: students.length,    note: "↑ 이번 달 +2명",   ok: true  },
            { icon: "📚", label: "이번 달 수업",   val: 38,                 note: "↑ 지난달 +5",      ok: true  },
            { icon: "📋", label: "미완료 숙제",    val: pendingHw.length,   note: "⚠ 확인 필요",     ok: false },
            { icon: "📊", label: "이번 달 리포트", val: 4,                  note: "✓ 전송 완료",      ok: true  },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-[10px] bg-sky-50 flex items-center justify-center text-[16px] mb-3">{stat.icon}</div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1">{stat.label}</div>
              <div className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-none mb-1">{stat.val}</div>
              <div className={`text-[12px] font-semibold ${stat.ok ? "text-green-600" : "text-amber-600"}`}>{stat.note}</div>
            </div>
          ))}
        </div>

        {/* Today's schedule */}
        <div className="mb-6">
          <div className="text-[13px] font-bold text-slate-700 mb-3">오늘 수업 일정</div>
          <div className="flex flex-col gap-2">
            {todaySessions.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 text-[13px] text-slate-300 text-center">
                오늘 예정된 수업이 없어요
              </div>
            )}
            {todaySessions.map((s) => {
              const st      = students.find((x) => x.id === s.studentId);
              const ongoing = s.start <= now && now < s.end;
              const done    = s.end < now;
              return (
                <div key={s.id}
                  className={`flex items-center gap-4 bg-white rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer
                    ${ongoing ? "border-sky-200 bg-sky-50/50" : "border-slate-100"}`}>
                  <span className="text-[12px] font-semibold text-slate-400 w-14 flex-shrink-0 tabular-nums">
                    {fmtTz(s.start, primaryOffset)}
                  </span>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    ongoing ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,.2)]" :
                    done    ? "bg-slate-300" : "bg-sky-400"
                  }`} />
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-slate-900">{st?.name ?? "미정"}</div>
                    <div className="text-[12px] text-slate-400">{st?.subject} · {
                      Math.round((s.end.getTime() - s.start.getTime()) / 3600000 * 10) / 10
                    }시간</div>
                  </div>
                  <Badge variant={ongoing ? "green" : done ? "gray" : "sky"}>
                    {ongoing ? "진행중" : done ? "완료" : "예정"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Pending HW */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="text-[13px] font-bold text-slate-700 mb-3">미완료 숙제</div>
            {pendingHw.length === 0 ? (
              <p className="text-[12px] text-slate-300">모든 숙제가 완료됐어요 🎉</p>
            ) : pendingHw.map((hw) => {
              const s  = sessions.find((x) => x.homework.some((h) => h.id === hw.id));
              const st = students.find((x) => x.id === s?.studentId);
              return (
                <div key={hw.id} className="flex items-center gap-2.5 py-2 border-b border-slate-100 last:border-0 text-[13px]">
                  <div className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-slate-300 flex-shrink-0" />
                  <span className="flex-1 text-slate-700">{hw.text}</span>
                  <span className="text-[11px] text-slate-400">{st?.name}</span>
                </div>
              );
            })}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="text-[13px] font-bold text-slate-700 mb-3">최근 활동</div>
            {recentActivity.map((s) => {
              const st = students.find((x) => x.id === s.studentId);
              return (
                <div key={s.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                  <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-[12px] text-slate-600">
                      <strong className="text-slate-900 font-semibold">{st?.name}</strong> 수업 기록 저장
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      {s.start.getMonth() + 1}월 {s.start.getDate()}일
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
