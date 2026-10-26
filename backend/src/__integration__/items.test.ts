// 등록 / 조회·검색 / 수정 / 통계 API 통합 테스트 (실제 PostgreSQL 테스트 DB 사용)
import pool, { initSchema } from "../db";
import { api, createKey, historyActions, testKey } from "./helpers";

describe("GET /health", () => {
  it("DB까지 연결되면 ok", async () => {
    await api().get("/health").expect(200, { status: "ok" });
  });
});

describe("POST /items", () => {
  it("등록하면 미배정(member NULL) 상태로 저장되고 create 이력이 남는다", async () => {
    const res = await api()
      .post("/items")
      .send({ key: `  ${testKey(1)}  `, category: "Windows", version: "Windows 11 Pro" })
      .expect(200);
    expect(res.body).toMatchObject({ key: testKey(1), member: null, memo: null, isdelete: false });
    expect(await historyActions(res.body.no)).toEqual(["create"]);
  });

  it("키 형식/화이트리스트/필수값을 검증한다", async () => {
    await api().post("/items").send({ key: "ABC", category: "Windows", version: "Windows 11 Pro" }).expect(400);
    await api().post("/items").send({ key: testKey(1), category: "Adobe", version: "x" }).expect(400);
    await api().post("/items").send({ key: testKey(1), category: "Windows", version: "Windows 95" }).expect(400);
    await api().post("/items").send({ category: "Windows", version: "Windows 11 Pro" }).expect(400);
  });

  it("삭제되지 않은 같은 키는 중복 등록할 수 없다", async () => {
    await createKey(1);
    const res = await api()
      .post("/items")
      .send({ key: testKey(1), category: "Windows", version: "Windows 10 Pro" })
      .expect(400);
    expect(res.body.error).toBe("이미 등록된 라이선스 키입니다.");
  });
});

describe("GET /items", () => {
  beforeEach(async () => {
    for (let n = 1; n <= 12; n++) await createKey(n);
    await createKey(13, "MS_Office", "Office 2021 Professional Plus");
    await api().put("/items/1").send({ key: testKey(1), member: "홍길동", memo: "회계팀 PC-01" }).expect(200);
  });

  it("페이지네이션: total은 전체 개수, items는 limit만큼 (no 오름차순)", async () => {
    const res = await api().get("/items?page=2&limit=5").expect(200);
    expect(res.body.total).toBe(13);
    expect(res.body.items.map((i: { no: number }) => i.no)).toEqual([6, 7, 8, 9, 10]);
  });

  it("카테고리 / 사용 상태 필터", async () => {
    expect((await api().get("/items?category=MS_Office").expect(200)).body.total).toBe(1);
    expect((await api().get("/items?status=assigned").expect(200)).body.total).toBe(1);
    expect((await api().get("/items?status=unassigned").expect(200)).body.total).toBe(12);
  });

  it("키 검색은 하이픈을 무시한다 (칸 경계를 걸친 검색)", async () => {
    // testKey(12) = TEST0-00000-00000-00000-00012 → 하이픈 없이 "0000000012" 같은 조각으로도 찾힌다
    const res = await api().get("/items").query({ searchField: "key", searchValue: "000000012" }).expect(200);
    expect(res.body.items.map((i: { key: string }) => i.key)).toEqual([testKey(12)]);
  });

  it("전체 검색은 사용자명과 메모도 찾는다", async () => {
    const byMember = await api().get("/items").query({ searchValue: "홍길" }).expect(200);
    const byMemo = await api().get("/items").query({ searchValue: "PC-01" }).expect(200);
    const memoField = await api().get("/items").query({ searchField: "memo", searchValue: "회계" }).expect(200);
    expect(byMember.body.total).toBe(1);
    expect(byMemo.body.total).toBe(1);
    expect(memoField.body.items[0].memo).toBe("회계팀 PC-01");
  });

  it("검색어의 %, _ 는 와일드카드가 아니라 글자로 취급된다", async () => {
    expect((await api().get("/items").query({ searchValue: "%" }).expect(200)).body.total).toBe(0);
    expect((await api().get("/items").query({ searchValue: "_" }).expect(200)).body.total).toBe(0);
  });
});

