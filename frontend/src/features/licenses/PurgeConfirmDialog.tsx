import React, { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { DeletedItem } from "../../types/item";

interface PurgeConfirmDialogProps {
  // 완전삭제 대상. null이면 닫힘.
  item: DeletedItem | null;
  isPurging: boolean;
  // confirm: 사용자가 입력한 키 마지막 5자리 (서버에서도 한 번 더 검증한다)
  onConfirm: (confirm: string) => void;
  onCancel: () => void;
}

// 완전삭제 확인 모달.
// 되돌릴 수 없는 작업이라 버튼 클릭만으로는 실행되지 않고, 키 마지막 5자리를 직접 입력해야 활성화된다.
//
// 입력칸은 "따라쓰기" 방식: 입력할 5글자가 회색으로 깔려 있고, 친 글자는 맞으면 진하게,
// 틀리면 빨간색으로 덮어 보여준다. 실제 <input>의 글자는 투명하게 두고(커서/선택/붙여넣기 등
// 기본 동작은 그대로), 같은 글꼴·여백의 오버레이가 색을 입힌 글자를 그 위치에 그린다.
const PurgeConfirmDialog: React.FC<PurgeConfirmDialogProps> = ({
  item,
  isPurging,
  onConfirm,
  onCancel,
}) => {
  const [typed, setTyped] = useState("");

  // 대상이 바뀌거나 다시 열릴 때 입력값 초기화
  useEffect(() => {
    setTyped("");
  }, [item]);

  const suffix = (item?.key.slice(-5) ?? "").toUpperCase();
  const typedUpper = typed.toUpperCase();
  const matches = typedUpper.trim() === suffix && suffix !== "";

  const submit = () => {
    if (matches && !isPurging) onConfirm(typed.trim());
  };

  return (
    <AlertDialog open={item !== null} onOpenChange={(next) => !next && !isPurging && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 flex-shrink-0 dark:bg-red-400/10">
            <TriangleAlert size={20} className="text-red-500 dark:text-red-400" />
          </span>
          <AlertDialogTitle>완전삭제</AlertDialogTitle>
        </AlertDialogHeader>

        <AlertDialogDescription asChild>
          <div className="space-y-3">
            <p>
              이 라이선스를 <span className="font-semibold text-red-600 dark:text-red-400">영구적으로 삭제</span>
              합니다. 휴지통에서도 사라지며 <span className="font-semibold">되돌릴 수 없습니다.</span>
            </p>
            <p className="font-mono text-sm font-semibold text-foreground break-all">
              {item?.key.slice(0, -5)}
              <span className="text-red-600 dark:text-red-400 underline underline-offset-4">{suffix}</span>
            </p>
            <p className="text-xs">사용 이력은 감사 기록으로 계속 보관됩니다.</p>
          </div>
        </AlertDialogDescription>

        <div className="mt-4 space-y-1.5">
          <label htmlFor="purge-confirm" className="text-xs font-medium text-muted-foreground">
            확인을 위해 키의 마지막 5자리 <span className="font-mono font-semibold text-foreground">{suffix}</span>를
            입력하세요.
          </label>
          <div className="relative">
            <Input
              id="purge-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              maxLength={5}
              autoComplete="off"
              spellCheck={false}
              disabled={isPurging}
              className={cn(
                "font-mono tracking-widest uppercase text-transparent caret-foreground selection:bg-red-500/20",
                // 5글자를 모두 맞게 입력하면 "삭제할 준비가 됨"을 빨간 테두리로 강조
                matches && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30",
              )}
              autoFocus
            />
            {/* 따라쓰기 오버레이: Input과 같은 테두리 두께(투명)·좌우 여백·글꼴·자간으로 글자 위치를 맞춘다 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center px-3 border border-transparent font-mono text-sm tracking-widest"
            >
              {suffix.split("").map((expected, i) => {
                const ch = typedUpper[i];
                return (
                  <span
                    key={i}
                    className={cn(
                      ch === undefined && "text-slate-300 dark:text-slate-600",
                      ch !== undefined && ch === expected && "text-foreground font-semibold",
                      ch !== undefined && ch !== expected && "text-red-500 dark:text-red-400 font-semibold",
                    )}
                  >
                    {ch ?? expected}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isPurging}>
            취소
          </AlertDialogCancel>
          {/* AlertDialogAction은 클릭 즉시 모달을 닫아버리므로, 요청이 끝날 때까지 열어두려고 일반 Button을 쓴다 */}
          <Button variant="destructive" onClick={submit} disabled={!matches || isPurging}>
            {isPurging ? "삭제 중..." : "완전삭제"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PurgeConfirmDialog;
