// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const pool = require("./db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// GET: 모든 항목 가져오기 (페이지네이션 추가)
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
        // ALL 검색
        queryParams.push(term);
        const idx = queryParams.length;
        baseQuery += ` AND (key ILIKE $${idx} OR member ILIKE $${idx})`;
      }
    }

    // [Step A] 전체 개수 조회
    const totalResult = await pool.query(
      `SELECT COUNT(*) ${baseQuery}`,
      queryParams,
    );
    const totalItems = parseInt(totalResult.rows[0].count);

    // [Step B] 실제 데이터 조회
    // limit와 offset을 위해 파라미터 추가
    // 개선된 방식 (가독성 중심)
    const finalParams = [...queryParams]; // 기존 검색 조건들 복사

    // LIMIT 추가 및 인덱스 저장
    finalParams.push(limit);
    const limitIdx = finalParams.length; // 현재 배열의 길이가 곧 $번호

    // OFFSET 추가 및 인덱스 저장
    finalParams.push(offset);
    const offsetIdx = finalParams.length; // 현재 배열의 길이가 곧 $번호

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
    console.error("!!! DB 조회 에러 발생 !!!");
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// GET: 카테고리별 자산 통계 가져오기
app.get("/items/category-stats", async (req, res) => {
  console.log("\n========================================");
  console.log("[STATS] 카테고리별 통계 요청 수신");

  try {
    const statsQuery = `
      SELECT
        CATEGORY,
        COUNT(*) AS TOTAL,

        -- ACTIVE: MEMBER가 NULL 아니고 '사용자없음' 아니고 '' 아닐 때
        COUNT(*) FILTER (
          WHERE MEMBER IS NOT NULL
            AND MEMBER <> '사용자없음'
            AND MEMBER <> ''
        ) AS ACTIVE,

        -- AVAILABLE: MEMBER가 NULL 이거나 '사용자없음' 이거나 '' 일 때
        COUNT(*) FILTER (
          WHERE MEMBER IS NULL
             OR MEMBER = '사용자없음'
             OR MEMBER = ''
        ) AS AVAILABLE

      FROM LICENSE_KEYS
      WHERE ISDELETE = 0
      GROUP BY CATEGORY
    `;

    console.log("[SQL] 통계 쿼리 실행 중...");
    const result = await pool.query(statsQuery);

    console.log(`[DB RESULT] 조회된 카테고리 수: ${result.rows.length}개`);
    if (result.rows.length > 0) console.table(result.rows);

    // PostgreSQL 결과를 JSON 형태로 변환
    const categoryStats = result.rows.map((row) => ({
      category: row.category || "미지정",
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      available: parseInt(row.available, 10),
    }));

    console.log("[JSON] 프론트엔드 전송 데이터:");
    console.dir(categoryStats, { depth: null });
    console.log("========================================\n");

    res.json(categoryStats);
  } catch (err) {
    console.error("!!!!!!!! [ERROR] 통계 조회 중 오류 발생 !!!!!!!!!");
    console.error(err.stack);
    console.log("========================================\n");
    res.status(500).send("Server Error");
  }
});

// POST: 항목 추가하기
app.post("/items", async (req, res) => {
  // 1. 리액트에서 보낸 category와 version을 추가로 꺼냅니다.
  const { key, category, version } = req.body;

  // 유효성 검사 (우리 대문자 규칙 잊지 마세요!)
  if (!key || !category || !version) {
    return res
      .status(400)
      .json({ error: "키, 카테고리, 버전은 필수 항목입니다." });
  }

  try {
    // 중복 확인
    const duplicateCheck = await pool.query(
      "SELECT * FROM LICENSE_KEYS WHERE key = $1",
      [key],
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
    }

    // 2. 쿼리문 수정: CATEGORY와 VERSION 컬럼에 데이터 삽입
    const result = await pool.query(
      "INSERT INTO LICENSE_KEYS (key, CATEGORY, VERSION) VALUES ($1, $2, $3) RETURNING *",
      [key, category, version], // 순서 중요! $1, $2, $3 순서대로 들어갑니다.
    );

    console.log("[DB] 새 데이터 등록 완료:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("데이터 등록 오류:", err);
    res.status(500).send("Server Error");
  }
});

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

// DELETE: 항목 삭제하기
app.delete("/items/:no", async (req, res) => {
  const { no } = req.params;

  try {
    await pool.query("UPDATE LICENSE_KEYS SET isdelete = 1 WHERE no = $1", [
      no,
    ]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`포트 ${PORT}에 정상 연결 됨`);
  console.log(`Server is running on http://localhost:${PORT}`);
});
