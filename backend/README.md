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
│   ├── server.ts        # 기동 진입점: 스키마 초기화 → listen, 종료 시그널 처리
│   ├── app.ts           # Express 앱 조립: 미들웨어 → 라우터 → 404/에러 처리 (테스트에서 listen 없이 바로 호출 가능)
│   ├── routes/          # 기능별 라우터
│   │   ├── meta.ts      #   GET /health, /categories
│   │   ├── items.ts     #   목록 조회 / 등록 / 수정 / 삭제(소프트)
│   │   ├── stats.ts     #   카테고리별 / 버전별 통계
│   │   ├── csv.ts       #   CSV 내보내기 / 가져오기
│   │   ├── trash.ts     #   휴지통 / 복구 / 완전삭제
│   │   └── history.ts   #   이력 (일반 키 / 완전삭제된 키)
│   ├── errors.ts        # 공통 에러 응답(JSON), 404·에러 처리 미들웨어
│   ├── db.ts            # PostgreSQL 커넥션 풀 + 테이블/인덱스 자동 생성·마이그레이션(initSchema) + withTransaction
│   ├── constants.ts     # category/version 화이트리스트(GET /categories 단일 소스), 키 형식, 카테고리 별칭
│   ├── query-builder.ts # GET /items·export의 WHERE 절 조립 (필터, 하이픈 무시 키 검색)
│   ├── history.ts       # 이력(LICENSE_KEY_HISTORY) 기록 헬퍼
│   ├── import.ts        # CSV 가져오기 행 검증/정규화 (키 형식, 카테고리 별칭, 버전 화이트리스트)
│   ├── csv.ts           # CSV 생성 (BOM, 이스케이프, CSV 인젝션 방지)
│   ├── types.ts         # 요청/응답 타입
│   ├── *.test.ts        # 순수 함수 단위 테스트 (npm test)
│   └── __integration__/ # 실제 테스트 DB에 붙는 API 통합 테스트 (npm run test:integration)
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

### 3. 테스트

```bash
npm test                  # 단위 테스트 (DB 불필요): 쿼리 조립, CSV, 가져오기 검증, 이력 분류 등
npm run test:integration  # API 통합 테스트 (PostgreSQL 필요)
```

통합 테스트는 `.env`의 접속 정보로 **같은 PostgreSQL 서버의 별도 테스트 DB**(기본 `<DB_NAME>_test`,
예: `postgres_test`)에 붙는다. 테스트 DB가 없으면 자동으로 만들고, 테스트마다 테이블을 비운다.

- 실제 데이터 DB를 건드리지 않도록, 테스트 DB 이름이 `_test`로 끝나지 않으면 시작 단계에서 멈춘다.
  테이블을 비우기 직전에도 `current_database()`를 한 번 더 확인한다.
- 다른 이름을 쓰려면 `TEST_DB_NAME=keymanager_test npm run test:integration`처럼 지정한다.
- 다루는 범위: 등록/중복/검증, 조회·필터·하이픈 무시 검색·메모 검색, 수정(이력 포함), 통계,
  삭제/복구/완전삭제와 완전삭제 이력, CSV 내보내기/가져오기, 미배정 값 정규화 마이그레이션.

## DB 스키마

