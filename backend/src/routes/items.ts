// routes/items.ts — 라이선스 목록 조회 · 등록 · 수정 · 삭제(소프트)
import { Router, Request, Response } from "express";
import { DatabaseError } from "pg";
import pool, { withTransaction } from "../db";
import { classifyMemberChange, describeEdit, recordHistory } from "../history";
import {
  CATEGORIES,
  LICENSE_KEY_PATTERN,
  MAX_FIELD_LENGTH,
  MAX_MEMO_LENGTH,
  VERSION_OPTIONS,
} from "../constants";
import { buildItemsFilter, parsePagination } from "../query-builder";
import { SERVER_ERROR, isValidNo } from "../errors";
import {
  ApiErrorBody,
  CreateItemBody,
  FullLicenseKeyRow,
  GetItemsQuery,
  GetItemsResponseBody,
  ItemParams,
  UpdateItemBody,
} from "../types";

const router = Router();

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
router.get(
  "/items",
  async (
    req: Request<{}, GetItemsResponseBody, {}, GetItemsQuery>,
    res: Response<GetItemsResponseBody | ApiErrorBody>,
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
  SELECT no, key, member, category, version, memo
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
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// POST /items
// 새 라이선스 키 등록.
// 중복 키 검사 후 INSERT (RETURNING *로 삽입된 행 즉시 반환) + "create" 이력 기록.
// ─────────────────────────────────────────────
router.post(
  "/items",
  async (
    req: Request<{}, FullLicenseKeyRow | ApiErrorBody, CreateItemBody>,
    res: Response<FullLicenseKeyRow | ApiErrorBody>,
  ) => {
    const { key, category, version } = req.body;
    // PUT /items/:no과 동일하게 공백만 입력된 키를 걸러낸다 (예: "   ").
    const trimmedKey = key?.trim();

    if (!trimmedKey || !category || !version) {
      return res.status(400).json({ error: "키, 카테고리, 버전은 필수 항목입니다." });
    }
    // 프론트의 5칸 입력 규칙을 우회한 직접 호출(curl 등)도 같은 형식만 허용한다.
    if (!LICENSE_KEY_PATTERN.test(trimmedKey)) {
      return res
        .status(400)
        .json({ error: "라이선스 키는 XXXXX-XXXXX-XXXXX-XXXXX-XXXXX 형식(영문 대문자/숫자)이어야 합니다." });
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
        "SELECT * FROM LICENSE_KEYS WHERE key = $1 AND NOT isdelete",
        [trimmedKey],
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
      }

      const created = await withTransaction(async (client) => {
        const result = await client.query<FullLicenseKeyRow>(
          "INSERT INTO LICENSE_KEYS (key, CATEGORY, VERSION) VALUES ($1, $2, $3) RETURNING *",
          [trimmedKey, category, version],
        );
        const row = result.rows[0];
        await recordHistory(client, row.no, "create");
        return row;
      });

      res.json(created);
    } catch (err) {
      // 23505 = unique_violation (중복 체크 통과 후 동시 요청으로 키가 먼저 삽입된 경우)
      if (err instanceof DatabaseError && err.code === "23505") {
        return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
      }
      console.error("데이터 등록 오류:", err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// PUT /items/:no
// 라이선스 정보 수정 (사용자 / 카테고리·버전 / 메모).
// - key는 필수. member/category/version/memo는 보내지 않으면 기존 값을 유지한다.
// - member/memo를 빈 문자열(또는 공백만)로 보내면 NULL로 지워진다 (member → 사용자 배정 해제).
// - category/version은 둘 중 하나라도 바뀌면 "바뀐 뒤의 조합"이 화이트리스트에 있어야 한다.
// 이력: 사용자가 바뀌면 assign/unassign, 카테고리·버전·메모가 바뀌면 edit(변경 요약 detail 포함).
// 둘 다 바뀌면 두 건이 모두 남는다.
// ─────────────────────────────────────────────
router.put(
  "/items/:no",
  async (
    req: Request<ItemParams, FullLicenseKeyRow | ApiErrorBody, UpdateItemBody>,
    res: Response<FullLicenseKeyRow | ApiErrorBody>,
  ) => {
    const { no } = req.params;
    const { key, member, category, version, memo } = req.body;
    const trimmedKey = key?.trim();
    // 공백만 입력된 값이 "사용 중"/"메모 있음"으로 보이지 않도록 trim 후 빈 값은 NULL로 저장한다.
    // undefined는 "변경 안 함"으로 구분해 둔다.
    const normalizedMember = member === undefined ? undefined : member.trim() || null;
    const normalizedMemo = memo === undefined ? undefined : memo.trim() || null;

    if (!isValidNo(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }
    if (!trimmedKey) {
      return res.status(400).json({ error: "라이선스 키는 필수 항목입니다." });
    }
    // 컬럼 길이(VARCHAR(100))를 넘기면 DB 에러(500)가 나므로 미리 400으로 돌려준다.
    // (PUT은 기존에 등록된 키를 그대로 다시 보내므로, 과거 형식의 키도 통과하도록 형식 검사는 하지 않는다.)
    if (trimmedKey.length > MAX_FIELD_LENGTH) {
      return res.status(400).json({ error: "라이선스 키가 너무 깁니다." });
    }
    if (normalizedMember && normalizedMember.length > MAX_FIELD_LENGTH) {
      return res.status(400).json({ error: `사용자명은 ${MAX_FIELD_LENGTH}자 이하로 입력해주세요.` });
    }
    if (normalizedMemo && normalizedMemo.length > MAX_MEMO_LENGTH) {
      return res.status(400).json({ error: `메모는 ${MAX_MEMO_LENGTH}자 이하로 입력해주세요.` });
    }

    try {
      const outcome = await withTransaction(async (client) => {
        // FOR UPDATE: 변경 전 값을 읽는 시점과 UPDATE 사이에 다른 요청이 끼어들지 않도록 행을 잠근다.
        const current = await client.query<{
          member: string | null;
          category: string | null;
          version: string | null;
          memo: string | null;
        }>(
          "SELECT member, category, version, memo FROM LICENSE_KEYS WHERE no = $1 AND NOT isdelete FOR UPDATE",
          [no],
        );
        if (current.rows.length === 0) return { kind: "not_found" as const };
        const before = current.rows[0];

        const next = {
          member: normalizedMember === undefined ? before.member : normalizedMember,
          category: category === undefined ? before.category : category,
          version: version === undefined ? before.version : version,
          memo: normalizedMemo === undefined ? before.memo : normalizedMemo,
        };

        // 카테고리/버전이 바뀌는 경우에만 화이트리스트 검사 (기존 데이터가 과거 값이어도 다른 필드 수정은 가능하도록)
        if (next.category !== before.category || next.version !== before.version) {
          if (!next.category || !CATEGORIES.includes(next.category)) {
            return { kind: "invalid" as const, error: "지원하지 않는 카테고리입니다." };
          }
          if (!next.version || !VERSION_OPTIONS[next.category].includes(next.version)) {
            return { kind: "invalid" as const, error: "선택한 카테고리에 없는 버전입니다." };
          }
        }

        const result = await client.query<FullLicenseKeyRow>(
          `UPDATE LICENSE_KEYS SET key = $1, member = $2, category = $3, version = $4, memo = $5
           WHERE no = $6 RETURNING *`,
          [trimmedKey, next.member, next.category, next.version, next.memo, no],
        );

        const memberAction = classifyMemberChange(before.member, next.member);
        if (memberAction) {
          await recordHistory(client, Number(no), memberAction, before.member, next.member);
        }
        const editDetail = describeEdit(before, next);
        if (editDetail) {
          await recordHistory(client, Number(no), "edit", null, null, editDetail);
        }

        return { kind: "updated" as const, row: result.rows[0] };
      });

      if (outcome.kind === "not_found") {
        return res.status(404).json({ error: "존재하지 않는 라이선스입니다." });
      }
      if (outcome.kind === "invalid") {
        return res.status(400).json({ error: outcome.error });
      }

      res.json(outcome.row);
    } catch (err) {
      // 23505 = unique_violation (다른 행이 이미 같은 key를 사용 중)
      if (err instanceof DatabaseError && err.code === "23505") {
        return res.status(400).json({ error: "이미 등록된 라이선스 키입니다." });
      }
      console.error(err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

// ─────────────────────────────────────────────
// DELETE /items/:no
// 소프트 삭제(Soft Delete) 방식 사용.
// 실제 행을 삭제하지 않고 isdelete = TRUE로 플래그만 설정 (+ deleted_at, "delete" 이력).
// 삭제된 키는 휴지통(GET /items/deleted)에서 확인하고 POST /items/:no/restore로 복구할 수 있다.
// 이력 보존 및 실수로 인한 영구 삭제 방지가 목적.
// 사용 중(member IS NOT NULL)인 키는 삭제할 수 없다 → 먼저 배정을 해제해야 한다.
// (프론트에서도 버튼을 막지만, API 직접 호출에 대비해 서버에서도 강제한다.)
// ─────────────────────────────────────────────
router.delete(
  "/items/:no",
  async (req: Request<ItemParams>, res: Response<ApiErrorBody | undefined>) => {
    const { no } = req.params;

    if (!isValidNo(no)) {
      return res.status(400).json({ error: "잘못된 요청입니다." });
    }

    try {
      const outcome = await withTransaction(async (client) => {
        const current = await client.query<{ member: string | null }>(
          "SELECT member FROM LICENSE_KEYS WHERE no = $1 AND NOT isdelete FOR UPDATE",
          [no],
        );
        if (current.rows.length === 0) return "not_found" as const;
        if (current.rows[0].member !== null) return "assigned" as const;

        await client.query(
          "UPDATE LICENSE_KEYS SET isdelete = TRUE, deleted_at = now() WHERE no = $1",
          [no],
        );
        await recordHistory(client, Number(no), "delete");
        return "deleted" as const;
      });

      if (outcome === "not_found") {
        return res.status(404).json({ error: "존재하지 않는 라이선스입니다." });
      }
      if (outcome === "assigned") {
        return res
          .status(409)
          .json({ error: "사용 중인 키는 삭제할 수 없습니다. 먼저 사용자 배정을 해제해주세요." });
      }

      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json(SERVER_ERROR);
    }
  },
);

export default router;
