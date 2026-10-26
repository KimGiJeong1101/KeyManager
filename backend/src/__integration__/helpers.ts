// 통합 테스트 공용 헬퍼.
import request from "supertest";
import app from "../app";
import pool from "../db";

export const api = () => request(app);

// 테스트마다 깨끗한 상태에서 시작한다. 혹시라도 실제 DB에 붙어 있으면 지우기 전에 멈춘다.
export async function resetDb(): Promise<void> {
  const { rows } = await pool.query<{ db: string }>("SELECT current_database() AS db");
  if (!rows[0].db.endsWith("_test")) {
    throw new Error(`테스트 DB가 아닌 곳(${rows[0].db})을 비우려고 했습니다. 중단합니다.`);
  }
  await pool.query("TRUNCATE LICENSE_KEY_HISTORY, LICENSE_KEYS RESTART IDENTITY CASCADE");
}

// 테스트용 키 생성: n번째 키 → "TEST0-00000-00000-00000-0000n" 형식 (5x5)
export const testKey = (n: number) => `TEST0-00000-00000-00000-${String(n).padStart(5, "0")}`;

export async function createKey(
  n: number,
  category = "Windows",
  version = "Windows 10 Pro",
): Promise<{ no: number; key: string }> {
  const res = await api().post("/items").send({ key: testKey(n), category, version }).expect(200);
  return { no: res.body.no, key: res.body.key };
}

export async function historyActions(no: number): Promise<string[]> {
  const res = await api().get(`/items/${no}/history`).expect(200);
  // 응답은 최신순 → 시간순으로 뒤집어 읽기 쉽게
  return res.body.map((h: { action: string }) => h.action).reverse();
}