```sql
CREATE TABLE LICENSE_KEYS (
  no           SERIAL PRIMARY KEY,
  key          VARCHAR(100) NOT NULL,       -- 라이선스 키 (XXXXX-XXXXX-... 형식)
  member       VARCHAR(100),                -- 배정된 사용자명 (NULL = 미배정)
  memo         VARCHAR(500),                -- 자유 메모 (PC명, 부서, 구매일 등)
  isdelete     BOOLEAN NOT NULL DEFAULT FALSE, -- 소프트 삭제 플래그 (false: 정상, true: 휴지통)
  CATEGORY     VARCHAR(50),                 -- Windows / MS_Office / Hancom (constants.ts 화이트리스트로 검증)
  VERSION      VARCHAR(50),                 -- 세부 버전명 (constants.ts 화이트리스트로 검증)
  created_at   TIMESTAMPTZ DEFAULT now(),   -- 등록 시각 (컬럼 도입 이전 등록분은 NULL)
  deleted_at   TIMESTAMPTZ                  -- 소프트 삭제 시각 (컬럼 도입 이전 삭제분은 NULL)
);

-- 컬럼 레벨 UNIQUE 대신, 삭제되지 않은 행(NOT isdelete) 사이에서만 key 유일성을 강제한다.
-- → 소프트 삭제된 키는 별도 조치 없이 같은 값으로 재등록할 수 있다.
CREATE UNIQUE INDEX license_keys_key_active_uidx
ON LICENSE_KEYS (key)
WHERE NOT isdelete;

-- 키별 이력(감사 로그). 등록/배정/해제/삭제/복구 시 상태 변경과 같은 트랜잭션에서 기록된다.
CREATE TABLE LICENSE_KEY_HISTORY (
  id            SERIAL PRIMARY KEY,
  license_no    INT REFERENCES LICENSE_KEYS(no) ON DELETE SET NULL,  -- 완전삭제되면 NULL
  original_no   INT,                      -- license_no 사본 (완전삭제돼도 남음 → 완전삭제된 키의 이력을 키 단위로 묶음)
  key_snapshot  VARCHAR(100),             -- 기록 시점의 키 값 (완전삭제 후에도 남음)
  action        VARCHAR(20) NOT NULL,     -- create / assign / unassign / edit / delete / restore / purge
  detail        VARCHAR(500),             -- edit 이력의 변경 요약 (예: "버전: A → B / 메모 추가")
  member_before VARCHAR(100),
  member_after  VARCHAR(100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

테이블·컬럼·인덱스는 서버 기동 시 `initSchema()`(`src/db.ts`)가 자동으로 생성/보강한다.

### DB에 직접 SQL을 쓸 때 (DBeaver 등)

- `isdelete`는 **BOOLEAN**이다 (예전 `INT 0/1`에서 서버 기동 시 자동 변환됨).
  `WHERE isdelete = 0`처럼 숫자로 비교하면 `boolean = integer` 오류가 난다 → `WHERE NOT isdelete` / `WHERE isdelete` 사용.
- 예전에 수동으로 추가했던 전문 검색 설정(`search_vector` 컬럼, 이를 채우는 트리거 `tsvectorupdate`, `idx_search_vector`)은
  앱이 쓰지 않아 서버 기동 시 정리된다 (트리거 → 인덱스 → 컬럼 순서, 한 트랜잭션). 키/사용자명 데이터와 무관하다.
- `pg_trgm` 기반 인덱스 `idx_key_trgm` / `idx_member_trgm`는 코드가 만들지 않지만 남겨 둔다
  (`ILIKE '%...%'` 부분 일치 검색을 데이터가 많아졌을 때 빠르게 해 줄 수 있음).
- DB에 트리거·인덱스 같은 객체를 직접 추가했다면, 코드의 `initSchema()`와 이 README에도 함께 기록해 두자
  (코드만 봐서는 알 수 없어 나중에 스키마를 바꿀 때 사고가 날 수 있다).

### 사용자 배정 상태 기준

| member 값 | 상태 |
|-----------|------|
| NULL | 미사용 |
| `''` (빈 문자열) / `'사용자없음'` | 서버 기동 시 `NULL`로 자동 정규화됨 |
| 그 외 문자열 | 사용 중 |

## API 명세

**에러 응답 형식**: 모든 실패 응답은 `{ "error": "사람이 읽을 메시지" }` JSON이다.
잘못된 JSON 본문은 400, 1MB 초과는 413, 없는 경로는 404, 서버 내부 오류는 500 —
Express 기본 HTML 에러 페이지(스택 트레이스와 서버 경로가 노출됨)는 쓰지 않는다 (`src/errors.ts`).

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
| `searchField` | `all` | `key` / `member` / `memo` / `all` (all = 키·사용자·메모) |
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

### `GET /items/version-stats`
버전별 재고 집계 (프론트의 재고 부족 경고용). 키가 한 건이라도 등록된 버전만 나온다.

```
Response 200:
[
  { "category": "MS_Office", "version": "Office 2010 Professional Plus", "total": 2, "available": 0 },
  ...
]
```

---

### `GET /items/export`
목록을 CSV 파일로 내려받는다. `GET /items`와 같은 필터(`category`/`status`/`searchField`/`searchValue`)를
받으며 페이지네이션 없이 조건에 맞는 전체를 내보낸다.

- 열: `번호, 라이선스 키, 카테고리, 버전, 사용자, 메모, 등록일`
- UTF-8 + BOM, CRLF → 엑셀에서 바로 열어도 한글이 깨지지 않는다
- `=`, `+`, `-`, `@`로 시작하는 값은 앞에 `'`를 붙여 엑셀 수식 실행(CSV 인젝션)을 막는다

