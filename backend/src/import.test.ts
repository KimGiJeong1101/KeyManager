import { normalizeLicenseKey, resolveCategory, resolveVersion, validateImportRow } from "./import";

const KEY = "ABCDE-12345-FGHIJ-67890-KLMNO";

describe("normalizeLicenseKey", () => {
  it("하이픈/공백/소문자를 정규화한다", () => {
    expect(normalizeLicenseKey("abcde-12345-fghij-67890-klmno")).toBe(KEY);
    expect(normalizeLicenseKey("ABCDE12345FGHIJ67890KLMNO")).toBe(KEY);
    expect(normalizeLicenseKey(" ABCDE 12345 FGHIJ 67890 KLMNO ")).toBe(KEY);
  });

  it("25자리 영문/숫자가 아니면 null", () => {
    expect(normalizeLicenseKey("ABCDE-12345")).toBeNull();
    expect(normalizeLicenseKey("ABCDE-12345-FGHIJ-67890-KLMN!")).toBeNull();
    expect(normalizeLicenseKey(undefined)).toBeNull();
  });
});

describe("resolveCategory", () => {
  it("코드명과 표시명/별칭을 모두 받는다 (대소문자 무시)", () => {
    expect(resolveCategory("Windows")).toBe("Windows");
    expect(resolveCategory("windows")).toBe("Windows");
    expect(resolveCategory("MS_Office")).toBe("MS_Office");
    expect(resolveCategory("MS Office")).toBe("MS_Office");
    expect(resolveCategory("한컴오피스")).toBe("Hancom");
    expect(resolveCategory("한컴")).toBe("Hancom");
  });

  it("모르는 값은 null", () => {
    expect(resolveCategory("Adobe")).toBeNull();
    expect(resolveCategory("")).toBeNull();
  });
});

describe("resolveVersion", () => {
  it("대소문자/공백 차이를 무시하고 정식 표기로 돌려준다", () => {
    expect(resolveVersion("Windows", " windows 11  pro ")).toBe("Windows 11 Pro");
  });

  it("해당 카테고리에 없는 버전은 null", () => {
    expect(resolveVersion("Windows", "Office 2021 Professional Plus")).toBeNull();
  });
});

describe("validateImportRow", () => {
  it("정상 행은 정규화된 값을 돌려준다 (빈 사용자 → null)", () => {
    expect(
      validateImportRow({
        key: "abcde12345fghij67890klmno",
        category: "MS Office",
        version: "office 2021 professional plus",
        member: "  ",
      }),
    ).toEqual({
      ok: true,
      row: { key: KEY, category: "MS_Office", version: "Office 2021 Professional Plus", member: null, memo: null },
    });
  });

  it("문제가 있는 칸을 알려준다", () => {
    expect(validateImportRow({ key: "bad", category: "Windows", version: "Windows 11 Pro" })).toMatchObject({
      ok: false,
    });
    expect(validateImportRow({ key: KEY, category: "", version: "x" })).toEqual({
      ok: false,
      error: "카테고리가 비어 있습니다",
    });
    expect(validateImportRow({ key: KEY, category: "Windows", version: "Windows 95" })).toEqual({
      ok: false,
      error: "Windows에 없는 버전입니다: Windows 95",
    });
    expect(
      validateImportRow({ key: KEY, category: "Windows", version: "Windows 11 Pro", member: "가".repeat(101) }),
    ).toMatchObject({ ok: false });
    expect(
      validateImportRow({ key: KEY, category: "Windows", version: "Windows 11 Pro", memo: "가".repeat(501) }),
    ).toEqual({ ok: false, error: "메모는 500자 이하여야 합니다" });
  });

  it("메모는 trim해서 저장한다", () => {
    expect(
      validateImportRow({ key: KEY, category: "Windows", version: "Windows 11 Pro", memo: "  PC-01  " }),
    ).toMatchObject({ ok: true, row: { memo: "PC-01" } });
  });
});
