// db.ts
import "dotenv/config";
import { Pool, PoolClient } from "pg";

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
//   key          - 라이선스 키 문자열. 삭제되지 않은(NOT isdelete) 행 사이에서만
//                  유일해야 하므로 컬럼 레벨 UNIQUE 대신 아래 partial unique index로 제약.
//                  → 소프트 삭제된 키는 이후 동일 값으로 재등록 가능.
//   member       - 배정된 사용자명. NULL = 미배정 상태 (빈 문자열/'사용자없음'은 아래에서 NULL로 정규화)
//   isdelete     - 소프트 삭제 플래그 BOOLEAN (false: 정상, true: 휴지통). 예전엔 INT(0/1)였음 → 아래에서 변환
//   CATEGORY     - 제품 종류 (Windows / MS_Office / Hancom)
//   VERSION      - 세부 버전명 (예: "Windows 11 Pro")
//   created_at   - 등록 시각. 이 컬럼 도입 이전에 등록된 행은 NULL(알 수 없음)
//   deleted_at   - 소프트 삭제 시각 (휴지통 정렬용). 이 컬럼 도입 이전에 삭제된 행은 NULL
//   memo         - 자유 메모 (PC명, 부서, 구매일 등). 최대 500자, 없으면 NULL
//
// LICENSE_KEY_HISTORY: 키별 등록/배정/해제/삭제/복구/완전삭제 이력 (감사 로그).
//   license_no    - 대상 키. 완전삭제(purge)되면 NULL이 되고(ON DELETE SET NULL) 이력 행은 남는다.
//   key_snapshot  - 기록 시점의 키 값. 완전삭제 후에도 "어떤 키였는지" 알 수 있도록 복사해 둔다.
//   original_no   - 대상 키의 no 사본. license_no와 달리 완전삭제돼도 NULL이 되지 않아, 완전삭제된 키의
//                   이력을 키 단위로 정확히 묶을 수 있다 (같은 키 값이 여러 번 등록·완전삭제된 경우에도).
//   action        - "create" | "assign" | "unassign" | "delete" | "restore" | "purge" (history.ts 참고)
//   member_before - 변경 전 사용자 (assign/unassign일 때만 의미 있음)
//   member_after  - 변경 후 사용자
//   detail        - "edit"(카테고리/버전/메모 변경) 이력의 변경 내용 요약 (history.ts describeEdit)
// ─────────────────────────────────────────────
export async function initSchema(): Promise<void> {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS LICENSE_KEYS (
         no SERIAL PRIMARY KEY,
         key VARCHAR(100) NOT NULL,
         member VARCHAR(100),
         isdelete BOOLEAN NOT NULL DEFAULT FALSE,
         CATEGORY VARCHAR(50), -- 제품 종류 (WINDOWS, HANCOM 등)
         VERSION VARCHAR(50)   -- 세부 버전 (10 PRO, 2024 등)
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

    // isdelete INT(0/1) → BOOLEAN 변환 (이미 BOOLEAN이면 아무것도 하지 않음).
    // partial unique index의 조건(isdelete = 0)이 컬럼 타입에 묶여 있어 타입을 바꾸기 전에 먼저 지우고,
    // 아래에서 새 조건(NOT isdelete)으로 다시 만든다. 전체가 한 문장(DO 블록)이라 중간에 실패하면 함께 롤백된다.
    await pool.query(`
      DO $$
      BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'license_keys' AND column_name = 'isdelete') = 'integer' THEN
          DROP INDEX IF EXISTS license_keys_key_active_uidx;
          ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete DROP DEFAULT;
          ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete TYPE BOOLEAN USING (COALESCE(isdelete, 0) <> 0);
          ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete SET DEFAULT FALSE;
          ALTER TABLE LICENSE_KEYS ALTER COLUMN isdelete SET NOT NULL;
        END IF;
      END $$;
    `);

    // 쓰이지 않는 전문 검색(full-text) 설정 정리.
    // 예전에 운영 DB에 수동으로 추가했던 search_vector 컬럼 + 이를 채우는 트리거 tsvectorupdate + 전용 GIN 인덱스.
    // 앱의 검색은 ILIKE(부분 일치)라 이 컬럼을 읽은 적이 없고, 단어 단위 검색이라 키 일부로는 찾을 수도 없었다.
    // - 트리거를 먼저 지워야 한다 (컬럼만 지우면 트리거가 없는 컬럼을 채우려다 모든 INSERT/UPDATE가 실패)
    // - 키/사용자명 데이터 자체는 건드리지 않는다. pg_trgm 인덱스(idx_key_trgm/idx_member_trgm)는 부분 일치 검색에
    //   쓸모가 있어 남긴다.
    // - 한 문장(DO 블록) = 한 트랜잭션: 중간에 실패하면 셋 다 원래대로 돌아간다. 이미 없으면 아무것도 하지 않는다.
    await pool.query(`
      DO $$
      BEGIN
        DROP TRIGGER IF EXISTS tsvectorupdate ON LICENSE_KEYS;
        DROP INDEX IF EXISTS idx_search_vector;
        ALTER TABLE LICENSE_KEYS DROP COLUMN IF EXISTS search_vector;
      END $$;
    `);

    // 과거 버전은 미배정 상태를 NULL / '' / '사용자없음' 세 가지로 저장했다.
    // 미배정 = NULL 하나로 통일해 조회/통계 조건이 한 가지 기준만 보도록 한다.
    await pool.query(`ALTER TABLE LICENSE_KEYS ALTER COLUMN member DROP DEFAULT`);
    await pool.query(`
      UPDATE LICENSE_KEYS SET member = NULL
      WHERE member IS NOT NULL AND (TRIM(member) = '' OR member = '사용자없음')
    `);

    // 삭제되지 않은(NOT isdelete) 행 사이에서만 key 유일성을 강제하는 partial unique index.
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS license_keys_key_active_uidx
      ON LICENSE_KEYS (key)
      WHERE NOT isdelete;
    `);

    // 등록/삭제 시각 컬럼. 기존 행에 "지금 시각"이 잘못 채워지지 않도록
    // 기본값 없이 컬럼을 추가한 뒤(기존 행 = NULL) 기본값을 따로 지정한다.
    await pool.query(`ALTER TABLE LICENSE_KEYS ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE LICENSE_KEYS ALTER COLUMN created_at SET DEFAULT now()`);
    await pool.query(`ALTER TABLE LICENSE_KEYS ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE LICENSE_KEYS ADD COLUMN IF NOT EXISTS memo VARCHAR(500)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS LICENSE_KEY_HISTORY (
        id            SERIAL PRIMARY KEY,
        license_no    INT REFERENCES LICENSE_KEYS(no) ON DELETE SET NULL,
        key_snapshot  VARCHAR(100),
        action        VARCHAR(20) NOT NULL,
        member_before VARCHAR(100),
        member_after  VARCHAR(100),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // 완전삭제 기능 도입 이전에 생성된 이력 테이블 보강:
    //   - key_snapshot 컬럼 추가 + 기존 행 채우기
    //   - license_no의 NOT NULL 해제 + FK를 ON DELETE SET NULL로 교체
    //     (키 행을 지워도 이력은 남기기 위함. 기존 FK는 삭제를 막는 NO ACTION이었음)
    await pool.query(`ALTER TABLE LICENSE_KEY_HISTORY ADD COLUMN IF NOT EXISTS key_snapshot VARCHAR(100)`);
    await pool.query(`ALTER TABLE LICENSE_KEY_HISTORY ADD COLUMN IF NOT EXISTS detail VARCHAR(500)`);
    await pool.query(`ALTER TABLE LICENSE_KEY_HISTORY ADD COLUMN IF NOT EXISTS original_no INT`);
    // 기존 이력 채우기. 이미 완전삭제된(license_no가 NULL이 된) 행은 원래 번호를 알 수 없어 NULL로 남는다
    // → 그런 행은 key_snapshot으로 묶는다 (GET /items/purged/:id/history 참고).
    await pool.query(`
      UPDATE LICENSE_KEY_HISTORY SET original_no = license_no
      WHERE original_no IS NULL AND license_no IS NOT NULL
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS license_key_history_original_no_idx
      ON LICENSE_KEY_HISTORY (original_no)
    `);
    await pool.query(`
      UPDATE LICENSE_KEY_HISTORY h SET key_snapshot = k.key
      FROM LICENSE_KEYS k
      WHERE h.license_no = k.no AND h.key_snapshot IS NULL
    `);
    await pool.query(`ALTER TABLE LICENSE_KEY_HISTORY ALTER COLUMN license_no DROP NOT NULL`);
    await pool.query(`
      DO $$
      DECLARE
        fk record;
      BEGIN
        FOR fk IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'license_key_history'::regclass
            AND contype = 'f'
            AND confdeltype <> 'n'  -- 'n' = SET NULL. 이미 SET NULL이면 건드리지 않는다.
        LOOP
          EXECUTE format('ALTER TABLE LICENSE_KEY_HISTORY DROP CONSTRAINT %I', fk.conname);
          ALTER TABLE LICENSE_KEY_HISTORY
            ADD CONSTRAINT license_key_history_license_no_fkey
            FOREIGN KEY (license_no) REFERENCES LICENSE_KEYS(no) ON DELETE SET NULL;
        END LOOP;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS license_key_history_license_no_idx
      ON LICENSE_KEY_HISTORY (license_no, created_at DESC);
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

// 여러 쿼리를 하나의 트랜잭션으로 묶는다 (예: 키 상태 변경 + 이력 기록).
// fn이 던지면 ROLLBACK 후 같은 에러를 다시 던지므로, 호출부의 기존 에러 처리(23505 등)가 그대로 동작한다.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
