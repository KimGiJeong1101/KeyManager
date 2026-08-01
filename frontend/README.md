# Frontend

라이선스 관리 시스템의 웹 UI. React + TypeScript, Tailwind CSS로 작성된 싱글 페이지 앱(CRA/`react-scripts` 기반)이다.

## 기술 스택

- **React 18 + TypeScript**
- **Tailwind CSS 3** — 다크/라이트 모드 지원 (`darkMode: "class"`, `<html>`의 `dark` 클래스로 토글)
- **MUI Icons** — 아이콘만 사용 (MUI 컴포넌트 자체는 쓰지 않음)
- **Axios** — API 통신 (`src/api/`에서 한 곳으로 모아 관리)
- **Pretendard**(가변 폰트, 한글 지원) + **JetBrains Mono**(라이선스 키 등 고정폭 텍스트용)

## 폴더 구조

```
frontend/src/
├── api/                    # axios 호출 전부 여기로 (컴포넌트에서 axios 직접 호출 안 함)
│   ├── client.ts
│   └── items.ts
├── types/                  # 공용 타입 (Item, CategoryStat, ToastMessage, SelectOption 등)
│   ├── item.ts
│   └── ui.ts
├── hooks/
│   └── useModalBehavior.ts # 모달 공통 동작(포커스 트랩, 배경 스크롤 잠금, ESC/배경 클릭 닫기)
├── components/ui/          # 도메인과 무관한 범용 컴포넌트
│   ├── Select.tsx          # 네이티브 select를 대체하는 커스텀 드롭다운
│   ├── Toast.tsx
│   ├── ConfirmDialog.tsx
│   └── PaginationComponent.tsx
├── features/licenses/      # 라이선스 관리 도메인 로직
│   ├── ItemList.tsx         # 메인 컴포넌트 (상태 관리, 통계 카드, 툴바)
│   ├── ItemListDisplay.tsx  # 테이블 렌더링, 인라인 편집(사용자명), 빈 상태
│   ├── RegisterModal.tsx    # 라이선스 등록 모달
│   └── SearchComponent.tsx  # 검색 필드 선택 + 검색어 입력
├── App.tsx                  # 헤더, 다크모드 토글, 연결 상태 배지
├── config.ts                 # API 서버 주소 (REACT_APP_API_URL)
└── css.d.ts                  # 일반 *.css 사이드이펙트 import에 대한 앰비언트 선언
```

## 실행 방법

### 사전 요구사항

**Node.js 18.18 이상** (권장: 현재 Active LTS 버전)

### 설치 및 실행

```bash
npm install
npm start          # http://localhost:3000
npm run build      # 배포용 정적 빌드 (build/)
npm test           # Jest + Testing Library
```

백엔드가 `http://localhost:5000`이 아닌 다른 주소로 실행 중이라면
`.env.example`을 복사해 `.env`로 저장하고 `REACT_APP_API_URL`을 설정한다.

## 주요 UI/기능 설명

### 다크/라이트 모드 (`App.tsx`)

우측 상단 토글 버튼으로 전환하며, 선택값은 `localStorage`(`km-theme`)에 저장되어 다음 방문에도 유지된다.
기본값은 다크 모드.

### 커스텀 Select (`components/ui/Select.tsx`)

브라우저 기본 `<select>`는 옵션 목록(팝업)의 스타일을 CSS로 제어할 수 없어 다크 모드에서
배경만 어둡고 목록은 OS 기본 스타일로 뜨는 문제가 있었다. 키보드 탐색(방향키/Home/End/Enter/Esc),
바깥 클릭 시 닫힘까지 지원하는 커스텀 드롭다운으로 대체했다. 카테고리/버전 선택(`RegisterModal`),
검색 필드 선택(`SearchComponent`)에서 사용.

> 옵션을 마우스로 선택하면 트리거 버튼으로 포커스를 명시적으로 되돌린다 — 그렇지 않으면 포커스가
> `body`로 빠져나가 모달이 열린 상태에서 `Escape`가 먹히지 않는 버그가 있었다.

