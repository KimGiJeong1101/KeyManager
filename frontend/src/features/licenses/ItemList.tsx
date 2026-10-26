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
import StatCards from "./StatCards";
import LowStockAlert from "./LowStockAlert";
import HistoryDialog from "./HistoryDialog";
import { HistoryTarget, historyTargetOf } from "./historyTarget";
import TrashDialog from "./TrashDialog";
import CsvDialog from "./CsvDialog";
import EditItemDialog from "./EditItemDialog";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import RegisterModal from "./RegisterModal";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { Archive, FileSpreadsheet, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createItem,
  deleteItemRequest,
  getCategories,
  getCategoryStats,
  getVersionStats,
  getErrorMessage,
  getItems,
  updateItemRequest,
} from "../../api/items";
import {
  CategoryStat,
  CategoryVersions,
  Item,
  SearchField,
  StatusFilter,
  UpdateItemPayload,
  VersionStat,
} from "../../types/item";
import { resolveValidPage } from "../../lib/pagination";
import { distributePastedKey } from "../../lib/licenseKey";
import { CATEGORY_META, getCategoryMeta } from "../../lib/categories";

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

const ITEMS_PER_PAGE = 10;
const PAGES_TO_SHOW = 5;

// "전체" 탭은 서버에 "allassets"로 전달된다 (카테고리 필터 없음).
// 나머지 탭은 백엔드(GET /categories)의 카테고리 목록에서 도출한다 → 아래 categoryTabs 참고.
const ALL_CATEGORY = "allassets";

// 사용 상태 필터: 라벨 → API 파라미터 값 매핑
const STATUS_MAP: Record<string, StatusFilter> = {
  "전체": "all",
  "사용 중": "assigned",
  "미사용": "unassigned",
};
const STATUS_LABELS = ["전체", "사용 중", "미사용"];

