import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "soft" | "danger";
type ButtonSize    = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-sky-500 text-white shadow-[0_2px_8px_rgba(16,67,109,.25)] hover:bg-sky-600 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(16,67,109,.34)]",
  ghost:   "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
  soft:    "bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100",
  danger:  "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-xs font-semibold px-3 py-1.5 rounded-lg",
  md: "text-[13px] font-semibold px-4 py-[9px] rounded-xl",
};

export function Button({
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 transition-all cursor-pointer font-[Pretendard,sans-serif]",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
