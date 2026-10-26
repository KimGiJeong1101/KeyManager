import { LICENSE_KEY_PATTERN } from "./constants";

describe("LICENSE_KEY_PATTERN", () => {
  it("5자리 × 5칸 영문 대문자/숫자 키를 허용한다", () => {
    expect(LICENSE_KEY_PATTERN.test("ABCDE-12345-FGHIJ-67890-KLMNO")).toBe(true);
  });

  it("형식이 다르면 거부한다", () => {
    expect(LICENSE_KEY_PATTERN.test("abcde-12345-fghij-67890-klmno")).toBe(false); // 소문자
    expect(LICENSE_KEY_PATTERN.test("ABCDE-12345-FGHIJ-67890")).toBe(false); // 4칸
    expect(LICENSE_KEY_PATTERN.test("ABCDE12345FGHIJ67890KLMNO")).toBe(false); // 하이픈 없음
    expect(LICENSE_KEY_PATTERN.test("ABCD!-12345-FGHIJ-67890-KLMNO")).toBe(false); // 특수문자
    expect(LICENSE_KEY_PATTERN.test("ABCDE-12345-FGHIJ-67890-KLMNOP")).toBe(false); // 마지막 칸 6자
  });
});
