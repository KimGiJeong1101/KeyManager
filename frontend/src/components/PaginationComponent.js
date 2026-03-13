import React from "react";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";

// ─────────────────────────────────────────────
// PaginationComponent
//
// 페이지 번호를 pagesToShow 단위로 그룹화해 표시.
// 예) pagesToShow=5, currentPage=7 이면 6~10 그룹을 보여줌.
//
// 그룹 계산 로직:
//   currentGroupFirstPage = floor((currentPage-1) / pagesToShow) * pagesToShow + 1
//   예: currentPage=7, pagesToShow=5 → floor(6/5)*5+1 = 6
// ─────────────────────────────────────────────
const PaginationComponent = ({
  currentPage,
  totalPages,
  pagesToShow,
  onPageChange,
}) => {
  // 현재 페이지가 속한 그룹의 첫 번째 / 마지막 페이지 번호
  const currentGroupFirstPage =
    Math.floor((currentPage - 1) / pagesToShow) * pagesToShow + 1;
  const currentGroupLastPage = Math.min(
    currentGroupFirstPage + pagesToShow - 1,
    totalPages,
  );

  const btnBase =
    "group flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 font-semibold text-[13px] outline-none select-none";

  const btnActive =
    "bg-indigo-600 text-white shadow-sm";

  const btnInactive =
    "text-slate-500 hover:bg-slate-700 hover:text-slate-200";

  // pointer-events-none으로 클릭 이벤트 자체를 차단 (disabled 속성 대신)
  const btnDisabled =
    "opacity-20 cursor-not-allowed text-slate-300 pointer-events-none";

  return (
    <div className="flex items-center justify-center py-2">
      <nav className="flex items-center gap-1 bg-slate-800 p-1.5 rounded-xl border border-slate-700 shadow-sm">
        {/* 첫 페이지로 이동 */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
        >
          <KeyboardDoubleArrowLeft sx={{ fontSize: "1rem" }} />
        </button>

        {/* 이전 페이지로 이동 */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
        >
          <KeyboardArrowLeft sx={{ fontSize: "1.1rem" }} />
        </button>

        {/* 현재 그룹의 페이지 번호 버튼들 */}
        <div className="flex items-center gap-1 mx-1">
          {Array.from(
            { length: currentGroupLastPage - currentGroupFirstPage + 1 },
            (_, index) => {
              const pageNum = currentGroupFirstPage + index;
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`${btnBase} ${isActive ? btnActive : btnInactive}`}
                >
                  {pageNum}
                </button>
              );
            },
          )}
        </div>

        {/* 다음 페이지로 이동 */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
        >
          <KeyboardArrowRight sx={{ fontSize: "1.1rem" }} />
        </button>

        {/* 마지막 페이지로 이동 */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
        >
          <KeyboardDoubleArrowRight sx={{ fontSize: "1rem" }} />
        </button>
      </nav>
    </div>
  );
};

export default PaginationComponent;
