"use client";

import { useEffect } from "react";
import { useTutorStore } from "@/store";
import { Sidebar } from "./Sidebar";
import { usePreferenceQuery } from "@/hooks/useAppQueries";

export function AppShell({ children }: { children: React.ReactNode }) {
  const setTimezonePreference = useTutorStore((s) => s.setTimezonePreference);
  const { data } = usePreferenceQuery();

  useEffect(() => {
    if (data?.primaryTimezone) {
      setTimezonePreference(data.primaryTimezone, data.extraTimezones ?? []);
    }
  }, [data?.primaryTimezone, data?.extraTimezones, setTimezonePreference]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
