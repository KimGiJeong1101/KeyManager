// 통합 테스트용 DB 이름 결정 (env.ts / global-setup.ts 공용).
// 기본값: .env의 DB_NAME 뒤에 "_test"를 붙인 이름 (예: postgres → postgres_test). TEST_DB_NAME으로 바꿀 수 있다.
// 테스트는 매번 테이블을 비우므로(TRUNCATE), 실수로 실제 DB를 가리키지 않도록 이름이 "_test"로 끝나야만 진행한다.
export function testDbName(): string {
  const name = process.env.TEST_DB_NAME || `${process.env.DB_NAME || "postgres"}_test`;
  if (!name.endsWith("_test")) {
    throw new Error(
      `통합 테스트 DB 이름은 "_test"로 끝나야 합니다 (현재: ${name}). 실제 데이터를 지우지 않기 위한 안전장치입니다.`,
    );
  }
  return name;
}
