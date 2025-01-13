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

  console.log(Number(true))
  console.log(Number(false))

  try {
    const totalResult = await pool.query(
      "SELECT COUNT(*) FROM key_win10 WHERE isdelete = 0"
    );

    const totalItems = totalResult.rows[0].count;

    // 데이터가 없을 경우 처리
    if (totalItems === "0") {
      return res.json({ items: [], total: totalItems });
    }

    // ORDER BY 절 추가
    const result = await pool.query(
      "SELECT no, key, member FROM key_win10 WHERE isdelete = 0 ORDER BY no ASC LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    res.json({
      items: result.rows,
      total: totalItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/search-items", async (req, res) => {
  const category = req.query.category || null; // 카테고리 값 (key, member, null 등)
  const searchTerm = req.query.search || ""; // 검색어
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    let query = "SELECT COUNT(*) FROM key_win10 WHERE isdelete = 0"; // 데이터 개수를 세는 쿼리
    let queryParams = []; // 쿼리 파라미터 배열
    let selectQuery = "SELECT * FROM key_win10 WHERE isdelete = 0"; // 실제 데이터를 가져오는 쿼리

    // TS query를 위한 파라미터 추가 (to_tsquery에 사용)
    const searchQuery = `to_tsquery('simple', $1::text)`;
    queryParams.push(searchTerm); // 첫 번째 파라미터는 searchTerm

    console.log("카테고리 뭐가 넘어오냐 : " + category);
    console.log("검색어 뭐가 넘어오냐 : " + searchTerm);

    if (category === "key") {
      // "key" 카테고리일 때만 key 관련 데이터 검색
      query += " AND (search_vector @@ " + searchQuery + " OR key ILIKE $2)";
      selectQuery +=
        " AND (search_vector @@ " + searchQuery + " OR key ILIKE $2)";
      queryParams.push(`%${searchTerm}%`); // ILIKE에 사용할 검색어 추가
    } else if (category === "member") {
      // "member" 카테고리일 때만 member 관련 데이터 검색
      query += " AND (search_vector @@ " + searchQuery + " OR member ILIKE $2)";
      selectQuery +=
        " AND (search_vector @@ " + searchQuery + " OR member ILIKE $2)";
      queryParams.push(`%${searchTerm}%`); // ILIKE에 사용할 검색어 추가
    } else if (category === "all") {
      // "all" 카테고리일 때는 key와 member 모두 검색
      query += " AND (search_vector @@ " + searchQuery + " OR key ILIKE $2";
      selectQuery +=
        " AND (search_vector @@ " + searchQuery + " OR key ILIKE $2";
      queryParams.push(`%${searchTerm}%`); // key에 대한 검색어 추가

      // 검색어가 있을 경우에만 member에 대한 조건을 추가
      if (searchTerm) {
        query += " OR member ILIKE $3)";
        selectQuery += " OR member ILIKE $3)";
        queryParams.push(`%${searchTerm}%`); // member에 대한 검색어 추가
      } else {
        query += ")";
        selectQuery += ")";
      }
    } else {
      // 다른 경우에도 all처럼 key와 member 모두 검색
      query +=
        " AND (search_vector @@ " +
        searchQuery +
        " OR key ILIKE $2 OR member ILIKE $3)";
      selectQuery +=
        " AND (search_vector @@ " +
        searchQuery +
        " OR key ILIKE $2 OR member ILIKE $3)";
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`); // key와 member에 대한 검색어 추가
    }

    console.log("쿼리: ", query);
    console.log("파라미터: ", queryParams);

    // 총 데이터 수 조회
    const totalResult = await pool.query(query, queryParams);
    const totalItems = parseInt(totalResult.rows[0].count, 10);

    if (totalItems === 0) {
      return res.json({ items: [], total: totalItems });
    }

    // 페이지네이션 쿼리 부분 수정
    if (queryParams.length >= 3) {
      // $3이 존재하는 경우
      selectQuery += " ORDER BY no ASC LIMIT $4 OFFSET $5";
      queryParams.push(limit, offset);
    } else {
      // $3이 존재하지 않는 경우
      selectQuery += " ORDER BY no ASC LIMIT $3 OFFSET $4";
      queryParams.push(limit, offset);
    }

    console.log("데이터 조회 쿼리: ", selectQuery);
    console.log("파라미터: ", queryParams);

    // 실제 데이터 조회
    const result = await pool.query(selectQuery, queryParams);

    res.json({
      items: result.rows,
      total: totalItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// POST: 항목 추가하기
app.post("/items", async (req, res) => {
  const { key } = req.body;

  // 유효성 검사: 키가 존재하는지만 확인
  if (!key) {
    return res.status(400).json({ error: "키는 필수 항목입니다." });
  }

  try {
    // 중복 확인
    const duplicateCheck = await pool.query(
      "SELECT * FROM key_win10 WHERE key = $1",
      [key]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: "중복된 키는 저장할 수 없습니다." });
    }

    // 중복이 아니면 새 키 추가
    const result = await pool.query(
      "INSERT INTO key_win10 (key) VALUES ($1) RETURNING *",
      [key]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.put("/items/:no", async (req, res) => {
  const { no } = req.params;
  const { key, member } = req.body;

  try {
    const result = await pool.query(
      "UPDATE key_win10 SET key = $1, member = $2 WHERE no = $3 RETURNING *",
      [key, member, no]
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
    await pool.query("UPDATE key_win10 SET isdelete = 1 WHERE no = $1", [no]);
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
