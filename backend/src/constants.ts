// 라이선스 등록 시 허용되는 category/version 화이트리스트.
// 단일 소스: 프론트엔드는 이 값을 하드코딩하지 않고 GET /categories로 그대로 받아간다.

export const VERSION_OPTIONS: Record<string, string[]> = {
  Windows: [
    "Windows 11 Pro",
    "Windows 11 Home",
    "Windows 11 Enterprise",
    "Windows 10 Pro",
    "Windows 10 Home",
    "Windows 10 Enterprise",
    "Windows 8.1 Pro",
    "Windows 7 Professional",
    "Windows 7 Ultimate",
    "Windows Server 2022 Standard",
    "Windows Server 2019 Standard",
    "Windows Server 2016 Standard",
    "Windows Server 2012 R2",
    "Windows Server 2008 R2",
  ],
  MS_Office: [
    "Microsoft 365 Business",
    "Microsoft 365 Apps for Enterprise",
    "Office 2021 Professional Plus",
    "Office 2019 Professional Plus",
    "Office 2016 Professional Plus",
    "Office 2013 Professional",
    "Office 2010 Professional Plus",
    "Office 2007 Standard",
  ],
  Hancom: [
    "한컴오피스 2024",
    "한컴오피스 2022",
    "한컴오피스 2020",
    "한컴오피스 2018",
    "한컴오피스 2014 VP",
    "한컴오피스 2010 SE",
    "한컴오피스 한글 2010",
    "한컴오피스 한글 2007",
  ],
};

export const CATEGORIES = Object.keys(VERSION_OPTIONS);

// 등록 가능한 라이선스 키 형식: 영문 대문자/숫자 5자리 × 5칸, 하이픈 구분.
// 프론트의 5칸 분리 입력(RegisterModal)이 만들어내는 형식과 동일하다.
export const LICENSE_KEY_PATTERN = /^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/;

// LICENSE_KEYS.key / member 컬럼 길이 (VARCHAR(100))
export const MAX_FIELD_LENGTH = 100;

// LICENSE_KEYS.memo 컬럼 길이 (VARCHAR(500))
export const MAX_MEMO_LENGTH = 500;

// CSV 가져오기에서 카테고리 칸에 코드명 대신 쓸 수 있는 표시명/별칭 (소문자, 공백 1칸 기준) → 코드명.
// 코드명 자체(대소문자 무시)는 별도로 항상 허용된다 (import.ts resolveCategory).
export const CATEGORY_ALIASES: Record<string, string> = {
  "ms office": "MS_Office",
  "ms-office": "MS_Office",
  "microsoft office": "MS_Office",
  office: "MS_Office",
  "한컴오피스": "Hancom",
  "한컴 오피스": "Hancom",
  "한컴": "Hancom",
  hancom: "Hancom",
  "윈도우": "Windows",
  "윈도우즈": "Windows",
};

// CSV 가져오기 1회 최대 행 수
export const MAX_IMPORT_ROWS = 1000;
