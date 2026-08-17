import axios from "axios";
import { API_BASE_URL } from "../config";

// timeout: 백엔드가 응답 없이 멈춘 경우(DB 커넥션 행 등) 요청이 무한정 대기하지 않도록 상한을 둔다.
export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });
