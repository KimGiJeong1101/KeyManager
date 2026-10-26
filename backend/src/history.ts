// 라이선스 키 이력(LICENSE_KEY_HISTORY) 기록 헬퍼.
// 상태 변경 쿼리와 같은 트랜잭션(client) 안에서 호출해야, 변경은 됐는데 이력은 빠지는(또는 그 반대) 상황이 생기지 않는다.

import { PoolClient } from "pg";

export type HistoryAction =
  | "create"
  | "assign"
  | "unassign"
  | "edit"
  | "delete"
  | "restore"
  | "purge";

// 사용자 변경을 이력 액션으로 분류한다. 변경이 없으면 null (이력 남기지 않음).
//   null → "홍길동"      : assign
//   "홍길동" → "김철수"  : assign (재배정, member_before로 이전 사용자 확인 가능)
//   "홍길동" → null      : unassign
export function classifyMemberChange(
  before: string | null,
  after: string | null,
): HistoryAction | null {
  if (before === after) return null;
  return after === null ? "unassign" : "assign";
}

export interface EditableFields {
  category: string | null;
  version: string | null;
  memo: string | null;
}

// 사용자 외 정보(카테고리/버전/메모) 변경 내용을 "edit" 이력의 detail 문구로 만든다. 변경이 없으면 null.
// 메모는 길 수 있고 개인적인 내용일 수 있어 값 대신 "변경/추가/삭제"만 남긴다.
export function describeEdit(before: EditableFields, after: EditableFields): string | null {
  const parts: string[] = [];
  if (before.category !== after.category) {
    parts.push(`카테고리: ${before.category ?? "-"} → ${after.category ?? "-"}`);
  }
  if (before.version !== after.version) {
    parts.push(`버전: ${before.version ?? "-"} → ${after.version ?? "-"}`);
  }
  if (before.memo !== after.memo) {
    parts.push(before.memo === null ? "메모 추가" : after.memo === null ? "메모 삭제" : "메모 변경");
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}

export async function recordHistory(
  client: PoolClient,
  licenseNo: number,
  action: HistoryAction,
  memberBefore: string | null = null,
  memberAfter: string | null = null,
  detail: string | null = null,
): Promise<void> {
  // key_snapshot: 기록 시점의 키 값을 함께 저장한다 (완전삭제 후에도 어떤 키였는지 남기기 위함).
  // 키 행이 아직 존재할 때 호출되므로 서브쿼리로 바로 읽어온다.
  await client.query(
    `INSERT INTO LICENSE_KEY_HISTORY (license_no, original_no, key_snapshot, action, member_before, member_after, detail)
     VALUES ($1, $1, (SELECT key FROM LICENSE_KEYS WHERE no = $1), $2, $3, $4, $5)`,
    [licenseNo, action, memberBefore, memberAfter, detail],
  );
}
