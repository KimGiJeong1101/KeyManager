// server.ts
import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { DatabaseError } from "pg";
import pool, { initSchema } from "./db";
import { CATEGORIES, VERSION_OPTIONS } from "./constants";
import { buildItemsFilter, parsePagination } from "./query-builder";
import {
  ApiErrorBody,
  CategoryStatRow,
  CategoryVersionsResponse,
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
// GET /categories
// 등록 폼에서 쓰는 category → version 화이트리스트.
// constants.ts를 프론트와 공유하는 단일 소스로 쓰기 위해 그대로 반환한다.
// (프론트에서 같은 목록을 하드코딩해두면 한쪽만 수정될 때 값이 어긋날 수 있다.)
// ─────────────────────────────────────────────
app.get(
  "/categories",
  (_req: Request, res: Response<CategoryVersionsResponse>) => {
    res.json(VERSION_OPTIONS);
  },
);

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
    const { limit, offset } = parsePagination(req.query.page, req.query.limit);
    const { category, status, searchField, searchValue } = req.query;

    try {
      const { baseQuery, queryParams } = buildItemsFilter({
        category,
        status,
        searchField,
        searchValue,
      });

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
    // PUT /items/:no과 동일하게 공백만 입력된 키를 걸러낸다 (예: "   ").
    const trimmedKey = key?.trim();

    if (!trimmedKey || !category || !version) {
      return res.status(400).json({ error: "키, 카테고리, 버전은 필수 항목입니다." });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "지원하지 않는 카테고리입니다." });
    }
    if (!VERSION_OPTIONS[category].includes(version)) {
      return res.status(400).json({ error: "지원하지 않는 버전입니다." });
    }

    try {
      // 동일한 키가 이미 존재하는지 확인 (삭제되지 않은 행만 대상 → 삭제된 키는 재등록 가능)
      const duplicateCheck = await pool.query(
        "SELECT * FROM LICENSE_KEYS WHERE key = $1 AND isdelete = 0",
        [trimmedKey],
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
      }

      const result = await pool.query(
        "INSERT INTO LICENSE_KEYS (key, CATEGORY, VERSION) VALUES ($1, $2, $3) RETURNING *",
        [trimmedKey, category, version],
      );

      res.json(result.rows[0]);
    } catch (err) {
      // 23505 = unique_violation (중복 체크 통과 후 동시 요청으로 키가 먼저 삽입된 경우)
      if (err instanceof DatabaseError && err.code === "23505") {
        return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
      }
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
    const trimmedKey = key?.trim();

    if (!/^\d+$/.test(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }
    if (!trimmedKey) {
      return res.status(400).json({ error: "라이선스 키는 필수 항목입니다." });
    }

    try {
      const result = await pool.query(
        "UPDATE LICENSE_KEYS SET key = $1, member = $2 WHERE no = $3 AND isdelete = 0 RETURNING *",
        [trimmedKey, member, no],
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

// 테이블/인덱스 생성이 끝난 뒤에 요청을 받기 시작해야, 완전히 새로운 DB에 처음
// 배포할 때 "relation does not exist" 에러를 방지할 수 있다.
let server: ReturnType<typeof app.listen>;

initSchema()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // 스키마 초기화가 실패한 상태로 기동하면 이후 모든 요청이 "relation does not
    // exist" 등으로 조용히 실패하므로, 리스닝을 시작하지 않고 즉시 종료한다.
    console.error("스키마 초기화 실패로 서버를 시작할 수 없습니다:", err);
    pool.end().finally(() => process.exit(1));
  });

function shutdown() {
  if (!server) {
    pool.end().finally(() => process.exit(0));
    return;
  }
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
