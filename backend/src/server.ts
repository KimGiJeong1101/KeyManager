// server.ts
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { DatabaseError } from "pg";
import pool from "./db";
import {
  ApiErrorBody,
  CategoryStatRow,
  CreateItemBody,
  FullLicenseKeyRow,
  GetItemsQuery,
  GetItemsResponseBody,
  ItemParams,
  UpdateItemBody,
} from "./types";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// ─────────────────────────────────────────────
// GET /health
// 프론트엔드의 연결 상태 배지에서 주기적으로 호출.
// DB 쿼리까지 통과해야 "연결됨"으로 표시됨.
// ─────────────────────────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
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
//   status      - "assigned"(사용 중) | "unassigned"(미사용). 그 외 값은 전체 조회
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
app.get(
  "/items",
  async (
    req: Request<{}, GetItemsResponseBody, {}, GetItemsQuery>,
    res: Response<GetItemsResponseBody | string>,
  ) => {
    const page = parseInt(req.query.page || "", 10) || 1;
    const limit = parseInt(req.query.limit || "", 10) || 10;
    const offset = (page - 1) * limit;

    const { category, status, searchField, searchValue } = req.query;

    try {
      let baseQuery = "FROM LICENSE_KEYS WHERE isdelete = 0";
      const queryParams: string[] = [];

      // 1. 카테고리 필터
      if (category && category !== "allassets") {
        queryParams.push(category);
        baseQuery += ` AND category = $${queryParams.length}`;
      }

      // 2. 사용 상태 필터
      // 미사용 기준: member가 NULL / '사용자없음' / '' 중 하나 (category-stats와 동일한 기준)
      if (status === "assigned") {
        baseQuery += ` AND (member IS NOT NULL AND member <> '사용자없음' AND member <> '')`;
      } else if (status === "unassigned") {
        baseQuery += ` AND (member IS NULL OR member = '사용자없음' OR member = '')`;
      }

      // 3. 검색어 필터
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
      const totalItems = parseInt(totalResult.rows[0].count, 10);

      // [Step B] 실제 데이터 조회 (LIMIT/OFFSET 추가)
      const finalParams: (string | number)[] = [...queryParams];
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
      const message = err instanceof Error ? err.message : String(err);
      console.error("DB 조회 에러:", message);
      res.status(500).send("Server Error");
    }
  },
);

// ─────────────────────────────────────────────
// GET /items/category-stats
// 상단 통계 카드용 카테고리별 집계.
// FILTER (WHERE ...) 구문으로 사용 중/미사용을 단일 쿼리로 계산.
//
// 사용 중 기준: member가 NULL이 아니고, '사용자없음'도 아니고, 빈 문자열도 아님
// 미사용 기준: 위 조건의 반대 (OR로 연결)
// ─────────────────────────────────────────────
app.get(
  "/items/category-stats",
  async (_req: Request, res: Response<CategoryStatRow[] | string>) => {
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

      const categoryStats: CategoryStatRow[] = result.rows.map((row) => ({
        category: row.category || "미지정",
        total: parseInt(row.total, 10),
        active: parseInt(row.active, 10),
        available: parseInt(row.available, 10),
      }));

      res.json(categoryStats);
    } catch (err) {
      const stack = err instanceof Error ? err.stack : String(err);
      console.error("통계 조회 에러:", stack);
      res.status(500).send("Server Error");
    }
  },
);

// ─────────────────────────────────────────────
// POST /items
// 새 라이선스 키 등록.
// 중복 키 검사 후 INSERT (RETURNING *로 삽입된 행 즉시 반환).
// ─────────────────────────────────────────────
app.post(
  "/items",
  async (
    req: Request<{}, FullLicenseKeyRow | ApiErrorBody, CreateItemBody>,
    res: Response<FullLicenseKeyRow | ApiErrorBody | string>,
  ) => {
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
  },
);

// ─────────────────────────────────────────────
// PUT /items/:no
// 라이선스 키와 사용자명 수정.
// member를 빈 문자열로 보내면 사용자 배정 해제 가능.
// ─────────────────────────────────────────────
app.put(
  "/items/:no",
  async (
    req: Request<ItemParams, FullLicenseKeyRow | ApiErrorBody, UpdateItemBody>,
    res: Response<FullLicenseKeyRow | ApiErrorBody | string>,
  ) => {
    const { no } = req.params;
    const { key, member } = req.body;

    if (!/^\d+$/.test(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }
    if (!key || !key.trim()) {
      return res.status(400).json({ error: "라이선스 키는 필수 항목입니다." });
    }

    try {
      const result = await pool.query(
        "UPDATE LICENSE_KEYS SET key = $1, member = $2 WHERE no = $3 AND isdelete = 0 RETURNING *",
        [key, member, no],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "존재하지 않는 라이선스입니다." });
      }

      res.json(result.rows[0]);
    } catch (err) {
      // 23505 = unique_violation (다른 행이 이미 같은 key를 사용 중)
      if (err instanceof DatabaseError && err.code === "23505") {
        return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
      }
      console.error(err);
      res.status(500).send("Server Error");
    }
  },
);

// ─────────────────────────────────────────────
// DELETE /items/:no
// 소프트 삭제(Soft Delete) 방식 사용.
// 실제 행을 삭제하지 않고 isdelete = 1로 플래그만 설정.
// 이력 보존 및 실수로 인한 영구 삭제 방지가 목적.
// ─────────────────────────────────────────────
app.delete(
  "/items/:no",
  async (req: Request<ItemParams>, res: Response<ApiErrorBody | undefined>) => {
    const { no } = req.params;

    if (!/^\d+$/.test(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    try {
      const result = await pool.query(
        "UPDATE LICENSE_KEYS SET isdelete = 1 WHERE no = $1 AND isdelete = 0",
        [no],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "존재하지 않는 라이선스입니다." });
      }

      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).send();
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
