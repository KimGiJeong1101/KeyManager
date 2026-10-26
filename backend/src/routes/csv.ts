// routes/csv.ts — CSV 내보내기 / 가져오기
import { Router, Request, Response } from "express";
import { DatabaseError } from "pg";
import pool, { withTransaction } from "../db";
import { recordHistory } from "../history";
import { MAX_IMPORT_ROWS } from "../constants";
import { buildItemsFilter } from "../query-builder";
import { toCsv } from "../csv";
import { validateImportRow } from "../import";
import { SERVER_ERROR } from "../errors";
import {
  ApiErrorBody,
  GetItemsQuery,
  ImportItemsBody,
  ImportItemsResponse,
  ImportRowResult,
} from "../types";

const router = Router();

// ─────────────────────────────────────────────
// GET /items/export
// 목록을 CSV로 내려받는다. GET /items와 같은 필터(category/status/searchField/searchValue)를
// 그대로 받으므로 "지금 화면에 걸린 조건" 그대로 내보낼 수 있다 (페이지네이션 없이 전체).
// 열 구성은 POST /items/import가 그대로 다시 읽을 수 있는 형태(키/카테고리/버전/사용자)를 포함한다.
// ─────────────────────────────────────────────
router.get(
  "/items/export",
  async (req: Request<{}, string, {}, GetItemsQuery>, res: Response<string | ApiErrorBody>) => {
    const { category, status, searchField, searchValue } = req.query;

    try {
      const { baseQuery, queryParams } = buildItemsFilter({
        category,
        status,
        searchField,
        searchValue,
      });
      const result = await pool.query(
        `SELECT no, key, category, version, member, memo,
                to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created
         ${baseQuery}
         ORDER BY no ASC`,
        queryParams,
      );

      const csv = toCsv(
        ["번호", "라이선스 키", "카테고리", "버전", "사용자", "메모", "등록일"],
        result.rows.map((r) => [r.no, r.key, r.category, r.version, r.member, r.memo, r.created]),
      );

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="licenses_${today}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error("내보내기 에러:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// POST /items/import
// CSV 일괄 등록. 프론트가 파일을 파싱해 { rows, dryRun }으로 보낸다.
//
//   1) 각 행을 validateImportRow로 검증/정규화 (키 형식, 카테고리/버전 화이트리스트, 사용자명 길이)
//   2) 파일 안 중복 키, DB(삭제되지 않은 행)에 이미 있는 키를 오류로 표시
//   3) dryRun이면 여기까지의 결과(미리보기)만 돌려준다.
//      아니면 정상 행만 한 트랜잭션으로 INSERT + 이력(create, 사용자가 있으면 assign)을 남긴다.
//      → 오류 행은 건너뛰고, 정상 행은 전부 들어가거나(커밋) 전부 안 들어간다(롤백).
// ─────────────────────────────────────────────
router.post(
  "/items/import",
  async (
    req: Request<{}, ImportItemsResponse | ApiErrorBody, ImportItemsBody>,
    res: Response<ImportItemsResponse | ApiErrorBody>,
  ) => {
    const { rows, dryRun } = req.body ?? {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "가져올 행이 없습니다." });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return res
        .status(400)
        .json({ error: `한 번에 최대 ${MAX_IMPORT_ROWS}행까지 가져올 수 있습니다. (현재 ${rows.length}행)` });
    }

    // 1) 행 단위 검증
    const checks = rows.map((row) => validateImportRow(row ?? {}));
    const results: ImportRowResult[] = checks.map((check, index) =>
      check.ok
        ? { index, status: "ok", ...check.row }
        : { index, status: "error", error: check.error },
    );

    // 2-a) 파일 안 중복 (먼저 나온 행만 인정)
    const firstIndexByKey = new Map<string, number>();
    for (const r of results) {
      if (r.status !== "ok") continue;
      const first = firstIndexByKey.get(r.key!);
      if (first === undefined) {
        firstIndexByKey.set(r.key!, r.index);
      } else {
        r.status = "error";
        r.error = "파일 안에서 중복된 키입니다";
        // 화면에서 "엑셀 몇 행과 같은지" 표시할 수 있도록 원래 행의 인덱스를 함께 보낸다
        r.duplicateOf = first;
      }
    }

    try {
      // 2-b) DB에 이미 등록된 키
      const candidateKeys = results.filter((r) => r.status === "ok").map((r) => r.key!);
      if (candidateKeys.length > 0) {
        const existing = await pool.query<{ key: string }>(
          "SELECT key FROM LICENSE_KEYS WHERE NOT isdelete AND key = ANY($1)",
          [candidateKeys],
        );
        const existingKeys = new Set(existing.rows.map((r) => r.key));
        for (const r of results) {
          if (r.status === "ok" && existingKeys.has(r.key!)) {
            r.status = "error";
            r.error = "이미 등록된 키입니다";
          }
        }
      }

      const okRows = results.filter((r) => r.status === "ok");
      if (dryRun || okRows.length === 0) {
        return res.json({ results, inserted: 0, dryRun: !!dryRun });
      }

      // 3) 정상 행 일괄 등록
      await withTransaction(async (client) => {
        for (const r of okRows) {
          const inserted = await client.query<{ no: number }>(
            "INSERT INTO LICENSE_KEYS (key, CATEGORY, VERSION, member, memo) VALUES ($1, $2, $3, $4, $5) RETURNING no",
            [r.key, r.category, r.version, r.member, r.memo],
          );
          const no = inserted.rows[0].no;
          await recordHistory(client, no, "create");
          if (r.member) await recordHistory(client, no, "assign", null, r.member);
        }
      });

      res.json({ results, inserted: okRows.length, dryRun: false });
    } catch (err) {
      // 미리보기와 등록 사이에 다른 요청이 같은 키를 먼저 등록한 경우 → 전체 롤백됨
      if (err instanceof DatabaseError && err.code === "23505") {
        return res.status(409).json({
          error: "그 사이 같은 키가 다른 곳에서 등록되었습니다. 다시 미리보기를 확인해주세요. (아무것도 등록되지 않았습니다)",
        });
      }
      console.error("가져오기 오류:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

export default router;
