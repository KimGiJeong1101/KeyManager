// CSV 가져오기/양식 관련 순수 함수.
// 파싱 결과는 서버(POST /items/import)가 다시 검증하므로, 여기서는 "열 찾기 + 행 만들기"까지만 한다.

import { ImportRowInput } from "../types/item";

// RFC 4180 CSV 파서. 따옴표로 감싼 칸 안의 쉼표/줄바꿈/"" 이스케이프, CRLF/LF, 맨 앞 BOM을 처리한다.
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  // 마지막 줄에 줄바꿈이 없는 경우
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// 헤더 이름 → 필드. 비교는 공백 제거 + 소문자로 한다 (예: "라이선스 키" = "라이선스키").
const HEADER_ALIASES: Record<keyof ImportRowInput, string[]> = {
  key: ["라이선스키", "키", "제품키", "key", "licensekey", "productkey"],
  category: ["카테고리", "분류", "category"],
  version: ["버전", "version"],
  member: ["사용자", "사용자명", "member", "user"],
  memo: ["메모", "비고", "memo", "note", "notes"],
};
const REQUIRED_FIELDS: (keyof ImportRowInput)[] = ["key", "category", "version"];
const FIELD_LABEL: Record<keyof ImportRowInput, string> = {
  key: "라이선스 키",
  category: "카테고리",
  version: "버전",
  member: "사용자",
  memo: "메모",
};

const normalizeHeader = (h: string) => h.replace(/\s+/g, "").toLowerCase();

export interface MappedCsv {
  rows: ImportRowInput[];
  // rows[i]가 엑셀에서 몇 번째 줄인지 (헤더 = 1행). 미리보기/오류 안내에 사용.
  lineNumbers: number[];
}

// 파싱된 표에서 헤더를 찾아 행 객체로 바꾼다. 필수 열이 없으면 에러 메시지를 던진다.
// 번호/등록일 등 모르는 열은 무시하므로, 내보내기 파일을 그대로 다시 가져올 수도 있다.
export function mapCsvToImportRows(table: string[][]): MappedCsv {
  if (table.length === 0) throw new Error("빈 파일입니다.");

  const header = table[0].map(normalizeHeader);
  const columnOf = {} as Record<keyof ImportRowInput, number>;
  (Object.keys(HEADER_ALIASES) as (keyof ImportRowInput)[]).forEach((field) => {
    columnOf[field] = header.findIndex((h) => HEADER_ALIASES[field].includes(h));
  });

  const missing = REQUIRED_FIELDS.filter((f) => columnOf[f] === -1);
  if (missing.length > 0) {
    throw new Error(
      `필수 열을 찾을 수 없습니다: ${missing.map((f) => FIELD_LABEL[f]).join(", ")}. 첫 줄(헤더)을 확인해주세요.`,
    );
  }

  const rows: ImportRowInput[] = [];
  const lineNumbers: number[] = [];
  table.slice(1).forEach((cells, i) => {
    // 완전히 빈 줄은 건너뛴다 (엑셀이 끝에 빈 줄을 남기는 경우 등)
    if (cells.every((c) => c.trim() === "")) return;
    const get = (field: keyof ImportRowInput) => (columnOf[field] === -1 ? "" : (cells[columnOf[field]] ?? "").trim());
    rows.push({
      key: get("key"),
      category: get("category"),
      version: get("version"),
      member: get("member"),
      memo: get("memo"),
    });
    lineNumbers.push(i + 2);
  });

  if (rows.length === 0) throw new Error("헤더 아래에 데이터가 없습니다.");
  return { rows, lineNumbers };
}

// 파일 바이트를 문자열로. 엑셀 "CSV UTF-8"은 UTF-8, 한국어 윈도우 엑셀의 기본 "CSV (쉼표로 분리)"는
// CP949(EUC-KR)로 저장되므로, UTF-8로 엄격하게 읽어보고 실패하면 EUC-KR로 다시 읽는다.
export function decodeCsvBytes(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("euc-kr").decode(buffer);
  }
}

// 가져오기 양식 (헤더 + 예시 1행). 엑셀에서 한글이 깨지지 않도록 BOM을 붙인다.
export const IMPORT_TEMPLATE_CSV =
  "\uFEFF라이선스 키,카테고리,버전,사용자,메모\r\n" +
  "ABCDE-12345-FGHIJ-67890-KLMNO,Windows,Windows 11 Pro,,\r\n";
