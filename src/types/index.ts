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
  locId?: string; // 位置ID
  showType?: "rectangle" | "ellipse"; // 图形类型
  showName?: string; // 显示名称（可选）
  rotation?: number; // 旋转角度（可选，弧度）
  zIndex?: number; // 层叠顺序（可选）
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

/**
 * 相机状态接口
 */
export interface CameraState {
  position: {
    x: number;
    y: number;
  };
  zoom: number;
}

/**
 * 交互模式枚举
 */
export enum ActionMode {
  Select = "select", // 选择模式
  Move = "move", // 移动模式
  Create = "create", // 创建模式
  Delete = "delete", // 删除模式
  Resize = "resize", // 调整大小模式
}

/**
 * 交互状态接口
 */
export interface InteractionState {
  isDragging: boolean; // 是否正在拖动画布
  isCreating: boolean; // 是否正在创建元素
  isSelecting: boolean; // 是否正在框选
  dragStartPoint: Point | null;
  selectionRect: Rect | null;
  lastSaveTime: number; // 上次保存时间戳
  actionMode: ActionMode; // 当前交互模式
}

/**
 * 设置状态接口
 */
export interface SettingsState {
  fastMode: boolean; // 快速插入模式
  autoMag: boolean; // 自动吸附
  showBoxCode: boolean; // 显示盒子编码
  showEquipId: boolean; // 显示设备ID
  showBoxName: boolean; // 显示盒子名称
  gridSize: number; // 网格大小
}

/**
 * 拖拽元素模板类型
 */
export interface DragTemplate {
  id: string; // 模板ID
  name: string; // 显示名称
  icon?: string; // 图标(可选)
  template: Partial<CanvasItem>; // 元素模板属性
}

/**
 * 导出/导入JSON数据格式
 */
export interface CanvasExportData {
  items: CanvasItem[];
  settings?: SettingsState;
  camera?: CameraState;
  version?: string;
  timestamp?: number;
  name?: string;
}
