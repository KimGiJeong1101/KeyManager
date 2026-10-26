// config.ts
// API 서버 주소를 한 곳에서 관리한다.
// .env(REACT_APP_API_URL)로 오버라이드 가능 (예: 배포 환경에서 다른 포트/도메인 사용 시).
// Vite는 vite.config.ts의 envPrefix("REACT_APP_")로 시작하는 변수만 import.meta.env로 노출한다.
export const API_BASE_URL: string =
  import.meta.env.REACT_APP_API_URL || "http://localhost:5000";

// 앱 버전: package.json의 "version" (vite.config.ts의 define이 빌드 시점에 넣어준다).
export const APP_VERSION: string = __APP_VERSION__;
