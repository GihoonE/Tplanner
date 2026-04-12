import { cn } from "@/lib/utils";

type BadgeVariant = "sky" | "green" | "amber" | "red" | "gray";

const VARIANTS: Record<BadgeVariant, string> = {
  sky:   "bg-sky-50   text-sky-600   border border-sky-100",
  green: "bg-green-50 text-green-600 border border-green-200",
  amber: "bg-amber-50 text-amber-600 border border-amber-200",
  red:   "bg-red-50   text-red-500   border border-red-200",
  gray:  "bg-slate-100 text-slate-500 border border-slate-200",
};

export function Badge({
  variant = "gray",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
