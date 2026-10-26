// routes/stats.ts — 통계 (카테고리별 / 버전별 재고)
import { Router, Request, Response } from "express";
import pool from "../db";
import { SERVER_ERROR } from "../errors";
import { ApiErrorBody, CategoryStatRow, VersionStatRow } from "../types";

const router = Router();

// ─────────────────────────────────────────────
// GET /items/category-stats
// 상단 통계 카드용 카테고리별 집계.
// FILTER (WHERE ...) 구문으로 사용 중/미사용을 단일 쿼리로 계산.
//
// 사용 중 기준: member IS NOT NULL / 미사용 기준: member IS NULL
// (미배정 값은 db.ts initSchema와 PUT /items/:no에서 NULL로 정규화된다)
// ─────────────────────────────────────────────
router.get(
  "/items/category-stats",
  async (_req: Request, res: Response<CategoryStatRow[] | ApiErrorBody>) => {
    try {
      const result = await pool.query(`
      SELECT
        CATEGORY,
        COUNT(*) AS TOTAL,
        COUNT(*) FILTER (WHERE MEMBER IS NOT NULL) AS ACTIVE,
        COUNT(*) FILTER (WHERE MEMBER IS NULL) AS AVAILABLE
      FROM LICENSE_KEYS
      WHERE NOT ISDELETE
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
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// GET /items/version-stats
// 버전별 재고(전체/미사용) 집계. 프론트의 재고 부족 경고에 쓴다.
// 키가 한 건이라도 등록된 버전만 나온다 (등록된 적 없는 버전은 "부족"이 아니라 "취급 안 함"으로 본다).
// ─────────────────────────────────────────────
router.get(
  "/items/version-stats",
  async (_req: Request, res: Response<VersionStatRow[] | ApiErrorBody>) => {
    try {
      const result = await pool.query(`
        SELECT category, version,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE member IS NULL) AS available
        FROM LICENSE_KEYS
        WHERE NOT isdelete
        GROUP BY category, version
        ORDER BY category, version
      `);

      res.json(
        result.rows.map((row) => ({
          category: row.category || "미지정",
          version: row.version || "미지정",
          total: parseInt(row.total, 10),
          available: parseInt(row.available, 10),
        })),
      );
    } catch (err) {
      console.error("버전별 통계 조회 에러:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

export default router;
