import React, { KeyboardEvent, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Category, Item } from "../../types/item";

// 행 좌측 인디케이터 색상
const CATEGORY_INDICATOR: Record<Category, string> = {
  Windows: "bg-blue-500 dark:bg-blue-400",
  MS_Office: "bg-orange-400 dark:bg-orange-400",
  Hancom: "bg-teal-500 dark:bg-teal-400",
};

interface CategoryStyle {
  label: string;
  className: string;
}

// 카테고리 코드명 → 표시명 + 색상 매핑
const CATEGORY_STYLE: Record<Category, CategoryStyle> = {
  Windows: {
    label: "Windows",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/20",
  },
  MS_Office: {
    label: "MS Office",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:border-orange-400/20",
  },
  Hancom: {
    label: "한컴오피스",
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-400/10 dark:text-teal-300 dark:border-teal-400/20",
  },
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const style = CATEGORY_STYLE[category as Category] || {
    label: category || "미지정",
    className: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
};

// 스켈레톤 행 (데이터 로딩 중 표시)
const SkeletonRow: React.FC = () => (
  <tr>
    <td className="px-4 py-3.5 first:rounded-l-xl border-y border-l bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
      <div className="h-5 w-10 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-3.5 border-y bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
      <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded animate-pulse mb-2" />
      <div className="h-3 w-24 bg-slate-200/70 dark:bg-white/5 rounded animate-pulse" />
    </td>
    <td className="px-4 py-3.5 border-y bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
      <div className="h-5 w-16 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-3.5 border-y bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/10 text-center">
      <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-full animate-pulse mx-auto" />
    </td>
    <td className="px-4 py-3.5 last:rounded-r-xl border-y border-r bg-slate-50 border-slate-200 dark:bg-white/[0.03] dark:border-white/10">
      <div className="flex justify-end gap-2">
        <div className="h-8 w-8 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        <div className="h-8 w-8 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
      </div>
    </td>
  </tr>
);

const COPY_RESET_DELAY = 1500;

interface ItemListDisplayProps {
  items: Item[];
  isLoading: boolean;
  deleteItem: (no: number) => void;
  updateItem: (no: number, key: string, member: string) => Promise<boolean>;
  isFiltering: boolean;
  onResetFilters: () => void;
  onOpenRegister: () => void;
}

const ItemListDisplay: React.FC<ItemListDisplayProps> = ({
  items,
  isLoading,
  deleteItem,
  updateItem,
  isFiltering,
  onResetFilters,
  onOpenRegister,
}) => {
  // editMode: 현재 편집 중인 항목의 no (null이면 편집 모드 없음)
  // 라이선스 키는 등록된 실물 키 값 그 자체이므로 편집 대상에서 제외한다.
  // 오타 등으로 값을 바로잡아야 한다면 삭제 후 재등록(중복 검증을 다시 거치는 경로)을 사용한다.
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editMember, setEditMember] = useState("");
  // copiedNo: 복사 완료 아이콘을 잠시 보여줄 항목의 no
  const [copiedNo, setCopiedNo] = useState<number | null>(null);

  const handleEdit = (item: Item) => {
    setEditMode(item.no);
    // member가 null/undefined인 경우 빈 문자열로 초기화
    setEditMember(item.member || "");
  };

  const handleSave = async () => {
    const target = items.find((item) => item.no === editMode);
    if (!target || editMode === null) return;
    // 서버가 실패(예: 중복 키)를 반환하면 편집 모드를 유지해 사용자가 값을 고칠 수 있게 한다.
    const success = await updateItem(editMode, target.key, editMember);
    if (success) setEditMode(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSave();
    if (event.key === "Escape") setEditMode(null);
  };

  const handleCopy = async (item: Item) => {
    try {
      await navigator.clipboard.writeText(item.key);
      setCopiedNo(item.no);
      setTimeout(() => setCopiedNo((prev) => (prev === item.no ? null : prev)), COPY_RESET_DELAY);
    } catch (error) {
      console.error("클립보드 복사 실패:", error);
    }
  };

  // 사용자 배정 여부 판단
  // null, '사용자없음', 빈 문자열 → 미사용(미배정) 상태
  const isAssigned = (member: string | null): boolean =>
    !!member && member !== "사용자없음" && member !== "";

  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      {!isEmpty && (
      <table className="w-full border-separate border-spacing-y-1.5">
        <thead>
          <tr className="bg-slate-50 dark:bg-transparent">
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 text-center w-20 first:rounded-l-lg">
              번호
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 text-left">
              라이선스 키
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 text-center">
              카테고리
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 text-center">
              사용자
            </th>
            <th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400 text-right pr-8 last:rounded-r-lg">
              관리
            </th>
          </tr>
        </thead>

        <tbody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : null}
          {!isLoading && items.map((item) => {
            const assigned = isAssigned(item.member);
            // isEditing: 현재 행이 편집 모드인지 여부
            const isEditing = editMode === item.no;

            return (
              <tr
                key={item.no}
                className={`group transition-all duration-200 ${
                  isEditing ? "translate-x-0.5" : ""
                }`}
              >
                {/* 번호 셀: 편집 모드일 때 인디고 배경/테두리로 강조 */}
                <td
                  className={`relative px-4 py-3.5 first:rounded-l-xl border-y border-l transition-all duration-200 ${
                    isEditing
                      ? "border-indigo-300 bg-indigo-50 dark:border-cyan-400/40 dark:bg-cyan-400/[0.06]"
                      : "bg-slate-50 border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-100 dark:bg-white/[0.02] dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  {/* 카테고리 컬러 인디케이터 */}
                  {!isEditing && (
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full opacity-70 ${
                        CATEGORY_INDICATOR[item.category as Category] || "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                  )}
                  <div className="flex justify-center">
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                        isEditing
                          ? "bg-indigo-600 text-white dark:bg-cyan-500 dark:text-slate-950"
                          : "bg-slate-200 text-slate-500 group-hover:text-slate-700 dark:bg-white/10 dark:text-slate-400 dark:group-hover:text-slate-200"
                      }`}
                    >
                      {item.no.toString().padStart(3, "0")}
                    </span>
                  </div>
                </td>

                {/* 라이선스 키 셀: 배정된 키는 취소선 + 흐린 색으로 표시 */}
                <td
                  className={`px-4 py-3.5 border-y transition-all duration-200 ${
                    isEditing
                      ? "border-indigo-300 bg-indigo-50 dark:border-cyan-400/40 dark:bg-cyan-400/[0.06]"
                      : "bg-slate-50 border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-100 dark:bg-white/[0.02] dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-semibold text-sm leading-none tracking-wide transition-all ${
                          assigned && !isEditing
                            ? "text-slate-400 line-through dark:text-slate-600"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {item.key}
                      </span>
                      <button
                        onClick={() => handleCopy(item)}
                        aria-label="라이선스 키 복사"
                        title="키 복사"
                        className="p-1 rounded-md text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all dark:text-slate-600 dark:hover:text-cyan-300 dark:hover:bg-cyan-400/10"
                      >
                        {copiedNo === item.no ? (
                          <CheckIcon sx={{ fontSize: 13 }} className="text-emerald-500 dark:text-emerald-400" />
                        ) : (
                          <ContentCopyRoundedIcon sx={{ fontSize: 13 }} />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[10px] font-medium tracking-wide ${
                          assigned ? "text-slate-400 dark:text-slate-600" : "text-indigo-600 dark:text-cyan-400"
                        }`}
                      >
                        {item.version}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 카테고리 셀 */}
                <td
                  className={`px-4 py-3.5 border-y transition-all duration-200 text-center ${
                    isEditing
                      ? "border-indigo-300 bg-indigo-50 dark:border-cyan-400/40 dark:bg-cyan-400/[0.06]"
                      : "bg-slate-50 border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-100 dark:bg-white/[0.02] dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  <CategoryBadge category={item.category} />
                </td>

                {/* 사용자 셀: 편집 모드 → 입력칸, 일반 모드 → 상태 배지 */}
                <td
                  className={`px-4 py-3.5 border-y transition-all duration-200 text-center ${
                    isEditing
                      ? "border-indigo-300 bg-indigo-50 dark:border-cyan-400/40 dark:bg-cyan-400/[0.06]"
                      : "bg-slate-50 border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-100 dark:bg-white/[0.02] dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  {isEditing ? (
                    <div className="relative inline-block">
                      <input
                        type="text"
                        value={editMember}
                        onChange={(e) => setEditMember(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="사용자명"
                        aria-label="사용자명 수정"
                        className="w-36 px-3 py-1.5 text-xs font-medium bg-white text-slate-900 border-2 border-indigo-500 rounded-lg outline-none shadow-sm placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-cyan-400 dark:placeholder:text-slate-600"
                        autoFocus
                      />
                    </div>
                  ) : (
                    // 사용 중: 에메랄드(초록) 배지 + pulse 애니메이션
                    // 미사용: 회색 배지
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                        assigned
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20"
                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          assigned ? "bg-emerald-500 animate-pulse dark:bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      ></span>
                      {assigned ? item.member : "미사용"}
                    </span>
                  )}
                </td>

                {/* 관리 버튼 셀
                    편집 모드: 저장(체크) / 취소(X)
                    일반 모드: 수정(연필) / 삭제(휴지통)
                    삭제 버튼은 배정된 키(사용 중)일 경우 비활성화 */}
                <td
                  className={`px-4 py-3.5 last:rounded-r-xl border-y border-r transition-all duration-200 text-right pr-6 ${
                    isEditing
                      ? "border-indigo-300 bg-indigo-50 dark:border-cyan-400/40 dark:bg-cyan-400/[0.06]"
                      : "bg-slate-50 border-slate-200 group-hover:border-slate-300 group-hover:bg-slate-100 dark:bg-white/[0.02] dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-end gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          aria-label="저장"
                          title="저장"
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-90 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                        >
                          <CheckIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          onClick={() => setEditMode(null)}
                          aria-label="편집 취소"
                          title="취소"
                          className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition-all dark:text-slate-400 dark:hover:bg-white/10"
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          aria-label="수정"
                          title="수정"
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all dark:text-slate-400 dark:hover:text-cyan-300 dark:hover:bg-cyan-400/10"
                        >
                          <EditRoundedIcon sx={{ fontSize: 16 }} />
                        </button>
                        <button
                          disabled={assigned}
                          onClick={() => deleteItem(item.no)}
                          aria-label={assigned ? "삭제 (사용 중인 키는 삭제할 수 없음)" : "삭제"}
                          title={assigned ? "사용 중인 키는 삭제할 수 없습니다" : "삭제"}
                          className={`p-2 rounded-lg transition-all ${
                            assigned
                              ? "text-slate-300 cursor-not-allowed dark:text-slate-700"
                              : "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-400/10"
                          }`}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}

      {/* 빈 상태 UI: 로딩 중에는 표시하지 않음.
          검색/필터 때문에 0건인 경우와, 애초에 등록된 라이선스가 없는 경우를 구분해서 안내한다. */}
      {isEmpty && isFiltering && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-transparent dark:border-white/10 dark:from-white/[0.03]">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <SearchOffRoundedIcon sx={{ fontSize: 20 }} className="text-slate-400 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">검색·필터 조건에 맞는 라이선스가 없습니다.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1.5">다른 조건으로 다시 검색하거나 필터를 초기화해보세요.</p>
          <button
            onClick={onResetFilters}
            className="mt-4 px-4 h-9 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
          >
            필터 초기화
          </button>
        </div>
      )}
      {isEmpty && !isFiltering && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-transparent dark:border-white/10 dark:from-white/[0.03]">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border border-slate-200 dark:bg-white/5 dark:border-white/10">
            <span className="text-slate-400 dark:text-slate-600 text-lg font-mono font-bold select-none">—</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">등록된 라이선스가 없습니다.</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1.5">새 라이선스 버튼으로 첫 라이선스를 등록해주세요.</p>
          <button
            onClick={onOpenRegister}
            className="mt-4 flex items-center gap-1.5 px-4 h-9 text-xs font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 transition-all dark:from-indigo-500 dark:to-fuchsia-500 dark:hover:from-indigo-400 dark:hover:to-fuchsia-400"
          >
            <AddRoundedIcon sx={{ fontSize: 15 }} />
            새 라이선스 등록
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemListDisplay;
