import React from "react";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardDoubleArrowLeft from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import KeyboardDoubleArrowRight from "@mui/icons-material/KeyboardDoubleArrowRight";

const PaginationComponent = ({
  currentPage,
  totalPages,
  pagesToShow,
  onPageChange,
}) => {
  const currentGroupFirstPage =
    Math.floor((currentPage - 1) / pagesToShow) * pagesToShow + 1;
  const currentGroupLastPage = Math.min(
    currentGroupFirstPage + pagesToShow - 1,
    totalPages,
  );

  // 공통 버튼 스타일: 더 부드러운 라운딩과 정밀한 폰트 무게 적용
  const btnBase =
    "group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 font-bold text-[13px] outline-none select-none";

  // 액티브: 인디고 그라데이션과 강한 그림자로 강조
  const btnActive =
    "bg-slate-900 text-white shadow-lg shadow-indigo-200 ring-4 ring-indigo-500/10 scale-105 z-10";

  // 인액티브: 미세한 보더와 투명도 조절
  const btnInactive =
    "bg-white/50 text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm hover:-translate-y-0.5 border border-transparent hover:border-slate-100";

  // 비활성화: 시각적 노이즈를 줄이기 위해 더 연하게 처리
  const btnDisabled =
    "opacity-20 cursor-not-allowed text-slate-300 pointer-events-none";

  return (
    <div className="flex items-center justify-center py-6">
      {/* 프리미엄 캡슐 컨테이너: 배경 흐림 효과와 얇은 보더 */}
      <nav className="flex items-center gap-1.5 bg-slate-100/40 backdrop-blur-md p-1.5 rounded-[20px] border border-white shadow-sm">
        {/* FIRST PAGE */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
        >
          <KeyboardDoubleArrowLeft
            className="group-hover:-translate-x-0.5 transition-transform"
            sx={{ fontSize: "1.1rem" }}
          />
        </button>

        {/* PREV PAGE */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnInactive}`}
        >
          <KeyboardArrowLeft
            className="group-hover:-translate-x-0.5 transition-transform"
            sx={{ fontSize: "1.2rem" }}
          />
        </button>

        {/* PAGE NUMBERS */}
        <div className="flex items-center gap-1 mx-1.5">
          {Array.from(
            { length: currentGroupLastPage - currentGroupFirstPage + 1 },
            (_, index) => {
              const pageNum = currentGroupFirstPage + index;
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`${btnBase} ${isActive ? btnActive : btnInactive} relative overflow-hidden`}
                >
                  <span className="relative z-10">{pageNum}</span>

                  {/* 활성화 상태의 하단 인디케이터: 인디고 포인트 */}
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full animate-pulse"></span>
                  )}

                  {/* 호버 시 나타나는 배경 효과 (선택사항) */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-indigo-50/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  )}
                </button>
              );
            },
          )}
        </div>

        {/* NEXT PAGE */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
        >
          <KeyboardArrowRight
            className="group-hover:translate-x-0.5 transition-transform"
            sx={{ fontSize: "1.2rem" }}
          />
        </button>

        {/* LAST PAGE */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnInactive}`}
        >
          <KeyboardDoubleArrowRight
            className="group-hover:translate-x-0.5 transition-transform"
            sx={{ fontSize: "1.1rem" }}
          />
        </button>
      </nav>
    </div>
  );
};

export default PaginationComponent;
