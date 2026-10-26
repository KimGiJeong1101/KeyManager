// 이력 모달(HistoryDialog)에 넘기는 "이력을 볼 대상".
// 목록/휴지통의 키는 GET /items/:no/history, 완전삭제된 키는 GET /items/purged/:id/history로
// 불러오므로 "어떻게 불러올지(load)"를 호출부가 넘긴다.
// (load가 바뀔 때마다 다시 불러오므로, 렌더링마다 새로 만들지 말고 클릭 시점에 한 번 만들어 state에 담을 것)
import { getItemHistory } from "../../api/items";
import { HistoryEntry, Item } from "../../types/item";

export interface HistoryTarget {
  key: string;
  load: () => Promise<HistoryEntry[]>;
}

// 목록/휴지통 항목용 대상 생성 헬퍼
export const historyTargetOf = (item: Pick<Item, "no" | "key">): HistoryTarget => ({
  key: item.key,
  load: () => getItemHistory(item.no),
});
