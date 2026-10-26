// Vite 설정 (개발 서버 / 빌드) + Vitest 설정 (테스트).
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 앱 버전의 단일 소스는 package.json의 "version" → 푸터에 표시 (src/config.ts APP_VERSION)
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  // CRA 시절의 환경변수 이름(REACT_APP_API_URL 등)을 그대로 쓴다 → 기존 .env를 바꿀 필요 없음
  envPrefix: "REACT_APP_",
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    // CRA와 같은 3000번 포트 (README/백엔드 안내와 맞춤). PORT 환경변수로 바꿀 수 있다.
    port: Number(process.env.PORT) || 3000,
  },
  build: {
    // CRA와 같은 출력 폴더 (.gitignore의 /build 그대로 사용)
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    css: false,
  },
});
