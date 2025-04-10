/**
 * 画布项目类型定义
 */
export interface CanvasItem {
  objid: string; // 唯一标识符
  boxLeft: number; // X坐标位置
  boxTop: number; // Y坐标位置
  boxWidth: number; // 宽度
  boxHeight: number; // 高度
  boxCode: string; // 业务编码
  equipId: string; // 设备ID
  showColor: string; // 显示颜色
  boxName: string; // 盒子名称
  locId: string; // 位置ID
  showType?: "rectangle" | "ellipse"; // 图形类型
  // showName?: string; // 显示名称（可选）
}

/**
 * 坐标点接口
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 矩形区域接口（用于碰撞检测和框选）
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * API响应接口
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
