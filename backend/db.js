// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "admin",
  port: 5432,
});

// 서버가 시작될 때 테이블 생성
(async () => {
  try {
    // 기존 LICENSE_KEYS 테이블 구조에 CATEGORY와 VERSION 추가
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
