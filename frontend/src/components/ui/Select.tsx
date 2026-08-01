import React, {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { SelectOption } from "../../types/ui";

type SelectSize = "md" | "sm";

interface SizeStyle {
  trigger: string;
  option: string;
}

// 브라우저 기본 <select>를 대체하는 커스텀 드롭다운.
// 네이티브 select는 옵션 목록(팝업)의 스타일을 CSS로 제어할 수 없어
// 다크 모드에서 배경만 어둡고 목록은 OS 기본 스타일로 뜨는 문제가 있었다.
//
// size: "md"(기본, 모달 등 일반 폼용) | "sm"(툴바 등 좁은 인라인 공간용)
const SIZE_STYLE: Record<SelectSize, SizeStyle> = {
  md: {
    trigger: "h-10 px-3 text-sm",
    option: "px-3 py-2 text-sm",
  },
  sm: {
    trigger: "h-9 px-2.5 pr-2 text-xs",
    option: "px-2.5 py-1.5 text-xs",
  },
};

interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  size?: SelectSize;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "선택",
  disabled = false,
  size = "md",
  id,
  "aria-label": ariaLabel,
  className = "",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const sizeStyle = SIZE_STYLE[size] || SIZE_STYLE.md;

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // 열릴 때 현재 선택값에 하이라이트를 맞추고 목록에 포커스
  useEffect(() => {
    if (!open) return;
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    listRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    // 목록(ul)이 언마운트되기 전에 포커스를 갖고 있었으므로, 닫힌 뒤에는 트리거로 포커스를
    // 되돌려야 한다. 그렇지 않으면 포커스가 body로 빠져나가 Escape 등 키 이벤트가 모달까지
    // 버블링되지 않는 문제가 생긴다.
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((prev) => Math.max(prev - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        event.preventDefault();
        setHighlighted(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(highlighted);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-lg font-medium outline-none transition-all ${sizeStyle.trigger} ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-white/[0.02] dark:text-slate-600 dark:border-white/10"
            : "text-slate-800 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-white/10 dark:hover:border-white/20"
        } ${
          open
            ? "ring-2 ring-indigo-500/30 border-indigo-500 dark:ring-cyan-400/30 dark:border-cyan-400"
            : !disabled
              ? "focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:ring-cyan-400/30 dark:focus:border-cyan-400"
              : ""
        }`}
      >
        <span className={`truncate ${!selected ? "text-slate-400 dark:text-slate-600" : ""}`}>
          {selected ? selected.label : placeholder}
        </span>
        <KeyboardArrowDownRoundedIcon
          sx={{ fontSize: 16 }}
          className={`flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          onKeyDown={handleListKeyDown}
          className="absolute z-20 mt-1.5 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10 py-1 outline-none dark:bg-slate-800 dark:border-white/10 dark:shadow-black/40"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlighted;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlighted(index)}
                onClick={(_event: ReactMouseEvent<HTMLLIElement>) => commit(index)}
                className={`flex items-center justify-between gap-2 cursor-pointer transition-colors ${sizeStyle.option} ${
                  isHighlighted ? "bg-indigo-50 dark:bg-cyan-400/10" : ""
                } ${
                  isSelected
                    ? "text-indigo-600 font-semibold dark:text-cyan-300"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <CheckRoundedIcon sx={{ fontSize: 14 }} className="flex-shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Select;
