/** @type {import('ts-jest').JestConfigWithTsJestConfigJson} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  // DB가 필요한 통합 테스트는 npm run test:integration으로 따로 실행한다 (jest.integration.config.js)
  testPathIgnorePatterns: ["/node_modules/", "/src/__integration__/"],
};
