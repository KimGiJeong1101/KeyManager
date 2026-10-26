// server.ts
// 서버 기동 진입점: 스키마 초기화 → listen, 종료 시그널 처리. 라우트는 app.ts에 있다.
import app from "./app";
import pool, { initSchema } from "./db";

const PORT = process.env.PORT || 5000;

// 테이블/인덱스 생성이 끝난 뒤에 요청을 받기 시작해야, 완전히 새로운 DB에 처음
// 배포할 때 "relation does not exist" 에러를 방지할 수 있다.
let server: ReturnType<typeof app.listen>;

initSchema()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // 스키마 초기화가 실패한 상태로 기동하면 이후 모든 요청이 "relation does not
    // exist" 등으로 조용히 실패하므로, 리스닝을 시작하지 않고 즉시 종료한다.
    console.error("스키마 초기화 실패로 서버를 시작할 수 없습니다:", err);
    pool.end().finally(() => process.exit(1));
  });

function shutdown() {
  if (!server) {
    pool.end().finally(() => process.exit(0));
    return;
  }
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
