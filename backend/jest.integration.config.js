// 통합 테스트 설정 (npm run test:integration).
// 실제 PostgreSQL의 별도 테스트 DB(기본: <DB_NAME>_test)에 붙어 API를 끝까지 호출한다.
// 테스트 DB는 없으면 자동으로 만들고, 테스트마다 테이블을 비운다 → 실제 데이터 DB는 건드리지 않는다.
/** @type {import('ts-jest').JestConfigWithTsJestConfigJson} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/__integration__/**/*.test.ts"],
  globalSetup: "<rootDir>/src/__integration__/global-setup.ts",
  setupFiles: ["<rootDir>/src/__integration__/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/__integration__/lifecycle.ts"],
  // 같은 테스트 DB를 공유하므로 파일들을 순서대로 실행한다
  maxWorkers: 1,
};
