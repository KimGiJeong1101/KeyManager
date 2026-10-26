import { mapCsvToImportRows, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("BOM, CRLF, 마지막 줄바꿈 유무를 처리한다", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("따옴표 안의 쉼표/줄바꿈/이스케이프된 따옴표를 처리한다", () => {
    expect(parseCsv('k,"홍길동, 김철수","a ""b""","x\ny"\n')).toEqual([
      ["k", "홍길동, 김철수", 'a "b"', "x\ny"],
    ]);
  });

  it("빈 칸을 유지한다", () => {
    expect(parseCsv("a,,c\n")).toEqual([["a", "", "c"]]);
  });
});

describe("mapCsvToImportRows", () => {
  it("헤더 이름(띄어쓰기/대소문자 무시)으로 열을 찾고, 모르는 열은 무시한다", () => {
    const table = parseCsv(
      "번호,라이선스키,카테고리,버전,사용자,비고,등록일\n1,AAAAA-BBBBB-CCCCC-DDDDD-EEEEE,Windows,Windows 11 Pro,홍길동,PC-01,2026-10-26\n",
    );
    expect(mapCsvToImportRows(table)).toEqual({
      rows: [
        {
          key: "AAAAA-BBBBB-CCCCC-DDDDD-EEEEE",
          category: "Windows",
          version: "Windows 11 Pro",
          member: "홍길동",
          memo: "PC-01",
        },
      ],
      lineNumbers: [2],
    });
  });

  it("영문 헤더, 사용자 열 없음도 허용한다", () => {
    const { rows } = mapCsvToImportRows(parseCsv("Key,Category,Version\nK,C,V\n"));
    expect(rows).toEqual([{ key: "K", category: "C", version: "V", member: "", memo: "" }]);
  });

  it("빈 줄은 건너뛰고, 엑셀 기준 줄 번호를 유지한다", () => {
    const { lineNumbers } = mapCsvToImportRows(parseCsv("키,카테고리,버전\nA,B,C\n,,\nD,E,F\n"));
    expect(lineNumbers).toEqual([2, 4]);
  });

  it("필수 열이 없거나 데이터가 없으면 에러", () => {
    expect(() => mapCsvToImportRows(parseCsv("키,버전\nA,B\n"))).toThrow("카테고리");
    expect(() => mapCsvToImportRows(parseCsv("키,카테고리,버전\n"))).toThrow("데이터가 없습니다");
    expect(() => mapCsvToImportRows([])).toThrow("빈 파일");
  });
});
