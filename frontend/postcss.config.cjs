// postcss.config.cjs
// Tailwind CSS 3 + autoprefixer. (CRA는 이 파일을 무시하고 자체 설정을 썼지만, Vite는 이 파일을 그대로 읽는다)
// package.json이 "type": "module"이라 CommonJS 문법(module.exports)을 쓰는 설정 파일은 .cjs 확장자를 쓴다.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