### 라이선스 등록 모달 (`features/licenses/RegisterModal.tsx`)

원래는 화면에 항상 펼쳐져 있던 인라인 폼이었으나, 테이블을 화면 상단으로 끌어올리기 위해
"+ 새 라이선스" 버튼 클릭 시 여는 모달로 전환했다. 25자리 키는 5글자씩 5칸으로 분리 입력받는다.

- 영문자/숫자만 허용(`/^[A-Za-z0-9]{0,5}$/`), 소문자 자동 대문자 변환
- 5글자 완성 시 다음 칸 자동 포커스, 빈 칸에서 Backspace 시 이전 칸으로 이동
- 등록 시 `keys.join("-")`으로 `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX` 형식으로 합쳐 전송

### 통계 카드 호버 애니메이션 (`features/licenses/ItemList.tsx`)

Tailwind의 `group` / `group-hover` 조합으로 순수 CSS 슬라이드 애니메이션을 구현.
기본 뷰는 위로 사라지고(`-translate-y-3 + opacity-0`), 호버 뷰는 아래에서 슬라이드 업
(`translate-y-full → translate-y-0`)한다. 터치 기기는 hover가 없어 클릭으로도 토글 가능.
우측 하단의 작은 셰브론 아이콘은 "펼쳐볼 수 있다"는 발견성 힌트.

### 페이지네이션 그룹 (`components/ui/PaginationComponent.tsx`)

페이지 번호를 `pagesToShow(=5)` 단위로 그룹화해 표시한다.

```
currentGroupFirstPage = floor((currentPage - 1) / pagesToShow) * pagesToShow + 1
```

예) currentPage=7, pagesToShow=5 → 그룹 시작: `floor(6/5)*5+1 = 6` → 6~10 표시

### 빈 상태 구분 (`features/licenses/ItemListDisplay.tsx`)

목록이 0건일 때, "검색/필터 때문에 안 보이는 것"과 "애초에 데이터가 없는 것"을 구분해서
서로 다른 안내 문구 + 액션 버튼("필터 초기화" / "새 라이선스 등록")을 보여준다.

## 트러블슈팅

### 에디터에 tsconfig.json 관련 빨간줄이 뜰 때

VSCode가 워크스페이스의 로컬 TypeScript(`node_modules/typescript`)가 아니라 자체 내장된
최신 버전을 사용 중일 가능성이 크다. `Ctrl+Shift+P` → **TypeScript: Select TypeScript Version**
→ **Use Workspace Version**으로 맞추면 실제 프로젝트가 쓰는 버전과 동일한 진단을 보게 된다.

### `*.css` import에서 "Cannot find module" (TS2882)

TypeScript 6.0부터 `noUncheckedSideEffectImports`가 기본 `true`가 되어, 선언되지 않은
사이드이펙트 import(`import './index.css'` 등)를 에러로 처리한다. CRA 기본 타입 선언은
`*.module.css`(CSS Modules)만 선언하고 일반 `*.css`는 선언하지 않아서 생기는 문제로,
`src/css.d.ts`에 `declare module "*.css";`를 추가해 해결해뒀다.

### `npm install` 시 ERESOLVE 에러

`react-scripts@5.0.1`은 `typescript` peerDependency를 `^3.2.1 || ^4`로 선언하지만, 이 프로젝트는
의도적으로 typescript 5.x를 사용한다(빌드/테스트/런타임 검증 완료). `.npmrc`의
`legacy-peer-deps=true`가 이 알려진 불일치를 우회하도록 이미 설정되어 있다.

### 카테고리 통계가 갱신되지 않을 때

통계(`fetchCategoryStats`)는 마운트 시 1회 + 등록/삭제/수정 완료 후에만 호출된다.
페이지 이동이나 검색 조건 변경 시에는 통계를 재조회하지 않는다 (의도된 동작).
