"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RecordsWorkspace } from "@/components/records/RecordsWorkspace";

export default function RecordsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <RecordsWorkspace />
      </Suspense>
    </AppShell>
  );
}
