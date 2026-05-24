"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "📊", label: "대시보드" },
  { href: "/students",  icon: "👤", label: "학생 관리" },
  { href: "/records",   icon: "✏️",  label: "수업 기록" },
  { href: "/reports",   icon: "📄", label: "리포트" },
  { href: "/calendar", icon: "📅", label: "일정",      badge: undefined },
  { href: "/settings", icon: "⚙️",  label: "설정",      badge: undefined },
];



export function Sidebar() {
  const path = usePathname();
  const { data: authSession } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const role = authSession?.user?.role;
  const displayName =
    authSession?.user?.name ?? (role === "parent" ? "학부모" : "선생님");
  const roleLabel = role === "parent" ? "학부모" : "선생님";
  const avatarChar = displayName.trim().charAt(0) || "쌤";
  const profileImage = authSession?.user?.image;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/revoke-oauth", {
        method: "POST",
        cache: "no-store",
      });
    } finally {
      await signOut({ callbackUrl: "/login" });
    }
  }

  return (
    <aside className="w-[216px] flex-shrink-0 bg-white border-r border-slate-100 flex flex-col px-3 py-[18px]">
      {/* Brand */}
      <div className="flex items-center gap-[9px] px-2 mb-6">
        <img
          src="/images/logo/app_logo.jpg"
          alt="쌤플래너"
          className="h-[30px] w-[30px] flex-shrink-0 rounded-[9px] object-cover shadow-[0_2px_8px_rgba(16,67,109,.18)]"
        />
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight">쌤플래너</span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={path.startsWith(item.href)} />
        ))}
      </nav>

      {/* Profile */}
      <div className="relative mt-auto">
        <div
          className={cn(
            "absolute bottom-[58px] left-0 right-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,.12)] transition-all duration-200",
            profileOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          )}
        >
          <div className="border-b border-slate-100 px-3 py-3">
            <div className="text-[12px] font-bold text-slate-900">
              {displayName}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400">
              {authSession?.user?.email ?? roleLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-between px-3 py-3 text-left text-[12px] font-bold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          >
            <span>{loggingOut ? "로그아웃 중..." : "로그아웃"}</span>
            <span aria-hidden="true" className="text-[13px]">
              ⎋
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
          className={cn(
            "w-full flex items-center gap-[9px] px-[10px] py-[10px] rounded-xl transition-colors cursor-pointer",
            profileOpen ? "bg-sky-50" : "bg-slate-50 hover:bg-sky-50"
          )}
        >
          <UserAvatar
            image={profileImage}
            name={displayName}
            fallbackChar={avatarChar}
          />
          <div className="text-left">
            <div className="text-[12px] font-semibold text-slate-800">
              {displayName}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {roleLabel}
            </div>
          </div>
          <span
            className={cn(
              "ml-auto text-slate-300 text-xs transition-transform",
              profileOpen && "-rotate-90"
            )}
          >
            ›
          </span>
        </button>
      </div>
    </aside>
  );
}

function UserAvatar({
  image,
  name,
  fallbackChar,
}: {
  image?: string | null;
  name: string;
  fallbackChar: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        referrerPolicy="no-referrer"
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
      style={{ background: "linear-gradient(135deg,#4b86b2,#164b7a)" }}
    >
      {fallbackChar}
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  badge,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-[10px] px-[10px] py-[9px] rounded-xl text-[13px] font-medium transition-all",
        active
          ? "bg-sky-50 text-sky-600 font-semibold"
          : "text-slate-500 hover:bg-sky-50 hover:text-sky-600"
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge != null && (
        <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </Link>
  );
}
