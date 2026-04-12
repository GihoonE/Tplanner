"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarTopbar } from "@/components/calendar/CalendarTopbar";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { TzPanel } from "@/components/calendar/TzPanel";
import { SessionModal } from "@/components/sessions/SessionModal";
import { useCalView } from "@/store";

export default function CalendarPage() {
  const view = useCalView();
  const [tzOpen, setTzOpen] = useState(false);

  return (
    <AppShell>
      <CalendarTopbar onTzPanel={() => setTzOpen((v) => !v)} />

      {/* Calendar area */}
      <div className="flex-1 flex overflow-hidden">
        {view === "week"  && <WeekView />}
        {view === "month" && <MonthView />}
        {view === "day"   && <WeekView />} {/* DayView reuses WeekView with 1 column */}
      </div>

      {/* Timezone panel */}
      <TzPanel open={tzOpen} onClose={() => setTzOpen(false)} />

      {/* Session modal */}
      <SessionModal />
    </AppShell>
  );
}
