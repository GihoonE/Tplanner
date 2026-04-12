"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useTutorStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

// Seed report data for UI demo
const REPORTS = [
  { id: 1, studentId: 1, month: "3월", status: "sent",  score: 78, summary: "미적분 극한 단원에서 꾸준한 향상을 보이고 있습니다. ε-δ 정의 이해도 70% 달성..." },
  { id: 2, studentId: 2, month: "3월", status: "draft", score: 85, summary: "독해 속도와 어휘력이 크게 향상됨. 다음 달 목표는 수능 독해 5분 단축..." },
  { id: 3, studentId: 3, month: "2월", status: "sent",  score: 62, summary: "역학 기초 개념을 이해했으며, 응용 문제에서 추가 연습이 필요합니다." },
];

export default function ReportsPage() {
  const students  = useTutorStore((s) => s.students);
  const [activeId, setActiveId] = useState(1);
  const active    = REPORTS.find((r) => r.id === activeId)!;
  const activeStu = students.find((s) => s.id === active?.studentId);

  return (
    <AppShell>
      {/* Topbar */}
      <div className="h-[54px] flex items-center px-5 gap-2.5 bg-white border-b border-slate-100 flex-shrink-0">
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight flex-1">리포트</span>
        <Button variant="ghost" size="sm">학생 선택 ▾</Button>
        <Button variant="primary" size="sm">+ 리포트 생성</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left list */}
        <div className="w-[300px] flex-shrink-0 bg-slate-50 border-r border-slate-100 overflow-y-auto p-4">
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm">🔍</span>
            <input placeholder="리포트 검색..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] outline-none focus:border-sky-400" />
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">최근 리포트</div>

          {REPORTS.map((r) => {
            const stu = students.find((s) => s.id === r.studentId);
            return (
              <div key={r.id} onClick={() => setActiveId(r.id)}
                className={`bg-white rounded-2xl border p-4 mb-2.5 cursor-pointer transition-all shadow-sm hover:-translate-y-px hover:shadow-md
                  ${activeId === r.id ? "border-sky-300 shadow-[0_0_0_3px_rgba(14,165,233,.1)]" : "border-slate-100"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-[14px] font-bold text-slate-900">{stu?.name} · {r.month}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{stu?.subject} · 2025.03</div>
                  </div>
                  <Badge variant={r.status === "sent" ? "green" : "amber"}>
                    {r.status === "sent" ? "전송완료" : "초안"}
                  </Badge>
                </div>
                <p className="text-[12px] text-slate-400 line-clamp-2 mb-2.5">{r.summary}</p>
                <div className="flex gap-1.5 items-center">
                  <Badge variant="gray">PDF</Badge>
                  {r.status === "draft" && <Button variant="primary" size="sm" className="ml-auto">전송하기</Button>}
                  {r.status === "sent"  && <Button variant="ghost"   size="sm" className="ml-auto">편집</Button>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right viewer */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI generation card */}
          <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100/40 p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-extrabold bg-sky-500 text-white px-2 py-0.5 rounded-full">AI</span>
              <span className="text-[14px] font-bold text-slate-900">리포트 자동 생성</span>
            </div>
            <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
              {activeStu?.name}의 이번 달 수업 기록을 바탕으로 리포트를 생성합니다. 생성 후 직접 편집 가능해요.
            </p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm">✦ 생성하기</Button>
              <Button variant="ghost"   size="sm">직접 작성</Button>
            </div>
          </div>

          {/* Report document */}
          {active && activeStu && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mb-1.5">월간 학습 리포트</div>
                  <div className="text-[22px] font-extrabold text-slate-900 tracking-tight">{activeStu.name} · {active.month}</div>
                  <div className="text-[12px] text-slate-400 mt-1">2025.03.01 – 03.20 · {activeStu.subject} · 총 8회 수업</div>
                </div>
                {/* Score ring */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: `conic-gradient(#38bdf8 0% ${active.score}%, #e0f2fe ${active.score}% 100%)` }}>
                    <div className="w-12 h-12 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-[16px] font-extrabold text-sky-600 leading-none">{active.score}</span>
                      <span className="text-[9px] text-slate-400">점수</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5">종합 이해도</div>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">이번 달 학습 요약</div>
              <p className="text-[14px] text-slate-700 leading-relaxed mb-4">{active.summary}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1.5">잘한 점</div>
                  <p className="text-[12px] text-green-800 leading-relaxed">그래프 활용 이해 탁월. 집중력과 수업 태도 일관적으로 우수.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1.5">보완할 점</div>
                  <p className="text-[12px] text-amber-800 leading-relaxed">연속함수 판별 오답률 높음. 반복 연습 권장.</p>
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">다음 달 계획</div>
              <p className="text-[14px] text-slate-700 leading-relaxed mb-5">
                연속함수 단원 복습 후 <strong className="text-slate-900">로피탈 정리</strong> 도입 예정. 수능 기출 문제를 통해 실전 감각을 키울 것을 권장합니다.
              </p>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm">✎ 편집</Button>
                <Button variant="ghost" size="sm">↓ PDF</Button>
                <Button variant="primary" size="sm">📤 부모님께 전송</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
