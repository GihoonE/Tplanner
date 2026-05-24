import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AccountSettings } from "@/components/settings/AccountSettings";

export const metadata: Metadata = {
  title: "설정 | 쌤플래너",
};

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-[#f5f7fb] px-7 py-7">
        <AccountSettings />
      </div>
    </AppShell>
  );
}
