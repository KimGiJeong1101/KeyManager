# 라이선스 키 관리 시스템

> Windows / MS Office / 한컴오피스 라이선스 키를 등록하고, 사용자 배포 현황을 관리하는 내부 관리 도구.

회사에서 여러 PC에 소프트웨어를 설치할 때, 라이선스 키가 어느 직원에게 배정됐는지 한눈에 파악하기 어렵습니다.
이 시스템은 **키 등록 → 사용자 배정 → 현황 조회**를 웹 브라우저에서 바로 처리할 수 있도록 만들어졌습니다.

### 주요 기능

- 라이선스 키 등록 (Windows / MS Office / 한컴오피스)
- 키별 사용자 배정 및 해제
- 카테고리별 사용 중 / 미사용 통계 확인 (호버 시 카테고리별 상세)
- 키 검색 (키 번호 또는 사용자명으로), 사용 상태 필터
- 키 삭제 (실수 복구가 가능한 소프트 삭제 방식)
- 다크 / 라이트 모드

### 전체 동작 흐름

```
[브라우저]  ←──── React + TypeScript 앱 (localhost:3000)
    │
    │  HTTP 요청 (axios)
    ▼
[백엔드]    ←──── Express + TypeScript 서버 (localhost:5000)
    │
    │  SQL 쿼리 (pg)
    ▼
[데이터베이스] ── PostgreSQL
```

브라우저에서 버튼을 클릭하면 → 백엔드 서버에 요청을 보내고 → 서버가 DB에서 데이터를 가져와 응답합니다.
세 가지(프론트엔드 / 백엔드 / DB)가 모두 실행 중이어야 정상 동작합니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Tailwind CSS 3, MUI Icons, Axios |
| Backend | Node.js, Express 4, TypeScript |
| Database | PostgreSQL |

프론트엔드와 백엔드 모두 TypeScript로 작성되어 있으며, 각각 독립적인 `package.json`/`tsconfig.json`을 가진 별도 프로젝트입니다.

---

## 프로젝트 구조

```
win10KeyManager/
├── backend/     # Express REST API 서버 (src/server.ts, db.ts, types.ts)
└── frontend/    # React SPA (src/features, components/ui, api, types, hooks)
```

각 폴더의 세부 구조, 실행 방법, API 명세, 트러블슈팅은 폴더별 README를 참고하세요.

- [backend/README.md](backend/README.md) — API 서버 실행 방법, DB 스키마, API 명세
- [frontend/README.md](frontend/README.md) — 웹 UI 실행 방법, 폴더 구조, 주요 컴포넌트 설명

---

## 빠른 시작

### 사전 요구사항

- **Node.js 18.18 이상** (권장: 현재 Active LTS 버전 — https://nodejs.org 에서 LTS 다운로드)
- **PostgreSQL** — 설치: https://www.postgresql.org/download/

```bash
node -v         # v18.18.0 이상이면 OK
psql --version  # PostgreSQL 버전이 출력되면 OK
```

### 백엔드

```bash
cd backend
cp .env.example .env   # DB 접속 정보 입력
npm install
npm run dev             # http://localhost:5000
```

### 프론트엔드

```bash
cd frontend
npm install
npm start                # http://localhost:3000
```

자세한 환경 변수, 배포용 빌드 방법은 각 폴더의 README를 참고하세요.

---

## 사용자 배정 상태 기준

라이선스 키의 `member` 값에 따라 사용 중 / 미사용 상태가 결정됩니다 (프론트/백엔드 공통 기준).

| member 값 | 상태 |
|-----------|------|
| NULL | 미사용 |
| `''` (빈 문자열) | 미사용 |
| `'사용자없음'` | 미사용 |
| 그 외 문자열 | 사용 중 |
