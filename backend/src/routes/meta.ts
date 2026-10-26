// routes/meta.ts — 서버 상태 / 카테고리 화이트리스트
import { Router, Request, Response } from "express";
import pool from "../db";
import { VERSION_OPTIONS } from "../constants";
import { CategoryVersionsResponse } from "../types";

const router = Router();

// ─────────────────────────────────────────────
// GET /health
// 프론트엔드의 연결 상태 배지에서 주기적으로 호출.
// DB 쿼리까지 통과해야 "연결됨"으로 표시됨.
// ─────────────────────────────────────────────
router.get("/health", async (_req: Request, res: Response) => {
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
router.get(
  "/categories",
  (_req: Request, res: Response<CategoryVersionsResponse>) => {
    res.json(VERSION_OPTIONS);
  },
);

export default router;
