// 각 통합 테스트 파일 공통 수명주기 (jest setupFilesAfterEnv).
//   전체 시작: 스키마 생성/마이그레이션 (server.ts가 기동 시 하는 것과 동일)
//   테스트마다: 테이블 비우기
//   전체 끝: 커넥션 풀 종료 (열린 핸들 때문에 jest가 끝나지 않는 것을 방지)
import pool, { initSchema } from "../db";
import { resetDb } from "./helpers";

beforeAll(async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  await initSchema();
  log.mockRestore();
});

beforeEach(resetDb);

afterAll(async () => {
  await pool.end();
});