describe("PUT /items/:no", () => {
  it("사용자 배정/재배정/해제가 이력으로 남는다 (공백만 입력 = 해제)", async () => {
    const { no, key } = await createKey(1);
    await api().put(`/items/${no}`).send({ key, member: "홍길동" }).expect(200);
    await api().put(`/items/${no}`).send({ key, member: "김철수" }).expect(200);
    const res = await api().put(`/items/${no}`).send({ key, member: "   " }).expect(200);
    expect(res.body.member).toBeNull();
    expect(await historyActions(no)).toEqual(["create", "assign", "assign", "unassign"]);
  });

  it("보내지 않은 필드는 유지하고, 바뀐 카테고리·버전·메모는 edit 이력(detail)으로 남긴다", async () => {
    const { no, key } = await createKey(1);
    await api().put(`/items/${no}`).send({ key, member: "홍길동", memo: "PC-01" }).expect(200);
    const kept = await api().put(`/items/${no}`).send({ key }).expect(200);
    expect(kept.body).toMatchObject({ member: "홍길동", memo: "PC-01", version: "Windows 10 Pro" });

    await api()
      .put(`/items/${no}`)
      .send({ key, category: "MS_Office", version: "Office 2021 Professional Plus", memo: "" })
      .expect(200);
    const history = (await api().get(`/items/${no}/history`).expect(200)).body;
    expect(history[0]).toMatchObject({
      action: "edit",
      detail: "카테고리: Windows → MS_Office / 버전: Windows 10 Pro → Office 2021 Professional Plus / 메모 삭제",
    });
  });

  it("바뀐 카테고리·버전 조합은 화이트리스트에 있어야 한다", async () => {
    const { no, key } = await createKey(1);
    await api().put(`/items/${no}`).send({ key, category: "MS_Office" }).expect(400);
    await api().put(`/items/${no}`).send({ key, category: "Adobe", version: "x" }).expect(400);
    await api().put(`/items/${no}`).send({ key, memo: "가".repeat(501) }).expect(400);
  });

  it("없는/삭제된 키는 404", async () => {
    await api().put("/items/999").send({ key: testKey(1) }).expect(404);
    const { no, key } = await createKey(1);
    await api().delete(`/items/${no}`).expect(204);
    await api().put(`/items/${no}`).send({ key, member: "x" }).expect(404);
  });
});

describe("통계", () => {
  it("카테고리별 / 버전별 사용 중·미사용 집계 (삭제된 키 제외)", async () => {
    await createKey(1);
    await createKey(2);
    await createKey(3, "MS_Office", "Office 2010 Professional Plus");
    await api().put("/items/1").send({ key: testKey(1), member: "홍길동" }).expect(200);
    await api().put("/items/3").send({ key: testKey(3), member: "김철수" }).expect(200);
    await api().delete("/items/2").expect(204);

    const cats = (await api().get("/items/category-stats").expect(200)).body;
    expect(cats).toEqual(
      expect.arrayContaining([
        { category: "Windows", total: 1, active: 1, available: 0 },
        { category: "MS_Office", total: 1, active: 1, available: 0 },
      ]),
    );
    const versions = (await api().get("/items/version-stats").expect(200)).body;
    expect(versions).toEqual(
      expect.arrayContaining([
        { category: "MS_Office", version: "Office 2010 Professional Plus", total: 1, available: 0 },
      ]),
    );
  });
});