```
Response 200: (text/csv) Content-Disposition: attachment; filename="licenses_YYYYMMDD.csv"
```

---

### `POST /items/import`
CSV 일괄 등록. 프론트가 파일을 파싱해 행 배열로 보낸다 (최대 1000행).
각 행을 `POST /items`와 같은 규칙으로 검증하되, 입력은 조금 너그럽게 받아 정규화한다.

- 키: 하이픈/공백 유무·대소문자 무관, 영문/숫자 25자리 → `XXXXX-XXXXX-...`로 저장
- 카테고리: 코드명 또는 별칭(`MS Office`, `한컴오피스`, `윈도우` 등, `constants.ts` `CATEGORY_ALIASES`)
- 버전: 화이트리스트 값 (대소문자/공백 차이 허용)
- 사용자: 선택. 있으면 등록과 동시에 배정되고 `assign` 이력도 남는다
- 메모: 선택 (500자 이하)

`dryRun: true`면 검증 결과만 돌려준다(미리보기). 아니면 **오류 행은 건너뛰고** 정상 행만 한 트랜잭션으로 등록한다.

```json
Request Body: { "rows": [{ "key": "...", "category": "Windows", "version": "Windows 11 Pro", "member": "" }], "dryRun": true }
Response 200:
{
  "results": [
    { "index": 0, "status": "ok", "key": "ABCDE-...", "category": "Windows", "version": "Windows 11 Pro", "member": null },
    { "index": 1, "status": "error", "error": "이미 등록된 키입니다" },
    { "index": 2, "status": "error", "error": "파일 안에서 중복된 키입니다", "duplicateOf": 0 }
  ],
  "inserted": 0,
  "dryRun": true
}
Response 400: { "error": "가져올 행이 없습니다." } / { "error": "한 번에 최대 1000행까지 ..." }
Response 409: 미리보기와 등록 사이에 같은 키가 다른 곳에서 등록됨 (전체 롤백, 아무것도 등록되지 않음)
```

---

### `POST /items`
새 라이선스 키 등록. `category`/`version`은 `src/constants.ts`의 화이트리스트에 있는 값만 허용하며,
중복 키(삭제되지 않은 행 기준) 입력 시 400 에러를 반환한다.

```json
Request Body: { "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX", "category": "Windows", "version": "Windows 11 Pro" }
Response 200: { 등록된 행 }
Response 400: { "error": "라이선스 키는 XXXXX-XXXXX-XXXXX-XXXXX-XXXXX 형식(...)이어야 합니다." }
Response 400: { "error": "이미 등록된 라이선스 키입니다." }
Response 400: { "error": "지원하지 않는 카테고리입니다." }
Response 400: { "error": "지원하지 않는 버전입니다." }
```

---

### `PUT /items/:no`
라이선스 정보 수정 (사용자 / 카테고리·버전 / 메모).

```json
Request Body: { "key": "...", "member": "홍길동", "category": "Windows", "version": "Windows 11 Pro", "memo": "개발팀 PC-07" }
Response 200: { 수정된 행 }
Response 400: { "error": "선택한 카테고리에 없는 버전입니다." } / { "error": "메모는 500자 이하로 입력해주세요." }
```