const ItemList: React.FC = () => {
  // ── 1. 데이터 및 등록 관련 상태 ──────────────────
  const [items, setItems] = useState<Item[]>([]);
  // keys: 5개 입력칸 각각의 값을 배열로 관리 (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)
  const [keys, setKeys] = useState<string[]>(["", "", "", "", ""]);
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("");
  // categoryStats: 상단 통계 카드용 집계 데이터
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  // versionStats: 버전별 재고 (재고 부족 경고용). 통계와 같은 시점에 함께 갱신한다.
  const [versionStats, setVersionStats] = useState<VersionStat[]>([]);
  // versionOptions: 등록 폼의 category → version 화이트리스트. 백엔드(GET /categories)에서
  // 받아오며, 프론트에 별도로 하드코딩하지 않는다(값이 어긋나는 것을 방지).
  const [versionOptions, setVersionOptions] = useState<CategoryVersions>({});

  // ── 2. 필터 및 검색 상태 ─────────────────────────
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
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
  // historyTarget: 이력 모달에 띄울 대상 (null이면 닫힘)
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  // isTrashOpen: 휴지통 모달 표시 여부
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  // editTarget: 수정 모달에 띄울 항목 (null이면 닫힘)
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  // isCsvOpen: CSV 내보내기/가져오기 모달 표시 여부
  const [isCsvOpen, setIsCsvOpen] = useState(false);
  // searchResetKey: 값이 바뀌면 SearchComponent가 리마운트되어 내부 검색어 입력이 초기화된다
  const [searchResetKey, setSearchResetKey] = useState(0);

  // 키 입력칸 5개의 DOM 참조 (입력 완료 시 다음 칸으로 자동 포커스)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  // 5개 칸 모두 5글자가 채워져야 등록 버튼 활성화
  const isKeyComplete = keys.every((key) => key.length === 5);
  // isFiltering: 탭/상태필터/검색 중 하나라도 기본값이 아니면 true.
  // 빈 목록이 "데이터가 아예 없음"인지 "필터 조건에 안 걸림"인지 구분하는 데 사용한다.
  const isFiltering =
    selectedCategory !== ALL_CATEGORY || statusFilter !== "all" || searchTerm !== "";

  // 카테고리 탭: "전체" + 백엔드 카테고리 목록. /categories 응답 전(또는 실패 시)에는
  // 표시 메타데이터에 등록된 카테고리로 대신 그려 탭이 비어 보이지 않게 한다.
  const categoryTabs = useMemo(() => {
    const loaded = Object.keys(versionOptions);
    const categories = loaded.length > 0 ? loaded : Object.keys(CATEGORY_META);
    return [
      { value: ALL_CATEGORY, label: "전체" },
      ...categories.map((c) => ({ value: c, label: getCategoryMeta(c).label })),
    ];
  }, [versionOptions]);

  // fetchItems 요청 순번. 탭/필터를 빠르게 바꾸면 이전 요청의 응답이 나중에 도착해
  // 최신 결과를 덮어쓸 수 있으므로, 가장 마지막에 보낸 요청의 응답만 반영한다.
  const latestFetchId = useRef(0);

  // ── 데이터 통신 로직 ─────────────────────────────

  const fetchCategoryStats = async () => {
    try {
      const [stats, versions] = await Promise.all([getCategoryStats(), getVersionStats()]);
      setCategoryStats(stats);
      setVersionStats(versions);
    } catch (error) {
      console.error("통계 로딩 실패:", error);
      toast.error("통계를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const fetchCategories = async () => {
    try {
      const categories = await getCategories();
      setVersionOptions(categories);
    } catch (error) {
      console.error("카테고리 목록 로딩 실패:", error);
      toast.error("카테고리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const fetchItems = async (page: number) => {
    const fetchId = ++latestFetchId.current;
    const isStale = () => fetchId !== latestFetchId.current;
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
      if (isStale()) return;
      // 현재 페이지가 삭제 등으로 더 이상 존재하지 않게 된 경우(예: 마지막 페이지의
      // 유일한 항목을 삭제) 유효한 마지막 페이지로 되돌린다. currentPage가 바뀌면
      // 아래 useEffect가 그 페이지로 다시 fetchItems를 호출한다.
      const validPage = resolveValidPage(
        page,
        response.total,
        ITEMS_PER_PAGE,
        response.items.length,
      );
      if (validPage !== page) {
        setCurrentPage(validPage);
        return;
      }
      setItems(response.items);
      setTotalItems(response.total);
    } catch (error) {
      if (isStale()) return;
      console.error("Error fetching items:", error);
      toast.error("목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      // 더 최신 요청이 진행 중이면 로딩 표시는 그 요청이 끝낼 때 내린다.
      if (!isStale()) setIsLoading(false);
    }
  };

  // 탭 클릭 시 카테고리를 API 파라미터로 변환하고 1페이지로 초기화
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
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
    setSelectedCategory(ALL_CATEGORY);
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

  // 성공 시 true, 실패 시 false를 반환해 호출부(EditItemDialog)가
  // 실패한 경우 입력값을 유지한 채 모달을 열어두도록 한다.
  const updateItem = async (no: number, payload: UpdateItemPayload): Promise<boolean> => {
    try {
      await updateItemRequest(no, payload);
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

  // 전체 키("XXXXX-XXXXX-..." 또는 25자리)를 붙여넣으면 현재 칸부터 5자씩 나눠 채운다
  const handlePaste = (index: number, text: string) => {
    const result = distributePastedKey(keys, index, text);
    if (!result) return;
    setKeys(result.keys);
    inputRefs.current[result.focusIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    // 현재 칸이 비어있을 때 Backspace → 이전 칸으로 포커스 이동
    if (event.key === "Backspace" && !keys[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (event.key === "Enter") addItems();
  };

  // ── useEffect ────────────────────────────────────

  // 통계와 카테고리 화이트리스트는 마운트 시 1회만 호출 (필터/검색과 무관)
  useEffect(() => {
    fetchCategoryStats();
    fetchCategories();
  }, []);

  // 목록은 페이지, 카테고리, 사용 상태, 검색 조건이 바뀔 때마다 재조회
  useEffect(() => {
    fetchItems(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCategory, statusFilter, searchType, searchTerm]);

  // ── useMemo ──────────────────────────────────────

  return (
    <div className="bg-white dark:bg-transparent rounded-2xl overflow-hidden">
      <ConfirmDialog
        open={deleteTarget !== null}
        title="라이선스 삭제"
        message="이 자산을 삭제하시겠습니까? 삭제된 항목은 휴지통으로 이동하며, 필요하면 복구할 수 있습니다."
        confirmLabel="삭제"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <HistoryDialog target={historyTarget} onClose={() => setHistoryTarget(null)} />
      <EditItemDialog
        item={editTarget}
        versionOptions={versionOptions}
        onSave={updateItem}
        onClose={() => setEditTarget(null)}
      />
      <CsvDialog
        open={isCsvOpen}
        onClose={() => setIsCsvOpen(false)}
        currentFilter={{
          category: selectedCategory,
          status: statusFilter,
          searchField: searchType,
          searchValue: searchTerm,
        }}
        currentCount={totalItems}
        isFiltering={isFiltering}
        onImported={() => {
          fetchItems(currentPage);
          fetchCategoryStats();
        }}
      />
      <TrashDialog
        open={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRestored={() => {
          fetchItems(currentPage);
          fetchCategoryStats();
        }}
      />
      <RegisterModal
        open={isRegisterOpen}
        category={category}
        version={version}
        keys={keys}
        versionOptions={versionOptions}
        isKeyComplete={isKeyComplete}
        isSubmitting={isSubmitting}
        onCategoryChange={handleCategorySelect}
        onVersionChange={setVersion}
        onKeyChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyPaste={handlePaste}
        inputRefs={inputRefs}
        onSubmit={addItems}
        onClose={() => setIsRegisterOpen(false)}
      />

      {/* 1. 상단 통계 카드 */}
      <StatCards categoryStats={categoryStats} />
      <LowStockAlert versionStats={versionStats} />

      {/* 2. 통합 툴바: 카테고리 탭 + 사용 상태 필터 + 검색 + 등록 버튼을 한 줄에 배치
          클릭 시 selectedCategory / statusFilter 변경 → useEffect가 목록 재조회 */}
      <div className="border-b border-slate-200 dark:border-white/10 px-4 sm:px-8 py-3">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {/* 카테고리 탭 */}
          <div className="flex items-center overflow-x-auto scrollbar-hide flex-shrink-0">
            {categoryTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleCategoryChange(tab.value)}
                className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === tab.value
                    ? "text-blue-600 bg-blue-50 dark:text-cyan-300 dark:bg-cyan-400/10"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5"
                }`}
              >
                {tab.label}
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

            {/* CSV 내보내기/가져오기. 글자는 툴바가 두 줄로 쌓이는 sm~xl 구간에서만 보인다:
                xl 이상은 탭과 한 줄에 놓여 공간이 빠듯하고(콘텐츠 폭이 max-w-6xl로 고정), sm 미만은 너무 좁다 */}
            <Button
              variant="ghost"
              onClick={() => setIsCsvOpen(true)}
              aria-label="CSV 내보내기/가져오기"
              title="CSV 내보내기/가져오기"
              className="px-2.5 sm:px-3 text-slate-500 dark:text-slate-400"
            >
              <FileSpreadsheet size={17} />
              <span className="hidden sm:inline xl:hidden">CSV</span>
            </Button>

            {/* 휴지통: 삭제된 라이선스 확인/복구.
                각 행의 삭제(휴지통) 아이콘과 헷갈리지 않도록 보관함 아이콘 + 글자로 구분한다 (글자 표시 구간은 CSV 버튼과 동일) */}
            <Button
              variant="ghost"
              onClick={() => setIsTrashOpen(true)}
              aria-label="휴지통 열기"
              title="휴지통"
              className="px-2.5 sm:px-3 text-slate-500 dark:text-slate-400"
            >
              <Archive size={17} />
              <span className="hidden sm:inline xl:hidden">휴지통</span>
            </Button>

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
            isFiltering={isFiltering}
            onResetFilters={resetFilters}
            onOpenRegister={() => setIsRegisterOpen(true)}
            onShowHistory={(item) => setHistoryTarget(historyTargetOf(item))}
            onEdit={setEditTarget}
          />
        </div>

        {/* 4. 하단 페이지네이션 */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            전체 <span className="text-slate-800 font-semibold dark:text-slate-200">{totalItems}</span>개 중{" "}
            <span className="text-slate-800 font-semibold dark:text-slate-200">{items.length}</span>개 표시
          </p>
          {/* 한 페이지뿐이면(검색 결과 0건 포함) 비활성 버튼만 보이므로 숨긴다 */}
          {totalPages > 1 && (
            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              pagesToShow={PAGES_TO_SHOW}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemList;
