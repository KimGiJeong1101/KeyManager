// 라이선스 관리 도메인에서 공유하는 타입 모음.
// 서버(backend/src/server.ts)의 LICENSE_KEYS 테이블 응답 형태를 그대로 반영한다.

export type Category = "Windows" | "MS_Office" | "Hancom";

// 탭의 "전체"는 서버에 "allassets"로 전달된다.
export type CategoryFilter = Category | "allassets";

export type StatusFilter = "all" | "assigned" | "unassigned";

export type SearchField = "all" | "key" | "member" | "memo";

export interface Item {
  no: number;
  key: string;
  // 미배정 시 null (백엔드에서 정규화됨).
  member: string | null;
  category: Category | string;
  version: string;
  // 자유 메모 (PC명, 부서 등). 없으면 null.
  memo: string | null;
}

// GET /items/version-stats 항목 (재고 부족 경고용)
export interface VersionStat {
  category: string;
  version: string;
  total: number;
  available: number;
}

export interface CategoryStat {
  category: Category | string;
  total: number;
  active: number;
  available: number;
}

// GET /categories 응답. category → 등록 가능한 version 목록.
// 백엔드 constants.ts를 단일 소스로 두기 위해 프론트에서 별도로 하드코딩하지 않는다.
export type CategoryVersions = Record<string, string[]>;

export interface ItemsQueryParams {
  page: number;
  limit: number;
  category: CategoryFilter | string;
  status: StatusFilter;
  searchField: SearchField;
  searchValue: string;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
}

export interface CreateItemPayload {
  key: string;
  category: string;
  version: string;
}

// PUT /items/:no. key 외 필드는 보내지 않으면 서버가 기존 값을 유지한다.
// member/memo는 빈 문자열이면 지워진다(NULL).
export interface UpdateItemPayload {
  key: string;
  member?: string;
  category?: string;
  version?: string;
  memo?: string;
}

// api 계층에서 백엔드 에러 응답 { error: string } 형태를 다루기 위한 타입.
export interface ApiErrorResponse {
  error?: string;
}

// ── 이력 / 휴지통 ─────────────────────────────────

// LICENSE_KEY_HISTORY의 action 값 (backend/src/history.ts와 동일)
export type HistoryAction = "create" | "assign" | "unassign" | "edit" | "delete" | "restore" | "purge";

// GET /items/:no/history 응답 항목. created_at은 ISO 문자열로 내려온다.
export interface HistoryEntry {
  id: number;
  action: HistoryAction;
  member_before: string | null;
  member_after: string | null;
  // "edit" 이력의 변경 요약 (예: "버전: Windows 10 Pro → Windows 11 Pro / 메모 추가")
  detail: string | null;
  created_at: string;
}

// GET /items/deleted 응답 항목. deleted_at은 삭제 시각 기록 도입 이전 삭제분이면 null.
export interface DeletedItem extends Item {
  deleted_at: string | null;
}

// GET /items/purged 항목: 완전삭제 기록. id는 "purge" 이력 행의 id (GET /items/purged/:id/history에 사용)
export interface PurgedKey {
  id: number;
  key: string;
  purged_at: string;
}

export interface PurgedKeysResponse {
  items: PurgedKey[];
  total: number;
}

export interface DeletedItemsResponse {
  items: DeletedItem[];
  total: number;
}

// ── CSV 가져오기 (POST /items/import) ─────────────

export interface ImportRowInput {
  key: string;
  category: string;
  version: string;
  member: string;
  memo: string;
}

// 행별 결과. index는 보낸 rows 배열의 인덱스. ok면 서버가 정규화한 값이 함께 온다.
export interface ImportRowResult {
  index: number;
  status: "ok" | "error";
  error?: string;
  // 파일 안 중복 키일 때, 먼저 나온 행의 index
  duplicateOf?: number;
  key?: string;
  category?: string;
  version?: string;
  member?: string | null;
}

export interface ImportItemsResponse {
  results: ImportRowResult[];
  inserted: number;
  dryRun: boolean;
}

// 내보내기(GET /items/export)에 넘길 목록 필터. GET /items와 같은 의미.
export interface ExportFilter {
  category?: string;
  status?: StatusFilter;
  searchField?: SearchField;
  searchValue?: string;
}
