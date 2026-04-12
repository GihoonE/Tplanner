"use client";

import { useTutorStore, useCalView, useTzData } from "@/store";
import { Button } from "@/components/ui/Button";
import { addDays, formatMonthDay } from "@/lib/utils";
import type { CalendarView } from "@/types";

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "월" },
  { id: "week",  label: "주" },
  { id: "day",   label: "일" },
];

export function CalendarTopbar({ onTzPanel }: { onTzPanel: () => void }) {
  const view         = useCalView();
  const tzData       = useTzData();
  const curWeekStart = useTutorStore((s) => s.curWeekStart);
  const curMonth     = useTutorStore((s) => s.curMonth);
  const curDay       = useTutorStore((s) => s.curDay);
  const setCalView   = useTutorStore((s) => s.setCalView);
  const navigateWeek = useTutorStore((s) => s.navigateWeek);
  const navigateMonth= useTutorStore((s) => s.navigateMonth);
  const navigateDay  = useTutorStore((s) => s.navigateDay);
  const goToday      = useTutorStore((s) => s.goToday);

  function navigate(dir: 1 | -1) {
    if (view === "week")  navigateWeek(dir);
    if (view === "month") navigateMonth(dir);
    if (view === "day")   navigateDay(dir);
  }

  function headerText(): string {
    if (view === "week") {
      const end = addDays(curWeekStart, 6);
      return `${formatMonthDay(curWeekStart)} — ${formatMonthDay(end)}`;
    }
    if (view === "month")
      return `${curMonth.getFullYear()}년 ${curMonth.getMonth() + 1}월`;
    return `${curDay.getMonth() + 1}월 ${curDay.getDate()}일`;
  }

  return (
    <div className="h-[54px] flex items-center px-5 gap-2.5 bg-white border-b border-slate-100 flex-shrink-0">
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(-1)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 transition-all text-sm"
        >
          ‹
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-600 transition-all text-sm"
        >
          ›
        </button>
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight mx-2 min-w-[160px]">
          {headerText()}
        </span>
        <button
          onClick={goToday}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50 transition-all"
        >
          오늘
        </button>
      </div>

      <div className="flex-1" />

      {/* TZ button */}
      <button
        onClick={onTzPanel}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
      >
        🌐 {tzData[0].label}
      </button>

      {/* View toggle */}
      <div className="flex gap-0.5 bg-slate-100 rounded-full p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setCalView(v.id)}
            className={
              "text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all " +
              (view === v.id
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600")
            }
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Add button */}
      <Button variant="primary" size="sm">
        + 수업 추가
      </Button>
    </div>
  );
}
