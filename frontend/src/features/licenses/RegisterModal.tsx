import React, { KeyboardEvent, MutableRefObject } from "react";
import { KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import SelectField from "../../components/ui/SelectField";
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
  // isSubmitting: 등록 요청이 진행 중인 동안 버튼을 비활성화해 중복 클릭을 막는다.
  isSubmitting?: boolean;
  onCategoryChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onKeyChange: (index: number, value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, index: number) => void;
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  onSubmit: () => void;
  onClose: () => void;
}

// 라이선스 등록 폼을 담는 모달.
const RegisterModal: React.FC<RegisterModalProps> = ({
  open,
  category,
  version,
  keys,
  versionOptions,
  isKeyComplete,
  isSubmitting = false,
  onCategoryChange,
  onVersionChange,
  onKeyChange,
  onKeyDown,
  inputRefs,
  onSubmit,
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSubmitting && onClose()}>
      <DialogContent onOpenAutoFocus={(e) => {
        e.preventDefault();
        inputRefs.current[0]?.focus();
      }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 flex-shrink-0 dark:bg-cyan-400/10">
              <KeyRound size={18} className="text-blue-600 dark:text-cyan-400" />
            </span>
            <div>
              <DialogTitle>라이선스 등록</DialogTitle>
              <DialogDescription>카테고리와 버전, 25자리 제품 키를 입력하세요.</DialogDescription>
            </div>
          </div>
          <Badge variant={isKeyComplete ? "default" : "muted"} className="mr-8">
            {isKeyComplete ? "준비 완료" : "입력 대기"}
          </Badge>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 카테고리 선택 → 버전 목록이 연동되어 변경됨 */}
            <div className="w-full space-y-1.5">
              <Label htmlFor="category-select">카테고리</Label>
              <SelectField
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
              <Label htmlFor="version-select">버전</Label>
              <SelectField
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

          <div className="border-t border-dashed border-border"></div>

          {/* 제품 키 입력: 5칸 분리 입력 + 자동 포커스 이동 */}
          <div className="space-y-2">
            <Label id="product-key-label">제품 키</Label>
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
                    className="w-0 flex-1 min-w-0 h-10 text-center font-mono font-bold text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring/40 focus:border-ring outline-none transition-all tracking-widest text-foreground placeholder:text-muted-foreground"
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
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              onClick={onSubmit}
              disabled={!isKeyComplete || !category || !version || isSubmitting}
              className="px-7"
            >
              {isSubmitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterModal;
