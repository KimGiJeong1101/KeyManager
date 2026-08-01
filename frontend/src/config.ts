// config.ts
// API 서버 주소를 한 곳에서 관리한다.
// .env(REACT_APP_API_URL)로 오버라이드 가능 (예: 배포 환경에서 다른 포트/도메인 사용 시).
export const API_BASE_URL: string =
  process.env.REACT_APP_API_URL || "http://localhost:5000";
