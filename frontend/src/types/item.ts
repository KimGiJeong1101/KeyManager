// 라이선스 관리 도메인에서 공유하는 타입 모음.
// 서버(backend/server.js)의 LICENSE_KEYS 테이블 응답 형태를 그대로 반영한다.

export type Category = "Windows" | "MS_Office" | "Hancom";

// 탭의 "전체"는 서버에 "allassets"로 전달된다.
export type CategoryFilter = Category | "allassets";

export type StatusFilter = "all" | "assigned" | "unassigned";

export type SearchField = "all" | "key" | "member";

export interface Item {
  no: number;
  key: string;
  // 미배정 시 null, '사용자없음', 빈 문자열 중 하나로 내려온다.
  member: string | null;
  category: Category | string;
  version: string;
}

export interface CategoryStat {
  category: Category | string;
  total: number;
  active: number;
  available: number;
}

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

export interface UpdateItemPayload {
  key: string;
  member: string;
}

// api 계층에서 백엔드 에러 응답 { error: string } 형태를 다루기 위한 타입.
export interface ApiErrorResponse {
  error?: string;
}
