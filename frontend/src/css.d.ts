// react-scripts가 제공하는 타입 선언(react-app-env.d.ts 참고)은 *.module.css(CSS Modules)만
// 선언하고, 일반 *.css 사이드이펙트 임포트(예: import './index.css')는 선언하지 않는다.
// TypeScript 6.0부터 noUncheckedSideEffectImports 기본값이 true가 되어, 선언되지 않은
// 사이드이펙트 임포트는 TS2882 에러로 처리된다. 이 프로젝트가 실제로 사용하는
// TypeScript 버전(호환 범위)에서는 아직 이 검사가 없어 안전하지만, 에디터가 더 최신 TS로
// 검사하는 경우까지 대비해 명시적으로 선언해둔다.
declare module "*.css";
