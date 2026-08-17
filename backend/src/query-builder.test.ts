import { buildItemsFilter, parsePagination } from "./query-builder";

describe("parsePagination", () => {
  it("기본값(1페이지, 10개)을 사용한다", () => {
    expect(parsePagination(undefined, undefined)).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
    });
  });

  it("page/limit을 offset으로 정확히 환산한다", () => {
    expect(parsePagination("3", "20")).toEqual({
      page: 3,
      limit: 20,
      offset: 40,
    });
  });

  it("page가 1보다 작거나 숫자가 아니면 1로 보정한다", () => {
    expect(parsePagination("0", "10").page).toBe(1);
    expect(parsePagination("-5", "10").page).toBe(1);
    expect(parsePagination("abc", "10").page).toBe(1);
  });

  it("limit은 1~100 사이로 clamp된다", () => {
    // limit=0은 parseInt("0")||10에서 0이 falsy로 처리되어 기본값(10)으로 폴백된다.
    expect(parsePagination("1", "0").limit).toBe(10);
    expect(parsePagination("1", "9999").limit).toBe(100);
    expect(parsePagination("1", "abc").limit).toBe(10);
    expect(parsePagination("1", "-5").limit).toBe(1);
  });
});

describe("buildItemsFilter", () => {
  it("필터가 없으면 isdelete = 0 조건만 남는다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({});
    expect(baseQuery).toBe("FROM LICENSE_KEYS WHERE isdelete = 0");
    expect(queryParams).toEqual([]);
  });

  it("category='allassets'는 필터를 걸지 않는다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({ category: "allassets" });
    expect(baseQuery).toBe("FROM LICENSE_KEYS WHERE isdelete = 0");
    expect(queryParams).toEqual([]);
  });

  it("category 필터는 $1에 바인딩된다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({ category: "Windows" });
    expect(baseQuery).toContain("AND category = $1");
    expect(queryParams).toEqual(["Windows"]);
  });

  it("status=assigned/unassigned은 파라미터 없이 조건만 추가한다", () => {
    expect(buildItemsFilter({ status: "assigned" }).baseQuery).toContain(
      "member IS NOT NULL AND member <> '사용자없음' AND member <> ''",
    );
    expect(buildItemsFilter({ status: "unassigned" }).baseQuery).toContain(
      "member IS NULL OR member = '사용자없음' OR member = ''",
    );
    expect(buildItemsFilter({ status: "unassigned" }).queryParams).toEqual([]);
  });

  it("그 외 status 값은 필터를 걸지 않는다", () => {
    expect(buildItemsFilter({ status: "all" }).baseQuery).toBe(
      "FROM LICENSE_KEYS WHERE isdelete = 0",
    );
  });

  it("searchField='key'는 key ILIKE로 검색어를 바인딩한다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({
      searchField: "key",
      searchValue: "ABC",
    });
    expect(baseQuery).toContain("AND key ILIKE $1");
    expect(queryParams).toEqual(["%ABC%"]);
  });

  it("searchField='member'는 member ILIKE로 검색어를 바인딩한다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({
      searchField: "member",
      searchValue: "홍길동",
    });
    expect(baseQuery).toContain("AND member ILIKE $1");
    expect(queryParams).toEqual(["%홍길동%"]);
  });

  it("searchField='all'(기본)은 key/member를 같은 파라미터로 OR 검색한다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({ searchValue: "ABC" });
    expect(baseQuery).toContain("AND (key ILIKE $1 OR member ILIKE $1)");
    // 파라미터가 한 번만 push되어 인덱스가 재사용되는지 확인
    expect(queryParams).toEqual(["%ABC%"]);
  });

  it("검색어의 %, _, \\ 는 리터럴로 취급되도록 이스케이프된다", () => {
    const { queryParams } = buildItemsFilter({ searchValue: "100%_off\\now" });
    expect(queryParams).toEqual(["%100\\%\\_off\\\\now%"]);
  });

  it("공백만 있는 검색어는 필터를 걸지 않는다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({ searchValue: "   " });
    expect(baseQuery).toBe("FROM LICENSE_KEYS WHERE isdelete = 0");
    expect(queryParams).toEqual([]);
  });

  it("카테고리 + 상태 + 검색어를 동시에 걸면 $ 인덱스가 순서대로 이어진다", () => {
    const { baseQuery, queryParams } = buildItemsFilter({
      category: "Windows",
      status: "assigned",
      searchField: "key",
      searchValue: "XYZ",
    });
    expect(baseQuery).toContain("AND category = $1");
    expect(baseQuery).toContain("AND key ILIKE $2");
    expect(queryParams).toEqual(["Windows", "%XYZ%"]);
  });
});
