"use client";

import {
  currentMonthValue,
  MonthPicker,
} from "@/components/ui/MonthPicker";

export function defaultStartMonthValue() {
  return currentMonthValue();
}

type StartMonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function StartMonthPicker({
  value,
  onChange,
  disabled,
  className = "",
}: StartMonthPickerProps) {
  return (
    <MonthPicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
    />
  );
}
