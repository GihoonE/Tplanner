"use client";

import { useTutorStore, useTzData } from "@/store";
import { TZ_CATALOG } from "@/lib/constants";
import { nowInTz } from "@/lib/utils";
import { queryKeys } from "@/hooks/useAppQueries";
import type { AppPreference } from "@/hooks/useAppQueries";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { TzEntry } from "@/types";

export function TzPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tzData       = useTzData();
  const setPrimary   = useTutorStore((s) => s.setPrimaryTz);
  const setTimezonePreference = useTutorStore((s) => s.setTimezonePreference);
  const toggleExtra  = useTutorStore((s) => s.toggleExtraTz);
  const addExtra     = useTutorStore((s) => s.addExtraTz);
  const removeExtra  = useTutorStore((s) => s.removeExtraTz);
  const queryClient   = useQueryClient();

  const [now, setNow] = useState(() => new Date());
  const [addSel, setAddSel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primary  = tzData[0];
  const extras   = tzData.slice(1);
  const addable  = TZ_CATALOG.filter((c) => !tzData.find((t) => t.id === c.id));

  const preferenceFromTzData = (nextTzData: TzEntry[]): AppPreference => ({
    primaryTimezone: nextTzData[0]?.timeZone ?? "Asia/Seoul",
    extraTimezones: nextTzData
      .slice(1)
      .map((timezone) => ({ timeZone: timezone.timeZone, on: timezone.on })),
  });

  const savePreference = async (
    nextPreference: AppPreference,
    previousPreference = preferenceFromTzData(tzData),
  ) => {
    setError(null);
    setSaving(true);
    queryClient.setQueryData(queryKeys.preferences, nextPreference);

    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPreference),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "타임존 저장에 실패했습니다.",
        );
      }
      const savedPreference = (await res.json()) as AppPreference;
      queryClient.setQueryData(queryKeys.preferences, savedPreference);
      setTimezonePreference(
        savedPreference.primaryTimezone,
        savedPreference.extraTimezones,
      );
    } catch (e) {
      queryClient.setQueryData(queryKeys.preferences, previousPreference);
      setTimezonePreference(
        previousPreference.primaryTimezone,
        previousPreference.extraTimezones,
      );
      setError(
        e instanceof Error ? e.message : "타임존 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [open]);

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-xl z-[150] flex flex-col transition-transform duration-300 ease-out
        ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-[14px] font-extrabold text-slate-900">🌐 시간대 설정</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Primary TZ */}
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">기본 시간대</div>
        <div className="flex items-center gap-3 p-3 rounded-xl border border-sky-200 bg-sky-50 mb-4">
          <div className="w-9 h-9 rounded-[10px] bg-sky-500 flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0">
            {primary.label}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-sky-700 flex items-center gap-1.5">
              {primary.name}
              <span className="text-[10px] bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded font-bold">기본</span>
            </div>
            <div className="text-[11px] text-slate-400">UTC{primary.display}</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-bold text-sky-600 tabular-nums">{nowInTz(now, primary.timeZone)}</div>
            <div className="text-[10px] text-sky-400">카드 표시 기준</div>
          </div>
        </div>

        {/* Change primary */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5">기본 시간대 변경</div>
          <select
            value={primary.id}
            disabled={saving}
            onChange={async (e) => {
              const nextId = e.target.value;
              const next = TZ_CATALOG.find((c) => c.id === nextId);
              if (!next) return;

              const previousPreference = preferenceFromTzData(tzData);
              const nextTzData = [
                { ...next, on: true, primary: true },
                ...extras.filter((timezone) => timezone.timeZone !== next.timeZone),
              ];
              setPrimary(nextId);
              await savePreference(
                preferenceFromTzData(nextTzData),
                previousPreference,
              );
            }}
            className="w-full text-[13px] px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 outline-none cursor-pointer hover:border-sky-300 transition-colors"
          >
            {TZ_CATALOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.label}) UTC{c.display}
              </option>
            ))}
          </select>
          {error && (
            <p className="mt-2 text-[11px] font-semibold text-red-500">
              {error}
            </p>
          )}
        </div>

        {/* Extra TZs */}
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          추가 시간대 <span className="text-[10px] font-normal normal-case tracking-normal">(캘린더 좌측 열)</span>
        </div>

        {extras.length === 0 && (
          <p className="text-[12px] text-slate-300 mb-3">추가된 시간대가 없어요</p>
        )}

        {extras.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 mb-2 hover:border-sky-200 transition-colors">
            {/* Toggle */}
            <button
              disabled={saving}
              onClick={async () => {
                const previousPreference = preferenceFromTzData(tzData);
                const nextTzData = tzData.map((timezone) =>
                  timezone.id === t.id && !timezone.primary
                    ? { ...timezone, on: !timezone.on }
                    : timezone,
                );
                toggleExtra(t.id);
                await savePreference(
                  preferenceFromTzData(nextTzData),
                  previousPreference,
                );
              }}
              className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${t.on ? "bg-sky-500" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${t.on ? "left-[18px]" : "left-0.5"}`} />
            </button>

            <div className="flex-1">
              <div className="text-[13px] font-semibold text-slate-800">
                {t.name} <span className="text-[11px] text-slate-400">{t.label}</span>
              </div>
              <div className="text-[11px] text-slate-400">UTC{t.display}</div>
            </div>

            <div className="text-right">
              <div className={`text-[13px] font-bold tabular-nums ${t.on ? "text-sky-600" : "text-slate-300"}`}>
                {nowInTz(now, t.timeZone)}
              </div>
              <button
                disabled={saving}
                onClick={async () => {
                  const previousPreference = preferenceFromTzData(tzData);
                  const nextTzData = tzData.filter(
                    (timezone) => !(timezone.id === t.id && !timezone.primary),
                  );
                  removeExtra(t.id);
                  await savePreference(
                    preferenceFromTzData(nextTzData),
                    previousPreference,
                  );
                }}
                className="text-[10px] text-slate-300 hover:text-red-400 transition-colors"
              >
                제거
              </button>
            </div>
          </div>
        ))}

        {/* Add new TZ */}
        {addable.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5">시간대 추가</div>
            <div className="flex gap-2">
              <select
                value={addSel}
                onChange={(e) => setAddSel(e.target.value)}
                className="flex-1 text-[12px] px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 outline-none cursor-pointer"
              >
                <option value="">선택...</option>
                {addable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.label}) UTC{c.display}
                  </option>
                ))}
              </select>
              <button
                disabled={saving}
                onClick={async () => {
                  if (!addSel) return;
                  const next = TZ_CATALOG.find((c) => c.id === addSel);
                  if (!next) return;
                  const previousPreference = preferenceFromTzData(tzData);
                  const nextTzData = [
                    ...tzData,
                    { ...next, on: true, primary: false },
                  ];
                  addExtra(addSel);
                  setAddSel("");
                  await savePreference(
                    preferenceFromTzData(nextTzData),
                    previousPreference,
                  );
                }}
                className="px-3.5 py-2 bg-sky-500 text-white text-[12px] font-bold rounded-xl hover:bg-sky-600 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
