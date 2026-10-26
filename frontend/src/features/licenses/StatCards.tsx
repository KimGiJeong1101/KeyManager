import React, { ReactNode, useMemo, useState } from "react";
import { ChevronDown, KeyRound, Unlock, User } from "lucide-react";
import { CategoryStat } from "../../types/item";
import { CATEGORY_META, getCategoryMeta } from "../../lib/categories";

type StatDetailKey = "total" | "active" | "available";

interface StatConfigItem {
  label: string;
  mainCount: number;
  detailKey: StatDetailKey;
  color: string;
  topBorder: string;
  hoverBg: string;
  iconBg: string;
  icon: ReactNode;
  showBar: boolean;
  barColor?: string;
}

interface StatCardsProps {
  categoryStats: CategoryStat[];
}

// 상단 통계 카드 3개 (전체 / 사용 중 / 미사용).
// 호버(또는 터치 기기에서는 클릭)하면 카테고리별 세부 수치가 아래에서 슬라이드 업된다.
const StatCards: React.FC<StatCardsProps> = ({ categoryStats }) => {
  // expandedStat: 탭/클릭으로 펼친 통계 카드의 label (터치 기기는 hover가 없어 클릭 토글 필요)
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // categoryStats 변경 시에만 전체 합계 재계산
  const totalStats = useMemo(
    () =>
      categoryStats.reduce(
        (acc, curr) => ({
          total: acc.total + curr.total,
          active: acc.active + curr.active,
          available: acc.available + curr.available,
        }),
        { total: 0, active: 0, available: 0 },
      ),
    [categoryStats],
  );

  // 상단 통계 카드 3개의 설정값 (레이블, 숫자, 색상, 아이콘, 프로그레스 바)
  const statConfig: StatConfigItem[] = useMemo(
    () => [
      {
        label: "전체 라이선스",
        mainCount: totalStats.total,
        detailKey: "total",
        color: "text-slate-900 dark:text-slate-100",
        topBorder: "border-t-slate-400 dark:border-t-slate-600",
        hoverBg: "hover:bg-slate-50 dark:hover:bg-white/[0.03]",
        iconBg: "bg-slate-100 dark:bg-white/10",
        icon: <KeyRound size={15} className="text-slate-500 dark:text-slate-300" />,
        showBar: false,
      },
      {
        label: "사용 중",
        mainCount: totalStats.active,
        detailKey: "active",
        color: "text-emerald-600 dark:text-emerald-400",
        topBorder: "border-t-emerald-500 dark:border-t-emerald-400",
        hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-500/[0.06]",
        iconBg: "bg-emerald-100 dark:bg-emerald-400/10",
        icon: <User size={15} className="text-emerald-600 dark:text-emerald-400" />,
        barColor: "bg-emerald-500 dark:bg-emerald-400",
        showBar: true,
      },
      {
        label: "미사용 (가용)",
        mainCount: totalStats.available,
        detailKey: "available",
        color: "text-blue-600 dark:text-cyan-400",
        topBorder: "border-t-blue-500 dark:border-t-cyan-400",
        hoverBg: "hover:bg-blue-50 dark:hover:bg-cyan-400/[0.06]",
        iconBg: "bg-blue-100 dark:bg-cyan-400/10",
        icon: <Unlock size={15} className="text-blue-600 dark:text-cyan-400" />,
        barColor: "bg-blue-500 dark:bg-cyan-400",
        showBar: true,
      },
    ],
    [totalStats],
  );

  // 카테고리별 상세는 DB 집계 순서(매번 달라질 수 있음)가 아니라 탭과 같은 순서로 보여준다
  const sortedStats = useMemo(() => {
    const order = Object.keys(CATEGORY_META);
    const rank = (c: string) => (order.indexOf(c) === -1 ? order.length : order.indexOf(c));
    return [...categoryStats].sort((a, b) => rank(a.category) - rank(b.category));
  }, [categoryStats]);

  return (
    <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 border-b border-slate-200 dark:border-white/10">
      {statConfig.map((stat) => {
        const isExpanded = expandedStat === stat.label;
        return (
        <button
          type="button"
          key={stat.label}
          onClick={() =>
            setExpandedStat((prev) => (prev === stat.label ? null : stat.label))
          }
          aria-expanded={isExpanded}
          aria-label={`${stat.label} 카테고리별 상세 보기`}
          className={`group relative overflow-hidden transition-all duration-300 border-t-2 w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset ${stat.topBorder} ${stat.hoverBg}`}
        >
          {/* 기본 뷰: 아이콘 + 레이블 + 숫자 + 프로그레스 바 */}
          <div
            className={`p-3 sm:p-6 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-3 ${
              isExpanded ? "opacity-0 -translate-y-3" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <span className={`flex items-center justify-center w-6 h-6 rounded-lg ${stat.iconBg}`}>
                {stat.icon}
              </span>
            </div>
            <p className={`text-2xl sm:text-4xl font-bold tracking-tight ${stat.color}`}>
              {stat.mainCount}
            </p>
            {stat.showBar && (
              <div className="mt-3">
                <div className="h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stat.barColor} rounded-full transition-all duration-700`}
                    style={{
                      width: `${totalStats.total > 0 ? Math.round((stat.mainCount / totalStats.total) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                  전체의{" "}
                  <span className={stat.color}>
                    {totalStats.total > 0
                      ? Math.round((stat.mainCount / totalStats.total) * 100)
                      : 0}
                    %
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* 카테고리별 상세를 펼쳐볼 수 있다는 발견성 힌트 (호버/펼침 시에는 사라짐) */}
          <span
            className={`absolute bottom-2.5 right-3 text-slate-300 dark:text-slate-600 transition-opacity duration-200 group-hover:opacity-0 ${
              isExpanded ? "opacity-0" : ""
            }`}
          >
            <ChevronDown size={16} />
          </span>

          {/* 호버/탭 뷰: 카테고리별 세부 수치 (아래에서 슬라이드 업) */}
          <div
            className={`absolute inset-0 p-3 sm:p-5 bg-white dark:bg-slate-900 group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-center ${
              isExpanded ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <p className="text-[9px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 mb-2 uppercase pb-1.5 border-b border-slate-200 dark:border-white/10">
              카테고리별
            </p>
            <div className="space-y-1">
              {sortedStats.map((cat) => (
                <div
                  key={cat.category}
                  className="flex justify-between items-center text-xs font-medium"
                >
                  <span className="text-slate-500 dark:text-slate-400">
                    {getCategoryMeta(cat.category).label}
                  </span>
                  <span className={`${stat.color}`}>
                    {cat[stat.detailKey]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </button>
        );
      })}
    </div>
  );
};

export default StatCards;
