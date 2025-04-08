/**
 * 生成一个唯一ID
 * 使用时间戳和随机字符串组合，确保ID的唯一性
 * @returns 生成的唯一ID字符串
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

/**
 * 生成一个指定前缀的唯一ID
 * @param prefix ID前缀
 * @returns 带前缀的唯一ID字符串
 */
export const generatePrefixedId = (prefix: string): string => {
  return `${prefix}-${generateId()}`;
};

/**
 * 生成一个指定长度的随机ID
 * @param length ID长度，默认为12
 * @returns 指定长度的随机ID字符串
 */
export const generateRandomId = (length: number = 12): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

/**
 * 检查ID是否有效
 * @param id 要检查的ID
 * @returns 布尔值，表示ID是否有效
 */
export const isValidId = (id: string): boolean => {
  // ID不能为空且长度必须大于等于8
  return !!id && id.length >= 8;
};

/**
 * 提取ID的前缀部分（如果有）
 * @param id 带前缀的ID，格式为 "prefix-id"
 * @returns ID的前缀部分，如果没有前缀则返回null
 */
export const extractIdPrefix = (id: string): string | null => {
  const parts = id.split("-");
  return parts.length > 1 ? parts[0] : null;
};