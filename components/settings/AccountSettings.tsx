"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

function roleLabel(role?: string | null) {
  if (role === "parent") return "학부모";
  if (role === "instructor") return "선생님";
  return "역할 미설정";
}

function firstAvatarChar(name?: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed.charAt(0) : "쌤";
}

function ProfileAvatar({
  image,
  name,
}: {
  image?: string | null;
  name?: string | null;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "프로필"}
        referrerPolicy="no-referrer"
        className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-sky-500 text-[26px] font-black text-white shadow-[0_12px_30px_rgba(16,67,109,.18)]">
      {firstAvatarChar(name)}
    </div>
  );
}

export function AccountSettings() {
  const { data: session, status } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const user = session?.user;
  const name = user?.name ?? "이름 없음";
  const email = user?.email ?? "이메일 없음";
  const role = roleLabel(user?.role);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/revoke-oauth", {
        method: "POST",
        cache: "no-store",
      });
    } finally {
      await signOut({ redirectTo: "/" });
    }
  }

  return (
    <section className="max-w-[720px]">
      <div className="mb-6">
        <h1 className="text-[24px] font-black tracking-tight text-slate-950">
          설정
        </h1>
        <p className="mt-1 text-[13px] font-medium text-slate-500">
          계정 정보와 로그인 상태를 확인합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.06)]">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              계정
            </div>
            <div className="mt-1 text-[17px] font-extrabold text-slate-900">
              프로필
            </div>
          </div>
          <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[12px] font-bold text-sky-600">
            {role}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ProfileAvatar image={user?.image} name={name} />
          <div className="min-w-0">
            <div className="truncate text-[20px] font-black tracking-tight text-slate-950">
              {status === "loading" ? "불러오는 중..." : name}
            </div>
            <div className="mt-1 truncate text-[13px] font-medium text-slate-500">
              {email}
            </div>
            <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {role}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-red-100 bg-red-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-extrabold text-slate-900">
                로그아웃
              </div>
              <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">
                현재 브라우저의 쌤플래너 세션을 종료합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-shrink-0 rounded-lg bg-red-500 px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(239,68,68,.22)] transition-colors hover:bg-red-600 disabled:cursor-wait disabled:opacity-60"
            >
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
