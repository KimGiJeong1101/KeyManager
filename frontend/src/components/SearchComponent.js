import React, { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const SearchComponent = ({ onSearch }) => {
  const [content, setContent] = useState("");
  const [filterOption, setFilterOption] = useState("all");

  const handleSearch = () => {
    console.log("검색 버튼 클릭됨:", filterOption, content); // 이 로그가 찍히는지 확인!
    onSearch(filterOption, content);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleSearch();
  };

  return (
    <div className="flex items-center w-full max-w-lg transition-all duration-300">
      {/* 검색 바 메인 컨테이너: 인디고 테마의 글로우 효과 적용 */}
      <div className="flex w-full bg-slate-50/80 backdrop-blur-xl rounded-[1.5rem] p-1.5 transition-all duration-500 border border-slate-200/60 shadow-sm focus-within:bg-white focus-within:ring-[6px] focus-within:ring-indigo-500/5 focus-within:border-indigo-400/50 focus-within:shadow-[0_20px_40px_rgba(79,70,229,0.08)]">
        {/* 카테고리 셀렉트 섹션: 더 정교한 캡슐 디자인 */}
        <div className="relative flex items-center group/select">
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="z-10 bg-white text-slate-600 text-[10px] font-bold uppercase tracking-widest pl-5 pr-8 py-2.5 rounded-xl border border-slate-100 outline-none cursor-pointer hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] appearance-none text-center min-w-[100px]"
          >
            <option value="all">ALL</option>
            <option value="key">LICENSE KEY</option>
            <option value="member">USER</option>
          </select>
          {/* 셀렉트 박스 전용 커스텀 화살표 */}
          <KeyboardArrowDownIcon
            className="absolute right-2.5 pointer-events-none text-slate-300 group-hover/select:text-indigo-400 transition-colors"
            sx={{ fontSize: 14 }}
          />
        </div>

        {/* 세련된 수직 구분선 */}
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-slate-200 to-transparent mx-2.5 self-center" />

        {/* 입력 영역: 아이콘과 텍스트의 정렬 최적화 */}
        <div className="flex-grow flex items-center px-2">
          <SearchIcon
            className="text-slate-300 mr-3 transition-colors group-focus-within:text-indigo-400"
            sx={{ fontSize: 18 }}
          />
          <input
            type="text"
            placeholder="Search licenses or users..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-[13px] text-slate-700 placeholder:text-slate-300 font-semibold tracking-tight"
          />
        </div>

        {/* 검색 실행 버튼: 인디고 그라데이션과 모션 추가 */}
        <button
          onClick={handleSearch}
          className="group relative flex items-center justify-center w-11 h-11 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl transition-all duration-300 active:scale-95 shadow-lg shadow-slate-200 hover:shadow-indigo-200"
        >
          <SearchIcon
            sx={{ fontSize: 18 }}
            className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 ease-out"
          />
        </button>
      </div>
    </div>
  );
};

export default SearchComponent;
