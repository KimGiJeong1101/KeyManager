/// <reference types="vite/client" />

// vite.config.ts의 define으로 빌드 시점에 package.json의 "version" 값이 들어간다.
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  // 백엔드 API 주소 (선택). 없으면 http://localhost:5000
  readonly REACT_APP_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
