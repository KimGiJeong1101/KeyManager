// 카테고리 코드명 → 화면 표시용 메타데이터(표시명, 배지/인디케이터 색상).
// 카테고리 목록 자체는 백엔드(GET /categories)가 단일 소스이고, 이 파일은 "어떻게 보여줄지"만 담당한다.
// 새 카테고리를 추가할 때 프론트에서 고칠 곳은 이 파일 한 곳뿐이며,
// 여기에 없는 카테고리도 FALLBACK 스타일 + 코드명 그대로 표시되므로 화면이 깨지지 않는다.

export interface CategoryMeta {
  label: string;
  // 카테고리 배지 색상
  badgeClass: string;
  // 목록 행 좌측 세로 인디케이터 색상
  indicatorClass: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  Windows: {
    label: "Windows",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/20",
    indicatorClass: "bg-blue-500 dark:bg-blue-400",
  },
  MS_Office: {
    label: "MS Office",
    badgeClass:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/20",
    indicatorClass: "bg-orange-400 dark:bg-orange-400",
  },
  Hancom: {
    label: "한컴오피스",
    badgeClass:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20",
    indicatorClass: "bg-teal-500 dark:bg-teal-400",
  },
};

const FALLBACK_BADGE_CLASS =
  "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10";
const FALLBACK_INDICATOR_CLASS = "bg-slate-300 dark:bg-slate-600";

export const getCategoryMeta = (category: string | null | undefined): CategoryMeta =>
  (category && CATEGORY_META[category]) || {
    label: category || "미지정",
    badgeClass: FALLBACK_BADGE_CLASS,
    indicatorClass: FALLBACK_INDICATOR_CLASS,
  };

// 사용자 배정 여부. 백엔드가 미배정 상태를 NULL 하나로 정규화해서 내려주지만,
// 공백만 있는 값이 혹시 섞여 들어와도 "사용 중"으로 보이지 않도록 trim해서 판단한다.
export const isAssigned = (member: string | null | undefined): boolean => !!member?.trim();

// 서버가 만든 이력 문구(예: "카테고리: Windows → MS_Office")의 "카테고리:" 부분에 있는 코드명을 표시명으로 바꾼다.
// 버전/메모 부분은 건드리지 않는다 (버전 이름 안에 우연히 같은 글자가 있어도 바뀌지 않도록).
export const labelizeCategoryChange = (detail: string): string =>
  detail
    .split(" / ")
    .map((part) =>
      part.startsWith("카테고리: ")
        ? "카테고리: " +
          part
            .slice("카테고리: ".length)
            .split(" → ")
            .map((code) => (code === "-" ? code : getCategoryMeta(code).label))
            .join(" → ")
        : part,
    )
    .join(" / ");
