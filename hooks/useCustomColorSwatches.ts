"use client";

import { useCallback, useEffect, useState } from "react";
import { normalizeStudentHex } from "@/lib/studentColor";

export const CUSTOM_COLOR_SWATCHES_KEY = "tutordesk:customColorSwatches";

/** 같은 탭의 다른 StudentColorPicker 인스턴스와 동기화 */
export const CUSTOM_SWATCHES_SYNC_EVENT = "tutordesk:custom-swatches-sync";

function notifySwatchesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOM_SWATCHES_SYNC_EVENT));
  }
}

function readSwatches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_COLOR_SWATCHES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: string[] = [];
    for (const x of arr) {
      const h = normalizeStudentHex(String(x));
      if (h) out.push(h);
    }
    return Array.from(new Set(out));
  } catch {
    return [];
  }
}

function writeSwatches(list: string[]) {
  try {
    localStorage.setItem(CUSTOM_COLOR_SWATCHES_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

export function useCustomColorSwatches() {
  const [swatches, setSwatches] = useState<string[]>([]);

  useEffect(() => {
    function syncFromStorage() {
      setSwatches(readSwatches());
    }
    syncFromStorage();
    window.addEventListener(CUSTOM_SWATCHES_SYNC_EVENT, syncFromStorage);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CUSTOM_COLOR_SWATCHES_KEY || e.key === null) {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CUSTOM_SWATCHES_SYNC_EVENT, syncFromStorage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const addSwatch = useCallback((raw: string) => {
    const h = normalizeStudentHex(raw);
    if (!h) return;
    setSwatches((prev) => {
      const next = [h, ...prev.filter((x) => x !== h)];
      writeSwatches(next);
      return next;
    });
    notifySwatchesChanged();
  }, []);

  const removeSwatch = useCallback((raw: string) => {
    const h = normalizeStudentHex(raw);
    if (!h) return;
    setSwatches((prev) => {
      const next = prev.filter((x) => x !== h);
      writeSwatches(next);
      return next;
    });
    notifySwatchesChanged();
  }, []);

  return { swatches, addSwatch, removeSwatch };
}
