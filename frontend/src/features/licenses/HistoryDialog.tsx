import React, { ReactNode, useEffect, useState } from "react";
import { History, Pencil, Plus, RotateCcw, Trash2, UserMinus, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { getErrorMessage } from "../../api/items";
import { HistoryTarget } from "./historyTarget";
import { HistoryAction, HistoryEntry } from "../../types/item";
import { formatDateTime } from "../../lib/format";
import { labelizeCategoryChange } from "../../lib/categories";

interface ActionStyle {
  label: string;
  icon: ReactNode;
  dotClass: string;
}

const ACTION_STYLE: Record<HistoryAction, ActionStyle> = {
  create: {
    label: "등록",
    icon: <Plus size={13} />,
    dotClass: "bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
  },
  assign: {
    label: "사용자 배정",
    icon: <UserPlus size={13} />,
    dotClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  unassign: {
    label: "배정 해제",
    icon: <UserMinus size={13} />,
    dotClass: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300",
  },
  edit: {
    label: "정보 수정",
    icon: <Pencil size={12} />,
    dotClass: "bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
  },
  delete: {
    label: "삭제",
    icon: <Trash2 size={13} />,
    dotClass: "bg-red-100 text-red-600 dark:bg-red-400/15 dark:text-red-300",
  },
  purge: {
    label: "완전삭제",
    icon: <Trash2 size={13} />,
    dotClass: "bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-300",
  },
  restore: {
    label: "복구",
    icon: <RotateCcw size={13} />,
    dotClass: "bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
};

// 이력 한 줄의 상세 설명 (누구 → 누구)
const describe = (entry: HistoryEntry): string | null => {
  if (entry.action === "assign") {
    return entry.member_before
      ? `${entry.member_before} → ${entry.member_after}`
      : `${entry.member_after}`;
  }
  if (entry.action === "unassign") return `${entry.member_before} 사용 종료`;
  if (entry.action === "edit") return entry.detail && labelizeCategoryChange(entry.detail);
  return null;
};


interface HistoryDialogProps {
  // 이력을 볼 대상. null이면 모달 닫힘.
  target: HistoryTarget | null;
  onClose: () => void;
}

// 라이선스 키별 등록/배정/해제/수정/삭제/복구/완전삭제 이력 타임라인.
const HistoryDialog: React.FC<HistoryDialogProps> = ({ target, onClose }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    // 모달을 빠르게 닫고 다른 키를 열었을 때 이전 응답이 늦게 도착해 덮어쓰지 않도록 한다.
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setEntries([]);
    target
      .load()
      .then((data) => !cancelled && setEntries(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err, "이력을 불러오지 못했습니다.")))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [target]);

  // 이력 기능 도입 이전에 등록된 키는 "등록" 이력이 없다 → 그 이전 기록은 없다고 안내한다.
  const hasCreateEntry = entries.some((e) => e.action === "create");

  return (
    <Dialog open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 flex-shrink-0 dark:bg-cyan-400/10">
              <History size={18} className="text-blue-600 dark:text-cyan-400" />
            </span>
            <div className="min-w-0">
              <DialogTitle>라이선스 이력</DialogTitle>
              <DialogDescription className="font-mono truncate">{target?.key}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1 pt-1 pb-2">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!isLoading && error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          {!isLoading && !error && entries.length > 0 && (
            <ol className="relative border-l border-slate-200 dark:border-white/10 ml-3 space-y-4">
              {entries.map((entry) => {
                const style = ACTION_STYLE[entry.action];
                const detail = describe(entry);
                return (
                  <li key={entry.id} className="ml-5">
                    <span
                      className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-card ${style.dotClass}`}
                    >
                      {style.icon}
                    </span>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{style.label}</p>
                      <time className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </time>
                    </div>
                    {detail && <p className="text-xs text-muted-foreground mt-0.5 break-all">{detail}</p>}
                  </li>
                );
              })}
            </ol>
          )}

          {!isLoading && !error && !hasCreateEntry && (
            <p className={`text-xs text-muted-foreground ${entries.length > 0 ? "mt-5" : ""}`}>
              이력 기록 기능이 도입되기 전에 등록된 키라서, 그 이전의 기록은 남아있지 않습니다.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryDialog;
