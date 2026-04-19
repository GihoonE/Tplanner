"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { COLOR_TOP } from "@/lib/constants";
import { useCustomColorSwatches } from "@/hooks/useCustomColorSwatches";
import { isHexStudentColor, normalizeStudentHex } from "@/lib/studentColor";
import { STUDENT_PRESET_COLORS, type StudentColor } from "@/types";

const DEFAULT_DRAFT = "#64748b";
const PANEL_W = 220;
const PANEL_MARGIN = 8;
const EST_PANEL_H = 200;

type PopoverPos = { top: number; left: number; width: number };

function computePopoverPos(trigger: DOMRect): PopoverPos {
  let left = trigger.right - PANEL_W;
  left = Math.min(
    Math.max(left, PANEL_MARGIN),
    window.innerWidth - PANEL_MARGIN - PANEL_W,
  );
  let top = trigger.bottom + 6;
  if (top + EST_PANEL_H > window.innerHeight - PANEL_MARGIN) {
    top = Math.max(PANEL_MARGIN, trigger.top - EST_PANEL_H - 6);
  }
  return { top, left, width: PANEL_W };
}

export function StudentColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: StudentColor;
  onChange: (c: StudentColor) => void;
  disabled?: boolean;
}) {
  const { swatches, addSwatch, removeSwatch } = useCustomColorSwatches();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftHex, setDraftHex] = useState(DEFAULT_DRAFT);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const [hoverLock, setHoverLock] = useState(false);
  const [mounted, setMounted] = useState(false);

  const addAreaRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  /** 네이티브 색 창이 뜬 뒤, color input 다음 클릭은 창을 닫기(blur) */
  const nextColorInputClickDismissesRef = useRef(false);
  const armDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  function clearNativeColorDismissArm() {
    if (armDismissTimeoutRef.current != null) {
      clearTimeout(armDismissTimeoutRef.current);
      armDismissTimeoutRef.current = null;
    }
    nextColorInputClickDismissesRef.current = false;
  }

  function handleColorInputClick(e: React.MouseEvent<HTMLInputElement>) {
    if (nextColorInputClickDismissesRef.current) {
      e.preventDefault();
      e.stopPropagation();
      colorInputRef.current?.blur();
      clearNativeColorDismissArm();
      return;
    }
    clearNativeColorDismissArm();
    armDismissTimeoutRef.current = setTimeout(() => {
      nextColorInputClickDismissesRef.current = true;
      armDismissTimeoutRef.current = null;
    }, 120);
  }

  const ephemeralHex =
    isHexStudentColor(value) && !swatches.includes(normalizeStudentHex(value)!)
      ? normalizeStudentHex(value)!
      : null;

  const updatePopoverPos = useCallback(() => {
    const el = addAreaRef.current;
    if (!el) return;
    setPopoverPos(computePopoverPos(el.getBoundingClientRect()));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(
    () => () => {
      if (armDismissTimeoutRef.current != null) {
        clearTimeout(armDismissTimeoutRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (!pickerOpen) {
      clearNativeColorDismissArm();
      setPopoverPos(null);
      return;
    }
    updatePopoverPos();
    window.addEventListener("resize", updatePopoverPos);
    window.addEventListener("scroll", updatePopoverPos, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPos);
      window.removeEventListener("scroll", updatePopoverPos, true);
    };
  }, [pickerOpen, updatePopoverPos]);

  function openPicker() {
    if (disabled) return;
    clearNativeColorDismissArm();
    const initial = isHexStudentColor(value)
      ? normalizeStudentHex(value)!
      : DEFAULT_DRAFT;
    setDraftHex(initial);
    setPickerOpen(true);
  }

  function commitPicker() {
    const h = normalizeStudentHex(draftHex);
    if (!h) return;
    clearNativeColorDismissArm();
    addSwatch(h);
    onChange(h);
    setPickerOpen(false);
  }

  function cancelPicker() {
    clearNativeColorDismissArm();
    setPickerOpen(false);
  }

  useEffect(() => {
    if (!pickerOpen) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (addAreaRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      cancelPicker();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  function handleRemoveSwatch(hex: string) {
    removeSwatch(hex);
    setHoverLock(true);
    window.setTimeout(() => setHoverLock(false), 140);
  }

  const panel =
    mounted &&
    pickerOpen &&
    popoverPos &&
    createPortal(
      <div
        ref={panelRef}
        role="dialog"
        aria-label="색 추가"
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
        style={{
          position: "fixed",
          top: popoverPos.top,
          left: popoverPos.left,
          width: popoverPos.width,
          zIndex: 320,
        }}
      >
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={cancelPicker}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={commitPicker}
            className="flex-1 rounded-xl bg-sky-500 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-sky-600"
          >
            선택
          </button>
        </div>
        <input
          ref={colorInputRef}
          type="color"
          value={draftHex}
          disabled={disabled}
          onClick={handleColorInputClick}
          onChange={(e) => {
            const h = normalizeStudentHex(e.target.value);
            if (h) setDraftHex(h);
            clearNativeColorDismissArm();
          }}
          className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-lg"
        />
      </div>,
      document.body,
    );

  return (
    <div
      className={`flex flex-wrap gap-2 ${hoverLock ? "pointer-events-none" : ""}`}
    >
      {STUDENT_PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onChange(c)}
          className={`w-9 h-9 rounded-xl border-2 transition-all disabled:opacity-50 ${
            value === c
              ? "border-slate-900 scale-105 shadow-md"
              : "border-transparent hover:scale-105"
          }`}
          style={{ background: COLOR_TOP[c] }}
          title={c}
        />
      ))}

      {swatches.map((hex) => (
        <div key={hex} className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(hex)}
            className={`h-9 w-9 rounded-xl border-2 transition-all disabled:opacity-50 ${
              value === hex
                ? "border-slate-900 scale-105 shadow-md"
                : "border-transparent hover:scale-105"
            }`}
            style={{ background: hex }}
            title={hex}
          />
          <button
            type="button"
            disabled={disabled}
            title="팔레트에서 제거"
            aria-label="팔레트에서 제거"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveSwatch(hex);
              (e.currentTarget as HTMLButtonElement).blur();
            }}
            className="absolute -left-1 -top-1 z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-slate-200 bg-white text-[9px] font-bold leading-none text-slate-500 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none"
          >
            ×
          </button>
        </div>
      ))}

      {ephemeralHex && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(ephemeralHex)}
          className={`h-9 w-9 rounded-xl border-2 transition-all disabled:opacity-50 ${
            value === ephemeralHex
              ? "border-slate-900 scale-105 shadow-md"
              : "border-transparent hover:scale-105"
          }`}
          style={{ background: ephemeralHex }}
          title={`저장된 팔레트에 없음 · ${ephemeralHex}`}
        />
      )}

      <div ref={addAreaRef} className="relative inline-block">
        {panel}
        <button
          type="button"
          disabled={disabled}
          onClick={() => (pickerOpen ? cancelPicker() : openPicker())}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-lg font-bold leading-none text-slate-400 transition-all hover:border-sky-400 hover:text-sky-600 disabled:opacity-50 ${
            pickerOpen ? "border-sky-400 text-sky-600" : ""
          }`}
          title="색 추가"
          aria-label="색 추가"
          aria-expanded={pickerOpen}
        >
          +
        </button>
      </div>
    </div>
  );
}
