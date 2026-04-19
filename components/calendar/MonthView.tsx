"use client";

import { useMemo } from "react";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { addDays, sameDay, fmtTz } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { DAYS_KO } from "@/lib/constants";
import { resolveSessionSurfaceStyle } from "@/lib/studentColor";

export function MonthView() {
  const sessions    = useSessions();
  const tzData      = useTzData();
  const now         = useNow();
  const students    = useTutorStore((s) => s.students);
  const curMonth    = useTutorStore((s) => s.curMonth);
  const jumpToDate  = useTutorStore((s) => s.jumpToDate);
  const setCalView  = useTutorStore((s) => s.setCalView);
  const openModal   = useTutorStore((s) => s.openModal);

  const primaryOffset = getPrimaryOffset(tzData);

  const cells = useMemo(() => {
    const first = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1);
    const last  = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0);
    const result: { date: Date; other: boolean }[] = [];

    for (let i = 0; i < first.getDay(); i++)
      result.push({ date: addDays(first, i - first.getDay()), other: true });
    for (let d = 1; d <= last.getDate(); d++)
      result.push({ date: new Date(curMonth.getFullYear(), curMonth.getMonth(), d), other: false });
    while (result.length < 42)
      result.push({ date: addDays(result[result.length - 1].date, 1), other: true });

    return result;
  }, [curMonth]);

  function handleCellClick(date: Date) {
    jumpToDate(date);
    setCalView("day");
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* DOW header */}
      <div className="grid border-b border-slate-100 bg-white flex-shrink-0"
        style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
        {DAYS_KO.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid overflow-hidden"
        style={{ gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: "repeat(6,1fr)" }}>
        {cells.map(({ date, other }, i) => {
          const tod      = sameDay(date, now);
          const daySes   = sessions.filter((s) => sameDay(s.start, date));
          return (
            <div
              key={i}
              onClick={() => handleCellClick(date)}
              className={`border-r border-b border-slate-100 p-2 overflow-hidden cursor-pointer transition-colors hover:bg-sky-50
                ${other ? "bg-slate-50" : ""}
                ${i % 7 === 6 ? "border-r-0" : ""}`}
            >
              <div className={`w-[22px] h-[22px] flex items-center justify-center text-[12px] font-bold mb-1 rounded-full
                ${tod ? "bg-sky-500 text-white" : other ? "text-slate-300" : "text-slate-600"}`}>
                {date.getDate()}
              </div>

              {daySes.slice(0, 3).map((s) => {
                const st = students.find((x) => x.id === s.studentId);
                const chip = resolveSessionSurfaceStyle(st?.color ?? "s-blue");
                return (
                  <div
                    key={s.id}
                    onClick={(e) => { e.stopPropagation(); openModal(s.id); }}
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80"
                    style={chip}
                  >
                    {fmtTz(s.start, primaryOffset)} {st?.name ?? "수업"}
                  </div>
                );
              })}

              {daySes.length > 3 && (
                <div className="text-[10px] font-semibold text-sky-600 px-1 cursor-pointer hover:underline">
                  +{daySes.length - 3}개
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
