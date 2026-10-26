import React, { useState } from "react";
import { Check, Copy, History, Pencil, Plus, SearchX, StickyNote, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { Item } from "../../types/item";
import { getCategoryMeta, isAssigned } from "../../lib/categories";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// 반응형 레이아웃
//   lg 이상(≥1024px) : 번호 | 키 | 카테고리 | 사용자 | 관리  (전체 표)
//   md ~ lg(768~1023): 키(+카테고리 배지) | 사용자 | 관리  (번호/카테고리 열 숨김 → 키가 줄바꿈되지 않도록)
//   md 미만(<768px)  : 카드 목록 (표는 좁은 화면에서 열이 뭉개지므로 별도 레이아웃)
// 키/사용자/관리 버튼 렌더링은 표와 카드가 같은 헬퍼(render*)를 공유한다.
// 수정(사용자/카테고리·버전/메모)은 EditItemDialog 모달에서 한다 (onEdit).
// ─────────────────────────────────────────────

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const meta = getCategoryMeta(category);
  return (
    <Badge title={meta.label} className={cn("rounded-md px-2 py-0.5 text-[10px] max-w-full truncate", meta.badgeClass)}>
      {meta.label}
    </Badge>
  );
};

// 행 왼쪽 카테고리 컬러 인디케이터
const CategoryIndicator: React.FC<{ category: string; className?: string }> = ({ category, className }) => (
  <span
    className={cn(
      "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full opacity-70",
      getCategoryMeta(category).indicatorClass,
      className,
    )}
  />
);

// 스켈레톤 행 (데이터 로딩 중 표시)
const SkeletonRow: React.FC = () => (
  <TableRow>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-5 w-10 mx-auto" />
    </TableCell>
    <TableCell className="max-lg:rounded-l-xl max-lg:border-l">
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-3 w-24" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-5 w-16 mx-auto" />
    </TableCell>
    <TableCell className="text-center">
      <Skeleton className="h-6 w-20 mx-auto rounded-full" />
    </TableCell>
    <TableCell>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </TableCell>
  </TableRow>
);

const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-white/10 dark:bg-white/[0.02]">
    <Skeleton className="h-4 w-56" />
    <Skeleton className="h-3 w-32" />
    <div className="flex justify-between">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  </div>
);

const COPY_RESET_DELAY = 1500;

const ICON_BUTTON =
  "p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-400/10";

interface ItemListDisplayProps {
  items: Item[];
  isLoading: boolean;
  deleteItem: (no: number) => void;
  isFiltering: boolean;
  onResetFilters: () => void;
  onOpenRegister: () => void;
  onShowHistory: (item: Item) => void;
  onEdit: (item: Item) => void;
}

