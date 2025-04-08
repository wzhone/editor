// src/utils/idGenerator.ts - 优化版ID生成器
import { CanvasItem } from "../types";

// 全局ID计数器
let globalCounter: number = 0;

/**
 * 从现有项目中找出最大的ID序号
 * @param items 当前画布上的所有元素
 * @returns 初始化的ID计数器
 */
export const initIdCounter = (items: CanvasItem[]): void => {
  // 如果没有元素，从0开始
  if (items.length === 0) {
    globalCounter = 0;
    return;
  }
  
  // 查找数字ID中的最大值
  let maxId = 0;
  
  for (const item of items) {
    // 尝试从ID中提取数字部分
    const matches = item.objid.match(/^item-(\d+)$/);
    if (matches && matches[1]) {
      const idNum = parseInt(matches[1], 10);
      if (!isNaN(idNum) && idNum > maxId) {
        maxId = idNum;
      }
    }
  }
  
  // 设置全局计数器为最大ID + 1
  globalCounter = maxId + 1;
};

/**
 * 生成一个序列化的唯一ID
 * 格式: item-123
 * @returns 递增的唯一ID字符串
 */
export const generateId = (): string => {
  return `item-${globalCounter++}`;
};

/**
 * 检查ID是否有效
 * @param id 要检查的ID
 * @returns 布尔值，表示ID是否有效
 */
export const isValidId = (id: string): boolean => {
  // 匹配格式 "item-数字"
  return /^item-\d+$/.test(id);
};

/**
 * 重置ID计数器（用于测试或完全清空画布后）
 */
export const resetIdCounter = (): void => {
  globalCounter = 0;
};