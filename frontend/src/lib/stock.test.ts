import { findLowStock } from "./stock";

const stat = (version: string, total: number, available: number, category = "Windows") => ({
  category,
  version,
  total,
  available,
});

describe("findLowStock", () => {
  it("남은 키가 기준(기본 1개) 이하인 버전만 고른다", () => {
    const result = findLowStock([stat("A", 10, 5), stat("B", 3, 1), stat("C", 2, 0)]);
    expect(result.map((s) => s.version)).toEqual(["C", "B"]);
  });

  it("적게 남은 순, 같으면 카테고리·버전 이름순", () => {
    const result = findLowStock([
      stat("Z", 1, 0, "Windows"),
      stat("A", 1, 0, "Windows"),
      stat("X", 1, 0, "Hancom"),
      stat("B", 4, 1, "Hancom"),
    ]);
    expect(result.map((s) => `${s.category}/${s.version}`)).toEqual([
      "Hancom/X",
      "Windows/A",
      "Windows/Z",
      "Hancom/B",
    ]);
  });

  it("기준값을 바꿀 수 있다", () => {
    expect(findLowStock([stat("A", 10, 3)], 3)).toHaveLength(1);
    expect(findLowStock([stat("A", 10, 3)], 2)).toHaveLength(0);
  });
});