const ItemListDisplay: React.FC<ItemListDisplayProps> = ({
  items,
  isLoading,
  deleteItem,
  isFiltering,
  onResetFilters,
  onOpenRegister,
  onShowHistory,
  onEdit,
}) => {
  // copiedNo: 복사 완료 아이콘을 잠시 보여줄 항목의 no
  const [copiedNo, setCopiedNo] = useState<number | null>(null);

  const handleCopy = async (item: Item) => {
    try {
      await navigator.clipboard.writeText(item.key);
      setCopiedNo(item.no);
      setTimeout(() => setCopiedNo((prev) => (prev === item.no ? null : prev)), COPY_RESET_DELAY);
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
      // HTTP(비보안 컨텍스트)로 접속하면 브라우저가 clipboard API를 막는다 → 사용자에게 알려준다.
      toast.error("키를 복사하지 못했습니다. 직접 선택해서 복사해주세요.");
    }
  };

  // ── 표/카드 공용 렌더링 헬퍼 ─────────────────────

  // 키 + 복사 버튼. 사용 중인 키는 살짝 흐리게 표시한다(읽고 복사할 수 있도록 취소선은 쓰지 않음).
  const renderKey = (item: Item, assigned: boolean) => (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className={cn(
          "font-mono font-semibold text-sm leading-none tracking-wide whitespace-nowrap transition-colors",
          assigned ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100",
        )}
      >
        {item.key}
      </span>
      <button
        onClick={() => handleCopy(item)}
        aria-label="라이선스 키 복사"
        title="키 복사"
        className="p-1 flex-shrink-0 rounded-md text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all dark:text-slate-600 dark:hover:text-cyan-300 dark:hover:bg-cyan-400/10"
      >
        {copiedNo === item.no ? (
          <Check size={13} className="text-emerald-500 dark:text-emerald-400" />
        ) : (
          <Copy size={13} />
        )}
      </button>
    </div>
  );

  // 버전 (+ 메모가 있으면 메모 아이콘과 한 줄 요약. 전체 내용은 툴팁)
  const renderMeta = (item: Item, assigned: boolean) => (
    <>
      <span
        className={cn(
          "text-[10px] font-medium tracking-wide truncate flex-shrink-0 max-w-[60%]",
          assigned ? "text-slate-400 dark:text-slate-500" : "text-blue-600 dark:text-cyan-400",
        )}
      >
        {item.version}
      </span>
      {item.memo && (
        <span
          title={item.memo}
          className="inline-flex items-center gap-1 min-w-0 text-[10px] text-slate-500 dark:text-slate-400"
        >
          <StickyNote size={11} className="flex-shrink-0 text-amber-500 dark:text-amber-400" />
          <span className="truncate">{item.memo.replace(/\s+/g, " ")}</span>
        </span>
      )}
    </>
  );

  // 사용자 상태 배지: 사용 중(초록) / 미사용(회색)
  const renderMember = (item: Item, assigned: boolean) => (
    <span
      title={assigned ? item.member ?? undefined : undefined}
      className={cn(
        "inline-flex max-w-full items-center px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200",
        assigned
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20"
          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 shrink-0 rounded-full mr-1.5",
          assigned ? "bg-emerald-500 dark:bg-emerald-400" : "bg-slate-300 dark:bg-slate-600",
        )}
      ></span>
      <span className="truncate">{assigned ? item.member : "미사용"}</span>
    </span>
  );

  // 관리 버튼: 이력 / 수정(모달) / 삭제(사용 중인 키는 비활성화)
  const renderActions = (item: Item, assigned: boolean) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => onShowHistory(item)} aria-label="이력 보기" title="이력 보기" className={ICON_BUTTON}>
        <History size={16} />
      </button>
      <button onClick={() => onEdit(item)} aria-label="수정" title="수정 (사용자·버전·메모)" className={ICON_BUTTON}>
        <Pencil size={16} />
      </button>
      <button
        disabled={assigned}
        onClick={() => deleteItem(item.no)}
        aria-label={assigned ? "삭제 (사용 중인 키는 삭제할 수 없음)" : "삭제"}
        title={assigned ? "사용 중인 키는 삭제할 수 없습니다" : "삭제"}
        className={cn(
          "p-2 rounded-lg transition-all",
          assigned
            ? "text-slate-300 cursor-not-allowed dark:text-slate-700"
            : "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-400/10",
        )}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="w-full pb-4">
      {/* ── md 이상: 표 ── */}
      {!isEmpty && (
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-transparent hover:bg-transparent">
              <TableHead className="hidden lg:table-cell text-center w-16">번호</TableHead>
              <TableHead className="text-left">라이선스 키</TableHead>
              <TableHead className="hidden lg:table-cell text-center w-28">카테고리</TableHead>
              <TableHead className="text-center w-40 lg:w-44">사용자</TableHead>
              <TableHead className="text-right pr-8 w-36">관리</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading &&
              items.map((item) => {
                const assigned = isAssigned(item.member);
                return (
                  <TableRow key={item.no}>
                    {/* 번호 셀 (lg 이상) */}
                    <TableCell className="hidden lg:table-cell relative">
                      <CategoryIndicator category={item.category} />
                      <div className="flex justify-center">
                        <span className="font-mono text-xs font-semibold px-2 py-1 rounded-md transition-colors bg-slate-200 text-slate-500 group-hover:text-slate-700 dark:bg-white/10 dark:text-slate-400 dark:group-hover:text-slate-200">
                          {item.no.toString().padStart(3, "0")}
                        </span>
                      </div>
                    </TableCell>

                    {/* 키 셀. lg 미만에서는 번호 셀이 숨겨지므로 이 셀이 행의 왼쪽 끝(둥근 모서리/인디케이터)을 맡는다 */}
                    <TableCell className="relative max-lg:rounded-l-xl max-lg:border-l">
                      <CategoryIndicator category={item.category} className="lg:hidden" />
                      <div className="flex flex-col min-w-0">
                        {renderKey(item, assigned)}
                        <div className="flex items-center gap-2 mt-1.5 min-w-0">
                          <span className="lg:hidden flex-shrink-0">
                            <CategoryBadge category={item.category} />
                          </span>
                          {renderMeta(item, assigned)}
                        </div>
                      </div>
                    </TableCell>

                    {/* 카테고리 셀 (lg 이상) */}
                    <TableCell className="hidden lg:table-cell text-center">
                      <CategoryBadge category={item.category} />
                    </TableCell>

                    <TableCell className="text-center">{renderMember(item, assigned)}</TableCell>

                    <TableCell className="text-right pr-6">{renderActions(item, assigned)}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      )}

      {/* ── md 미만: 카드 목록 ── */}
      {!isEmpty && (
        <ul className="md:hidden space-y-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <SkeletonCard />
              </li>
            ))}
          {!isLoading &&
            items.map((item) => {
              const assigned = isAssigned(item.member);
              return (
                <li
                  key={item.no}
                  className="relative rounded-xl border p-4 pl-5 transition-colors border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <CategoryIndicator category={item.category} />
                  {renderKey(item, assigned)}
                  <div className="flex items-center gap-2 mt-2 min-w-0">
                    <span className="flex-shrink-0">
                      <CategoryBadge category={item.category} />
                    </span>
                    {renderMeta(item, assigned)}
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="min-w-0 flex-1">{renderMember(item, assigned)}</div>
                    {renderActions(item, assigned)}
                  </div>
                </li>
              );
            })}
        </ul>
      )}

      {/* 빈 상태 UI: 로딩 중에는 표시하지 않음.
          검색/필터 때문에 0건인 경우와, 애초에 등록된 라이선스가 없는 경우를 구분해서 안내한다. */}
      {isEmpty && isFiltering && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-transparent dark:border-white/10 dark:from-white/[0.03]">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <SearchX size={20} className="text-slate-400 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">검색·필터 조건에 맞는 라이선스가 없습니다.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1.5">다른 조건으로 다시 검색하거나 필터를 초기화해보세요.</p>
          <Button variant="ghost" onClick={onResetFilters} className="mt-4 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20">
            필터 초기화
          </Button>
        </div>
      )}
      {isEmpty && !isFiltering && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-transparent dark:border-white/10 dark:from-white/[0.03]">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <span className="text-slate-400 dark:text-slate-600 text-lg font-mono font-bold select-none">—</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">등록된 라이선스가 없습니다.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1.5">새 라이선스 버튼으로 첫 라이선스를 등록해주세요.</p>
          <Button onClick={onOpenRegister} className="mt-4">
            <Plus size={15} />
            새 라이선스 등록
          </Button>
        </div>
      )}
    </div>
  );
};

export default ItemListDisplay;
