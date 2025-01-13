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
    await pool.query(`
       CREATE TABLE IF NOT EXISTS key_win10 (
        no SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        member VARCHAR(100) DEFAULT '사용자없음', 
        isdelete INT DEFAULT 0,
        search_vector tsvector
      );
    `);

    console.log("key_win10 테이블이 존재하는지 확인, 없으면 생성");
  } catch (error) {
    console.error("테이블 생성 중 오류가 발생했습니다:", error);
  }
})();

module.exports = pool;
