// 에러 응답 형식 통합 테스트: 어떤 실패든 JSON { error }로 응답하고, 스택 트레이스/서버 경로를 노출하지 않는다.
import { api } from "./helpers";

const expectJsonError = (res: { headers: Record<string, string>; body: { error?: unknown }; text: string }) => {
  expect(res.headers["content-type"]).toMatch(/application\/json/);
  expect(typeof res.body.error).toBe("string");
  expect(res.text).not.toMatch(/at |node_modules|\\Users\\/); // 스택 트레이스·경로 미노출
};

describe("에러 응답", () => {
  it("JSON 문법이 깨진 요청 → 400 JSON", async () => {
    const res = await api().post("/items").set("Content-Type", "application/json").send('{"key": "AB');
    expect(res.status).toBe(400);
    expectJsonError(res);
  });

  it("1MB를 넘는 요청 → 413 JSON", async () => {
    const res = await api()
      .post("/items/import")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ rows: "a".repeat(1_100_000) }));
    expect(res.status).toBe(413);
    expectJsonError(res);
  });

  it("없는 경로 → 404 JSON", async () => {
    const res = await api().get("/nope");
    expect(res.status).toBe(404);
    expectJsonError(res);
  });

  it("잘못된 번호 형식 → 400 JSON", async () => {
    for (const req of [api().put("/items/abc").send({ key: "x" }), api().delete("/items/1.5"), api().get("/items/x/history")]) {
      const res = await req;
      expect(res.status).toBe(400);
      expectJsonError(res);
    }
  });
});
