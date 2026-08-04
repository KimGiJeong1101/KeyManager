import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { SelectOption } from "../../types/ui";
import { cn } from "../../lib/utils";

type SelectFieldSize = "md" | "sm";

const SIZE_CLASS: Record<SelectFieldSize, string> = {
  md: "h-10 px-3 text-sm",
  sm: "h-9 px-2.5 pr-2 text-xs",
};

interface SelectFieldProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: SelectFieldSize;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

// options 배열 기반 셀렉트: RegisterModal/SearchComponent에서 쓰는 간단한 폼 셀렉트용 래퍼.
// 내부적으로는 Radix Select 프리미티브(./Select)를 사용한다.
function SelectField<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled = false,
  size = "md",
  id,
  "aria-label": ariaLabel,
  className = "",
}: SelectFieldProps<T>) {
  return (
    <Select value={value || undefined} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn(SIZE_CLASS[size], className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SelectField;