describe("마이그레이션 (initSchema)", () => {
  it("예전 방식의 미배정 값('', '사용자없음', 공백)을 NULL로 정규화하고, 여러 번 실행해도 안전하다", async () => {
    await pool.query(
      `INSERT INTO LICENSE_KEYS (key, category, version, member) VALUES
       ($1, 'Windows', 'Windows 10 Pro', '사용자없음'),
       ($2, 'Windows', 'Windows 10 Pro', ''),
       ($3, 'Windows', 'Windows 10 Pro', '   '),
       ($4, 'Windows', 'Windows 10 Pro', '홍길동')`,
      [testKey(1), testKey(2), testKey(3), testKey(4)],
    );
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    await initSchema();
    await initSchema();
    log.mockRestore();

    const { rows } = await pool.query("SELECT member FROM LICENSE_KEYS ORDER BY no");
    expect(rows.map((r) => r.member)).toEqual([null, null, null, "홍길동"]);
  });

  it("운영 DB의 예전 상태(INT isdelete + search_vector 트리거·인덱스 + 트라이그램 인덱스)를 정리해도 데이터는 그대로다", async () => {
    const a = await createKey(1);
    const b = await createKey(2);
    await api().put(`/items/${a.no}`).send({ key: a.key, member: "홍길동", memo: "개발팀 PC-07" }).expect(200);
    await api().delete(`/items/${b.no}`).expect(204);

    // ── 운영 DB의 예전 상태를 그대로 재현 ──
    // 1) isdelete INT(0/1) + (isdelete = 0) 부분 인덱스
    await pool.query("DROP INDEX license_keys_key_active_uidx");
    await pool.query("ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete DROP DEFAULT, ALTER COLUMN isdelete DROP NOT NULL");
    await pool.query(
      "ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete TYPE INT USING (CASE WHEN isdelete THEN 1 ELSE 0 END)",
    );
    await pool.query("ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete SET DEFAULT 0");
    await pool.query("CREATE UNIQUE INDEX license_keys_key_active_uidx ON LICENSE_KEYS (key) WHERE isdelete = 0");
    // 2) 수동으로 추가했던 전문 검색 설정: search_vector 컬럼 + 채우는 트리거 + GIN 인덱스
    await pool.query("ALTER TABLE LICENSE_KEYS ADD COLUMN IF NOT EXISTS search_vector tsvector");
    await pool.query("DROP TRIGGER IF EXISTS tsvectorupdate ON LICENSE_KEYS");
    await pool.query(`CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON LICENSE_KEYS
      FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger('search_vector', 'pg_catalog.simple', 'key', 'member')`);
    await pool.query("UPDATE LICENSE_KEYS SET key = key"); // 트리거로 기존 행의 search_vector 채우기
    await pool.query("CREATE INDEX IF NOT EXISTS idx_search_vector ON LICENSE_KEYS USING gin (search_vector)");
    // 3) 남겨야 하는 트라이그램 인덱스
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_key_trgm ON LICENSE_KEYS USING gin (key gin_trgm_ops)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_member_trgm ON LICENSE_KEYS USING gin (member gin_trgm_ops)");

    const snapshot = () =>
      pool
        .query(
          `SELECT no, key, member, category, version, memo, (isdelete::text IN ('1', 'true')) AS deleted, created_at, deleted_at
           FROM LICENSE_KEYS ORDER BY no`,
        )
        .then((r) => r.rows);
    const before = await snapshot();
    const historyBefore = (await pool.query("SELECT * FROM LICENSE_KEY_HISTORY ORDER BY id")).rows;
    expect((await pool.query("SELECT count(*) FROM LICENSE_KEYS WHERE search_vector IS NOT NULL")).rows[0].count).toBe("2");

    try {
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      await initSchema();
      await initSchema(); // 두 번째 실행은 아무것도 바꾸지 않아야 한다
      log.mockRestore();

      // 데이터: 키·이력 전부 그대로
      expect(await snapshot()).toEqual(before);
      expect((await pool.query("SELECT * FROM LICENSE_KEY_HISTORY ORDER BY id")).rows).toEqual(historyBefore);

      // isdelete → BOOLEAN, 부분 인덱스는 새 조건
      const col = await pool.query(
        "SELECT data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'license_keys' AND column_name = 'isdelete'",
      );
      expect(col.rows[0]).toMatchObject({ data_type: "boolean", is_nullable: "NO", column_default: "false" });
      const uidx = await pool.query("SELECT indexdef FROM pg_indexes WHERE indexname = 'license_keys_key_active_uidx'");
      expect(uidx.rows[0].indexdef).toContain("WHERE (NOT isdelete)");

      // 전문 검색 설정은 사라지고, 트라이그램 인덱스는 남는다
      const svCol = await pool.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'license_keys' AND column_name = 'search_vector'",
      );
      expect(svCol.rowCount).toBe(0);
      const trig = await pool.query("SELECT 1 FROM pg_trigger WHERE tgname = 'tsvectorupdate'");
      expect(trig.rowCount).toBe(0);
      const indexes = (await pool.query("SELECT indexname FROM pg_indexes WHERE tablename = 'license_keys'")).rows.map(
        (r) => r.indexname,
      );
      expect(indexes).not.toContain("idx_search_vector");
      expect(indexes).toEqual(expect.arrayContaining(["idx_key_trgm", "idx_member_trgm"]));

      // 정리 후에도 등록/수정/중복 방지/재등록이 정상 동작
      await api().post("/items").send({ key: a.key, category: "Windows", version: "Windows 10 Pro" }).expect(400);
      await createKey(2);
      await api().put(`/items/${a.no}`).send({ key: a.key, member: "김철수" }).expect(200);
    } finally {
      await pool.query("DROP TRIGGER IF EXISTS tsvectorupdate ON LICENSE_KEYS");
      await pool.query("ALTER TABLE LICENSE_KEYS DROP COLUMN IF EXISTS search_vector");
    }
  });
});
