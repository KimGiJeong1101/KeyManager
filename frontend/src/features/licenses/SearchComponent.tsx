import React, { KeyboardEvent, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import SelectField from "../../components/ui/SelectField";
import { SearchField } from "../../types/item";
import { SelectOption } from "../../types/ui";

const FILTER_OPTIONS: SelectOption<SearchField>[] = [
  { value: "all", label: "전체" },
  { value: "key", label: "키" },
  { value: "member", label: "사용자" },
  { value: "memo", label: "메모" },
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
      <div className="flex w-full bg-slate-100 rounded-xl p-1 transition-all duration-300 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 dark:bg-white/5 dark:border-white/10 dark:focus-within:ring-cyan-400/30 dark:focus-within:border-cyan-400/50">
        {/* 필터 셀렉트 */}
        <SelectField
          size="sm"
          value={filterOption}
          onChange={setFilterOption}
          options={FILTER_OPTIONS}
          aria-label="검색 필드 선택"
          className="w-20 sm:w-24 flex-shrink-0 border-none bg-transparent"
        />

        {/* 구분선 */}
        <div className="w-px h-5 bg-slate-300 mx-1 sm:mx-2 self-center dark:bg-white/10" />

        {/* 검색 입력 */}
        <div className="flex-grow flex items-center px-1 min-w-0">
          <Search size={16} className="text-slate-400 mr-2 flex-shrink-0 dark:text-slate-500" />
          <input
            type="text"
            placeholder="키·사용자 검색"
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
              <X size={14} />
            </button>
          )}
        </div>

        {/* 검색 버튼 */}
        <Button
          onClick={handleSearch}
          size="icon"
          aria-label="검색 실행"
          className="h-9 w-9 rounded-lg shadow-none active:scale-95"
        >
          <Search size={16} />
        </Button>
      </div>
    </div>
  );
};

export default SearchComponent;
