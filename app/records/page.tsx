"use client";

import { AppShell } from "@/components/layout/AppShell";
import { RecordsWorkspace } from "@/components/records/RecordsWorkspace";

export default function RecordsPage() {
  return (
    <AppShell>
      <RecordsWorkspace />
    </AppShell>
  );
}
