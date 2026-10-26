// 재고 부족 경고 판단 (순수 함수).

import { VersionStat } from "../types/item";

// 남은(미사용) 키가 이 개수 이하인 버전을 "부족"으로 본다. 0개는 "소진".
export const LOW_STOCK_THRESHOLD = 1;

// 키가 등록된 버전 중 남은 키가 기준 이하인 것만, 적게 남은 순(같으면 카테고리·버전 이름순)으로 돌려준다.
export function findLowStock(stats: VersionStat[], threshold = LOW_STOCK_THRESHOLD): VersionStat[] {
  return stats
    .filter((s) => s.total > 0 && s.available <= threshold)
    .sort(
      (a, b) =>
        a.available - b.available ||
        a.category.localeCompare(b.category) ||
        a.version.localeCompare(b.version),
    );
}
