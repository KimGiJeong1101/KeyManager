import { distributePastedKey, shouldSplitPaste } from "./licenseKey";

const EMPTY = ["", "", "", "", ""];

describe("shouldSplitPaste", () => {
  it("영문/숫자 5자 이하는 기본 붙여넣기에 맡긴다", () => {
    expect(shouldSplitPaste("ABCDE")).toBe(false);
    expect(shouldSplitPaste("ab1")).toBe(false);
  });

  it("전체 키나 하이픈/공백이 섞인 값은 나눠 채운다", () => {
    expect(shouldSplitPaste("ABCDE-12345-FGHIJ-67890-KLMNO")).toBe(true);
    expect(shouldSplitPaste("ABCDE12345")).toBe(true);
    expect(shouldSplitPaste(" ABC ")).toBe(true);
  });
});

describe("distributePastedKey", () => {
  it("하이픈 포함 전체 키를 5칸에 나눠 채운다", () => {
    expect(distributePastedKey(EMPTY, 0, "abcde-12345-fghij-67890-klmno")).toEqual({
      keys: ["ABCDE", "12345", "FGHIJ", "67890", "KLMNO"],
      focusIndex: 4,
    });
  });

  it("하이픈 없는 25자리, 공백/줄바꿈이 섞인 값도 처리한다", () => {
    expect(distributePastedKey(EMPTY, 0, "ABCDE 12345\nFGHIJ67890KLMNO")?.keys).toEqual([
      "ABCDE",
      "12345",
      "FGHIJ",
      "67890",
      "KLMNO",
    ]);
  });

  it("중간 칸에서 붙여넣으면 그 칸부터 채우고, 넘치는 부분은 버린다", () => {
    const keys = ["AAAAA", "", "", "", ""];
    expect(distributePastedKey(keys, 3, "11111-22222-33333")).toEqual({
      keys: ["AAAAA", "", "", "11111", "22222"],
      focusIndex: 4,
    });
  });

  it("일부만 붙여넣으면 덜 찬 칸에 포커스를 둔다", () => {
    expect(distributePastedKey(EMPTY, 0, "ABCDE-123")).toEqual({
      keys: ["ABCDE", "123", "", "", ""],
      focusIndex: 1,
    });
    expect(distributePastedKey(EMPTY, 0, "ABCDE-12345")?.focusIndex).toBe(2);
  });

  it("영문/숫자가 하나도 없으면 null", () => {
    expect(distributePastedKey(EMPTY, 0, "---")).toBeNull();
  });
});
