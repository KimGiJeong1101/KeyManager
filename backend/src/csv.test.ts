import { escapeCsvCell, toCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("일반 값은 그대로, null/undefined는 빈 칸", () => {
    expect(escapeCsvCell("ABCDE-12345")).toBe("ABCDE-12345");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("쉼표/따옴표/줄바꿈이 있으면 따옴표로 감싼다", () => {
    expect(escapeCsvCell("홍길동, 김철수")).toBe('"홍길동, 김철수"');
    expect(escapeCsvCell('그 "키"')).toBe('"그 ""키"""');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("수식으로 해석될 수 있는 값은 '를 붙여 CSV 인젝션을 막는다", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+82")).toBe("'+82");
    expect(escapeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsvCell("-x")).toBe("'-x");
  });
});

describe("toCsv", () => {
  it("BOM + CRLF로 헤더와 행을 만든다", () => {
    expect(toCsv(["a", "b"], [["1", null]])).toBe("\uFEFFa,b\r\n1,\r\n");
  });
});
