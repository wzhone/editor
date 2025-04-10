import axios, { AxiosRequestConfig } from "axios";
import { CanvasItem, ApiResponse } from "../types";

// 创建axios实例
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  timeout: 30000, // 30秒超时
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证信息等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 错误处理
    const message = error.response?.data?.error || error.message || "请求失败";
    return Promise.reject({ error: message });
  }
);

/**
 * 保存布局数据
 * @param items 画布项目列表
 */
export const saveLayout = async (items: CanvasItem[]): Promise<any> => {
  try {
    const response = await api.post<any>("/save", { items });
    return response;
  } catch (error) {
    console.error("保存布局失败:", error);
    throw error;
  }
};

/**
 * 加载布局数据
 */
export const loadLayout = async (): Promise<CanvasItem[]> => {
  try {
    const { data } = await api.get<any>("/load");
    return data as CanvasItem[];
  } catch (error) {
    console.error("加载布局失败:", error);
    throw error;
  }
};

/**
 * 通用API请求函数
 * @param method HTTP方法
 * @param endpoint 接口路径
 * @param data 请求数据
 * @param config 请求配置
 */
export const apiRequest = async <T>(
  method: string,
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<any> => {
  try {
    const response = await api.request<ApiResponse<T>>({
      method,
      url: endpoint,
      data: method !== "GET" ? data : undefined,
      params: method === "GET" ? data : undefined,
      ...config,
    });
    return response;
  } catch (error) {
    console.error(`API请求失败 (${method} ${endpoint}):`, error);
    throw error;
  }
};