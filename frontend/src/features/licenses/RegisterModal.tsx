import React, { KeyboardEvent, MutableRefObject, useEffect } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import { useModalBehavior } from "../../hooks/useModalBehavior";
import Select from "../../components/ui/Select";
import { Category } from "../../types/item";
import { SelectOption } from "../../types/ui";

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "Windows", label: "Windows" },
  { value: "MS_Office", label: "MS_Office" },
  { value: "Hancom", label: "Hancom" },
];

interface RegisterModalProps {
  open: boolean;
  category: string;
  version: string;
  keys: string[];
  versionOptions: Record<Category, string[]>;
  isKeyComplete: boolean;
  onCategoryChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onKeyChange: (index: number, value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, index: number) => void;
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  onSubmit: () => void;
  onClose: () => void;
}

// 라이선스 등록 폼을 담는 모달.
// 예전에는 화면에 항상 펼쳐져 있던 인라인 폼이었으나,
// 테이블을 화면 상단으로 끌어올리기 위해 버튼 클릭 시 여는 모달로 전환했다.
const RegisterModal: React.FC<RegisterModalProps> = ({
  open,
  category,
  version,
  keys,
  versionOptions,
  isKeyComplete,
  onCategoryChange,
  onVersionChange,
  onKeyChange,
  onKeyDown,
  inputRefs,
  onSubmit,
  onClose,
}) => {
  const { containerRef, handleKeyDown, handleOverlayClick } = useModalBehavior(open, onClose);

  // 모달이 열릴 때 첫 번째 키 입력칸에 자동 포커스
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, inputRefs]);

  if (!open) return null;

  // body에 직접 포탈로 렌더링한다. 조상 요소에 backdrop-filter(다크 모드 유리 효과) 같은
  // CSS가 붙으면 그 요소가 fixed 자손의 컨테이닝 블록이 되어 뷰포트 기준 중앙 정렬이 깨지기 때문.
  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-modal-title"
      onKeyDown={handleKeyDown}
      onClick={handleOverlayClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/20 p-6 dark:bg-slate-900 dark:border-white/10 dark:shadow-black/60"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 flex-shrink-0 dark:bg-cyan-400/10">
              <VpnKeyRoundedIcon sx={{ fontSize: 18 }} className="text-indigo-600 dark:text-cyan-400" />
            </span>
            <div>
              <h3 id="register-modal-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                라이선스 등록
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                카테고리와 버전, 25자리 제품 키를 입력하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                isKeyComplete
                  ? "bg-indigo-50 text-indigo-600 dark:bg-cyan-400/10 dark:text-cyan-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
              }`}
            >
              {isKeyComplete ? "준비 완료" : "입력 대기"}
            </span>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/10"
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 카테고리 선택 → 버전 목록이 연동되어 변경됨 */}
            <div className="w-full space-y-1.5">
              <label
                htmlFor="category-select"
                className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400"
              >
                카테고리
              </label>
              <Select
                id="category-select"
                aria-label="카테고리 선택"
                value={category}
                onChange={onCategoryChange}
                options={CATEGORY_OPTIONS}
                placeholder="카테고리 선택"
              />
            </div>

            {/* 버전 선택: 카테고리 미선택 시 disabled */}
            <div className="w-full space-y-1.5">
              <label
                htmlFor="version-select"
                className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400"
              >
                버전
              </label>
              <Select
                id="version-select"
                aria-label="버전 선택"
                disabled={!category}
                value={version}
                onChange={onVersionChange}
                options={
                  category
                    ? versionOptions[category as Category].map((v) => ({ value: v, label: v }))
                    : []
                }
                placeholder={category ? "버전 선택" : "카테고리 선택 우선"}
              />
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 dark:border-white/10"></div>

          {/* 제품 키 입력: 5칸 분리 입력 + 자동 포커스 이동 */}
          <div className="space-y-2">
            <label id="product-key-label" className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              제품 키
            </label>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {keys.map((key, index) => (
                <React.Fragment key={index}>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => onKeyChange(index, e.target.value)}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    ref={(el) => (inputRefs.current[index] = el)}
                    aria-labelledby="product-key-label"
                    aria-label={`${index + 1}번째 칸 (5자리)`}
                    className="w-0 flex-1 min-w-0 h-10 text-center font-mono font-bold text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all tracking-widest text-slate-900 placeholder:text-slate-400 dark:bg-slate-800 dark:border-white/10 dark:text-slate-100 dark:focus:ring-cyan-400/30 dark:focus:border-cyan-400 dark:placeholder:text-slate-600"
                    placeholder="XXXXX"
                  />
                  {index < keys.length - 1 && (
                    <span className="text-slate-300 dark:text-slate-700 font-light text-lg flex-shrink-0">—</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 h-10 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all dark:text-slate-300 dark:hover:bg-white/10"
            >
              취소
            </button>
            {/* 3가지 조건(키 완성 + 카테고리 + 버전) 모두 충족 시 버튼 활성화 */}
            <button
              onClick={onSubmit}
              disabled={!isKeyComplete || !category || !version}
              className={`px-7 h-10 text-sm font-semibold rounded-lg transition-all ${
                isKeyComplete && category && version
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 active:scale-95 shadow-md shadow-indigo-200 dark:from-indigo-500 dark:to-fuchsia-500 dark:hover:from-indigo-400 dark:hover:to-fuchsia-400 dark:shadow-indigo-500/30"
                  : "bg-slate-200/70 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:text-slate-600"
              }`}
            >
              등록
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RegisterModal;
