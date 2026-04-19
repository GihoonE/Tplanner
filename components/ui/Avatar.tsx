import { resolveAvatarBg } from "@/lib/studentColor";
import { cn } from "@/lib/utils";
import type { StudentColor } from "@/types";

export function Avatar({
  char,
  color,
  size = "md",
  className,
}: {
  char: string;
  color: StudentColor;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "w-7 h-7 text-[11px]", md: "w-8 h-8 text-[12px]", lg: "w-11 h-11 text-[17px]" };
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white flex-shrink-0",
        sizes[size],
        className
      )}
      style={{ background: resolveAvatarBg(color) }}
    >
      {char}
    </div>
  );
}
