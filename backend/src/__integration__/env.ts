// 각 테스트 파일이 모듈을 불러오기 전에 실행된다 (jest setupFiles).
// db.ts의 커넥션 풀이 만들어지기 전에 DB_NAME을 테스트 DB로 바꿔 둔다.
// (db.ts의 dotenv는 이미 설정된 환경변수를 덮어쓰지 않으므로 여기서 바꾼 값이 유지된다)
import "dotenv/config";
import { testDbName } from "./test-db";

process.env.DB_NAME = testDbName();
