// db.js
const { Pool } = require("pg");

// ─────────────────────────────────────────────
// PostgreSQL 연결 풀 설정.
// Pool을 사용하면 요청마다 새 연결을 맺지 않고
// 기존 연결을 재사용해 성능을 높인다.
// ─────────────────────────────────────────────
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "admin",
  port: 5432,
});

// ─────────────────────────────────────────────
// 서버 시작 시 테이블 자동 생성 (IIFE 패턴).
// IF NOT EXISTS 덕분에 이미 테이블이 있으면 무시됨.
//
// 컬럼 설명:
//   no           - PK, 자동 증가 (SERIAL)
//   key          - 라이선스 키 문자열, UNIQUE 제약으로 중복 등록 방지
//   member       - 배정된 사용자명. NULL/'사용자없음'/'' = 미배정 상태
//   isdelete     - 소프트 삭제 플래그 (0: 정상, 1: 삭제됨)
//   CATEGORY     - 제품 종류 (Windows / MS_Office / Hancom)
//   VERSION      - 세부 버전명 (예: "Windows 11 Pro")
//   search_vector- tsvector 타입. 현재는 미사용(향후 전문 검색 확장용)
// ─────────────────────────────────────────────
(async () => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS LICENSE_KEYS (
         no SERIAL PRIMARY KEY,
         key VARCHAR(100) NOT NULL UNIQUE,
         member VARCHAR(100) DEFAULT '사용자없음',
         isdelete INT DEFAULT 0,
         CATEGORY VARCHAR(50), -- 제품 종류 (WINDOWS, HANCOM 등)
         VERSION VARCHAR(50),  -- 세부 버전 (10 PRO, 2024 등)
         search_vector tsvector
       );
    `);

    console.log("LICENSE_KEYS 테이블 확인 및 최신화 완료");
  } catch (error) {
    console.error("테이블 생성 중 오류가 발생했습니다:", error);
  }
})();

module.exports = pool;
