"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "⊞", label: "대시보드" },
  { href: "/students",  icon: "👤", label: "학생 관리" },
  { href: "/records",   icon: "✏️",  label: "수업 기록" },
  { href: "/reports",   icon: "📄", label: "리포트" },
];

const TOOL_ITEMS = [
  { href: "/calendar", icon: "📅", label: "일정",      badge: undefined },
  { href: "/homework", icon: "✅", label: "숙제 관리", badge: 7 },
  { href: "/settings", icon: "⚙️",  label: "설정",      badge: undefined },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-[216px] flex-shrink-0 bg-white border-r border-slate-100 flex flex-col px-3 py-[18px]">
      {/* Brand */}
      <div className="flex items-center gap-[9px] px-2 mb-6">
        <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#38bdf8,#0284c7)", boxShadow: "0 2px 8px rgba(14,165,233,.3)" }}>
          <svg className="w-[14px] h-[14px]" fill="none" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight">TutorDesk</span>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={path.startsWith(item.href)} />
        ))}
      </nav>

      <div className="h-px bg-slate-100 my-2.5" />

      {/* Tools nav */}
      <nav className="flex flex-col gap-0.5">
        {TOOL_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={path.startsWith(item.href)} />
        ))}
      </nav>

      {/* Profile */}
      <div className="mt-auto">
        <button className="w-full flex items-center gap-[9px] px-[10px] py-[10px] rounded-xl bg-slate-50 hover:bg-sky-50 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7dd3fc,#0ea5e9)" }}>
            김
          </div>
          <div className="text-left">
            <div className="text-[12px] font-semibold text-slate-800">김선생님</div>
            <div className="text-[10px] text-slate-400 mt-0.5">과외 선생님</div>
          </div>
          <span className="ml-auto text-slate-300 text-xs">›</span>
        </button>
      </div>
    </aside>
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
