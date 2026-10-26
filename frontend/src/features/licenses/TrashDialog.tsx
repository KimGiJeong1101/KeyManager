import React, { useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, History, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import {
  getDeletedItems,
  getErrorMessage,
  getPurgedHistory,
  getPurgedKeys,
  purgeItemRequest,
  restoreItemRequest,
} from "../../api/items";
import { DeletedItem, PurgedKey } from "../../types/item";
import { formatDateTime } from "../../lib/format";
import { getCategoryMeta } from "../../lib/categories";
import { resolveValidPage } from "../../lib/pagination";
import { cn } from "../../lib/utils";
import PurgeConfirmDialog from "./PurgeConfirmDialog";
import HistoryDialog from "./HistoryDialog";
import { HistoryTarget, historyTargetOf } from "./historyTarget";

const TRASH_PER_PAGE = 8;

type Tab = "trash" | "purged";

const ICON_BUTTON =
  "h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-500 dark:hover:text-cyan-300 dark:hover:bg-cyan-400/10";

interface TrashDialogProps {
  open: boolean;
  onClose: () => void;
  // 복구 성공 시 메인 목록/통계를 다시 불러오도록 부모에게 알린다.
  onRestored: () => void;
}

// 휴지통.
//   "휴지통" 탭      : 소프트 삭제된 라이선스 — 이력 보기 / 복구 / 완전삭제
//   "완전삭제 기록" 탭: 완전삭제된 키 목록 — 이력 보기 (키 행은 없지만 이력은 key_snapshot과 함께 남아 있음)
const TrashDialog: React.FC<TrashDialogProps> = ({ open, onClose, onRestored }) => {
  const [tab, setTab] = useState<Tab>("trash");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [items, setItems] = useState<DeletedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [purged, setPurged] = useState<PurgedKey[]>([]);
  const [purgedTotal, setPurgedTotal] = useState(0);

  // restoringNo: 복구 요청 중인 항목의 no (중복 클릭 방지 + 버튼 상태 표시)
  const [restoringNo, setRestoringNo] = useState<number | null>(null);
  // purgeTarget: 완전삭제 확인 모달에 띄울 항목 (null이면 닫힘)
  const [purgeTarget, setPurgeTarget] = useState<DeletedItem | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  // historyTarget: 이력 모달에 띄울 대상 (null이면 닫힘)
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  // reloadKey: 복구/완전삭제 후 같은 페이지를 다시 불러오기 위한 트리거
  const [reloadKey, setReloadKey] = useState(0);

  const currentTotal = tab === "trash" ? total : purgedTotal;
  const totalPages = Math.max(1, Math.ceil(currentTotal / TRASH_PER_PAGE));

  // 열 때마다 휴지통 탭 첫 페이지부터 보여준다
  useEffect(() => {
    if (open) {
      setTab("trash");
      setPage(1);
    }
  }, [open]);

  // 탭 제목의 개수 표시용: 두 탭의 전체 개수를 함께 갱신
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([getDeletedItems(1, 1), getPurgedKeys(1, 1)])
      .then(([d, p]) => {
        if (cancelled) return;
        setTotal(d.total);
        setPurgedTotal(p.total);
      })
      .catch(() => {
        /* 목록 조회 쪽에서 에러를 알리므로 여기서는 무시 */
      });
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  // 현재 탭의 현재 페이지 조회
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    const request =
      tab === "trash" ? getDeletedItems(page, TRASH_PER_PAGE) : getPurgedKeys(page, TRASH_PER_PAGE);
    request
      .then((data) => {
        if (cancelled) return;
        // 마지막 페이지의 유일한 항목을 복구/완전삭제한 경우 등 → 유효한 페이지로 되돌린다
        const validPage = resolveValidPage(page, data.total, TRASH_PER_PAGE, data.items.length);
        if (validPage !== page) {
          setPage(validPage);
          return;
        }
        if (tab === "trash") {
          setItems(data.items as DeletedItem[]);
          setTotal(data.total);
        } else {
          setPurged(data.items as PurgedKey[]);
          setPurgedTotal(data.total);
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(getErrorMessage(err, "휴지통을 불러오지 못했습니다."));
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, tab, page, reloadKey]);

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
  };

  const handleRestore = async (item: DeletedItem) => {
    if (restoringNo !== null) return;
    setRestoringNo(item.no);
    try {
      await restoreItemRequest(item.no);
      toast.success("라이선스가 복구되었습니다.", { icon: <RotateCcw size={18} className="text-emerald-500" /> });
      setReloadKey((k) => k + 1);
      onRestored();
    } catch (err) {
      toast.error(getErrorMessage(err, "복구 중 오류가 발생했습니다."));
    } finally {
      setRestoringNo(null);
    }
  };

  const handlePurge = async (confirm: string) => {
    if (!purgeTarget || isPurging) return;
    setIsPurging(true);
    try {
      await purgeItemRequest(purgeTarget.no, confirm);
      toast("라이선스가 완전삭제되었습니다.", { icon: <Trash2 size={18} className="text-red-500" /> });
      setPurgeTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "완전삭제 중 오류가 발생했습니다."));
    } finally {
      setIsPurging(false);
    }
  };

  const showSkeleton = isLoading && (tab === "trash" ? items.length === 0 : purged.length === 0);
  const isEmpty = !isLoading && (tab === "trash" ? items.length === 0 : purged.length === 0);

  return (
    <>
      <PurgeConfirmDialog
        item={purgeTarget}
        isPurging={isPurging}
        onConfirm={handlePurge}
        onCancel={() => setPurgeTarget(null)}
      />
      <HistoryDialog target={historyTarget} onClose={() => setHistoryTarget(null)} />
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 flex-shrink-0 dark:bg-white/10">
                <Archive size={18} className="text-slate-500 dark:text-slate-300" />
              </span>
              <div>
                <DialogTitle>휴지통</DialogTitle>
                <DialogDescription>
                  {tab === "trash"
                    ? "복구하면 목록에 다시 나타나고, 완전삭제하면 되돌릴 수 없습니다."
                    : "완전삭제된 키는 되돌릴 수 없지만, 이력은 감사 기록으로 계속 볼 수 있습니다."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* 탭 */}
          <div role="tablist" className="flex gap-1 mb-3 p-1 rounded-lg bg-slate-100 border border-slate-200 w-fit dark:bg-white/5 dark:border-white/10">
            {(
              [
                ["trash", `휴지통 ${total}`],
                ["purged", `완전삭제 기록 ${purgedTotal}`],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => switchTab(value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                  tab === value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-[200px]">
            {showSkeleton && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}

            {isEmpty && (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {tab === "trash" ? "휴지통이 비어 있습니다." : "완전삭제된 키가 없습니다."}
              </p>
            )}

            {/* 휴지통 탭 */}
            {tab === "trash" && items.length > 0 && (
              <ul className={cn("divide-y divide-border transition-opacity", isLoading && "opacity-50")}>
                {items.map((item) => (
                  <li key={item.no} className="flex items-center gap-2 sm:gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold text-foreground truncate">{item.key}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {getCategoryMeta(item.category).label} · {item.version}
                        {item.member ? ` · ${item.member}` : ""}
                      </p>
                    </div>
                    <time
                      className={cn(
                        "hidden sm:block text-[11px] text-muted-foreground whitespace-nowrap",
                        item.deleted_at && "font-mono",
                      )}
                    >
                      {item.deleted_at ? formatDateTime(item.deleted_at) : "삭제 시각 미기록"}
                    </time>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setHistoryTarget(historyTargetOf(item))}
                      aria-label="이력 보기"
                      title="이력 보기"
                      className={ICON_BUTTON}
                    >
                      <History size={15} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label="복구"
                      title="복구"
                      onClick={() => handleRestore(item)}
                      disabled={restoringNo !== null}
                    >
                      <RotateCcw size={13} />
                      {/* 좁은 화면에서는 아이콘만 (키가 잘리지 않도록) */}
                      <span className="hidden sm:inline">{restoringNo === item.no ? "복구 중..." : "복구"}</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setPurgeTarget(item)}
                      disabled={restoringNo !== null}
                      aria-label="완전삭제"
                      title="완전삭제"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:text-slate-500 dark:hover:text-red-400 dark:hover:bg-red-400/10"
                    >
                      <X size={15} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* 완전삭제 기록 탭 */}
            {tab === "purged" && purged.length > 0 && (
              <ul className={cn("divide-y divide-border transition-opacity", isLoading && "opacity-50")}>
                {purged.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold text-muted-foreground line-through decoration-slate-400/60 truncate">
                        {p.key ?? "(키 값 미기록)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        완전삭제 <span className="font-mono">{formatDateTime(p.purged_at)}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHistoryTarget({ key: p.key, load: () => getPurgedHistory(p.id) })}
                    >
                      <History size={13} />
                      이력
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-border">
              <span className="text-xs text-muted-foreground mr-1">
                {page} / {totalPages}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="이전 페이지"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="다음 페이지"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages || isLoading}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrashDialog;
