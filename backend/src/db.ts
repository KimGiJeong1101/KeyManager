// db.ts
import "dotenv/config";
import { Pool } from "pg";

// ─────────────────────────────────────────────
// PostgreSQL 연결 풀 설정.
// Pool을 사용하면 요청마다 새 연결을 맺지 않고
// 기존 연결을 재사용해 성능을 높인다.
//
// DB_PASSWORD는 약한 기본값으로 조용히 폴백하지 않고,
// 설정이 없으면 즉시 에러를 던져 기동을 막는다(.env.example 참고).
// ─────────────────────────────────────────────
if (!process.env.DB_PASSWORD) {
  throw new Error(
    "DB_PASSWORD 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요 (.env.example 참고).",
  );
}

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432", 10),
});

// pg.Pool은 EventEmitter라서, 유휴 커넥션에서 에러(DB 재시작, 네트워크 끊김 등)가 나면
// 'error' 이벤트를 emit한다. 리스너가 없으면 Node가 unhandled exception으로 처리해
// 프로세스 전체가 죽으므로, 로그만 남기고 넘어가도록 핸들러를 반드시 등록해야 한다.
pool.on("error", (err) => {
  console.error("PostgreSQL 유휴 커넥션 에러:", err);
});

// ─────────────────────────────────────────────
// 서버 시작 시 테이블 자동 생성.
// IF NOT EXISTS 덕분에 이미 테이블이 있으면 무시됨.
//
// server.ts가 app.listen() 이전에 이 함수를 await해서, 완전히 새로운 DB에
// 처음 배포할 때 테이블이 채 생성되기 전에 요청이 들어와 "relation does not
// exist" 에러가 나는 경쟁 상태를 방지한다.
//
// 컬럼 설명:
//   no           - PK, 자동 증가 (SERIAL)
//   key          - 라이선스 키 문자열. 삭제되지 않은(isdelete=0) 행 사이에서만
//                  유일해야 하므로 컬럼 레벨 UNIQUE 대신 아래 partial unique index로 제약.
//                  → 소프트 삭제된 키는 이후 동일 값으로 재등록 가능.
//   member       - 배정된 사용자명. NULL/'사용자없음'/'' = 미배정 상태
//   isdelete     - 소프트 삭제 플래그 (0: 정상, 1: 삭제됨)
//   CATEGORY     - 제품 종류 (Windows / MS_Office / Hancom)
//   VERSION      - 세부 버전명 (예: "Windows 11 Pro")
//   search_vector- tsvector 타입. 현재는 미사용(향후 전문 검색 확장용)
// ─────────────────────────────────────────────
export async function initSchema(): Promise<void> {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS LICENSE_KEYS (
         no SERIAL PRIMARY KEY,
         key VARCHAR(100) NOT NULL,
         member VARCHAR(100) DEFAULT '사용자없음',
         isdelete INT DEFAULT 0,
         CATEGORY VARCHAR(50), -- 제품 종류 (WINDOWS, HANCOM 등)
         VERSION VARCHAR(50),  -- 세부 버전 (10 PRO, 2024 등)
         search_vector tsvector
       );
    `);

    // 과거 버전에서 생성된 컬럼 레벨 UNIQUE(key) 제약이 남아있다면 제거.
    // (이 제약이 있으면 삭제된 키를 재등록할 수 없음)
    await pool.query(`
      DO $$
      DECLARE
        con_name text;
      BEGIN
        SELECT conname INTO con_name
        FROM pg_constraint
        WHERE conrelid = 'license_keys'::regclass
          AND contype = 'u';

        IF con_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE LICENSE_KEYS DROP CONSTRAINT %I', con_name);
        END IF;
      END $$;
    `);

    // 삭제되지 않은 행(isdelete=0) 사이에서만 key 유일성을 강제하는 partial unique index.
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS license_keys_key_active_uidx
      ON LICENSE_KEYS (key)
      WHERE isdelete = 0;
    `);

    console.log("LICENSE_KEYS 테이블 확인 및 최신화 완료");
  } catch (error) {
    // 에러를 삼키고 넘어가면 서버가 "정상 기동"한 것처럼 보이지만 이후 모든 쿼리가
    // "relation does not exist" 등으로 조용히 실패한다. 호출자(server.ts)가 기동을
    // 중단할 수 있도록 다시 던진다.
    console.error("테이블 생성 중 오류가 발생했습니다:", error);
    throw error;
  }
}

export default pool;
