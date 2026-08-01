// backend 전역에서 공유하는 타입 모음.
// LICENSE_KEYS 테이블(db.ts 참고)의 행 구조를 그대로 반영한다.

export interface LicenseKeyRow {
  no: number;
  key: string;
  member: string | null;
  category: string | null;
  version: string | null;
}

// POST/PUT의 RETURNING *는 전체 컬럼을 돌려준다.
export interface FullLicenseKeyRow extends LicenseKeyRow {
  isdelete: number;
  search_vector: unknown;
}

export interface CategoryStatRow {
  category: string;
  total: number;
  active: number;
  available: number;
}

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

export interface UpdateItemBody {
  key?: string;
  member?: string;
}

export interface ItemParams {
  no: string;
}
