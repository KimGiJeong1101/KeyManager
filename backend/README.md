# Backend

라이선스 관리 시스템의 REST API 서버. Express + TypeScript로 작성되어 있고, PostgreSQL을 데이터 저장소로 사용한다.

## 기술 스택

- **Node.js + TypeScript** — 소스는 `src/`에 `.ts`로 작성하고, `tsc`로 `dist/`에 컴파일해서 실행한다.
- **Express 4** — REST API 라우팅.
- **pg** — PostgreSQL 드라이버. 커넥션 풀(`Pool`)을 재사용해 요청마다 새로 연결하지 않는다.
- **ts-node + nodemon** — 개발 중에는 컴파일 없이 `.ts`를 바로 실행하고, 파일이 바뀌면 자동 재시작한다.

## 폴더 구조

```
backend/
├── src/
│   ├── server.ts   # Express 앱, 라우트 핸들러 전부 (health/items/category-stats/CRUD)
│   ├── db.ts       # PostgreSQL 커넥션 풀 설정 + 테이블 자동 생성
│   └── types.ts    # LicenseKeyRow, CategoryStatRow 등 요청/응답 타입
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

`.env` 파일이 없으면 `src/db.ts`에 정의된 기본값(user: postgres, password: admin 등)이 사용된다.

테이블은 서버 최초 실행 시 자동으로 생성된다 (별도 SQL 실행 불필요).

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
  key          VARCHAR(100) NOT NULL UNIQUE, -- 라이선스 키 (XXXXX-XXXXX-... 형식)
  member       VARCHAR(100) DEFAULT '사용자없음', -- 배정된 사용자명
  isdelete     INT DEFAULT 0,               -- 소프트 삭제 플래그 (0: 정상, 1: 삭제)
  CATEGORY     VARCHAR(50),                 -- Windows / MS_Office / Hancom
  VERSION      VARCHAR(50),                 -- 세부 버전명
  search_vector tsvector                    -- 향후 전문 검색 확장용 (현재 미사용)
);
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
새 라이선스 키 등록. 중복 키 입력 시 400 에러 반환.

```json
Request Body: { "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX", "category": "Windows", "version": "Windows 11 Pro" }
Response 200: { 등록된 행 }
Response 400: { "error": "이미 등록된 라이선스 키입니다." }
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

동일한 키는 `isdelete` 값에 관계없이 중복으로 판단한다 (소프트 삭제된 키 포함).
삭제된 키를 재사용하려면 DB에서 해당 행의 `isdelete`를 `0`으로 직접 수정해야 한다.

### `npm install` 시 ERESOLVE 에러가 날 때

`typescript`를 `react-scripts`(프론트엔드) 공식 지원 범위보다 높은 버전으로 의도적으로 올려둔 상태라
프론트엔드 쪽에서 이 문제가 발생할 수 있다. `frontend/.npmrc`의 `legacy-peer-deps=true`가 이미 이를 처리한다.
백엔드는 이 문제와 무관하다.
