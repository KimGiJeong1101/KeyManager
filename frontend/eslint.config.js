// ESLint 설정 (flat config). CRA에 내장돼 있던 "react-app" 설정을 대신한다.
//   - JS/TS 기본 권장 규칙 (@eslint/js, typescript-eslint)
//   - React Hooks 규칙 (rules-of-hooks, exhaustive-deps)
//   - Vite HMR이 컴포넌트 상태를 유지할 수 있도록 컴포넌트 파일은 컴포넌트 위주로 export (react-refresh)
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // shadcn/ui 스타일 컴포넌트는 컴포넌트와 함께 스타일 변형(buttonVariants 등)을 export하는 것이 관례
    files: ["src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
);
