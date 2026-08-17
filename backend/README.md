# Backend

라이선스 관리 시스템의 REST API 서버. Express + TypeScript로 작성되어 있고, PostgreSQL을 데이터 저장소로 사용한다.

> **인증 없음(의도된 설계)**: 사내망에서만 쓰는 내부 관리 도구라 로그인/권한 체크가 없다.
> 외부에 노출하는 배포 형태가 아니므로 누락이 아니라 의도적으로 생략한 것이다.

## 기술 스택

- **Node.js + TypeScript** — 소스는 `src/`에 `.ts`로 작성하고, `tsc`로 `dist/`에 컴파일해서 실행한다.
- **Express 4** — REST API 라우팅.
- **pg** — PostgreSQL 드라이버. 커넥션 풀(`Pool`)을 재사용해 요청마다 새로 연결하지 않는다.
- **ts-node + nodemon** — 개발 중에는 컴파일 없이 `.ts`를 바로 실행하고, 파일이 바뀌면 자동 재시작한다.

## 폴더 구조

```
backend/
├── src/
│   ├── server.ts     # Express 앱, 라우트 핸들러 전부 (health/items/category-stats/CRUD)
│   ├── db.ts         # PostgreSQL 커넥션 풀 설정 + 테이블/인덱스 자동 생성(initSchema)
│   ├── constants.ts  # category/version 화이트리스트 (GET /categories로 프론트에 그대로 제공하는 단일 소스)
│   └── types.ts      # LicenseKeyRow, CategoryStatRow 등 요청/응답 타입
├── dist/           # tsc 빌드 산출물 (git 추적 안 함, npm run build로 생성)
├── tsconfig.json
└── package.json
```

## 실행 방법

### 사전 요구사항

**Node.js 18.18 이상** (권장: 현재 Active LTS 버전)

**PostgreSQL**
- 실제 데이터(키, 사용자 등)를 저장하는 데이터베이스.
- 설치: https://www.postgresql.org/download/
- 설치 시 설정한 비밀번호를 기억해 둔다 (아래 `.env` 설정에 필요).

### 1. 환경 변수 설정

`.env.example`을 복사해 `.env`로 저장하고 본인 환경에 맞게 값을 수정한다 (dotenv로 자동 로드됨):

```bash
cp .env.example .env
```

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=postgres
DB_PASSWORD=your_password_here  # ← 변경 필요
DB_PORT=5432
PORT=5000
```

`DB_USER`/`DB_HOST`/`DB_NAME`/`DB_PORT`는 값이 없으면 `src/db.ts`의 기본값(각각 `postgres`/`localhost`/`postgres`/`5432`)이 쓰인다.
단, `DB_PASSWORD`는 약한 기본값으로 조용히 폴백하지 않고 **값이 없으면 서버가 즉시 에러를 던지며 기동을 거부**한다.

테이블과 인덱스는 서버 최초 실행 시 `initSchema()`가 자동으로 생성한다 (별도 SQL 실행 불필요).
`server.ts`는 `app.listen()` 전에 이 초기화를 `await`하므로, 완전히 새로운 DB에 처음 배포해도
테이블이 준비되기 전에 요청을 받는 경쟁 상태가 발생하지 않는다.

### 2. 설치 및 실행

```bash
npm install

# 개발: src/*.ts를 저장할 때마다 자동 재시작 (컴파일 결과물을 신경 쓸 필요 없음)
npm run dev

# 배포/운영: 한 번 컴파일한 뒤 컴파일된 JS로 실행
npm run build   # dist/ 생성
npm start       # node dist/server.js
```

`→ http://localhost:5000` (또는 `.env`의 `PORT` 값)

## DB 스키마

```sql
CREATE TABLE LICENSE_KEYS (
  no           SERIAL PRIMARY KEY,
  key          VARCHAR(100) NOT NULL,       -- 라이선스 키 (XXXXX-XXXXX-... 형식)
  member       VARCHAR(100) DEFAULT '사용자없음', -- 배정된 사용자명
  isdelete     INT DEFAULT 0,               -- 소프트 삭제 플래그 (0: 정상, 1: 삭제)
  CATEGORY     VARCHAR(50),                 -- Windows / MS_Office / Hancom (constants.ts 화이트리스트로 검증)
  VERSION      VARCHAR(50),                 -- 세부 버전명 (constants.ts 화이트리스트로 검증)
  search_vector tsvector                    -- 향후 전문 검색 확장용 (현재 미사용)
);

-- 컬럼 레벨 UNIQUE 대신, 삭제되지 않은 행(isdelete = 0) 사이에서만 key 유일성을 강제한다.
-- → 소프트 삭제된 키는 별도 조치 없이 같은 값으로 재등록할 수 있다.
CREATE UNIQUE INDEX license_keys_key_active_uidx
ON LICENSE_KEYS (key)
WHERE isdelete = 0;
```

### 사용자 배정 상태 기준

| member 값 | 상태 |
|-----------|------|
| NULL | 미사용 |
| `''` (빈 문자열) | 미사용 |
| `'사용자없음'` | 미사용 |
| 그 외 문자열 | 사용 중 |

## API 명세

### `GET /health`
서버 및 DB 연결 상태 확인. 프론트엔드 상단 배지에서 사용.

```
Response 200: { "status": "ok" }
Response 503: { "status": "error" }
```

---

### `GET /categories`
등록 폼의 category → version 화이트리스트(`src/constants.ts`)를 그대로 반환한다.
프론트는 이 값을 별도로 하드코딩하지 않고 그대로 사용한다.

