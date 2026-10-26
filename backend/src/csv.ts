// CSV 생성 헬퍼 (GET /items/export).

// 엑셀에서 수식으로 해석될 수 있는 시작 문자. 사용자명 등에 "=..."가 들어있으면
// 내보낸 파일을 엑셀로 열 때 수식이 실행되는 CSV 인젝션이 생기므로 앞에 '를 붙여 문자열로 고정한다.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (FORMULA_PREFIX.test(s)) s = `'${s}`;
  // 쉼표/따옴표/줄바꿈이 있으면 따옴표로 감싸고, 내부 따옴표는 두 번 써서 이스케이프 (RFC 4180)
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

// 엑셀이 UTF-8로 인식하도록 BOM을 붙이고, 줄바꿈은 CRLF를 쓴다.
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
