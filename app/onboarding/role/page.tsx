import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RoleSelection } from "@/components/auth/RoleSelection";
import { getUserRole, roleHomePath } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "역할 선택 | 쌤플래너",
};

export default async function RoleOnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/onboarding/role");
  }
  const role = await getUserRole(session.user.id);
  if (role) {
    redirect(roleHomePath(role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-5 py-10">
      <section className="w-full max-w-[840px]">
        <div className="mb-9 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-[20px] font-black text-white shadow-[0_12px_30px_rgba(16,67,109,.28)]">
            T
          </div>
          <h1 className="mt-4 text-[30px] font-black tracking-tight text-slate-950">
            어떤 역할로 시작할까요?
          </h1>
          <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
            선택한 역할에 맞춰 대시보드와 사용할 수 있는 기능이 달라집니다.
          </p>
        </div>

        <RoleSelection />
      </section>
    </main>
  );
}
