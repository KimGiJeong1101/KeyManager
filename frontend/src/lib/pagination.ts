// pagination.ts
// 목록 재조회 결과를 보고 현재 페이지가 여전히 유효한지 판단하는 순수 함수.
// 삭제 등으로 마지막 페이지의 유일한 항목이 없어지면, 요청한 페이지에는 더 이상
// 항목이 없지만(response.items.length === 0) 다른 페이지에는 데이터가 남아있는
// 상태가 될 수 있다. 이 경우 화면에 "등록된 항목이 없습니다"로 잘못 표시되는 것을
// 막기 위해 유효한 마지막 페이지로 되돌린다.
export function resolveValidPage(
  requestedPage: number,
  total: number,
  itemsPerPage: number,
  returnedItemsCount: number,
): number {
  const lastValidPage = Math.max(1, Math.ceil(total / itemsPerPage));
  if (returnedItemsCount === 0 && requestedPage > lastValidPage) {
    return lastValidPage;
  }
  return requestedPage;
}
