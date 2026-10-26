import { formatDateTime } from "./format";

describe("formatDateTime", () => {
  it("로컬 시간 기준 YYYY-MM-DD HH:mm 형식으로 표시한다", () => {
    // 타임존이 없는 ISO 문자열은 로컬 시간으로 해석되므로 실행 환경 타임존과 무관하게 결과가 같다.
    expect(formatDateTime("2026-10-26T09:05:00")).toBe("2026-10-26 09:05");
  });

  it("값이 없거나 잘못된 문자열이면 '-'를 반환한다", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
    expect(formatDateTime("not-a-date")).toBe("-");
  });
});
