// backend 전역에서 공유하는 타입 모음.
// LICENSE_KEYS 테이블(db.ts 참고)의 행 구조를 그대로 반영한다.

import type { ImportRowInput } from "./import";

export interface LicenseKeyRow {
  no: number;
  key: string;
  member: string | null;
  category: string | null;
  version: string | null;
  memo: string | null;
}

// POST/PUT의 RETURNING *는 전체 컬럼을 돌려준다.
export interface FullLicenseKeyRow extends LicenseKeyRow {
  isdelete: boolean;
  created_at: Date | null;
  deleted_at: Date | null;
}

// 휴지통(GET /items/deleted) 행
export interface DeletedLicenseKeyRow extends LicenseKeyRow {
  deleted_at: Date | null;
}

export interface GetDeletedItemsResponseBody {
  items: DeletedLicenseKeyRow[];
  total: number;
}

// LICENSE_KEY_HISTORY 행 (GET /items/:no/history)
export interface HistoryRow {
  id: number;
  action: "create" | "assign" | "unassign" | "edit" | "delete" | "restore" | "purge";
  member_before: string | null;
  member_after: string | null;
  // "edit" 이력의 변경 내용 요약 (예: "버전: Windows 10 Pro → Windows 11 Pro / 메모 추가")
  detail: string | null;
  created_at: Date;
}

// GET /items/purged 항목: 완전삭제 기록 (id = purge 이력 행의 id)
export interface PurgedKeyRow {
  id: number;
  key: string;
  purged_at: Date;
}

export interface GetPurgedResponseBody {
  items: PurgedKeyRow[];
  total: number;
}

// GET /items/version-stats 행 (재고 부족 경고용)
export interface VersionStatRow {
  category: string;
  version: string;
  total: number;
  available: number;
}

export interface CategoryStatRow {
  category: string;
  total: number;
  active: number;
  available: number;
}

// GET /categories 응답. constants.ts의 category → version 화이트리스트를 그대로 반환해
// 프론트가 별도로 하드코딩하지 않고 백엔드를 단일 소스로 쓰게 한다.
export type CategoryVersionsResponse = Record<string, string[]>;

export interface ApiErrorBody {
  error: string;
}

// ── 라우트별 요청 쿼리/바디 타입 ──────────────────────

export interface GetItemsQuery {
  page?: string;
  limit?: string;
  category?: string;
  status?: string;
  searchField?: string;
  searchValue?: string;
}

export interface GetItemsResponseBody {
  items: LicenseKeyRow[];
  total: number;
}

export interface CreateItemBody {
  key?: string;
  category?: string;
  version?: string;
}

// PUT /items/:no. key는 필수, 나머지는 보내지 않으면(undefined) 기존 값을 유지한다.
// member/memo는 빈 문자열(공백만)을 보내면 NULL로 지워진다. category/version은 화이트리스트 값만 허용.
export interface UpdateItemBody {
  key?: string;
  member?: string;
  category?: string;
  version?: string;
  memo?: string;
}

// POST /items/import
export interface ImportItemsBody {
  rows?: ImportRowInput[];
  // true면 검증 결과(미리보기)만 돌려주고 등록하지 않는다
  dryRun?: boolean;
}

// 행별 결과. index는 요청 rows 배열의 인덱스(0부터).
// status가 "ok"면 정규화된 key/category/version/member가 함께 온다.
export interface ImportRowResult {
  index: number;
  status: "ok" | "error";
  error?: string;
  // 파일 안 중복 키일 때, 먼저 나온(인정된) 행의 index
  duplicateOf?: number;
  key?: string;
  category?: string;
  version?: string;
  member?: string | null;
  memo?: string | null;
}

export interface ImportItemsResponse {
  results: ImportRowResult[];
  inserted: number;
  dryRun: boolean;
}

export interface PurgeItemBody {
  // 확인용: 대상 키의 마지막 5자리. 버튼 연타/잘못된 대상 지정으로 영구 삭제되는 것을 막는다.
  confirm?: string;
}

export interface ItemParams {
  no: string;
}
