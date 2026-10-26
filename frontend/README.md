# Frontend

라이선스 관리 시스템의 웹 UI. React + TypeScript, Tailwind CSS로 작성된 싱글 페이지 앱이다. 빌드 도구는 **Vite**, 테스트는 **Vitest** (예전 CRA/`react-scripts`에서 이전).

## 기술 스택

- **React 18 + TypeScript**
- **Vite** (개발 서버/빌드) + **Vitest** + Testing Library (테스트) + **ESLint 9** (flat config, `eslint.config.js`)
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
│   ├── ItemList.tsx         # 메인 컴포넌트 (상태 관리, 툴바, 모달 연결)
│   ├── StatCards.tsx        # 상단 통계 카드 3개 (호버/탭 시 카테고리별 상세)
│   ├── LowStockAlert.tsx    # 재고 부족 경고 띠 (남은 키가 적은 버전)
│   ├── ItemListDisplay.tsx  # 목록 렌더링 (md 이상 표 / md 미만 카드), 빈 상태
│   ├── RegisterModal.tsx    # 라이선스 등록 모달 (5칸 키 입력, 전체 키 붙여넣기)
│   ├── SearchComponent.tsx  # 검색 필드 선택 + 검색어 입력
│   ├── HistoryDialog.tsx    # 키별 이력 타임라인
│   ├── TrashDialog.tsx      # 휴지통 (복구 / 완전삭제)
│   ├── PurgeConfirmDialog.tsx # 완전삭제 확인 (키 마지막 5자리 따라쓰기 입력)
│   ├── EditItemDialog.tsx   # 정보 수정 모달 (사용자 / 카테고리·버전 / 메모)
│   └── CsvDialog.tsx        # CSV 내보내기 / 가져오기(미리보기 → 일괄 등록)
├── lib/                    # 화면과 분리된 순수 함수 (대부분 *.test.ts로 단위 테스트)
│   ├── categories.ts        # 카테고리 표시명/색상 메타데이터, 사용자 배정 여부 판단
│   ├── csv.ts               # CSV 파싱, 헤더→필드 매핑, UTF-8/CP949 디코딩, 가져오기 양식
│   ├── licenseKey.ts        # 붙여넣은 전체 키를 5칸에 나눠 채우기
│   ├── stock.ts             # 재고 부족 판단 (LOW_STOCK_THRESHOLD)
│   ├── pagination.ts        # 삭제 후 현재 페이지가 사라졌을 때 유효한 페이지로 보정
│   ├── format.ts            # 날짜 표시 (YYYY-MM-DD HH:mm)
│   └── utils.ts             # cn() (clsx + tailwind-merge)
├── App.tsx                  # 헤더, 다크모드 토글, 연결 상태 배지, 푸터(앱 버전)
├── config.ts                 # API 서버 주소 (REACT_APP_API_URL), 앱 버전 (package.json version)
├── vite-env.d.ts             # import.meta.env / __APP_VERSION__ 타입 선언
├── index.css                 # Tailwind 베이스 + 라이트/다크 컬러 토큰(CSS 변수)
└── css.d.ts                  # 일반 *.css 사이드이펙트 import에 대한 앰비언트 선언
```

## 실행 방법

### 사전 요구사항

**Node.js 20.19 이상** (Vite 8 요구사항. 권장: 현재 Active LTS 버전)

### 설치 및 실행

```bash
npm install
npm run dev        # 개발 서버 http://localhost:3000 (npm start도 같음). PORT 환경변수로 포트 변경
npm run build      # 타입 체크 + 배포용 정적 빌드 (build/)
npm run preview    # 빌드 결과를 로컬에서 미리보기
npm test           # Vitest 1회 실행 (npm run test:watch: 변경 감지 모드)
npm run lint       # ESLint
```

설정 파일: `vite.config.ts`(개발 서버·빌드·Vitest), `eslint.config.js`, `postcss.config.cjs`, `tailwind.config.cjs`.
진입 HTML은 `public/`이 아니라 프로젝트 루트의 `index.html`이고, `public/`의 파일(favicon 등)은 `/` 경로로 그대로 제공된다.

백엔드가 `http://localhost:5000`이 아닌 다른 주소로 실행 중이라면
`.env.example`을 복사해 `.env`로 저장하고 `REACT_APP_API_URL`을 설정한다.

환경변수 이름은 CRA 시절의 `REACT_APP_` 접두사를 그대로 쓴다 (`vite.config.ts`의 `envPrefix`).
코드에서는 `process.env`가 아니라 `import.meta.env.REACT_APP_API_URL`로 읽는다.

