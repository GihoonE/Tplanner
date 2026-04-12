"use client";

import { AppShell } from "@/components/layout/AppShell";
import { RecordList } from "@/components/records/RecordList";
import { RecordEditor } from "@/components/records/RecordEditor";

export default function RecordsPage() {
  return (
    <AppShell>
      {/* Header */}
      <div className="h-[54px] flex items-center px-6 gap-3 bg-white border-b border-slate-100 flex-shrink-0">
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight flex-1">수업 기록</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
          🔄 캘린더와 실시간 동기화
        </span>
        <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
          필터 ▾
        </button>
        <button className="text-[13px] font-bold px-4 py-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors shadow-[0_2px_8px_rgba(14,165,233,.3)]">
          + 새 기록
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <RecordList />
        <RecordEditor />
      </div>
    </AppShell>
  );
}
