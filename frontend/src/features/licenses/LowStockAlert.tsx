import React, { useMemo, useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { VersionStat } from "../../types/item";
import { findLowStock, LOW_STOCK_THRESHOLD } from "../../lib/stock";
import { getCategoryMeta } from "../../lib/categories";
import { cn } from "../../lib/utils";

// 처음에 보여줄 칩 개수 (나머지는 "+N개 더" 펼치기)
const COLLAPSED_COUNT = 4;

interface LowStockAlertProps {
  versionStats: VersionStat[];
}

// 재고 부족 경고 띠. 남은 키가 LOW_STOCK_THRESHOLD개 이하인 버전을 칩으로 보여준다.
// 해당 버전이 없으면 아무것도 렌더링하지 않는다.
const LowStockAlert: React.FC<LowStockAlertProps> = ({ versionStats }) => {
  const [expanded, setExpanded] = useState(false);
  const lowStock = useMemo(() => findLowStock(versionStats), [versionStats]);

  if (lowStock.length === 0) return null;

  const soldOut = lowStock.filter((s) => s.available === 0).length;
  const visible = expanded ? lowStock : lowStock.slice(0, COLLAPSED_COUNT);
  const hidden = lowStock.length - visible.length;

  return (
    <div
      role="status"
      className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 px-4 sm:px-8 py-3 border-b border-amber-200 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/[0.06]"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap sm:pt-1">
        <TriangleAlert size={14} className="flex-shrink-0" />
        재고 부족 {lowStock.length}개 버전
        {soldOut > 0 && <span className="font-normal text-amber-700/80 dark:text-amber-300/70">(소진 {soldOut})</span>}
      </p>

      <ul className="flex flex-wrap items-center gap-1.5">
        {visible.map((s) => (
          <li
            key={`${s.category}/${s.version}`}
            title={`${getCategoryMeta(s.category).label} · ${s.version} — 전체 ${s.total}개 중 ${s.available}개 남음`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              s.available === 0
                ? "border-red-200 bg-white text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300"
                : "border-amber-200 bg-white text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
            )}
          >
            {s.version}
            <span className="font-semibold">{s.available === 0 ? "소진" : `${s.available}개 남음`}</span>
          </li>
        ))}
        {lowStock.length > COLLAPSED_COUNT && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-400/10"
            >
              {expanded ? "접기" : `+${hidden}개 더`}
              <ChevronDown size={12} className={cn("transition-transform", expanded && "rotate-180")} />
            </button>
          </li>
        )}
      </ul>

      <p className="sm:ml-auto text-[10px] text-amber-700/70 dark:text-amber-300/50 whitespace-nowrap sm:pt-1.5">
        남은 키 {LOW_STOCK_THRESHOLD}개 이하
      </p>
    </div>
  );
};

export default LowStockAlert;
