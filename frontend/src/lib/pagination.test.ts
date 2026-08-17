import { resolveValidPage } from "./pagination";

describe("resolveValidPage", () => {
  it("정상 범위의 페이지는 그대로 유지한다", () => {
    // 총 25개, 페이지당 10개 → 3페이지. 2페이지에 데이터가 있으면 그대로 둔다.
    expect(resolveValidPage(2, 25, 10, 10)).toBe(2);
  });

  it("마지막 페이지의 유일한 항목이 삭제되어 비어버리면 새 마지막 페이지로 되돌린다", () => {
    // 3페이지(21번째 항목 하나)를 삭제해서 총 20개가 됐다 → 유효한 마지막 페이지는 2.
    expect(resolveValidPage(3, 20, 10, 0)).toBe(2);
  });

  it("모든 항목이 삭제되면 1페이지로 되돌린다", () => {
    expect(resolveValidPage(3, 0, 10, 0)).toBe(1);
  });

  it("필터/검색 결과가 원래부터 0건인 빈 목록은 건드리지 않는다", () => {
    // 1페이지에서 검색 결과가 0건인 정상적인 빈 상태 (요청 페이지가 유효 범위 내)
    expect(resolveValidPage(1, 0, 10, 0)).toBe(1);
  });

  it("항목이 반환됐다면(0건이 아니면) 페이지를 건드리지 않는다", () => {
    expect(resolveValidPage(5, 3, 10, 3)).toBe(5);
  });
});
