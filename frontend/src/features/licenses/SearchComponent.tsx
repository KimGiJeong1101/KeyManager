import React, { KeyboardEvent, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import Select from "../../components/ui/Select";
import { SearchField } from "../../types/item";
import { SelectOption } from "../../types/ui";

const FILTER_OPTIONS: SelectOption<SearchField>[] = [
  { value: "all", label: "전체" },
  { value: "key", label: "키" },
  { value: "member", label: "사용자" },
];

interface SearchComponentProps {
  onSearch: (field: SearchField, keyword: string) => void;
}

const SearchComponent: React.FC<SearchComponentProps> = ({ onSearch }) => {
  const [content, setContent] = useState("");
  const [filterOption, setFilterOption] = useState<SearchField>("all");

  const handleSearch = () => {
    onSearch(filterOption, content);
  };

  const handleClear = () => {
    setContent("");
    onSearch(filterOption, "");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleSearch();
    if (event.key === "Escape" && content) handleClear();
  };

  return (
    <div className="flex items-center w-full sm:max-w-lg transition-all duration-300">
      <div className="flex w-full bg-slate-100 rounded-xl p-1 transition-all duration-300 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 dark:bg-white/5 dark:border-white/10 dark:focus-within:ring-cyan-400/30 dark:focus-within:border-cyan-400/50">
        {/* 필터 셀렉트 */}
        <Select
          size="sm"
          value={filterOption}
          onChange={setFilterOption}
          options={FILTER_OPTIONS}
          aria-label="검색 필드 선택"
          className="w-24 flex-shrink-0"
        />

        {/* 구분선 */}
        <div className="w-px h-5 bg-slate-300 mx-2 self-center dark:bg-white/10" />

        {/* 검색 입력 */}
        <div className="flex-grow flex items-center px-1 min-w-0">
          <SearchIcon className="text-slate-400 mr-2 flex-shrink-0 dark:text-slate-500" sx={{ fontSize: 16 }} />
          <input
            type="text"
            placeholder="키 / 사용자 검색"
            aria-label="검색어 입력"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium dark:text-slate-100 dark:placeholder:text-slate-600"
          />
          {/* 검색어 초기화 버튼: 입력 내용이 있을 때만 표시 */}
          {content && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-0.5 ml-1 text-slate-400 hover:text-slate-600 rounded transition-colors dark:text-slate-500 dark:hover:text-slate-300"
              title="검색 초기화"
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </button>
          )}
        </div>

        {/* 검색 버튼 */}
        <button
          onClick={handleSearch}
          aria-label="검색 실행"
          className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 active:scale-95 dark:bg-gradient-to-r dark:from-indigo-500 dark:to-fuchsia-500 dark:hover:from-indigo-400 dark:hover:to-fuchsia-400"
        >
          <SearchIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
};

export default SearchComponent;
