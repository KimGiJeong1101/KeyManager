// routes/history.ts — 이력 조회 (일반 키 / 완전삭제된 키)
import { Router, Request, Response } from "express";
import pool from "../db";
import { parsePagination } from "../query-builder";
import { SERVER_ERROR, isValidNo } from "../errors";
import {
  ApiErrorBody,
  GetPurgedResponseBody,
  HistoryRow,
  ItemParams,
} from "../types";

const router = Router();

// ─────────────────────────────────────────────
// GET /items/purged
// 완전삭제 기록: "purge" 이력 행 목록 (최근 순, 페이지네이션). id는 이력 행의 id.
// 키 행 자체는 지워졌으므로 이력에 남긴 key_snapshot으로 어떤 키였는지 보여준다.
// ─────────────────────────────────────────────
router.get(
  "/items/purged",
  async (
    req: Request<{}, GetPurgedResponseBody, {}, { page?: string; limit?: string }>,
    res: Response<GetPurgedResponseBody | ApiErrorBody>,
  ) => {
    const { limit, offset } = parsePagination(req.query.page, req.query.limit);
    try {
      const total = await pool.query("SELECT COUNT(*) FROM LICENSE_KEY_HISTORY WHERE action = 'purge'");
      const result = await pool.query(
        `SELECT id, key_snapshot AS key, created_at AS purged_at
         FROM LICENSE_KEY_HISTORY
         WHERE action = 'purge'
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      res.json({ items: result.rows, total: parseInt(total.rows[0].count, 10) });
    } catch (err) {
      console.error("완전삭제 기록 조회 에러:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// GET /items/purged/:id/history
// 완전삭제된 키의 전체 이력. :id는 GET /items/purged가 준 purge 이력 행의 id.
//   - 그 행에 original_no가 있으면 같은 original_no의 이력 전체 (정확한 묶음)
//   - 없으면(original_no 컬럼 도입 전에 완전삭제된 경우) 같은 key_snapshot을 가진 완전삭제된(license_no IS NULL) 이력으로 대신 묶는다
// ─────────────────────────────────────────────
router.get(
  "/items/purged/:no/history",
  async (req: Request<ItemParams>, res: Response<HistoryRow[] | ApiErrorBody>) => {
    const { no: id } = req.params;
    if (!isValidNo(id)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }
    try {
      const purge = await pool.query<{ original_no: number | null; key_snapshot: string | null }>(
        "SELECT original_no, key_snapshot FROM LICENSE_KEY_HISTORY WHERE id = $1 AND action = 'purge'",
        [id],
      );
      if (purge.rows.length === 0) {
        return res.status(404).json({ error: "완전삭제 기록을 찾을 수 없습니다." });
      }
      const { original_no, key_snapshot } = purge.rows[0];
      const result =
        original_no !== null
          ? await pool.query<HistoryRow>(
              `SELECT id, action, member_before, member_after, detail, created_at
               FROM LICENSE_KEY_HISTORY WHERE original_no = $1
               ORDER BY created_at DESC, id DESC`,
              [original_no],
            )
          : await pool.query<HistoryRow>(
              `SELECT id, action, member_before, member_after, detail, created_at
               FROM LICENSE_KEY_HISTORY WHERE license_no IS NULL AND key_snapshot = $1
               ORDER BY created_at DESC, id DESC`,
              [key_snapshot],
            );
      res.json(result.rows);
    } catch (err) {
      console.error("완전삭제 이력 조회 에러:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// GET /items/:no/history
// 키별 이력 (최신순). 삭제된 키의 이력도 조회할 수 있다.
// 이력 기능 도입 이전에 등록된 키는 그 이후의 변경분만 남아있다.
// ─────────────────────────────────────────────
router.get(
  "/items/:no/history",
  async (req: Request<ItemParams>, res: Response<HistoryRow[] | ApiErrorBody>) => {
    const { no } = req.params;

    if (!isValidNo(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    try {
      const exists = await pool.query("SELECT 1 FROM LICENSE_KEYS WHERE no = $1", [no]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: "존재하지 않는 라이선스입니다." });
      }

      const result = await pool.query<HistoryRow>(
        `SELECT id, action, member_before, member_after, detail, created_at
         FROM LICENSE_KEY_HISTORY
         WHERE license_no = $1
         ORDER BY created_at DESC, id DESC`,
        [no],
      );
      res.json(result.rows);
    } catch (err) {
      console.error("이력 조회 에러:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

export default router;