- `key`는 필수. `member`/`category`/`version`/`memo`는 **보내지 않으면 기존 값을 유지**한다.
- `member`/`memo`를 빈 문자열(또는 공백)로 보내면 `NULL`로 지워진다 (`member` → 사용자 배정 해제).
- 카테고리/버전은 바뀌는 경우에만, 바뀐 뒤의 조합이 화이트리스트에 있어야 한다.
- 이력: 사용자가 바뀌면 `assign`/`unassign`, 카테고리·버전·메모가 바뀌면 `edit`(변경 요약 `detail`).

---

### `DELETE /items/:no`
소프트 삭제. 실제 행 삭제 없이 `isdelete = TRUE`로 플래그만 변경.
사용 중(`member`가 NULL이 아님)인 키는 `409`로 거부된다 — 먼저 배정을 해제해야 한다.

```
Response 204: No Content
Response 404: { "error": "존재하지 않는 라이선스입니다." }
Response 409: { "error": "사용 중인 키는 삭제할 수 없습니다. ..." }
```

---

### `GET /items/deleted`
휴지통: 소프트 삭제된 라이선스 목록 (최근 삭제 순). `page` / `limit` 지원.

```
Response 200: { items: [{ no, key, member, category, version, deleted_at }, ...], total: 15 }
```

---

### `POST /items/:no/restore`
휴지통의 라이선스를 복구한다 (`isdelete = FALSE`).

```
Response 200: { 복구된 행 }
Response 404: { "error": "휴지통에 없는 라이선스입니다." }
Response 409: { "error": "같은 키가 이미 다시 등록되어 있어 복구할 수 없습니다." }
```

---

### `POST /items/:no/purge`
휴지통의 라이선스를 **완전삭제(영구 삭제)** 한다. 되돌릴 수 없다.
휴지통에 있는 키만 대상이며, 확인용으로 키의 마지막 5자리를 보내야 한다.
이력은 지워지지 않고 `license_no = NULL`, `key_snapshot`(키 값)과 함께 남는다.

```
Request Body: { "confirm": "KLMNO" }
Response 204: No Content
Response 400: { "error": "입력한 값이 키의 마지막 5자리와 일치하지 않습니다." }
Response 404: { "error": "휴지통에 없는 라이선스입니다." }
```

---

### `GET /items/purged`
완전삭제 기록 ("purge" 이력) 목록, 최근 순. `page` / `limit` 지원. `id`는 그 이력 행의 id.

```
Response 200: { items: [{ id, key, purged_at }, ...], total: 2 }
```

---

### `GET /items/purged/:id/history`
완전삭제된 키의 전체 이력 (최신순). `original_no`로 묶으며, `original_no` 컬럼 도입 전에 완전삭제된 경우에는
같은 `key_snapshot`을 가진 완전삭제된 이력으로 대신 묶는다.

```
Response 200: [ { id, action, member_before, member_after, detail, created_at }, ... ]
Response 404: { "error": "완전삭제 기록을 찾을 수 없습니다." }
```

---

### `GET /items/:no/history`
키별 이력 (최신순). 삭제된 키의 이력도 조회할 수 있다.

```
Response 200:
[
  { "id": 3, "action": "assign", "member_before": "홍길동", "member_after": "김철수", "created_at": "..." },
  { "id": 1, "action": "create", "member_before": null, "member_after": null, "created_at": "..." }
]
Response 404: { "error": "존재하지 않는 라이선스입니다." }
```

## 주요 로직 설명

### 동적 쿼리 빌더 (`src/query-builder.ts`)

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

`DELETE` 요청은 실제로 행을 삭제하지 않고 `isdelete = TRUE`로만 표시한다.
모든 조회 쿼리에 `WHERE NOT isdelete` 조건이 붙어 삭제된 항목은 노출되지 않는다.
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
`src/app.ts`의 `cors()` 옵션에 허용 origin을 명시한다.

### 중복 키 등록 오류

중복 판정은 삭제되지 않은 행(`NOT isdelete`)만 대상으로 한다 (partial unique index 기준).
즉 **소프트 삭제된 키는 별도 조치 없이 동일한 값으로 다시 등록할 수 있으며**, 이미 등록되어
있고 삭제되지 않은 키와 같은 값을 입력할 때만 400 에러가 발생한다.

