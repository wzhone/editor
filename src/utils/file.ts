/**
 * 创建JSON Blob对象
 * @param data 要转换为JSON的数据
 * @returns Blob对象
 */
export const createJSONBlob = (data: any): Blob => {
  const jsonString = JSON.stringify(data, null, 2);
  return new Blob([jsonString], { type: "application/json" });
};

/**
 * 下载Blob对象为文件
 * @param blob Blob对象
 * @param fileName 文件名
 */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;

  // 模拟点击并触发下载
  document.body.appendChild(a);
  a.click();

  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * 读取文件内容为文本
 * @param file 文件对象
 * @returns Promise，成功时返回文件内容
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("读取文件失败"));
      }
    };

    reader.onerror = () => {
      reject(new Error("读取文件时发生错误"));
    };

    reader.readAsText(file);
  });
};

/**
 * 导入JSON文件
 * @param file 文件对象
 * @returns Promise，成功时返回解析后的JSON对象
 */
export const importJSONFile = async (file: File): Promise<any> => {
  try {
    // 验证文件类型
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      throw new Error("仅支持JSON文件");
    }

    // 读取文件内容
    const content = await readFileAsText(file);

    // 解析JSON
    return JSON.parse(content);
  } catch (error) {
    console.error("导入JSON文件失败:", error);
    throw error;
  }
};

/**
 * 安全地获取本地存储的值
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;

  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`从LocalStorage获取${key}失败:`, error);
    return defaultValue;
  }
};

/**
 * 安全地设置本地存储的值
 * @param key 存储键名
 * @param value 要存储的值
 * @returns 操作是否成功
 */
export const setLocalStorageItem = (key: string, value: any): boolean => {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`向LocalStorage设置${key}失败:`, error);
    return false;
  }
};
