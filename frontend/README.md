# Frontend

라이선스 관리 시스템의 웹 UI. React + TypeScript, Tailwind CSS로 작성된 싱글 페이지 앱(CRA/`react-scripts` 기반)이다.

## 기술 스택

- **React 18 + TypeScript**
- **Tailwind CSS 3** — 다크/라이트 모드 지원 (`darkMode: "class"`, `<html>`의 `dark` 클래스로 토글)
- **Radix UI** (`@radix-ui/react-*`) + **shadcn/ui 스타일** — Select/Dialog/AlertDialog/Label 등
  접근성 처리된 프리미티브를 Tailwind로 스타일링 (`components/ui/`)
- **sonner** — 토스트 알림
- **lucide-react** — 아이콘
- **Axios** — API 통신 (`src/api/`에서 한 곳으로 모아 관리)
- **Pretendard**(가변 폰트, 한글 지원) + **JetBrains Mono**(라이선스 키 등 고정폭 텍스트용)

## 폴더 구조

```
frontend/src/
├── api/                    # axios 호출 전부 여기로 (컴포넌트에서 axios 직접 호출 안 함)
│   ├── client.ts
│   └── items.ts
├── types/                  # 공용 타입 (Item, CategoryStat, SelectOption 등)
│   ├── item.ts
│   └── ui.ts
├── components/ui/          # 도메인과 무관한 범용 컴포넌트 (shadcn/ui 스타일 + Radix 프리미티브)
│   ├── Select.tsx / SelectField.tsx  # 네이티브 select를 대체하는 커스텀 드롭다운
│   ├── button.tsx, badge.tsx, input.tsx, label.tsx, skeleton.tsx, table.tsx
│   ├── dialog.tsx, alert-dialog.tsx  # Radix 기반 모달/확인창 프리미티브
│   ├── sonner.tsx           # 토스트 컨테이너 (실제 호출은 각 화면에서 `import { toast } from "sonner"`)
│   ├── ConfirmDialog.tsx    # alert-dialog를 감싼 삭제 확인 모달
│   └── PaginationComponent.tsx
├── features/licenses/      # 라이선스 관리 도메인 로직
│   ├── ItemList.tsx         # 메인 컴포넌트 (상태 관리, 통계 카드, 툴바)
│   ├── ItemListDisplay.tsx  # 테이블 렌더링, 인라인 편집(사용자명), 빈 상태
│   ├── RegisterModal.tsx    # 라이선스 등록 모달
│   └── SearchComponent.tsx  # 검색 필드 선택 + 검색어 입력
├── App.tsx                  # 헤더, 다크모드 토글, 연결 상태 배지
├── config.ts                 # API 서버 주소 (REACT_APP_API_URL)
├── index.css                 # Tailwind 베이스 + 라이트/다크 컬러 토큰(CSS 변수)
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

### 컬러 테마 (`index.css`)

주요 색상은 `:root`/`.dark` 블록의 CSS 변수(HSL)로 중앙 관리한다 (`--primary`, `--ring` 등).
Primary는 차분한 블루 계열(`217 91% 60%` / 다크 `213 94% 68%`)이며, 다크 모드의 아이콘·보더
호버 포인트로는 청록(cyan) 한 가지만 절제해서 사용한다. 과거에 있던 인디고→fuchsia→cyan
다색 그라디언트, 강한 블러 글로우, 진한 그림자 등 "네온사인" 톤은 정리했다 — 버튼/배지/탭 색상은
`components/ui`와 `features/licenses`의 컴포넌트 클래스에도 일부 하드코딩되어 있으므로, 색을
다시 바꿀 때는 `index.css`의 변수뿐 아니라 해당 컴포넌트들의 `blue-*`/`cyan-*` 클래스도 함께
확인해야 한다.

### Select (`components/ui/Select.tsx`, `SelectField.tsx`)

브라우저 기본 `<select>`는 옵션 목록(팝업)의 스타일을 CSS로 제어할 수 없어 다크 모드에서
배경만 어둡고 목록은 OS 기본 스타일로 뜨는 문제가 있었다. `@radix-ui/react-select` 프리미티브를
Tailwind 클래스로 스타일링한 래퍼로 대체했다 — 키보드 탐색, 바깥 클릭 시 닫힘, 포커스 복귀는
Radix가 처리하므로 별도 구현이 없다. `SelectField.tsx`는 `RegisterModal`(카테고리/버전 선택),
`SearchComponent`(검색 필드 선택)에서 쓰는 단순화된 옵션 배열 기반 래퍼.

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

### 테이블 열 너비 고정 (`components/ui/table.tsx`, `ItemListDisplay.tsx`)

`Table`은 `table-fixed` 레이아웃을 쓴다. 기본값인 `table-auto`는 열 너비를 **현재 화면에 보이는
행의 내용**으로 계산하기 때문에, 사용자명이 긴 행이 있는 페이지와 짧은 페이지 사이에서 카테고리/관리
칸 위치가 좌우로 흔들리는 문제가 있었다. 번호/카테고리/사용자/관리 칸에 고정 너비를 주고 "라이선스 키"
칸만 남은 공간을 흡수하도록 했고, 칸보다 긴 카테고리/사용자명은 늘어나는 대신 말줄임(`truncate`) +
`title` 툴팁으로 처리한다.

### 중복 요청 방지 (`ItemList.tsx`, `ItemListDisplay.tsx`, `RegisterModal.tsx`, `ConfirmDialog.tsx`)

등록/삭제/인라인 수정 저장은 각각 `isSubmitting`/`isDeleting`/`isSaving` 상태로 요청 진행 여부를
추적한다. 버튼을 연타하거나 입력창에서 Enter를 반복해도 요청 중에는 버튼이 비활성화되어("등록 중...",
"처리 중...") 같은 요청이 중복으로 나가지 않는다.

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
