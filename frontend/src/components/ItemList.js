import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import ItemListDisplay from "./ItemListDisplay";
import PaginationComponent from "./PaginationComponent";
import SearchComponent from "./SearchComponent";

// ─────────────────────────────────────────────
// 컴포넌트 외부 상수 선언
// 렌더링마다 재생성되지 않도록 모듈 스코프에 고정.
// ─────────────────────────────────────────────

// 카테고리별 버전 목록 (카테고리 select → 버전 select 연동에 사용)
const VERSION_OPTIONS = {
  Windows: [
    "Windows 11 Pro",
    "Windows 11 Home",
    "Windows 11 Enterprise",
    "Windows 10 Pro",
    "Windows 10 Home",
    "Windows 10 Enterprise",
    "Windows 8.1 Pro",
    "Windows 7 Professional",
    "Windows 7 Ultimate",
    "Windows Server 2022 Standard",
    "Windows Server 2019 Standard",
    "Windows Server 2016 Standard",
    "Windows Server 2012 R2",
    "Windows Server 2008 R2",
  ],
  MS_Office: [
    "Microsoft 365 Business",
    "Microsoft 365 Apps for Enterprise",
    "Office 2021 Professional Plus",
    "Office 2019 Professional Plus",
    "Office 2016 Professional Plus",
    "Office 2013 Professional",
    "Office 2010 Professional Plus",
    "Office 2007 Standard",
  ],
  Hancom: [
    "한컴오피스 2024",
    "한컴오피스 2022",
    "한컴오피스 2020",
    "한컴오피스 2018",
    "한컴오피스 2014 VP",
    "한컴오피스 2010 SE",
    "한컴오피스 한글 2010",
    "한컴오피스 한글 2007",
  ],
};

const ITEMS_PER_PAGE = 10;
const PAGES_TO_SHOW = 5;

// 탭 이름 → API 파라미터 값 매핑
// "전체" 탭은 서버에서 "allassets"로 처리 (카테고리 필터 없음)
const CATEGORY_MAP = {
  "전체": "allassets",
  Windows: "Windows",
  MS_Office: "MS_Office",
  Hancom: "Hancom",
};

