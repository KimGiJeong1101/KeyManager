import axios from "axios";
import { apiClient } from "./client";
import {
  ApiErrorResponse,
  CategoryStat,
  CategoryVersions,
  CreateItemPayload,
  Item,
  ItemsQueryParams,
  ItemsResponse,
  UpdateItemPayload,
} from "../types/item";

export const checkHealth = (): Promise<unknown> => apiClient.get("/health");

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
