"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTutorStore, useSessions, useTzData, useNow } from "@/store";
import { addDays, sameDay, fmtTz } from "@/lib/utils";
import { getPrimaryOffset } from "@/lib/utils";
import { DAYS_KO } from "@/lib/constants";
import { resolveAvatarBg } from "@/lib/studentColor";

const MONTH_WINDOW = 6;

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthCells(month: Date) {
  const first = monthStart(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const result: { date: Date; other: boolean }[] = [];

  for (let i = 0; i < first.getDay(); i++)
    result.push({ date: addDays(first, i - first.getDay()), other: true });
  for (let d = 1; d <= last.getDate(); d++)
    result.push({ date: new Date(first.getFullYear(), first.getMonth(), d), other: false });
  while (result.length < 42)
    result.push({ date: addDays(result[result.length - 1].date, 1), other: true });

  return result;
}

export function MonthView() {
  const sessions    = useSessions();
  const tzData      = useTzData();
  const now         = useNow();
  const students    = useTutorStore((s) => s.students);
  const curMonth    = useTutorStore((s) => s.curMonth);
  const jumpToDate  = useTutorStore((s) => s.jumpToDate);
  const setCalView  = useTutorStore((s) => s.setCalView);
  const openModal   = useTutorStore((s) => s.openModal);
  const [anchorMonth, setAnchorMonth] = useState(() => monthStart(curMonth));
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef(new Map<string, HTMLElement>());
  const scrollUpdateRef = useRef(false);
  const skipScrollToRef = useRef(false);

  const primaryOffset = getPrimaryOffset(tzData);

  const months = useMemo(
    () =>
      Array.from({ length: MONTH_WINDOW * 2 + 1 }, (_, i) =>
        addMonths(anchorMonth, i - MONTH_WINDOW),
      ),
    [anchorMonth],
  );

  useEffect(() => {
    if (scrollUpdateRef.current) {
      scrollUpdateRef.current = false;
      return;
    }
    setAnchorMonth(monthStart(curMonth));
  }, [curMonth]);

  useEffect(() => {
    if (skipScrollToRef.current) {
      skipScrollToRef.current = false;
      return;
    }
    const container = scrollRef.current;
    const target = monthRefs.current.get(monthKey(curMonth));
    if (!container || !target) return;
    container.scrollTo({
      top: target.offsetTop - container.offsetTop,
      behavior: "smooth",
    });
  }, [anchorMonth, curMonth]);

  function handleCellClick(date: Date) {
    jumpToDate(date);
    setCalView("day");
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;

    const center = container.scrollTop + container.clientHeight / 2;
    let closestDate: Date | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    months.forEach((month) => {
      const node = monthRefs.current.get(monthKey(month));
      if (!node) return;
      const mid = node.offsetTop - container.offsetTop + node.offsetHeight / 2;
      const distance = Math.abs(center - mid);
      if (distance < closestDistance) {
        closestDate = month;
        closestDistance = distance;
      }
    });

    if (!closestDate || monthKey(closestDate) === monthKey(curMonth)) return;
    scrollUpdateRef.current = true;
    skipScrollToRef.current = true;
    jumpToDate(closestDate);
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
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-white"
        style={{ scrollbarWidth: "thin" }}
      >
        {months.map((month) => {
          const key = monthKey(month);
          const cells = monthCells(month);

          return (
            <section
              key={key}
              ref={(node) => {
                if (node) monthRefs.current.set(key, node);
                else monthRefs.current.delete(key);
              }}
              className="flex min-h-full flex-col border-b border-slate-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2">
                <div className="text-[14px] font-extrabold tracking-tight text-slate-900">
                  {month.getFullYear()}년 {month.getMonth() + 1}월
                </div>
              </div>

              <div
                className="grid flex-1 overflow-hidden"
                style={{ gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: "repeat(6,1fr)" }}
              >
                {cells.map(({ date, other }, i) => {
                  const tod = sameDay(date, now);
                  const daySes = sessions
                    .filter((s) => sameDay(s.start, date))
                    .sort((a, b) => a.start.getTime() - b.start.getTime());
                  return (
                    <div
                      key={`${key}-${i}`}
                      onClick={() => handleCellClick(date)}
                      className={`cursor-pointer overflow-hidden border-r border-b border-slate-100 p-2 transition-colors hover:bg-sky-50
                        ${other ? "bg-slate-50" : ""}
                        ${i % 7 === 6 ? "border-r-0" : ""}`}
                    >
                      <div className={`mb-1 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-bold
                        ${tod ? "bg-sky-500 text-white" : other ? "text-slate-300" : "text-slate-600"}`}>
                        {date.getDate()}
                      </div>

                      {daySes.slice(0, 3).map((s) => {
                        const st = students.find((x) => x.id === s.studentId);
                        const chip = {
                          background: resolveAvatarBg(st?.color ?? "s-blue"),
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,.55)",
                        };
                        return (
                          <div
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); openModal(s.id); }}
                            className="mb-0.5 cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-bold shadow-sm hover:opacity-90"
                            style={chip}
                          >
                            {fmtTz(s.start, primaryOffset)} {st?.name ?? "수업"}
                          </div>
                        );
                      })}

                      {daySes.length > 3 && (
                        <div className="cursor-pointer px-1 text-[10px] font-semibold text-sky-600 hover:underline">
                          +{daySes.length - 3}개
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
