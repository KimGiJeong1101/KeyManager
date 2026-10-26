import React, { ClipboardEvent, KeyboardEvent, MutableRefObject } from "react";
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
import { SelectOption } from "../../types/ui";
import { shouldSplitPaste } from "../../lib/licenseKey";
import { getCategoryMeta } from "../../lib/categories";

interface RegisterModalProps {
  open: boolean;
  category: string;
  version: string;
  keys: string[];
  // 백엔드(GET /categories)에서 받아온 category → version 화이트리스트.
  // 카테고리 선택지 자체도 이 목록의 키에서 도출한다(별도 하드코딩 없음).
  versionOptions: Record<string, string[]>;
  isKeyComplete: boolean;
  // isSubmitting: 등록 요청이 진행 중인 동안 버튼을 비활성화해 중복 클릭을 막는다.
  isSubmitting?: boolean;
  onCategoryChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onKeyChange: (index: number, value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, index: number) => void;
  // 전체 키(하이픈 포함 등)를 붙여넣었을 때 여러 칸에 나눠 채운다
  onKeyPaste: (index: number, text: string) => void;
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
  onKeyPaste,
  inputRefs,
  onSubmit,
  onClose,
}) => {
  // 카테고리 선택지를 versionOptions의 키에서 도출한다 (백엔드 화이트리스트와 항상 일치).
  const categoryOptions: SelectOption[] = Object.keys(versionOptions).map((value) => ({
    value,
    label: getCategoryMeta(value).label,
  }));

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
              <DialogDescription>카테고리와 버전, 25자리 제품 키를 입력하세요. 전체 키를 붙여넣어도 됩니다.</DialogDescription>
            </div>
          </div>
          <Badge variant={isKeyComplete ? "default" : "muted"} className="mr-8 whitespace-nowrap flex-shrink-0">
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
                options={categoryOptions}
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
                    ? (versionOptions[category] ?? []).map((v) => ({ value: v, label: v }))
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
                    onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
                      const text = e.clipboardData.getData("text");
                      // 5자 이하 영문/숫자는 기본 동작(onChange 검증)에 맡기고, 그 외만 가로챈다
                      if (!shouldSplitPaste(text)) return;
                      e.preventDefault();
                      onKeyPaste(index, text);
                    }}
                    ref={(el) => (inputRefs.current[index] = el)}
                    aria-labelledby="product-key-label"
                    aria-label={`${index + 1}번째 칸 (5자리)`}
                    className="w-0 flex-1 min-w-0 h-10 px-0 text-center font-mono font-bold text-xs sm:text-sm tracking-normal sm:tracking-widest bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring/40 focus:border-ring outline-none transition-all text-foreground placeholder:text-muted-foreground"
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
