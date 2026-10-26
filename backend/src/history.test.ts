import { classifyMemberChange, describeEdit } from "./history";

describe("describeEdit", () => {
  const base = { category: "Windows", version: "Windows 10 Pro", memo: null };

  it("바뀐 게 없으면 null", () => {
    expect(describeEdit(base, { ...base })).toBeNull();
  });

  it("카테고리/버전은 이전 → 이후 값을 남긴다", () => {
    expect(describeEdit(base, { ...base, version: "Windows 11 Pro" })).toBe(
      "버전: Windows 10 Pro → Windows 11 Pro",
    );
    expect(
      describeEdit(base, { category: "MS_Office", version: "Office 2021 Professional Plus", memo: null }),
    ).toBe("카테고리: Windows → MS_Office / 버전: Windows 10 Pro → Office 2021 Professional Plus");
  });

  it("메모는 내용 대신 추가/변경/삭제만 남긴다", () => {
    expect(describeEdit(base, { ...base, memo: "PC-01" })).toBe("메모 추가");
    expect(describeEdit({ ...base, memo: "PC-01" }, { ...base, memo: "PC-02" })).toBe("메모 변경");
    expect(describeEdit({ ...base, memo: "PC-01" }, base)).toBe("메모 삭제");
  });
});

describe("classifyMemberChange", () => {
  it("사용자가 그대로면 이력을 남기지 않는다", () => {
    expect(classifyMemberChange(null, null)).toBeNull();
    expect(classifyMemberChange("홍길동", "홍길동")).toBeNull();
  });

  it("미배정 → 사용자, 사용자 → 다른 사용자는 assign", () => {
    expect(classifyMemberChange(null, "홍길동")).toBe("assign");
    expect(classifyMemberChange("홍길동", "김철수")).toBe("assign");
  });

  it("사용자 → 미배정은 unassign", () => {
    expect(classifyMemberChange("홍길동", null)).toBe("unassign");
  });
});
