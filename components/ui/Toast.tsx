"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type?: "default" | "sync";
  visible: boolean;
}

export function Toast({ message, type = "default", visible }: ToastProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-[13px] font-semibold",
        "px-5 py-2.5 rounded-full shadow-lg z-[999] transition-transform duration-300 pointer-events-none",
        type === "sync" ? "bg-green-600" : "bg-slate-800",
        visible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
      )}
    >
      {message}
    </div>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [state, setState] = useState<{ message: string; type: "default" | "sync"; visible: boolean }>({
    message: "",
    type: "default",
    visible: false,
  });

  const show = (message: string, type: "default" | "sync" = "default") => {
    setState({ message, type, visible: true });
  };

  useEffect(() => {
    if (!state.visible) return;
    const t = setTimeout(() => setState((s) => ({ ...s, visible: false })), 2400);
    return () => clearTimeout(t);
  }, [state.visible, state.message]);

  return { toastProps: state, showToast: show };
}
