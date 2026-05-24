"use client";

import { useEffect } from "react";
import { useTutorStore } from "@/store";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const setPrimaryTimezone = useTutorStore((s) => s.setPrimaryTimezone);

  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      try {
        const res = await fetch("/api/preferences");
        if (!res.ok) return;
        const data = (await res.json()) as { primaryTimezone?: string };
        if (!cancelled && data.primaryTimezone) {
          setPrimaryTimezone(data.primaryTimezone);
        }
      } catch {
        // 기본값(Asia/Seoul)을 그대로 사용합니다.
      }
    }

    loadPreference();
    return () => {
      cancelled = true;
    };
  }, [setPrimaryTimezone]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
