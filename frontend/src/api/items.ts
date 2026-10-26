import axios from "axios";
import { apiClient } from "./client";
import { API_BASE_URL } from "../config";
import {
  ApiErrorResponse,
  CategoryStat,
  CategoryVersions,
  CreateItemPayload,
  DeletedItemsResponse,
  ExportFilter,
  HistoryEntry,
  ImportItemsResponse,
  ImportRowInput,
  PurgedKeysResponse,
  Item,
  ItemsQueryParams,
  ItemsResponse,
  UpdateItemPayload,
  VersionStat,
} from "../types/item";

export const checkHealth = (): Promise<unknown> => apiClient.get("/health");

export const getVersionStats = async (): Promise<VersionStat[]> => {
  const response = await apiClient.get<VersionStat[]>("/items/version-stats");
  return response.data;
};

export const getCategoryStats = async (): Promise<CategoryStat[]> => {
  const response = await apiClient.get<CategoryStat[]>("/items/category-stats");
  return response.data;
};

// 등록 폼의 category → version 화이트리스트. 백엔드 constants.ts를 그대로 반환받아
// 프론트가 별도로 하드코딩하지 않도록 한다.
export const getCategories = async (): Promise<CategoryVersions> => {
  const response = await apiClient.get<CategoryVersions>("/categories");
  return response.data;
};

export const getItems = async (
  params: ItemsQueryParams,
): Promise<ItemsResponse> => {
  const response = await apiClient.get<ItemsResponse>("/items", { params });
  return response.data;
};

export const createItem = async (payload: CreateItemPayload): Promise<Item> => {
  const response = await apiClient.post<Item>("/items", payload);
  return response.data;
};

export const updateItemRequest = async (
  no: number,
  payload: UpdateItemPayload,
): Promise<Item> => {
  const response = await apiClient.put<Item>(`/items/${no}`, payload);
  return response.data;
};

export const deleteItemRequest = async (no: number): Promise<void> => {
  await apiClient.delete(`/items/${no}`);
};

// 서버가 { error: "..." } 형태로 내려주는 실패 메시지를 안전하게 꺼낸다.
// axios가 아닌 예외(네트워크 완전 차단 등)이거나 메시지가 없으면 fallback을 사용한다.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
};

export const getItemHistory = async (no: number): Promise<HistoryEntry[]> => {
  const response = await apiClient.get<HistoryEntry[]>(`/items/${no}/history`);
  return response.data;
};

export const getDeletedItems = async (
  page: number,
  limit: number,
): Promise<DeletedItemsResponse> => {
  const response = await apiClient.get<DeletedItemsResponse>("/items/deleted", {
    params: { page, limit },
  });
  return response.data;
};

// 휴지통 항목 완전삭제. confirm: 키 마지막 5자리 (서버가 일치 여부를 다시 검증한다).
export const purgeItemRequest = async (no: number, confirm: string): Promise<void> => {
  await apiClient.post(`/items/${no}/purge`, { confirm });
};

export const getPurgedKeys = async (page: number, limit: number): Promise<PurgedKeysResponse> => {
  const response = await apiClient.get<PurgedKeysResponse>("/items/purged", { params: { page, limit } });
  return response.data;
};

export const getPurgedHistory = async (id: number): Promise<HistoryEntry[]> => {
  const response = await apiClient.get<HistoryEntry[]>(`/items/purged/${id}/history`);
  return response.data;
};

export const restoreItemRequest = async (no: number): Promise<Item> => {
  const response = await apiClient.post<Item>(`/items/${no}/restore`);
  return response.data;
};

// CSV 내보내기 URL. 파일 다운로드는 브라우저가 직접 받도록 링크로 연다(Content-Disposition: attachment).
export const buildExportUrl = (filter: ExportFilter): string => {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return `${API_BASE_URL}/items/export?${params.toString()}`;
};

// CSV 일괄 등록. dryRun=true면 검증 결과(미리보기)만 받는다.
export const importItems = async (
  rows: ImportRowInput[],
  dryRun: boolean,
): Promise<ImportItemsResponse> => {
  const response = await apiClient.post<ImportItemsResponse>("/items/import", { rows, dryRun });
  return response.data;
};
