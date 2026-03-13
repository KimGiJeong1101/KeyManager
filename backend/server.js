// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const pool = require("./db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// ─────────────────────────────────────────────
// GET /health
// 프론트엔드의 연결 상태 배지에서 주기적으로 호출.
// DB 쿼리까지 통과해야 "연결됨"으로 표시됨.
// ─────────────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error" });
  }
});

// ─────────────────────────────────────────────
// GET /items
// 라이선스 목록 조회 (페이지네이션 + 카테고리 필터 + 검색)
//
// Query params:
//   page        - 현재 페이지 번호 (기본값: 1)
//   limit       - 페이지당 항목 수 (기본값: 10)
//   category    - 카테고리 필터. "allassets"이면 전체 조회
//   searchField - "key" | "member" | "all"
//   searchValue - 검색어
//
// 동적 쿼리 빌더 패턴:
//   baseQuery 문자열에 조건을 누적하고, queryParams 배열에
//   대응하는 값을 순서대로 쌓는다.
//   $1, $2 ... 인덱스는 항상 queryParams.length 기준으로 계산해
//   SQL 인젝션을 방지하는 파라미터 바인딩을 유지한다.
//
// 두 번 쿼리하는 이유:
//   [Step A] COUNT(*)로 전체 개수를 구해 totalItems 반환 → 프론트 페이지네이션용
//   [Step B] LIMIT/OFFSET을 붙여 실제 데이터만 가져옴
// ─────────────────────────────────────────────
app.get("/items", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const { category, searchField, searchValue } = req.query;

  try {
    let baseQuery = "FROM LICENSE_KEYS WHERE isdelete = 0";
    let queryParams = [];

    // 1. 카테고리 필터
    if (category && category !== "allassets") {
      queryParams.push(category);
      baseQuery += ` AND category = $${queryParams.length}`;
    }

    // 2. 검색어 필터
    if (searchValue && searchValue.trim() !== "") {
      const term = `%${searchValue}%`;
      if (searchField === "key") {
        queryParams.push(term);
        baseQuery += ` AND key ILIKE $${queryParams.length}`;
      } else if (searchField === "member") {
        queryParams.push(term);
        baseQuery += ` AND member ILIKE $${queryParams.length}`;
      } else {
        // ALL 검색: key와 member 둘 다 같은 파라미터($idx)로 OR 검색
        // → 파라미터를 한 번만 push하고 인덱스를 재사용
        queryParams.push(term);
        const idx = queryParams.length;
        baseQuery += ` AND (key ILIKE $${idx} OR member ILIKE $${idx})`;
      }
    }

    // [Step A] 전체 개수 조회 (페이지네이션 계산용)
    const totalResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery}`,
      queryParams,
    );
    const totalItems = parseInt(totalResult.rows[0].count);

    // [Step B] 실제 데이터 조회 (LIMIT/OFFSET 추가)
    const finalParams = [...queryParams];
    finalParams.push(limit);
    const limitIdx = finalParams.length;
    finalParams.push(offset);
    const offsetIdx = finalParams.length;

    const dataSql = `
  SELECT no, key, member, category, version
  ${baseQuery}
  ORDER BY no ASC
  LIMIT $${limitIdx} OFFSET $${offsetIdx}
`;

    const result = await pool.query(dataSql, finalParams);

    res.json({
      items: result.rows,
      total: totalItems,
    });
  } catch (err) {
    console.error("DB 조회 에러:", err.message);
    res.status(500).send("Server Error");
  }
});

// ─────────────────────────────────────────────
// GET /items/category-stats
// 상단 통계 카드용 카테고리별 집계.
// FILTER (WHERE ...) 구문으로 사용 중/미사용을 단일 쿼리로 계산.
//
// 사용 중 기준: member가 NULL이 아니고, '사용자없음'도 아니고, 빈 문자열도 아님
// 미사용 기준: 위 조건의 반대 (OR로 연결)
// ─────────────────────────────────────────────
app.get("/items/category-stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CATEGORY,
        COUNT(*) AS TOTAL,
        COUNT(*) FILTER (
          WHERE MEMBER IS NOT NULL
            AND MEMBER <> '사용자없음'
            AND MEMBER <> ''
        ) AS ACTIVE,
        COUNT(*) FILTER (
          WHERE MEMBER IS NULL
             OR MEMBER = '사용자없음'
             OR MEMBER = ''
        ) AS AVAILABLE
      FROM LICENSE_KEYS
      WHERE ISDELETE = 0
      GROUP BY CATEGORY
    `);

    const categoryStats = result.rows.map((row) => ({
      category: row.category || "미지정",
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      available: parseInt(row.available, 10),
    }));

    res.json(categoryStats);
  } catch (err) {
    console.error("통계 조회 에러:", err.stack);
    res.status(500).send("Server Error");
  }
});

// ─────────────────────────────────────────────
// POST /items
// 새 라이선스 키 등록.
// 중복 키 검사 후 INSERT (RETURNING *로 삽입된 행 즉시 반환).
// ─────────────────────────────────────────────
app.post("/items", async (req, res) => {
  const { key, category, version } = req.body;

  if (!key || !category || !version) {
    return res.status(400).json({ error: "키, 카테고리, 버전은 필수 항목입니다." });
  }

  try {
    // 동일한 키가 이미 존재하는지 확인 (isdelete 관계없이 전체 검색)
    const duplicateCheck = await pool.query(
      "SELECT * FROM LICENSE_KEYS WHERE key = $1",
      [key],
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
    }

    const result = await pool.query(
      "INSERT INTO LICENSE_KEYS (key, CATEGORY, VERSION) VALUES ($1, $2, $3) RETURNING *",
      [key, category, version],
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("데이터 등록 오류:", err);
    res.status(500).send("Server Error");
  }
});

// ─────────────────────────────────────────────
// PUT /items/:no
// 라이선스 키와 사용자명 수정.
// member를 빈 문자열로 보내면 사용자 배정 해제 가능.
// ─────────────────────────────────────────────
app.put("/items/:no", async (req, res) => {
  const { no } = req.params;
  const { key, member } = req.body;

  try {
    const result = await pool.query(
      "UPDATE LICENSE_KEYS SET key = $1, member = $2 WHERE no = $3 RETURNING *",
      [key, member, no],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// ─────────────────────────────────────────────
// DELETE /items/:no
// 소프트 삭제(Soft Delete) 방식 사용.
// 실제 행을 삭제하지 않고 isdelete = 1로 플래그만 설정.
// 이력 보존 및 실수로 인한 영구 삭제 방지가 목적.
// ─────────────────────────────────────────────
app.delete("/items/:no", async (req, res) => {
  const { no } = req.params;

  try {
    await pool.query("UPDATE LICENSE_KEYS SET isdelete = 1 WHERE no = $1", [no]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