```
Response 200:
{
  "Windows": ["Windows 11 Pro", ...],
  "MS_Office": ["Microsoft 365 Business", ...],
  "Hancom": ["한컴오피스 2024", ...]
}
```

---

### `GET /items`
라이선스 목록 조회 (페이지네이션 + 필터 + 검색).

**Query Parameters**

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `page` | 1 | 페이지 번호 |
| `limit` | 10 | 페이지당 항목 수 |
| `category` | - | `allassets` 또는 `Windows` / `MS_Office` / `Hancom` |
| `status` | `all` | `assigned`(사용 중) / `unassigned`(미사용) |
| `searchField` | `all` | `key` / `member` / `all` |
| `searchValue` | - | 검색어 |

```
Response 200: { items: [...], total: 42 }
```

---

### `GET /items/category-stats`
상단 통계 카드용 카테고리별 집계.

```
Response 200:
[
  { "category": "Windows", "total": 10, "active": 7, "available": 3 },
  ...
]
```

---

### `POST /items`
새 라이선스 키 등록. `category`/`version`은 `src/constants.ts`의 화이트리스트에 있는 값만 허용하며,
중복 키(삭제되지 않은 행 기준) 입력 시 400 에러를 반환한다.

```json
Request Body: { "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX", "category": "Windows", "version": "Windows 11 Pro" }
Response 200: { 등록된 행 }
Response 400: { "error": "이미 등록된 라이선스 키입니다." }
Response 400: { "error": "지원하지 않는 카테고리입니다." }
Response 400: { "error": "지원하지 않는 버전입니다." }
```

---

### `PUT /items/:no`
라이선스 키 또는 사용자명 수정.

```json
Request Body: { "key": "...", "member": "홍길동" }
```

member를 빈 문자열(`""`)로 보내면 사용자 배정 해제.

---

### `DELETE /items/:no`
소프트 삭제. 실제 행 삭제 없이 `isdelete = 1`로 플래그만 변경.

```
Response 204: No Content
```

## 주요 로직 설명

### 동적 쿼리 빌더 (`src/server.ts`)

`GET /items`는 카테고리 필터와 검색 조건이 선택적이라 동적으로 SQL을 조립한다.
`queryParams` 배열에 값을 순서대로 push하고, `` $`${queryParams.length}` ``  인덱스로
파라미터 바인딩을 유지해 SQL 인젝션을 방지한다.

```ts
// ALL 검색: 같은 파라미터를 두 컬럼에 재사용
queryParams.push(term);
const idx = queryParams.length;  // 한 번만 push하고 인덱스 재사용
baseQuery += ` AND (key ILIKE $${idx} OR member ILIKE $${idx})`;
```

검색어에 포함된 `%`, `_`, `\`는 ILIKE의 와일드카드/이스케이프 문자로 해석되므로,
쿼리에 넣기 전에 `\`로 이스케이프해 사용자가 입력한 문자 그대로 리터럴 매칭되도록 한다.

### DB 커넥션 안정성 (`src/db.ts`)

`pg.Pool`은 `EventEmitter`라서 유휴 커넥션에서 에러(DB 재시작, 네트워크 끊김 등)가 나면
`'error'` 이벤트를 emit한다. 리스너가 없으면 Node가 이를 unhandled exception으로 처리해
서버 프로세스 전체가 죽으므로, `pool.on("error", ...)`로 로그만 남기고 서버는 계속 동작하도록 한다.

### 소프트 삭제 (Soft Delete)

`DELETE` 요청은 실제로 행을 삭제하지 않고 `isdelete = 1`로만 표시한다.
모든 조회 쿼리에 `WHERE isdelete = 0` 조건이 붙어 삭제된 항목은 노출되지 않는다.
이력 보존과 실수 복구가 목적이다.

> **쉽게 말하면:** 데이터를 "휴지통에 버리는" 방식. 실제로 지우지 않아서 나중에 DB에서 직접 꺼낼 수 있다.

## 트러블슈팅

### 서버 연결 안 됨 (프론트 상단 배지 빨간색)

1. `npm run dev`(또는 `npm start`) 실행 여부 확인
2. PostgreSQL 서비스 실행 여부 확인 (`pg_isready` 또는 서비스 매니저)
3. `.env`의 비밀번호/포트가 로컬 DB 설정과 일치하는지 확인

### CORS 에러

백엔드가 `http://localhost:5000`이 아닌 다른 포트로 실행 중인 경우,
`frontend/.env`의 `REACT_APP_API_URL`을 실제 백엔드 주소로 설정하거나
`src/server.ts`의 `cors()` 옵션에 허용 origin을 명시한다.

### 중복 키 등록 오류

중복 판정은 삭제되지 않은 행(`isdelete = 0`)만 대상으로 한다 (partial unique index 기준).
즉 **소프트 삭제된 키는 별도 조치 없이 동일한 값으로 다시 등록할 수 있으며**, 이미 등록되어
있고 삭제되지 않은 키와 같은 값을 입력할 때만 400 에러가 발생한다.

### `npm install` 시 ERESOLVE 에러가 날 때

`typescript`를 `react-scripts`(프론트엔드) 공식 지원 범위보다 높은 버전으로 의도적으로 올려둔 상태라
프론트엔드 쪽에서 이 문제가 발생할 수 있다. `frontend/.npmrc`의 `legacy-peer-deps=true`가 이미 이를 처리한다.
백엔드는 이 문제와 무관하다.
