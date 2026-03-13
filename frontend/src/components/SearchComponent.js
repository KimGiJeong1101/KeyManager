import React, { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

const SearchComponent = ({ onSearch }) => {
  const [content, setContent] = useState("");
  const [filterOption, setFilterOption] = useState("all");

  const handleSearch = () => {
    onSearch(filterOption, content);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleSearch();
  };

  return (
    <div className="flex items-center w-full max-w-lg transition-all duration-300">
      <div className="flex w-full bg-slate-800 rounded-xl p-1 transition-all duration-300 border border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500">
        {/* 필터 셀렉트 */}
        <div className="relative flex items-center">
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="z-10 bg-slate-700 text-slate-300 text-xs font-semibold pl-3 pr-7 py-2 rounded-lg border border-slate-600 outline-none cursor-pointer hover:bg-slate-600 transition-all appearance-none min-w-[80px]"
          >
            <option value="all">전체</option>
            <option value="key">키</option>
            <option value="member">사용자</option>
          </select>
          <KeyboardArrowDownIcon
            className="absolute right-1.5 pointer-events-none text-slate-500"
            sx={{ fontSize: 14 }}
          />
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-slate-600 mx-2 self-center" />

        {/* 검색 입력 */}
        <div className="flex-grow flex items-center px-1">
          <SearchIcon className="text-slate-500 mr-2" sx={{ fontSize: 16 }} />
          <input
            type="text"
            placeholder="키 / 사용자 검색"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-600 font-medium"
          />
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={handleSearch}
          className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 active:scale-95"
        >
          <SearchIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
};

export default SearchComponent;