const ItemList = () => {
  // ── 1. 데이터 및 등록 관련 상태 ──────────────────
  const [items, setItems] = useState([]);
  // keys: 5개 입력칸 각각의 값을 배열로 관리 (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
  const [keys, setKeys] = useState(["", "", "", "", ""]);
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  // categoryStats: 상단 통계 카드용 집계 데이터
  const [categoryStats, setCategoryStats] = useState([]);

  // ── 2. 필터 및 검색 상태 ─────────────────────────
  const [selectedCategory, setSelectedCategory] = useState("allassets");
  const [searchType, setSearchType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ── 3. 페이지네이션 상태 ─────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // 키 입력칸 5개의 DOM 참조 (입력 완료 시 다음 칸으로 자동 포커스)
  const inputRefs = useRef([]);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  // 5개 칸 모두 5글자가 채워져야 등록 버튼 활성화
  const isKeyComplete = keys.every((key) => key.length === 5);

  // ── 데이터 통신 로직 ─────────────────────────────

  const fetchCategoryStats = async () => {
    try {
      const response = await axios.get("http://localhost:5000/items/category-stats");
      setCategoryStats(response.data);
    } catch (error) {
      console.error("통계 로딩 실패:", error);
    }
  };

  const fetchItems = async (page) => {
    try {
      const response = await axios.get("http://localhost:5000/items", {
        params: {
          page,
          limit: ITEMS_PER_PAGE,
          category: selectedCategory,
          searchField: searchType,
          searchValue: searchTerm,
        },
      });
      setItems(response.data.items);
      setTotalItems(response.data.total);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  // 탭 클릭 시 카테고리를 API 파라미터로 변환하고 1페이지로 초기화
  const handleCategoryChange = (tabName) => {
    setSelectedCategory(CATEGORY_MAP[tabName] || tabName);
    setCurrentPage(1);
  };

  // 검색 실행 시 조건 업데이트 + 1페이지로 초기화
  const handleSearchRequest = (type, keyword) => {
    setSearchType(type);
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  const addItems = async () => {
    if (!isKeyComplete || !category || !version) {
      alert("카테고리, 버전 및 25자리 키를 모두 확인해주세요.");
      return;
    }
    try {
      await axios.post("http://localhost:5000/items", {
        // 5개 칸을 하이픈으로 연결해 "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" 형식으로 전송
        key: keys.join("-"),
        category,
        version,
      });
      setKeys(["", "", "", "", ""]);
      inputRefs.current[0].focus();
      fetchItems(currentPage);
      fetchCategoryStats();
      alert("새로운 라이선스가 등록되었습니다.");
    } catch (error) {
      alert(error.response?.data?.error || "등록 프로세스 중 오류가 발생했습니다.");
    }
  };

  const deleteItem = async (no) => {
    if (window.confirm("이 자산을 삭제하시겠습니까?")) {
      await axios.delete(`http://localhost:5000/items/${no}`);
      fetchItems(currentPage);
      fetchCategoryStats();
    }
  };

  const updateItem = async (no, key, member) => {
    try {
      await axios.put(`http://localhost:5000/items/${no}`, { key, member });
      fetchItems(currentPage);
      fetchCategoryStats();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // ── 키 입력 핸들러 ───────────────────────────────
  const handleChange = (index, value) => {
    // 영문자/숫자만 허용 (특수문자, 한글 입력 차단)
    if (!/^[A-Za-z0-9]{0,5}$/.test(value)) return;
    const updatedKeys = [...keys];
    updatedKeys[index] = value.toUpperCase();
    setKeys(updatedKeys);
    // 5글자 입력 완료 시 다음 칸으로 자동 포커스
    if (value.length === 5 && index < keys.length - 1)
      inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (event, index) => {
    // 현재 칸이 비어있을 때 Backspace → 이전 칸으로 포커스 이동
    if (event.key === "Backspace" && !keys[index] && index > 0)
      inputRefs.current[index - 1].focus();
    if (event.key === "Enter") addItems();
  };

  // ── useEffect ────────────────────────────────────

  // 통계는 마운트 시 1회만 호출 (필터/검색과 무관)
  useEffect(() => {
    fetchCategoryStats();
  }, []);

  // 목록은 페이지, 카테고리, 검색 조건이 바뀔 때마다 재조회
  useEffect(() => {
    fetchItems(currentPage);
  }, [currentPage, selectedCategory, searchType, searchTerm]);

  // ── useMemo ──────────────────────────────────────

  // categoryStats 변경 시에만 전체 합계 재계산
  const totalStats = useMemo(
    () =>
      categoryStats.reduce(
        (acc, curr) => ({
          total: acc.total + curr.total,
          active: acc.active + curr.active,
          available: acc.available + curr.available,
        }),
        { total: 0, active: 0, available: 0 },
      ),
    [categoryStats],
  );

  // 상단 통계 카드 3개의 설정값 (레이블, 숫자, 색상, 컬러 테두리)
  const statConfig = useMemo(
    () => [
      {
        label: "전체",
        mainCount: totalStats.total,
        detailKey: "total",
        color: "text-white",
        accent: "bg-slate-500",
        topBorder: "border-t-slate-500",
        hoverBg: "hover:bg-slate-800/60",
      },
      {
        label: "사용 중",
        mainCount: totalStats.active,
        detailKey: "active",
        color: "text-emerald-400",
        accent: "bg-emerald-400",
        topBorder: "border-t-emerald-500",
        hoverBg: "hover:bg-emerald-900/20",
      },
      {
        label: "미사용",
        mainCount: totalStats.available,
        detailKey: "available",
        color: "text-indigo-400",
        accent: "bg-indigo-400",
        topBorder: "border-t-indigo-500",
        hoverBg: "hover:bg-indigo-900/20",
      },
    ],
    [totalStats],
  );

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden">
      {/* 1. 상단 통계 카드
          호버 시 슬라이드 애니메이션으로 카테고리별 세부 수치 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 border-b border-slate-800">
        {statConfig.map((stat) => (
          <div
            key={stat.label}
            className={`group relative p-6 overflow-hidden h-[88px] transition-all duration-300 border-t-2 ${stat.topBorder} ${stat.hoverBg}`}
          >
            {/* 기본 뷰: 레이블 + 전체 합계 숫자 */}
            <div className="transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 mb-1.5">
                {stat.label}
              </p>
              <p className={`text-3xl font-bold tracking-tight ${stat.color}`}>
                {stat.mainCount}
              </p>
            </div>
            {/* 호버 뷰: 카테고리별 세부 수치 (아래에서 슬라이드 업) */}
            <div className="absolute inset-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-center">
              <p className="text-[9px] font-semibold tracking-widest text-slate-500 mb-2 uppercase pb-1.5 border-b border-slate-700">
                카테고리별
              </p>
              <div className="space-y-1">
                {categoryStats.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex justify-between items-center text-xs font-medium"
                  >
                    <span className="text-slate-500">{cat.category}</span>
                    <span className={`${stat.color}`}>
                      {cat[stat.detailKey]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. 카테고리 탭
          클릭 시 selectedCategory 변경 → useEffect가 목록 재조회 */}
      <div className="border-b border-slate-800">
        <nav className="flex items-center px-8">
          {["전체", "Windows", "MS_Office", "Hancom"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleCategoryChange(tab)}
              className={`px-4 py-4 text-sm font-semibold border-b-2 -mb-px transition-all duration-200 ${
                selectedCategory === (CATEGORY_MAP[tab] || tab)
                  ? "text-indigo-400 border-indigo-400 bg-indigo-900/20 rounded-t-md"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 border-transparent rounded-t-md"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* 헤더 섹션 */}
      <div className="px-8 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            라이선스 <span className="text-indigo-400">목록</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            라이선스 키 등록 및 사용자 관리
          </p>
        </div>
        <div className="flex-shrink-0">
          <SearchComponent onSearch={handleSearchRequest} />
        </div>
      </div>

      <div className="px-8 pb-8">
        {/* 3. 라이선스 등록 섹션 */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
              라이선스 등록
            </span>
            {/* isKeyComplete 상태에 따라 색상이 바뀌는 상태 배지 */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                isKeyComplete
                  ? "bg-indigo-900/30 text-indigo-400"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {isKeyComplete ? "준비 완료" : "입력 대기"}
            </span>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/60 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 카테고리 선택 → 버전 목록이 연동되어 변경됨 */}
              <div className="w-full md:w-64 space-y-1.5">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                  카테고리
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setVersion(""); // 카테고리 바뀌면 버전 초기화
                  }}
                  className="w-full h-10 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                >
                  <option value="">카테고리 선택</option>
                  <option value="Windows">Windows</option>
                  <option value="MS_Office">MS_Office</option>
                  <option value="Hancom">Hancom</option>
                </select>
              </div>

              {/* 버전 선택: 카테고리 미선택 시 disabled */}
              <div className="w-full md:w-72 space-y-1.5">
                <label className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                  버전
                </label>
                <select
                  disabled={!category}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all disabled:bg-slate-800 disabled:text-slate-600"
                >
                  <option value="">
                    {category ? "버전 선택" : "카테고리 선택 우선"}
                  </option>
                  {category &&
                    VERSION_OPTIONS[category].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-700"></div>

            {/* 제품 키 입력: 5칸 분리 입력 + 자동 포커스 이동 */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                제품 키
              </label>
              <div className="flex flex-col xl:flex-row items-center gap-5">
                <div className="flex items-center gap-2">
                  {keys.map((key, index) => (
                    <React.Fragment key={index}>
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        ref={(el) => (inputRefs.current[index] = el)}
                        className="w-[62px] sm:w-[78px] h-10 text-center font-mono font-bold text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all tracking-widest text-slate-100 placeholder:text-slate-600"
                        placeholder="XXXXX"
                      />
                      {index < keys.length - 1 && (
                        <span className="text-slate-600 font-light text-lg">—</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                {/* 3가지 조건(키 완성 + 카테고리 + 버전) 모두 충족 시 버튼 활성화 */}
                <button
                  onClick={addItems}
                  disabled={!isKeyComplete || !category || !version}
                  className={`w-full xl:w-auto px-7 h-10 text-sm font-semibold rounded-lg transition-all ${
                    isKeyComplete && category && version
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 active:scale-95 shadow-md shadow-indigo-200"
                      : "bg-slate-700/50 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 목록 섹션 */}
        <div className="min-h-[500px] relative">
          <ItemListDisplay
            items={items}
            deleteItem={deleteItem}
            updateItem={updateItem}
          />
        </div>

        {/* 5. 하단 페이지네이션 */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            전체 <span className="text-slate-200 font-semibold">{totalItems}</span>개 중{" "}
            <span className="text-slate-200 font-semibold">{items.length}</span>개 표시
          </p>
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            pagesToShow={PAGES_TO_SHOW}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default ItemList;