푸터의 앱 버전은 `package.json`의 `"version"`을 단일 소스로 쓴다 (`vite.config.ts`가 빌드 시점에
`__APP_VERSION__`으로 넣어준다). 버전을 올릴 때는 `package.json`만 고치면 된다.

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
- **전체 키 붙여넣기**: `XXXXX-XXXXX-...` 또는 하이픈 없는 25자리를 아무 칸에나 붙여넣으면 그 칸부터
  5자씩 나눠 채운다 (`lib/licenseKey.ts`). 영문/숫자 5자 이하는 브라우저 기본 붙여넣기에 맡긴다.
- 등록 시 `keys.join("-")`으로 `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX` 형식으로 합쳐 전송

### 키 검색 (하이픈 무시)

DB에는 키가 하이픈 포함 형식으로 저장되지만, 검색은 하이픈/공백을 무시한다
(서버 `query-builder.ts`에서 `REPLACE(key, '-', '') ILIKE ...`). `QDXC72DG`처럼 칸 경계를 걸친
검색어로도 `XDCQD-XC72D-...`를 찾을 수 있다.

### 반응형 목록 (`features/licenses/ItemListDisplay.tsx`)

| 화면 폭 | 레이아웃 |
|---|---|
| `lg` 이상 (≥1024px) | 표: 번호 / 키 / 카테고리 / 사용자 / 관리 |
| `md`~`lg` (768~1023px) | 표: 번호·카테고리 열을 숨기고 카테고리 배지를 키 아래로 → 키가 줄바꿈되지 않음 |
| `md` 미만 (<768px) | 카드 목록 |

키 / 사용자(배지·편집 입력칸) / 관리 버튼은 `renderKey`·`renderMember`·`renderActions` 헬퍼를 표와 카드가
함께 쓴다. 번호 열이 숨겨지는 구간에서는 `first:` 둥근 모서리가 숨겨진 셀에 걸리므로, 키 셀에
`max-lg:rounded-l-xl max-lg:border-l`을 따로 준다.

### 정보 수정 모달 (`EditItemDialog.tsx`)

각 행의 ✏️ 버튼. 사용자 / 카테고리·버전 / 메모를 한 번에 수정한다 (예전의 사용자명 인라인 편집을 대체).
- 키 값 자체는 수정 대상이 아니다 (오타는 삭제 후 재등록 → 중복 검증을 다시 거치도록).
- 카테고리를 바꾸면 버전을 다시 골라야 저장할 수 있다. 바뀐 게 없으면 저장 버튼이 꺼져 있다.
- 화이트리스트에 없는 과거 카테고리/버전도 현재 값으로 그대로 보여주며, 그대로 두고 다른 필드만 고칠 수 있다.
- Enter로 저장, 메모 칸(여러 줄)은 Ctrl+Enter로 저장.
- 메모가 있으면 목록에서 버전 옆에 📝 아이콘과 한 줄 요약으로 보인다 (전체는 툴팁). 검색 필드 "메모" 또는 "전체" 검색으로 찾을 수 있다.

### 이력 / 휴지통 / 완전삭제

- **이력** (`HistoryDialog.tsx`): 각 행의 🕘 버튼. 등록·배정·해제·정보 수정·삭제·복구·완전삭제를 시각과 함께 타임라인으로
  보여준다. 이력 기능 도입 이전에 등록된 키는 "그 이전 기록은 없음"을 안내한다.
- **휴지통** (`TrashDialog.tsx`): 툴바의 보관함 아이콘. 두 탭으로 나뉜다.
  - "휴지통": 삭제된 키를 최근 삭제 순으로 보고 이력 확인 / 복구 / 완전삭제. 같은 키가 이미 다시 등록돼 있으면 복구는 서버가 409로 거부한다.
  - "완전삭제 기록": 완전삭제된 키 목록과 각 키의 이력. 키 행은 없지만 이력이 키 값 사본과 함께 남아 있어 감사 기록으로 볼 수 있다.
  - 이력 모달(`HistoryDialog`)은 "어떻게 불러올지(load)"를 받는 형태라 목록·휴지통·완전삭제 기록에서 같은 컴포넌트를 쓴다.
- **완전삭제** (`PurgeConfirmDialog.tsx`): 휴지통 안에서만 가능. 키 마지막 5자리를 직접 입력해야 버튼이 켜진다.
  입력칸은 "따라쓰기" 방식 — 입력할 글자가 회색으로 깔려 있고, 맞게 친 글자는 진하게, 틀린 글자는 빨간색으로
  덮어 보여준다. 실제 `<input>` 글자는 투명하게 두고 같은 글꼴/여백의 오버레이가 색을 입혀 그리므로,
  커서·선택·붙여넣기 등 기본 동작은 그대로다.

### CSV 내보내기 / 가져오기 (`CsvDialog.tsx`, `lib/csv.ts`)

- **내보내기**: "현재 목록"(탭·상태·검색 조건 그대로) 또는 "전체 목록". 서버가 BOM 포함 UTF-8 CSV를 내려주므로
  엑셀에서 바로 열어도 한글이 깨지지 않는다.
