"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true면 확인 버튼을 danger 스타일로 */
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "modal-backdrop !z-[300]",
        loading && "pointer-events-none",
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="mx-4 w-full max-w-[400px] animate-scale-in rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="confirm-dialog-title"
          className="text-[17px] font-extrabold tracking-tight text-slate-900"
        >
          {title}
        </h3>
        <div
          id="confirm-dialog-desc"
          className="mt-2 text-[13px] leading-relaxed text-slate-600"
        >
          {description}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            size="md"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? "처리 중…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
