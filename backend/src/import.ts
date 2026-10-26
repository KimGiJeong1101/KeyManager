// CSV 일괄 등록(POST /items/import)의 행 단위 검증/정규화 (순수 함수).
// 프론트에서 파싱한 행을 서버가 다시 검증한다 — 화이트리스트/키 형식 규칙은 POST /items와 동일.

import { CATEGORY_ALIASES, MAX_FIELD_LENGTH, MAX_MEMO_LENGTH, VERSION_OPTIONS } from "./constants";

export interface ImportRowInput {
  key?: unknown;
  category?: unknown;
  version?: unknown;
  member?: unknown;
  memo?: unknown;
}

export interface NormalizedImportRow {
  key: string;
  category: string;
  version: string;
  member: string | null;
  memo: string | null;
}

export type ImportRowCheck =
  | { ok: true; row: NormalizedImportRow }
  | { ok: false; error: string };

const asText = (v: unknown): string =>
  typeof v === "string" || typeof v === "number" ? String(v).trim() : "";

// 비교용: 소문자 + 연속 공백 1칸
const normalizeLabel = (v: unknown): string => asText(v).toLowerCase().replace(/\s+/g, " ");

// 하이픈/공백 유무, 대소문자와 상관없이 25자리 영문/숫자면 "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"로 정규화한다.
export function normalizeLicenseKey(raw: unknown): string | null {
  const compact = asText(raw).toUpperCase().replace(/[\s-]/g, "");
  if (!/^[A-Z0-9]{25}$/.test(compact)) return null;
  return (compact.match(/.{5}/g) as string[]).join("-");
}

// 코드명(Windows/MS_Office/Hancom) 또는 표시명/별칭("MS Office", "한컴오피스" 등)을 코드명으로 변환한다.
export function resolveCategory(raw: unknown): string | null {
  const text = normalizeLabel(raw);
  if (!text) return null;
  const direct = Object.keys(VERSION_OPTIONS).find((c) => c.toLowerCase() === text);
  return direct ?? CATEGORY_ALIASES[text] ?? null;
}

// 버전은 화이트리스트에 있는 값만 허용. 대소문자/공백 차이는 허용하고 정식 표기로 돌려준다.
export function resolveVersion(category: string, raw: unknown): string | null {
  const text = normalizeLabel(raw);
  if (!text) return null;
  return VERSION_OPTIONS[category]?.find((v) => v.toLowerCase() === text) ?? null;
}

export function validateImportRow(input: ImportRowInput): ImportRowCheck {
  const key = normalizeLicenseKey(input.key);
  if (!key) return { ok: false, error: "키 형식이 올바르지 않습니다 (영문/숫자 25자리)" };

  const categoryText = asText(input.category);
  if (!categoryText) return { ok: false, error: "카테고리가 비어 있습니다" };
  const category = resolveCategory(categoryText);
  if (!category) return { ok: false, error: `지원하지 않는 카테고리입니다: ${categoryText}` };

  const versionText = asText(input.version);
  if (!versionText) return { ok: false, error: "버전이 비어 있습니다" };
  const version = resolveVersion(category, versionText);
  if (!version) return { ok: false, error: `${category}에 없는 버전입니다: ${versionText}` };

  const member = asText(input.member) || null;
  if (member && member.length > MAX_FIELD_LENGTH) {
    return { ok: false, error: `사용자명은 ${MAX_FIELD_LENGTH}자 이하여야 합니다` };
  }

  const memo = asText(input.memo) || null;
  if (memo && memo.length > MAX_MEMO_LENGTH) {
    return { ok: false, error: `메모는 ${MAX_MEMO_LENGTH}자 이하여야 합니다` };
  }

  return { ok: true, row: { key, category, version, member, memo } };
}
