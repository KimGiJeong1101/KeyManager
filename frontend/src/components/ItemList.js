import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import ItemListDisplay from "./ItemListDisplay";
import PaginationComponent from "./PaginationComponent";
import SearchComponent from "./SearchComponent";

const ItemList = () => {
  // 1. 데이터 및 등록 관련 상태
  const [items, setItems] = useState([]);
  const [keys, setKeys] = useState(["", "", "", "", ""]);
  const [category, setCategory] = useState(""); // 등록용 카테고리
  const [version, setVersion] = useState(""); // 등록용 버전
  const [categoryStats, setCategoryStats] = useState([]);

  // 2. 필터 및 검색 상태 (서로 독립적임)
  const [selectedCategory, setSelectedCategory] = useState("allassets"); // 상단 탭용
  const [searchType, setSearchType] = useState("all"); // 검색 셀렉트박스용
  const [searchTerm, setSearchTerm] = useState(""); // 검색어 입력값

  // 3. 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const pagesToShow = 5;

  const inputRefs = useRef([]);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isKeyComplete = keys.every((key) => key.length === 5);

  const versionOptions = {
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

  // --- [데이터 통신 로직] ---

  // 카테고리별 통계 가져오기
  const fetchCategoryStats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/items/category-stats",
      );
      setCategoryStats(response.data);
    } catch (error) {
      console.error("통계 로딩 실패:", error);
    }
  };

  // 통합 데이터 호출 함수 (모든 필터 적용)
  const fetchItems = async (page) => {
    console.log("-----------------------------------------");
    console.log(`[DATA FETCH] PAGE: ${page}`);
    console.log(`[FILTER] CATEGORY_TAB: ${selectedCategory}`);
    console.log(`[FILTER] SEARCH_TYPE: ${searchType}`);
    console.log(`[FILTER] KEYWORD: "${searchTerm}"`);
    console.log("-----------------------------------------");

    try {
      const response = await axios.get(`http://localhost:5000/items`, {
        params: {
          page: page,
          limit: itemsPerPage,
          category: selectedCategory, // 상단 탭
          searchField: searchType, // 검색 필터(KEY/MEMBER)
          searchValue: searchTerm, // 검색어
        },
      });
      setItems(response.data.items);
      setTotalItems(response.data.total);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  // 상단 카테고리 탭 클릭 시
  const handleCategoryChange = (tabName) => {
    // 탭 이름과 DB 값을 매핑하는 객체
    const categoryMap = {
      "All Assets": "allassets",
      Windows: "Windows",
      MS_Office: "MS_Office",
      Hancom: "Hancom",
    };

    const dbCategory = categoryMap[tabName] || tabName;

    console.log(`[EVENT] 카테고리 탭 변경: ${dbCategory}`);
    setSelectedCategory(dbCategory);
    setCurrentPage(1);
  };

  // 검색 컴포넌트 실행 시
  const handleSearchRequest = (type, keyword) => {
    console.log(`[EVENT] 검색 실행 - 필터: ${type}, 검색어: ${keyword}`);
    setSearchType(type);
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  const addItems = async () => {
    if (!isKeyComplete || !category || !version) {
      alert("카테고리, 버전 및 25자리 키를 모두 확인해주세요.");
      return;
    }
    const combinedKey = keys.join("-");

    try {
      await axios.post("http://localhost:5000/items", {
        key: combinedKey,
        category: category,
        version: version,
      });
      setKeys(["", "", "", "", ""]);
      inputRefs.current[0].focus();
      fetchItems(currentPage);
      fetchCategoryStats();
      alert("새로운 라이선스가 등록되었습니다.");
    } catch (error) {
      alert(
        error.response?.data?.error || "등록 프로세스 중 오류가 발생했습니다.",
      );
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

  // 키 입력 핸들러
  const handleChange = (index, value) => {
    const regex = /^[A-Za-z0-9]{0,5}$/;
    if (!regex.test(value)) return;
    const updatedKeys = [...keys];
    updatedKeys[index] = value.toUpperCase();
    setKeys(updatedKeys);
    if (value.length === 5 && index < keys.length - 1)
      inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !keys[index] && index > 0)
      inputRefs.current[index - 1].focus();
    if (event.key === "Enter") addItems();
  };

  useEffect(() => {
    fetchCategoryStats();
    fetchItems(currentPage);
  }, [currentPage, selectedCategory, searchType, searchTerm]);

  // 전체 요약 정보 계산
  const totalStats = categoryStats.reduce(
    (acc, curr) => ({
      total: acc.total + curr.total,
      active: acc.active + curr.active,
      available: acc.available + curr.available,
    }),
    { total: 0, active: 0, available: 0 },
  );

  const statConfig = [
    {
      label: "TOTAL ASSETS",
      mainCount: totalStats.total,
      detailKey: "total",
      color: "text-slate-900",
      accent: "bg-slate-900",
    },
    {
      label: "ACTIVE KEYS",
      mainCount: totalStats.active,
      detailKey: "active",
      color: "text-emerald-600",
      accent: "bg-emerald-600",
    },
    {
      label: "AVAILABLE",
      mainCount: totalStats.available,
      detailKey: "available",
      color: "text-blue-600",
      accent: "bg-blue-600",
    },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-white/60 overflow-hidden">
      {/* 1. 상단 통계 대시보드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-8 bg-slate-50/50 border-b border-slate-100">
        {statConfig.map((stat) => (
          <div
            key={stat.label}
            className="group relative bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden h-24"
          >
            <div className="transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-4">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-black ${stat.color}`}>
                {stat.mainCount}
              </p>
            </div>
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-center">
              <p className="text-[9px] font-black text-slate-400 mb-2 tracking-tighter border-b border-slate-100 pb-1">
                BREAKDOWN BY CATEGORY
              </p>
              <div className="space-y-1">
                {categoryStats.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex justify-between items-center text-[11px] font-bold"
                  >
                    <span className="text-slate-500">{cat.category}</span>
                    <span className={`${stat.color}`}>
                      {cat[stat.detailKey]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div
              className={`absolute bottom-0 left-0 h-1 transition-all duration-300 w-0 group-hover:w-full ${stat.accent} opacity-20`}
            />
          </div>
        ))}
      </div>

      {/* 2. 카테고리 네비게이션 */}
      <div className="px-10 pt-8">
        <nav className="flex items-center gap-2 p-1.5 w-fit bg-slate-100/80 rounded-2xl border border-slate-200/50">
          {["All Assets", "Windows", "MS_Office", "Hancom"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleCategoryChange(tab)}
              className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${
                selectedCategory === tab.toLowerCase().replace(" ", "")
                  ? "bg-white text-indigo-600 shadow-md ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* 헤더 섹션 */}
      <div className="px-10 py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Asset <span className="text-indigo-600">Database</span>
          </h2>
          <p className="text-[13px] text-slate-400 font-semibold flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            라이선스 자산 통합 관리
          </p>
        </div>
        <div className="flex-shrink-0">
          <SearchComponent onSearch={handleSearchRequest} />
        </div>
      </div>

      <div className="px-10 py-10">
        {/* 3. 키 등록 섹션 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5 px-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em]">
              New Product Key Registration
            </label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isKeyComplete ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"}`}
            >
              {isKeyComplete ? "READY TO REGISTER" : "WAITING FOR INPUT"}
            </span>
          </div>

          <div className="bg-slate-50/70 p-8 rounded-[2rem] border border-slate-100/80 flex flex-col gap-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-72 space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                  1. Select Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setVersion("");
                  }}
                  className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                >
                  <option value="">카테고리 선택</option>
                  <option value="Windows">Windows</option>
                  <option value="MS_Office">MS_Office</option>
                  <option value="Hancom">Hancom</option>
                </select>
              </div>

              <div className="w-full md:w-80 space-y-2">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                  2. Select Version
                </label>
                <select
                  disabled={!category}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all disabled:bg-slate-100"
                >
                  <option value="">
                    {category ? "버전 선택" : "카테고리 선택 우선"}
                  </option>
                  {category &&
                    versionOptions[category].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 w-full"></div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">
                3. Enter Product Key
              </label>
              <div className="flex flex-col xl:flex-row items-center gap-8">
                <div className="flex items-center gap-2 md:gap-2.5">
                  {keys.map((key, index) => (
                    <React.Fragment key={index}>
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        ref={(el) => (inputRefs.current[index] = el)}
                        className="w-[62px] sm:w-[84px] h-14 text-center font-mono font-bold bg-white border-none rounded-xl shadow-sm ring-1 ring-slate-200 focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all"
                        placeholder="XXXXX"
                      />
                      {index < keys.length - 1 && (
                        <span className="text-slate-300 font-black">-</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <button
                  onClick={addItems}
                  disabled={!isKeyComplete || !category || !version}
                  className={`w-full xl:w-auto px-10 h-14 font-bold rounded-xl transition-all ${
                    isKeyComplete && category && version
                      ? "bg-slate-900 text-white hover:bg-indigo-600 shadow-lg active:scale-95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  REGISTER ASSET
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. 리스트 표시 섹션 */}
        <div className="min-h-[500px] relative">
          <ItemListDisplay
            items={items}
            deleteItem={deleteItem}
            updateItem={updateItem}
          />
        </div>

        {/* 5. 하단 정보 및 페이지네이션 */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-slate-400 font-medium">
            Showing{" "}
            <span className="text-slate-700 font-bold">{items.length}</span> of{" "}
            <span className="text-slate-700 font-bold">{totalItems}</span>{" "}
            assets
          </p>
          <PaginationComponent
            currentPage={currentPage}
            totalPages={totalPages}
            pagesToShow={pagesToShow}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default ItemList;
