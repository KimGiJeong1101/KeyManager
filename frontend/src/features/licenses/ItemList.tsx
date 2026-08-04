import React, {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ItemListDisplay from "./ItemListDisplay";
import PaginationComponent from "../../components/ui/PaginationComponent";
import SearchComponent from "./SearchComponent";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RegisterModal from "./RegisterModal";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { KeyRound, User, Unlock, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createItem,
  deleteItemRequest,
  getCategoryStats,
  getErrorMessage,
  getItems,
  updateItemRequest,
} from "../../api/items";
import { Category, CategoryStat, Item, SearchField, StatusFilter } from "../../types/item";

// 토스트 액션별 아이콘 (성공/중립 토스트에서 등록·수정·삭제를 구분해서 보여주기 위함)
const TOAST_ICON: Record<string, ReactNode> = {
  add: <Plus size={18} className="text-emerald-500" />,
  edit: <Pencil size={18} className="text-emerald-500" />,
  delete: <Trash2 size={18} className="text-slate-400" />,
};

// ─────────────────────────────────────────────
// 컴포넌트 외부 상수 선언
// 렌더링마다 재생성되지 않도록 모듈 스코프에 고정.
// ─────────────────────────────────────────────

// 카테고리별 버전 목록 (카테고리 select → 버전 select 연동에 사용)
const VERSION_OPTIONS: Record<Category, string[]> = {
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
const CATEGORY_MAP: Record<string, string> = {
  "전체": "allassets",
  Windows: "Windows",
  MS_Office: "MS_Office",
  Hancom: "Hancom",
};

// 탭 버튼에 표시할 사람이 읽기 좋은 이름
const TAB_LABELS = ["전체", "Windows", "MS_Office", "Hancom"];
const TAB_DISPLAY: Record<string, string> = {
  "전체": "전체",
  Windows: "Windows",
  MS_Office: "MS Office",
  Hancom: "한컴오피스",
};

// 통계 호버 패널 등에서 카테고리 코드명 → 표시명 변환
const CATEGORY_DISPLAY: Record<string, string> = {
  Windows: "Windows",
  MS_Office: "MS Office",
  Hancom: "한컴오피스",
};

// 사용 상태 필터: 라벨 → API 파라미터 값 매핑
const STATUS_MAP: Record<string, StatusFilter> = {
  "전체": "all",
  "사용 중": "assigned",
  "미사용": "unassigned",
};
const STATUS_LABELS = ["전체", "사용 중", "미사용"];

type StatDetailKey = "total" | "active" | "available";

interface StatConfigItem {
  label: string;
  mainCount: number;
  detailKey: StatDetailKey;
  color: string;
  topBorder: string;
  hoverBg: string;
  iconBg: string;
  icon: ReactNode;
  showBar: boolean;
  barColor?: string;
}

const ItemList: React.FC = () => {
  // ── 1. 데이터 및 등록 관련 상태 ──────────────────
  const [items, setItems] = useState<Item[]>([]);
  // keys: 5개 입력칸 각각의 값을 배열로 관리 (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
  const [keys, setKeys] = useState<string[]>(["", "", "", "", ""]);
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  // categoryStats: 상단 통계 카드용 집계 데이터
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);

  // ── 2. 필터 및 검색 상태 ─────────────────────────
  const [selectedCategory, setSelectedCategory] = useState("allassets");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchType, setSearchType] = useState<SearchField>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ── 3. 페이지네이션 상태 ─────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ── 4. UI 상태 ───────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  // deleteTarget: 삭제 확인 모달에 띄울 대상 항목의 no (null이면 모달 닫힘)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  // isRegisterOpen: 라이선스 등록 모달 표시 여부
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  // isSubmitting/isDeleting: 요청이 진행 중일 때 버튼을 비활성화해 중복 클릭으로
  // 같은 요청이 두 번 나가는 것을 막는다.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // searchResetKey: 값이 바뀌면 SearchComponent가 리마운트되어 내부 검색어 입력이 초기화된다
  const [searchResetKey, setSearchResetKey] = useState(0);
  // expandedStat: 탭/클릭으로 펼친 통계 카드의 label (터치 기기는 hover가 없어 클릭 토글 필요)
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  // 키 입력칸 5개의 DOM 참조 (입력 완료 시 다음 칸으로 자동 포커스)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  // 5개 칸 모두 5글자가 채워져야 등록 버튼 활성화
  const isKeyComplete = keys.every((key) => key.length === 5);
  // isFiltering: 탭/상태필터/검색 중 하나라도 기본값이 아니면 true.
  // 빈 목록이 "데이터가 아예 없음"인지 "필터 조건에 안 걸림"인지 구분하는 데 사용한다.
  const isFiltering =
    selectedCategory !== "allassets" || statusFilter !== "all" || searchTerm !== "";

  // ── 데이터 통신 로직 ─────────────────────────────

  const fetchCategoryStats = async () => {
    try {
      const stats = await getCategoryStats();
      setCategoryStats(stats);
    } catch (error) {
      console.error("통계 로딩 실패:", error);
      toast.error("통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const fetchItems = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await getItems({
        page,
        limit: ITEMS_PER_PAGE,
        category: selectedCategory,
        status: statusFilter,
        searchField: searchType,
        searchValue: searchTerm,
      });
      setItems(response.items);
      setTotalItems(response.total);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 탭 클릭 시 카테고리를 API 파라미터로 변환하고 1페이지로 초기화
  const handleCategoryChange = (tabName: string) => {
    setSelectedCategory(CATEGORY_MAP[tabName] || tabName);
    setCurrentPage(1);
  };

  // 사용 상태 필터 클릭 시 API 파라미터로 변환하고 1페이지로 초기화
  const handleStatusChange = (label: string) => {
    setStatusFilter(STATUS_MAP[label] || "all");
    setCurrentPage(1);
  };

  // 검색 실행 시 조건 업데이트 + 1페이지로 초기화
  const handleSearchRequest = (type: SearchField, keyword: string) => {
    setSearchType(type);
    setSearchTerm(keyword);
    setCurrentPage(1);
  };

  // 탭/상태필터/검색 조건을 모두 기본값으로 되돌린다 (빈 검색 결과 화면의 "필터 초기화" 버튼에서 사용)
  const resetFilters = () => {
    setSelectedCategory("allassets");
    setStatusFilter("all");
    setSearchType("all");
    setSearchTerm("");
    setCurrentPage(1);
    // SearchComponent를 리마운트해 입력창에 남아있는 검색어도 함께 지운다
    setSearchResetKey((prev) => prev + 1);
  };

  // 등록 모달에서 카테고리 변경 시 버전 선택을 초기화
  const handleCategorySelect = (value: string) => {
    setCategory(value);
    setVersion("");
  };

  const addItems = async () => {
    if (!isKeyComplete || !category || !version) {
      toast.error("카테고리, 버전 및 25자리 키를 모두 확인해주세요.");
      return;
    }
    // 이미 요청이 진행 중이면 버튼 연타/Enter 반복으로 같은 등록이 두 번 나가지 않도록 막는다.
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createItem({
        // 5개 칸을 하이픈으로 연결해 "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" 형식으로 전송
        key: keys.join("-"),
        category,
        version,
      });
      setKeys(["", "", "", "", ""]);
      setCategory("");
      setVersion("");
      setIsRegisterOpen(false);
      fetchItems(currentPage);
      fetchCategoryStats();
      toast.success("새로운 라이선스가 등록되었습니다.", { icon: TOAST_ICON.add });
    } catch (error) {
      toast.error(getErrorMessage(error, "등록 프로세스 중 오류가 발생했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 실제 삭제 요청은 확인 모달에서 confirmDelete가 호출될 때 실행된다.
  const deleteItem = (no: number) => {
    setDeleteTarget(no);
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    const no = deleteTarget;
    if (no === null) return;
    setIsDeleting(true);
    try {
      await deleteItemRequest(no);
      setDeleteTarget(null);
      fetchItems(currentPage);
      fetchCategoryStats();
      toast("라이선스가 삭제되었습니다.", { icon: TOAST_ICON.delete });
    } catch (error) {
      toast.error(getErrorMessage(error, "삭제 중 오류가 발생했습니다."));
    } finally {
      setIsDeleting(false);
    }
  };

  // 성공 시 true, 실패 시 false를 반환해 호출부(ItemListDisplay)가
  // 실패한 경우 편집 모드를 계속 유지하도록 한다.
  const updateItem = async (no: number, key: string, member: string): Promise<boolean> => {
    try {
      await updateItemRequest(no, { key, member });
      fetchItems(currentPage);
      fetchCategoryStats();
      toast.success("라이선스 정보가 수정되었습니다.", { icon: TOAST_ICON.edit });
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "수정 중 오류가 발생했습니다."));
      return false;
    }
  };

  // ── 키 입력 핸들러 ───────────────────────────────
  const handleChange = (index: number, value: string) => {
    // 영문자/숫자만 허용 (특수문자, 한글 입력 차단)
    if (!/^[A-Za-z0-9]{0,5}$/.test(value)) return;
    const updatedKeys = [...keys];
    updatedKeys[index] = value.toUpperCase();
    setKeys(updatedKeys);
    // 5글자 입력 완료 시 다음 칸으로 자동 포커스
    if (value.length === 5 && index < keys.length - 1)
      inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    // 현재 칸이 비어있을 때 Backspace → 이전 칸으로 포커스 이동
    if (event.key === "Backspace" && !keys[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (event.key === "Enter") addItems();
  };

  // ── useEffect ────────────────────────────────────

  // 통계는 마운트 시 1회만 호출 (필터/검색과 무관)
  useEffect(() => {
    fetchCategoryStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 목록은 페이지, 카테고리, 사용 상태, 검색 조건이 바뀔 때마다 재조회
  useEffect(() => {
    fetchItems(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCategory, statusFilter, searchType, searchTerm]);

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

  // 상단 통계 카드 3개의 설정값 (레이블, 숫자, 색상, 아이콘, 프로그레스 바)
  const statConfig: StatConfigItem[] = useMemo(
    () => [
      {
        label: "전체 라이선스",
        mainCount: totalStats.total,
        detailKey: "total",
        color: "text-slate-900 dark:text-slate-100",
        topBorder: "border-t-slate-400 dark:border-t-slate-600",
        hoverBg: "hover:bg-slate-50 dark:hover:bg-white/[0.03]",
        iconBg: "bg-slate-100 dark:bg-white/10",
        icon: <KeyRound size={15} className="text-slate-500 dark:text-slate-300" />,
        showBar: false,
      },
      {
        label: "사용 중",
        mainCount: totalStats.active,
        detailKey: "active",
        color: "text-emerald-600 dark:text-emerald-400",
        topBorder: "border-t-emerald-500 dark:border-t-emerald-400",
        hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-500/[0.06]",
        iconBg: "bg-emerald-100 dark:bg-emerald-400/10",
        icon: <User size={15} className="text-emerald-600 dark:text-emerald-400" />,
        barColor: "bg-emerald-500 dark:bg-emerald-400",
        showBar: true,
      },
      {
        label: "미사용 (가용)",
        mainCount: totalStats.available,
        detailKey: "available",
        color: "text-blue-600 dark:text-cyan-400",
        topBorder: "border-t-blue-500 dark:border-t-cyan-400",
        hoverBg: "hover:bg-blue-50 dark:hover:bg-cyan-400/[0.06]",
        iconBg: "bg-blue-100 dark:bg-cyan-400/10",
        icon: <Unlock size={15} className="text-blue-600 dark:text-cyan-400" />,
        barColor: "bg-blue-500 dark:bg-cyan-400",
        showBar: true,
      },
    ],
    [totalStats],
  );

  return (
    <div className="bg-white dark:bg-transparent rounded-2xl overflow-hidden">
      <ConfirmDialog
        open={deleteTarget !== null}
        title="라이선스 삭제"
        message="이 자산을 삭제하시겠습니까? 삭제된 항목은 목록에서 즉시 사라집니다."
        confirmLabel="삭제"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <RegisterModal
        open={isRegisterOpen}
        category={category}
        version={version}
        keys={keys}
        versionOptions={VERSION_OPTIONS}
        isKeyComplete={isKeyComplete}
        isSubmitting={isSubmitting}
        onCategoryChange={handleCategorySelect}
        onVersionChange={setVersion}
        onKeyChange={handleChange}
        onKeyDown={handleKeyDown}
        inputRefs={inputRefs}
        onSubmit={addItems}
        onClose={() => setIsRegisterOpen(false)}
      />

      {/* 1. 상단 통계 카드
          호버 시 슬라이드 애니메이션으로 카테고리별 세부 수치 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/10 border-b border-slate-200 dark:border-white/10">
        {statConfig.map((stat) => {
          const isExpanded = expandedStat === stat.label;
          return (
          <button
            type="button"
            key={stat.label}
            onClick={() =>
              setExpandedStat((prev) => (prev === stat.label ? null : stat.label))
            }
            aria-expanded={isExpanded}
            aria-label={`${stat.label} 카테고리별 상세 보기`}
            className={`group relative overflow-hidden transition-all duration-300 border-t-2 w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset ${stat.topBorder} ${stat.hoverBg}`}
          >
            {/* 기본 뷰: 아이콘 + 레이블 + 숫자 + 프로그레스 바 */}
            <div
              className={`p-6 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-3 ${
                isExpanded ? "opacity-0 -translate-y-3" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <span className={`flex items-center justify-center w-6 h-6 rounded-lg ${stat.iconBg}`}>
                  {stat.icon}
                </span>
              </div>
              <p className={`text-4xl font-bold tracking-tight ${stat.color}`}>
                {stat.mainCount}
              </p>
              {stat.showBar && (
                <div className="mt-3">
                  <div className="h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stat.barColor} rounded-full transition-all duration-700`}
                      style={{
                        width: `${totalStats.total > 0 ? Math.round((stat.mainCount / totalStats.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                    전체의{" "}
                    <span className={stat.color}>
                      {totalStats.total > 0
                        ? Math.round((stat.mainCount / totalStats.total) * 100)
                        : 0}
                      %
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* 카테고리별 상세를 펼쳐볼 수 있다는 발견성 힌트 (호버/펼침 시에는 사라짐) */}
            <span
              className={`absolute bottom-2.5 right-3 text-slate-300 dark:text-slate-600 transition-opacity duration-200 group-hover:opacity-0 ${
                isExpanded ? "opacity-0" : ""
              }`}
            >
              <ChevronDown size={16} />
            </span>

            {/* 호버/탭 뷰: 카테고리별 세부 수치 (아래에서 슬라이드 업) */}
            <div
              className={`absolute inset-0 p-5 bg-white dark:bg-slate-900 group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-center ${
                isExpanded ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <p className="text-[9px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 mb-2 uppercase pb-1.5 border-b border-slate-200 dark:border-white/10">
                카테고리별
              </p>
              <div className="space-y-1">
                {categoryStats.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex justify-between items-center text-xs font-medium"
                  >
                    <span className="text-slate-500 dark:text-slate-400">
                      {CATEGORY_DISPLAY[cat.category] || cat.category}
                    </span>
                    <span className={`${stat.color}`}>
                      {cat[stat.detailKey]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </button>
          );
        })}
      </div>

      {/* 2. 통합 툴바: 카테고리 탭 + 사용 상태 필터 + 검색 + 등록 버튼을 한 줄에 배치
          클릭 시 selectedCategory / statusFilter 변경 → useEffect가 목록 재조회 */}
      <div className="border-b border-slate-200 dark:border-white/10 px-4 sm:px-8 py-3">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {/* 카테고리 탭 */}
          <div className="flex items-center overflow-x-auto scrollbar-hide flex-shrink-0">
            {TAB_LABELS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleCategoryChange(tab)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === (CATEGORY_MAP[tab] || tab)
                    ? "text-blue-600 bg-blue-50 dark:text-cyan-300 dark:bg-cyan-400/10"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5"
                }`}
              >
                {TAB_DISPLAY[tab]}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2 xl:justify-end">
            {/* 사용 상태 필터: 미사용 키를 찾을 때 페이지를 일일이 넘기지 않도록 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 dark:bg-white/5 dark:border-white/10">
              {STATUS_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => handleStatusChange(label)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 whitespace-nowrap ${
                    statusFilter === (STATUS_MAP[label] || "all")
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:shadow-none"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 검색 */}
            <div className="flex-1 min-w-[220px] sm:flex-none sm:w-72">
              <SearchComponent key={searchResetKey} onSearch={handleSearchRequest} />
            </div>

            {/* 등록 버튼: 클릭 시 등록 모달을 연다 */}
            <Button onClick={() => setIsRegisterOpen(true)} className="whitespace-nowrap">
              <Plus size={18} />
              새 라이선스
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {/* 3. 목록 섹션 */}
        <div className="min-h-[500px] relative">
          <ItemListDisplay
            items={items}
            isLoading={isLoading}
            deleteItem={deleteItem}
            updateItem={updateItem}
            isFiltering={isFiltering}
            onResetFilters={resetFilters}
            onOpenRegister={() => setIsRegisterOpen(true)}
          />
        </div>

        {/* 4. 하단 페이지네이션 */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            전체 <span className="text-slate-800 font-semibold dark:text-slate-200">{totalItems}</span>개 중{" "}
            <span className="text-slate-800 font-semibold dark:text-slate-200">{items.length}</span>개 표시
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
