"use client";

import { useEffect } from "react";
import { useTutorStore } from "@/store";
import { Sidebar } from "./Sidebar";
import { usePreferenceQuery } from "@/hooks/useAppQueries";

export function AppShell({ children }: { children: React.ReactNode }) {
  const setPrimaryTimezone = useTutorStore((s) => s.setPrimaryTimezone);
  const { data } = usePreferenceQuery();

  useEffect(() => {
    if (data?.primaryTimezone) {
      setPrimaryTimezone(data.primaryTimezone);
    }
  }, [data?.primaryTimezone, setPrimaryTimezone]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