- **가져오기**: 파일 선택 → 서버 검증(dryRun) 미리보기 → "N건 등록". 오류 행은 엑셀 행 번호와 이유를 보여주고
  등록에서 제외한다. 정상 행은 한 트랜잭션으로 전부 등록되거나 전부 롤백된다.
  - 헤더 이름으로 열을 찾는다 (필수: 라이선스 키·카테고리·버전 / 선택: 사용자, 띄어쓰기·영문 헤더 허용).
    모르는 열(번호, 등록일 등)은 무시하므로 내보낸 파일을 그대로 다시 가져올 수 있다.
  - 인코딩: UTF-8로 엄격하게 읽어보고 실패하면 CP949(EUC-KR)로 다시 읽는다. 한국어 윈도우 엑셀의 기본
    "CSV (쉼표로 분리)" 저장이 CP949이기 때문.
  - 상단 "양식 내려받기"로 헤더 + 예시 1행짜리 양식을 받을 수 있다.

### 재고 부족 경고 (`LowStockAlert.tsx`, `lib/stock.ts`)

통계 카드 아래에, 남은(미사용) 키가 `LOW_STOCK_THRESHOLD`(기본 1)개 이하인 버전을 칩으로 보여준다.
0개는 빨간 "소진", 그 외는 주황 "N개 남음". 키가 한 건도 등록되지 않은 버전은 대상이 아니다.
통계와 같은 시점(마운트, 등록/수정/삭제/복구/가져오기 후)에 `GET /items/version-stats`로 함께 갱신된다.
기준을 바꾸려면 `lib/stock.ts`의 `LOW_STOCK_THRESHOLD`만 고치면 된다.

### 통계 카드 호버 애니메이션 (`features/licenses/StatCards.tsx`)

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

### 중복 요청 방지 (`ItemList.tsx`, `EditItemDialog.tsx`, `RegisterModal.tsx`, `ConfirmDialog.tsx`)

등록/삭제/정보 수정 저장(`EditItemDialog`)은 각각 `isSubmitting`/`isDeleting`/`isSaving` 상태로 요청 진행 여부를
추적한다. 버튼을 연타하거나 입력창에서 Enter를 반복해도 요청 중에는 버튼이 비활성화되어("등록 중...",
"처리 중...") 같은 요청이 중복으로 나가지 않는다.

### 목록 요청 경쟁 방지 (`ItemList.tsx` `latestFetchId`)

탭/필터를 빠르게 바꾸면 이전 조건의 응답이 나중에 도착해 최신 결과를 덮어쓸 수 있다.
요청마다 순번을 매기고, 가장 마지막에 보낸 요청의 응답만 화면에 반영한다.
이력/휴지통 모달의 조회도 같은 이유로 `cancelled` 플래그로 늦게 온 응답을 버린다.

## 트러블슈팅

### 에디터에 tsconfig.json 관련 빨간줄이 뜰 때

VSCode가 워크스페이스의 로컬 TypeScript(`node_modules/typescript`)가 아니라 자체 내장된
최신 버전을 사용 중일 가능성이 크다. `Ctrl+Shift+P` → **TypeScript: Select TypeScript Version**
→ **Use Workspace Version**으로 맞추면 실제 프로젝트가 쓰는 버전과 동일한 진단을 보게 된다.

### `*.css` import에서 "Cannot find module" (TS2882)

TypeScript 6.0부터 `noUncheckedSideEffectImports`가 기본 `true`가 되어, 선언되지 않은
사이드이펙트 import(`import './index.css'` 등)를 에러로 처리한다. 에디터가 더 최신 TS로 검사하는
경우까지 대비해 `src/css.d.ts`에 `declare module "*.css";`를 선언해 두었다.

### `postcss.config` / `tailwind.config`를 고칠 때

`package.json`이 `"type": "module"`이라, `module.exports`를 쓰는 CommonJS 설정 파일은 `.cjs` 확장자여야 한다.
PostCSS 플러그인은 Tailwind **3**용(`tailwindcss`)이다 — `@tailwindcss/postcss`는 Tailwind 4용이라 지금은 쓰지 않는다.
(CRA는 이 파일을 무시하고 자체 설정을 썼기 때문에, 예전에 잘못 적혀 있던 v4 플러그인 설정이 드러나지 않았었다)

### `npm audit`의 postcss-selector-parser 경고

Tailwind 3이 쓰는 빌드 시점 의존성이다. 고치려면 Tailwind 4로 올려야 해서(설정 방식이 바뀌는 큰 변경) 보류 중이다.
실행 중인 앱(브라우저)에는 포함되지 않는다.

### 카테고리 통계가 갱신되지 않을 때

통계(`fetchCategoryStats`)는 마운트 시 1회 + 등록/삭제/수정 완료 후에만 호출된다.
페이지 이동이나 검색 조건 변경 시에는 통계를 재조회하지 않는다 (의도된 동작).
