// 삭제 / 휴지통·복구 / 완전삭제 / 이력 API 통합 테스트
import pool from "../db";
import { api, createKey, historyActions, testKey } from "./helpers";

describe("DELETE /items/:no", () => {
  it("사용 중인 키는 409, 미사용 키는 소프트 삭제(204) 후 휴지통에 나타난다", async () => {
    const { no, key } = await createKey(1);
    await api().put(`/items/${no}`).send({ key, member: "홍길동" }).expect(200);
    await api().delete(`/items/${no}`).expect(409);

    await api().put(`/items/${no}`).send({ key, member: "" }).expect(200);
    await api().delete(`/items/${no}`).expect(204);
    await api().delete(`/items/${no}`).expect(404);

    const trash = (await api().get("/items/deleted").expect(200)).body;
    expect(trash.total).toBe(1);
    expect(trash.items[0]).toMatchObject({ no, key });
    expect(trash.items[0].deleted_at).not.toBeNull();
    expect((await api().get("/items").expect(200)).body.total).toBe(0);
  });

  it("삭제된 키는 같은 값으로 다시 등록할 수 있다 (partial unique index)", async () => {
    const { no } = await createKey(1);
    await api().delete(`/items/${no}`).expect(204);
    await createKey(1);
  });
});

describe("POST /items/:no/restore", () => {
  it("휴지통의 키를 복구하고 restore 이력을 남긴다", async () => {
    const { no } = await createKey(1);
    await api().delete(`/items/${no}`).expect(204);
    const res = await api().post(`/items/${no}/restore`).expect(200);
    expect(res.body).toMatchObject({ isdelete: false, deleted_at: null });
    expect(await historyActions(no)).toEqual(["create", "delete", "restore"]);
    await api().post(`/items/${no}/restore`).expect(404);
  });

  it("같은 키가 이미 다시 등록돼 있으면 409", async () => {
    const { no } = await createKey(1);
    await api().delete(`/items/${no}`).expect(204);
    await createKey(1);
    await api().post(`/items/${no}/restore`).expect(409);
  });
});

describe("POST /items/:no/purge (완전삭제)", () => {
  it("휴지통에 있는 키만, 마지막 5자리를 맞게 보내야 지워진다", async () => {
    const { no } = await createKey(7);
    await api().post(`/items/${no}/purge`).send({ confirm: "00007" }).expect(404); // 아직 휴지통이 아님
    await api().delete(`/items/${no}`).expect(204);
    await api().post(`/items/${no}/purge`).send({}).expect(400);
    await api().post(`/items/${no}/purge`).send({ confirm: "12345" }).expect(400);
    await api().post(`/items/${no}/purge`).send({ confirm: "00007" }).expect(204);

    const { rows } = await pool.query("SELECT 1 FROM LICENSE_KEYS WHERE no = $1", [no]);
    expect(rows).toHaveLength(0);
    await api().post(`/items/${no}/restore`).expect(404);
  });

  it("완전삭제 후에도 이력은 남고, 완전삭제 기록에서 키 단위로 다시 볼 수 있다", async () => {
    const { no, key } = await createKey(7);
    await api().put(`/items/${no}`).send({ key, member: "홍길동" }).expect(200);
    await api().put(`/items/${no}`).send({ key, member: "" }).expect(200);
    await api().delete(`/items/${no}`).expect(204);
    await api().post(`/items/${no}/purge`).send({ confirm: "00007" }).expect(204);

    // 같은 키 값으로 다시 등록해도 완전삭제된 키의 이력과 섞이지 않는다 (original_no로 묶음)
    await createKey(7);

    const purged = (await api().get("/items/purged").expect(200)).body;
    expect(purged.total).toBe(1);
    expect(purged.items[0].key).toBe(key);

    const history = (await api().get(`/items/purged/${purged.items[0].id}/history`).expect(200)).body;
    expect(history.map((h: { action: string }) => h.action).reverse()).toEqual([
      "create",
      "assign",
      "unassign",
      "delete",
      "purge",
    ]);
    await api().get("/items/purged/99999/history").expect(404);
  });
});

describe("GET /items/:no/history", () => {
  it("숫자가 아닌 번호는 400, 없는 키는 404", async () => {
    await api().get("/items/abc/history").expect(400);
    await api().get("/items/999/history").expect(404);
  });
});

describe("CSV", () => {
  it("내보내기: BOM + 헤더 + 필터 적용, 수식으로 해석될 값은 '를 붙인다", async () => {
    const a = await createKey(1);
    await createKey(2);
    await api().put(`/items/${a.no}`).send({ key: a.key, member: "=HYPERLINK()", memo: "메모, 쉼표" }).expect(200);

    const res = await api().get("/items/export").query({ status: "assigned" }).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="licenses_\d{8}\.csv"/);
    const buf = res.body as Buffer;
    expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = buf.toString("utf8").slice(1).trim().split("\r\n");
    expect(lines[0]).toBe("번호,라이선스 키,카테고리,버전,사용자,메모,등록일");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`${a.key},Windows,Windows 10 Pro,'=HYPERLINK(),"메모, 쉼표",`);
  });

  it("가져오기: dryRun은 저장하지 않고, 실제 등록은 정상 행만 넣는다", async () => {
    await createKey(9);
    const rows = [
      { key: "test0000000000000000000001", category: "Windows", version: "Windows 11 Pro" }, // 26자 → 형식 오류
      { key: "test0-00000-00000-00000-00001", category: "윈도우", version: "windows 11 pro", member: "홍길동", memo: "PC-01" },
      { key: testKey(1), category: "Windows", version: "Windows 11 Pro" }, // 파일 안 중복
      { key: testKey(9), category: "Windows", version: "Windows 10 Pro" }, // DB에 이미 있음
      { key: testKey(2), category: "한컴오피스", version: "한컴오피스 2024" },
    ];
    const dry = (await api().post("/items/import").send({ rows, dryRun: true }).expect(200)).body;
    expect(dry.results.map((r: { status: string }) => r.status)).toEqual(["error", "ok", "error", "error", "ok"]);
    expect(dry.results[2]).toMatchObject({ error: "파일 안에서 중복된 키입니다", duplicateOf: 1 });
    expect(dry.results[3].error).toBe("이미 등록된 키입니다");
    expect((await api().get("/items").expect(200)).body.total).toBe(1);

    const real = (await api().post("/items/import").send({ rows }).expect(200)).body;
    expect(real.inserted).toBe(2);
    const list = (await api().get("/items").expect(200)).body.items;
    expect(list.find((i: { key: string }) => i.key === testKey(1))).toMatchObject({
      category: "Windows",
      version: "Windows 11 Pro",
      member: "홍길동",
      memo: "PC-01",
    });
    const imported = list.find((i: { key: string }) => i.key === testKey(1));
    expect(await historyActions(imported.no)).toEqual(["create", "assign"]);
  });

  it("가져오기: 빈 요청 / 1000행 초과는 400", async () => {
    await api().post("/items/import").send({ rows: [] }).expect(400);
    await api().post("/items/import").send({ rows: Array(1001).fill({}) }).expect(400);
  });
});
