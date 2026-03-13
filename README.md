# 라이선스 키 관리 시스템

Windows / MS Office / 한컴오피스 라이선스 키를 등록하고, 사용자 배포 현황을 관리하는 내부 관리 도구.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 18, Tailwind CSS 3, MUI Icons, Axios |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL |

---

## 프로젝트 구조

```
win10KeyManager/
├── backend/
│   ├── db.js         # PostgreSQL 연결 풀 + 테이블 자동 생성
│   └── server.js     # Express REST API 서버
└── frontend/
    └── src/
        ├── App.js                        # 루트 컴포넌트, 연결 상태 확인
        └── components/
            ├── ItemList.js               # 메인 컴포넌트 (상태 관리, API 호출)
            ├── ItemListDisplay.js        # 테이블 렌더링, 인라인 편집
            ├── SearchComponent.js        # 검색 필터 UI
            └── PaginationComponent.js    # 페이지네이션
```

---

## 실행 방법

### 사전 요구사항
- Node.js 18+
- PostgreSQL (로컬 실행 중이어야 함)

### 1. 데이터베이스 설정

`backend/db.js`에서 연결 정보를 본인 환경에 맞게 수정:

```js
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "admin",  // ← 변경 필요
  port: 5432,
});
```

테이블은 서버 최초 실행 시 자동으로 생성된다.

### 2. 백엔드 실행

```bash
cd backend
npm install
node server.js        # 또는: npx nodemon server.js
# → http://localhost:5000
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

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

---

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

---

## 주요 로직 설명

### 동적 쿼리 빌더 (server.js)

`GET /items`는 카테고리 필터와 검색 조건이 선택적이라 동적으로 SQL을 조립한다.
`queryParams` 배열에 값을 순서대로 push하고, `$${queryParams.length}` 인덱스로
파라미터 바인딩을 유지해 SQL 인젝션을 방지한다.

```js
// ALL 검색: 같은 파라미터를 두 컬럼에 재사용
queryParams.push(term);
const idx = queryParams.length;  // 한 번만 push하고 인덱스 재사용
baseQuery += ` AND (key ILIKE $${idx} OR member ILIKE $${idx})`;
```

### 소프트 삭제 (Soft Delete)

`DELETE` 요청은 실제로 행을 삭제하지 않고 `isdelete = 1`로만 표시한다.
모든 조회 쿼리에 `WHERE isdelete = 0` 조건이 붙어 삭제된 항목은 노출되지 않는다.
이력 보존과 실수 복구가 목적이다.

### 5칸 키 입력 (ItemList.js)

25자리 키를 5글자씩 5칸으로 분리해 입력받는다.

- `handleChange`: 영문자/숫자만 허용(`/^[A-Za-z0-9]{0,5}$/`), 소문자 자동 대문자 변환, 5글자 완성 시 다음 칸 자동 포커스
- `handleKeyDown`: 현재 칸이 비어있을 때 Backspace → 이전 칸 포커스, Enter → 등록 실행
- 등록 시 `keys.join("-")`으로 `XXXXX-XXXXX-XXXXX-XXXXX-XXXXX` 형식으로 합쳐 전송

### 통계 카드 호버 애니메이션 (ItemList.js)

Tailwind의 `group` / `group-hover` 조합으로 순수 CSS 슬라이드 애니메이션을 구현.
기본 뷰는 위로 사라지고(`-translate-y-3 + opacity-0`), 호버 뷰는 아래에서 슬라이드 업(`translate-y-full → translate-y-0`).

### 페이지네이션 그룹 (PaginationComponent.js)

페이지 번호를 `pagesToShow(=5)` 단위로 그룹화해 표시한다.

```
currentGroupFirstPage = floor((currentPage - 1) / pagesToShow) * pagesToShow + 1
```

예) currentPage=7, pagesToShow=5 → 그룹 시작: `floor(6/5)*5+1 = 6` → 6~10 표시

---

## 트러블슈팅

### 서버 연결 안 됨 (상단 배지 빨간색)

1. `cd backend && node server.js` 실행 여부 확인
2. PostgreSQL 서비스 실행 여부 확인 (`pg_isready` 또는 서비스 매니저)
3. `backend/db.js`의 비밀번호/포트가 로컬 DB 설정과 일치하는지 확인

### CORS 에러

백엔드가 `http://localhost:5000`이 아닌 다른 포트로 실행 중인 경우,
`frontend/src` 내 API URL(`http://localhost:5000`)을 수정하거나
`backend/server.js`의 `cors()` 옵션에 허용 origin을 명시한다.

### 중복 키 등록 오류

동일한 키는 `isdelete` 값에 관계없이 중복으로 판단한다 (소프트 삭제된 키 포함).
삭제된 키를 재사용하려면 DB에서 해당 행의 `isdelete`를 `0`으로 직접 수정해야 한다.

### 카테고리 통계가 갱신되지 않을 때

통계(`fetchCategoryStats`)는 마운트 시 1회 + 등록/삭제/수정 완료 후 호출된다.
페이지 이동이나 검색 조건 변경 시에는 통계를 재조회하지 않는다 (의도된 동작).
