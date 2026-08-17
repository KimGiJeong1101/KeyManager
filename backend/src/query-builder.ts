// query-builder.ts
// GET /items의 동적 쿼리 조립 로직을 순수 함수로 분리한 것.
// Express Request/pg에 의존하지 않아 유닛 테스트로 파라미터 바인딩(인덱스 계산)이
// 항상 정확한지 검증할 수 있다.

import { GetItemsQuery } from "./types";

export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
}

// page/limit 쿼리 파라미터를 안전한 정수로 파싱한다.
// page: 1 이상. limit: 1~100 (한 번에 너무 많은 행을 끌어오지 못하도록 상한을 둔다).
export function parsePagination(
  pageRaw?: string,
  limitRaw?: string,
): ParsedPagination {
  const page = Math.max(1, parseInt(pageRaw || "", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitRaw || "", 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export interface BuiltItemsFilter {
  // "FROM LICENSE_KEYS WHERE ..." 형태의 WHERE 조건까지 포함한 쿼리 조각.
  // 호출부가 SELECT/COUNT 양쪽에 그대로 재사용한다.
  baseQuery: string;
  // baseQuery의 $1, $2 ... 에 대응하는 값. 순서가 baseQuery의 자리표시자 순서와 일치해야 한다.
  queryParams: string[];
}

// 카테고리 필터 + 사용 상태 필터 + 검색어 필터를 조합해 WHERE 절을 조립한다.
// $ 인덱스는 항상 queryParams.length 기준으로 계산해 SQL 인젝션을 방지하는
// 파라미터 바인딩을 유지한다.
export function buildItemsFilter(
  query: Pick<GetItemsQuery, "category" | "status" | "searchField" | "searchValue">,
): BuiltItemsFilter {
  const { category, status, searchField, searchValue } = query;

  let baseQuery = "FROM LICENSE_KEYS WHERE isdelete = 0";
  const queryParams: string[] = [];

  // 1. 카테고리 필터
  if (category && category !== "allassets") {
    queryParams.push(category);
    baseQuery += ` AND category = $${queryParams.length}`;
  }

  // 2. 사용 상태 필터
  // 미사용 기준: member가 NULL / '사용자없음' / '' 중 하나 (category-stats와 동일한 기준)
  if (status === "assigned") {
    baseQuery += ` AND (member IS NOT NULL AND member <> '사용자없음' AND member <> '')`;
  } else if (status === "unassigned") {
    baseQuery += ` AND (member IS NULL OR member = '사용자없음' OR member = '')`;
  }

  // 3. 검색어 필터
  if (searchValue && searchValue.trim() !== "") {
    // ILIKE의 와일드카드 문자(%, _)와 이스케이프 문자(\) 자체를 사용자가
    // 검색어에 입력했을 때 리터럴로 취급하도록 이스케이프한다.
    const escaped = searchValue.replace(/[\\%_]/g, (match) => `\\${match}`);
    const term = `%${escaped}%`;
    if (searchField === "key") {
      queryParams.push(term);
      baseQuery += ` AND key ILIKE $${queryParams.length}`;
    } else if (searchField === "member") {
      queryParams.push(term);
      baseQuery += ` AND member ILIKE $${queryParams.length}`;
    } else {
      // ALL 검색: key와 member 둘 다 같은 파라미터($idx)로 OR 검색
      // → 파라미터를 한 번만 push하고 인덱스를 재사용
      queryParams.push(term);
      const idx = queryParams.length;
      baseQuery += ` AND (key ILIKE $${idx} OR member ILIKE $${idx})`;
    }
  }

  return { baseQuery, queryParams };
}
