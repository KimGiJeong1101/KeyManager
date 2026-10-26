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

// ILIKE의 와일드카드 문자(%, _)와 이스케이프 문자(\) 자체를 사용자가
// 검색어에 입력했을 때 리터럴로 취급하도록 이스케이프한 뒤 부분 일치 패턴으로 감싼다.
function toLikeTerm(value: string): string {
  const escaped = value.replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${escaped}%`;
}

// 카테고리 필터 + 사용 상태 필터 + 검색어 필터를 조합해 WHERE 절을 조립한다.
// $ 인덱스는 항상 queryParams.length 기준으로 계산해 SQL 인젝션을 방지하는
// 파라미터 바인딩을 유지한다.
export function buildItemsFilter(
  query: Pick<GetItemsQuery, "category" | "status" | "searchField" | "searchValue">,
): BuiltItemsFilter {
  const { category, status, searchField, searchValue } = query;

  let baseQuery = "FROM LICENSE_KEYS WHERE NOT isdelete";
  const queryParams: string[] = [];

  // 1. 카테고리 필터
  if (category && category !== "allassets") {
    queryParams.push(category);
    baseQuery += ` AND category = $${queryParams.length}`;
  }

  // 2. 사용 상태 필터
  // 미사용 기준: member IS NULL (db.ts initSchema에서 미배정 값을 NULL로 정규화함)
  if (status === "assigned") {
    baseQuery += ` AND member IS NOT NULL`;
  } else if (status === "unassigned") {
    baseQuery += ` AND member IS NULL`;
  }

  // 3. 검색어 필터
  if (searchValue && searchValue.trim() !== "") {
    const trimmed = searchValue.trim();
    // 키 검색은 하이픈/공백을 무시한다. DB에는 "XXXXX-XXXXX-..." 형식으로 저장되지만,
    // "12345FGHIJ"처럼 하이픈 없이(또는 칸 경계를 걸쳐) 검색해도 찾을 수 있도록
    // 검색어와 컬럼 양쪽에서 하이픈을 제거하고 비교한다.
    const compactKey = trimmed.replace(/[-\s]/g, "");
    const keyClause = (idx: number) => `REPLACE(key, '-', '') ILIKE $${idx}`;

    if (searchField === "key") {
      if (compactKey) {
        queryParams.push(toLikeTerm(compactKey));
        baseQuery += ` AND ${keyClause(queryParams.length)}`;
      } else {
        // 하이픈/공백만 입력한 경우: 키로는 아무것도 매칭되지 않는다 (전체가 나오지 않도록)
        baseQuery += ` AND FALSE`;
      }
    } else if (searchField === "member") {
      queryParams.push(toLikeTerm(trimmed));
      baseQuery += ` AND member ILIKE $${queryParams.length}`;
    } else if (searchField === "memo") {
      queryParams.push(toLikeTerm(trimmed));
      baseQuery += ` AND memo ILIKE $${queryParams.length}`;
    } else {
      // ALL 검색: member/memo는 원본 검색어, key는 하이픈을 뺀 검색어로 OR 검색.
      // 두 값이 같으면(검색어에 하이픈/공백이 없으면) 파라미터를 한 번만 push하고 인덱스를 재사용한다.
      queryParams.push(toLikeTerm(trimmed));
      const textIdx = queryParams.length;
      const textClause = `member ILIKE $${textIdx} OR memo ILIKE $${textIdx}`;
      if (!compactKey) {
        baseQuery += ` AND (${textClause})`;
      } else {
        let keyIdx = textIdx;
        if (compactKey !== trimmed) {
          queryParams.push(toLikeTerm(compactKey));
          keyIdx = queryParams.length;
        }
        baseQuery += ` AND (${keyClause(keyIdx)} OR ${textClause})`;
      }
    }
  }

  return { baseQuery, queryParams };
}
