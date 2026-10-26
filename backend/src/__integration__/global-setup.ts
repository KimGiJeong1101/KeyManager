// 통합 테스트 전체 시작 전 1회: 테스트 DB가 없으면 만든다 (같은 PostgreSQL 서버, .env의 접속 정보 사용).
import "dotenv/config";
import { Client } from "pg";
import { testDbName } from "./test-db";

export default async function globalSetup(): Promise<void> {
  const dbName = testDbName();
  // 관리용 연결은 .env의 원래 DB(보통 postgres)로 맺는다. 이 연결로는 CREATE DATABASE만 한다.
  const admin = new Client({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "postgres",
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || "5432", 10),
  });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      // 식별자는 파라미터 바인딩이 안 되므로 이름을 검증된 형태(영문/숫자/_)로만 허용한다
      if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error(`허용되지 않는 DB 이름: ${dbName}`);
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`\n[integration] 테스트 DB 생성: ${dbName}`);
    }
  } finally {
    await admin.end();
  }
}
