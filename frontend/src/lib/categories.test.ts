import { getCategoryMeta, isAssigned, labelizeCategoryChange } from "./categories";

describe("getCategoryMeta", () => {
  it("알려진 코드는 표시명, 모르는 값은 그대로(없으면 미지정)", () => {
    expect(getCategoryMeta("MS_Office").label).toBe("MS Office");
    expect(getCategoryMeta("Adobe").label).toBe("Adobe");
    expect(getCategoryMeta(null).label).toBe("미지정");
  });
});

describe("isAssigned", () => {
  it("공백만 있는 값은 미배정", () => {
    expect(isAssigned("홍길동")).toBe(true);
    expect(isAssigned("  ")).toBe(false);
    expect(isAssigned(null)).toBe(false);
  });
});

describe("labelizeCategoryChange", () => {
  it("카테고리 부분의 코드만 표시명으로 바꾼다", () => {
    expect(
      labelizeCategoryChange("카테고리: Hancom → MS_Office / 버전: 한컴오피스 2024 → Office 2021 Professional Plus / 메모 추가"),
    ).toBe("카테고리: 한컴오피스 → MS Office / 버전: 한컴오피스 2024 → Office 2021 Professional Plus / 메모 추가");
  });

  it("카테고리 변경이 없는 문구는 그대로", () => {
    expect(labelizeCategoryChange("버전: Windows 10 Pro → Windows 11 Pro")).toBe("버전: Windows 10 Pro → Windows 11 Pro");
  });
});
