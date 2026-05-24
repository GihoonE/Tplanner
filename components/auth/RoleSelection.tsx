"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Role = "instructor" | "parent";

const ROLES: {
  id: Role;
  title: string;
  description: string;
  label: string;
}[] = [
  {
    id: "instructor",
    title: "선생님",
    description: "학생을 만들고 수업 기록, 숙제, 리포트를 관리합니다.",
    label: "선생님으로 시작",
  },
  {
    id: "parent",
    title: "학부모",
    description: "초대 코드를 입력해 자녀의 수업 기록과 리포트를 확인합니다.",
    label: "학부모로 시작",
  },
];

export function RoleSelection() {
  const router = useRouter();
  const { update } = useSession();
  const [savingRole, setSavingRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseRole(role: Role) {
    setSavingRole(role);
    setError(null);

    try {
      const res = await fetch("/api/me/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "역할 설정에 실패했습니다.");
      }

      await update({ role });
      router.refresh();
      router.replace("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "역할 설정에 실패했습니다.");
      setSavingRole(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => chooseRole(role.id)}
            disabled={savingRole != null}
            className="group min-h-[260px] rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-[0_18px_55px_rgba(15,23,42,.08)] transition-all hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_24px_70px_rgba(16,67,109,.14)] disabled:cursor-wait disabled:opacity-70"
          >
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-[20px] font-black text-white transition-colors group-hover:bg-sky-500">
              {role.id === "instructor" ? "T" : "P"}
            </div>
            <div className="text-[24px] font-black tracking-tight text-slate-950">
              {role.title}
            </div>
            <p className="mt-3 min-h-[52px] text-[14px] font-medium leading-6 text-slate-500">
              {role.description}
            </p>
            <div className="mt-8 text-[13px] font-extrabold text-sky-600">
              {savingRole === role.id ? "설정 중..." : role.label}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-[13px] font-semibold text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
