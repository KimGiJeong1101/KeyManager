// 등록 폼의 5칸 키 입력(XXXXX-XXXXX-XXXXX-XXXXX-XXXXX) 관련 순수 함수.

export const KEY_GROUP_LENGTH = 5;

// 붙여넣기 처리가 필요한지 판단한다.
// 영문/숫자 5자 이하는 브라우저 기본 붙여넣기 → onChange 검증 경로로 충분하다.
// 그 외(전체 키, 하이픈/공백 포함 등)는 가로채서 여러 칸에 나눠 채운다.
export const shouldSplitPaste = (text: string): boolean =>
  !new RegExp(`^[A-Za-z0-9]{0,${KEY_GROUP_LENGTH}}$`).test(text);

// 붙여넣은 텍스트를 startIndex 칸부터 5자씩 나눠 채운다.
// 영문/숫자 외 문자(하이픈, 공백, 줄바꿈 등)는 제거하고 대문자로 바꾼다.
// 칸 수를 넘는 나머지는 버린다. 채울 문자가 없으면 null.
export function distributePastedKey(
  keys: string[],
  startIndex: number,
  text: string,
): { keys: string[]; focusIndex: number } | null {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return null;

  const next = [...keys];
  let index = startIndex;
  let rest = cleaned;
  while (rest && index < next.length) {
    next[index] = rest.slice(0, KEY_GROUP_LENGTH);
    rest = rest.slice(KEY_GROUP_LENGTH);
    index++;
  }

  // 마지막으로 채운 칸이 꽉 찼으면 다음 칸으로, 아니면 그 칸에 포커스 (이어서 입력할 수 있도록)
  const lastFilled = index - 1;
  const focusIndex =
    next[lastFilled].length === KEY_GROUP_LENGTH && lastFilled < next.length - 1
      ? lastFilled + 1
      : lastFilled;

  return { keys: next, focusIndex };
}
