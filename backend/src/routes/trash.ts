// routes/trash.ts — 휴지통 · 복구 · 완전삭제
import { Router, Request, Response } from "express";
import { DatabaseError } from "pg";
import pool, { withTransaction } from "../db";
import { recordHistory } from "../history";
import { parsePagination } from "../query-builder";
import { SERVER_ERROR, isValidNo } from "../errors";
import {
  ApiErrorBody,
  DeletedLicenseKeyRow,
  FullLicenseKeyRow,
  GetDeletedItemsResponseBody,
  ItemParams,
  PurgeItemBody,
} from "../types";

const router = Router();

// ─────────────────────────────────────────────
// GET /items/deleted
// 휴지통: 소프트 삭제된 라이선스 목록 (최근 삭제 순, 페이지네이션).
// deleted_at 컬럼 도입 이전에 삭제된 행은 deleted_at이 NULL이라 맨 뒤에 온다.
// ─────────────────────────────────────────────
router.get(
  "/items/deleted",
  async (
    req: Request<{}, GetDeletedItemsResponseBody, {}, { page?: string; limit?: string }>,
    res: Response<GetDeletedItemsResponseBody | ApiErrorBody>,
  ) => {
    const { limit, offset } = parsePagination(req.query.page, req.query.limit);

    try {
      const totalResult = await pool.query(
        "SELECT COUNT(*) FROM LICENSE_KEYS WHERE isdelete",
      );
      const result = await pool.query<DeletedLicenseKeyRow>(
        `SELECT no, key, member, category, version, memo, deleted_at
         FROM LICENSE_KEYS
         WHERE isdelete
         ORDER BY deleted_at DESC NULLS LAST, no DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );

      res.json({
        items: result.rows,
        total: parseInt(totalResult.rows[0].count, 10),
      });
    } catch (err) {
      console.error("휴지통 조회 에러:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// POST /items/:no/restore
// 휴지통의 라이선스를 복구한다 (isdelete = FALSE, deleted_at = NULL, "restore" 이력).
// 같은 키가 이미 다시 등록돼 있으면 partial unique index에 걸려 23505 → 409로 거부한다.
// ─────────────────────────────────────────────
router.post(
  "/items/:no/restore",
  async (req: Request<ItemParams>, res: Response<FullLicenseKeyRow | ApiErrorBody>) => {
    const { no } = req.params;

    if (!isValidNo(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    try {
      const restored = await withTransaction(async (client) => {
        const result = await client.query<FullLicenseKeyRow>(
          `UPDATE LICENSE_KEYS SET isdelete = FALSE, deleted_at = NULL
           WHERE no = $1 AND isdelete
           RETURNING *`,
          [no],
        );
        if (result.rows.length === 0) return null;
        await recordHistory(client, Number(no), "restore");
        return result.rows[0];
      });

      if (!restored) {
        return res.status(404).json({ error: "휴지통에 없는 라이선스입니다." });
      }

      res.json(restored);
    } catch (err) {
      if (err instanceof DatabaseError && err.code === "23505") {
        return res
          .status(409)
          .json({ error: "같은 키가 이미 다시 등록되어 있어 복구할 수 없습니다." });
      }
      console.error("복구 오류:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// POST /items/:no/purge
// 휴지통의 라이선스를 완전삭제(영구 삭제)한다. 되돌릴 수 없다.
//
// 안전장치:
//   - 휴지통에 있는(isdelete = TRUE) 키만 대상 → 사용 중/활성 키는 바로 완전삭제할 수 없다.
//   - body.confirm에 키의 마지막 5자리를 보내야 한다 (확인 입력 없이 실수로 지워지는 것을 방지).
//   - "purge" 이력을 key_snapshot과 함께 먼저 남긴 뒤 행을 지운다. FK가 ON DELETE SET NULL이라
//     이 키의 기존 이력도 license_no만 NULL이 된 채 그대로 남는다.
// ─────────────────────────────────────────────
router.post(
  "/items/:no/purge",
  async (
    req: Request<ItemParams, ApiErrorBody, PurgeItemBody>,
    res: Response<ApiErrorBody | undefined>,
  ) => {
    const { no } = req.params;
    const confirm = req.body?.confirm?.trim().toUpperCase();

    if (!isValidNo(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }
    if (!confirm) {
      return res.status(400).json({ error: "확인을 위해 키의 마지막 5자리를 입력해주세요." });
    }

    try {
      const outcome = await withTransaction(async (client) => {
        const current = await client.query<{ key: string }>(
          "SELECT key FROM LICENSE_KEYS WHERE no = $1 AND isdelete FOR UPDATE",
          [no],
        );
        if (current.rows.length === 0) return "not_found" as const;
        if (current.rows[0].key.slice(-5).toUpperCase() !== confirm) return "mismatch" as const;

        await recordHistory(client, Number(no), "purge");
        await client.query("DELETE FROM LICENSE_KEYS WHERE no = $1", [no]);
        return "purged" as const;
      });

      if (outcome === "not_found") {
        return res.status(404).json({ error: "휴지통에 없는 라이선스입니다." });
      }
      if (outcome === "mismatch") {
        return res.status(400).json({ error: "입력한 값이 키의 마지막 5자리와 일치하지 않습니다." });
      }

      res.status(204).send();
    } catch (err) {
      console.error("완전삭제 오류:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

export default router;
