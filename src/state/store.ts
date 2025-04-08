// src/state/store.ts
"use client";
import { create } from "zustand";
import { CanvasItem, Point, Rect, CameraState } from "../types";
import { createJSONBlob, downloadBlob } from "../utils/file";
import { generateId } from "../utils/idGenerator";

// 默认配置
const LOCAL_STORAGE_KEY = "canvas-editor-state";

// 状态接口
interface CanvasStore {
  // 数据状态
  itemsMap: Map<string, CanvasItem>; // 使用Map存储items提高查询效率
  selectedItemIds: Set<string>; // 使用Set存储选中的多个元素ID
  templateItem: Partial<CanvasItem>; // 模板元素（用于创建新元素）

  settings: {
    fastMode: boolean;
    autoMag: boolean;
    showBoxCode: boolean;
    showEquipId: boolean;
    showBoxName: boolean;
    gridSize: number;
    snapToGrid: boolean;
  };

  // 相机/视图状态
  camera: CameraState;

  // 交互状态
  interaction: {
    isDragging: boolean; // 是否正在拖动画布
    isCreating: boolean; // 是否正在创建元素
    isSelecting: boolean; // 是否正在框选
    dragStartPoint: Point | null;
    selectionRect: Rect | null;
    lastSaveTime: number; // 上次保存时间戳
  };

  setItems: (items: CanvasItem[]) => void;
  addItem: (item: CanvasItem) => void;
  updateItem: (id: string, updates: Partial<CanvasItem>) => void;
  updateItems: (ids: string[], updates: Partial<CanvasItem>) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
  selectItem: (id: string, isMultiSelect: boolean) => void;
  selectItems: (ids: string[]) => void;
  setTemplateItem: (templateItem: Partial<CanvasItem>) => void;
  clearSelection: () => void;
  updateSettings: (settings: Partial<typeof initialState.settings>) => void;
  updateCamera: (camera: Partial<typeof initialState.camera>) => void;
  updateInteraction: (
    interaction: Partial<typeof initialState.interaction>
  ) => void;
  clearItems: () => void;
  exportToJSON: () => void;
  importFromJSON: (jsonData: string) => boolean;
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => boolean;
  getItems: () => CanvasItem[];
  getSelectedItems: () => CanvasItem[];

  addItemFromTemplate: (template: Partial<CanvasItem>) => string;
  deleteItemById: (itemId: string) => void;
  selectItemById: (itemId: string) => void;
  clearSelectionAction: () => void;
  clearAllItems: () => void;
  updateCameraPosition: (position: Point, zoom: number) => void;
  addAdjacentItem: (
    sourceItemId: string,
    direction: "up" | "down" | "left" | "right",
    template: Partial<CanvasItem>
  ) => void;
}

// 初始状态
const initialState = {
  itemsMap: new Map<string, CanvasItem>(),
  selectedItemIds: new Set<string>(),
  templateItem: {
    boxWidth: 20,
    boxHeight: 20,
    showColor: "#4682B4",
    boxCode: "",
    equipId: "",
    boxName: "",
    locId: "",
    showType: "rectangle", // 默认为矩形
    boxLeft: 10,
    boxTop: 10,
  } as Partial<CanvasItem>,
  settings: {
    fastMode: false,
    autoMag: true,
    showBoxCode: false,
    showEquipId: false,
    showBoxName: false,
    gridSize: 50,
    snapToGrid: true,
  },
  camera: {
    position: { x: 0, y: 0 },
    zoom: 1,
  },
  interaction: {
    isDragging: false,
    isCreating: false,
    isSelecting: false,
    dragStartPoint: null as Point | null,
    selectionRect: null,
    lastSaveTime: Date.now(),
  },
};

// 创建持久化存储
export const useCanvasStore = create<CanvasStore>((set, get) => {
  // 缓存数组，避免重复创建
  let cachedItems: CanvasItem[] | null = null;
  let cachedSelectedItems: CanvasItem[] | null = null;
  let prevMapSize = 0;
  let prevSelectedSize = 0;

  return {
    ...initialState,

    // 设置所有项目
    setItems: (items) => {
      cachedItems = null; // 清除缓存
      cachedSelectedItems = null;
      set({
        itemsMap: new Map(items.map((item) => [item.objid, item])),
      });
    },

    // 添加项目
    addItem: (item) => {
      cachedItems = null; // 清除缓存
      set((state) => {
        const newMap = new Map(state.itemsMap);

        const safeItem = {
          ...item,
          boxLeft: item.boxLeft,
          boxTop: item.boxTop,
        };

        newMap.set(safeItem.objid, safeItem);
        return { itemsMap: newMap };
      });
    },

    // 更新单个项目
    updateItem: (id, updates) => {
      cachedItems = null; // 清除缓存
      cachedSelectedItems = null;
      set((state) => {
        const newMap = new Map(state.itemsMap);
        const item = newMap.get(id);
        if (item) {
          const updatedItem = {
            ...item,
            ...updates,
            boxLeft:
              updates.boxLeft !== undefined ? updates.boxLeft : item.boxLeft,
            boxTop: updates.boxTop !== undefined ? updates.boxTop : item.boxTop,
          };
          newMap.set(id, updatedItem);
        }
        return { itemsMap: newMap };
      });
    },

    // 批量更新多个项目
    updateItems: (ids, updates) => {
      if (ids.length === 0) return;

      cachedItems = null; // 清除缓存
      cachedSelectedItems = null;
      set((state) => {
        const newMap = new Map(state.itemsMap);

        for (const id of ids) {
          const item = newMap.get(id);
          if (item) {
            const updatedItem = {
              ...item,
              ...updates,
              boxLeft:
                updates.boxLeft !== undefined ? updates.boxLeft : item.boxLeft,
              boxTop:
                updates.boxTop !== undefined ? updates.boxTop : item.boxTop,
            };
            newMap.set(id, updatedItem);
          }
        }

        return { itemsMap: newMap };
      });
    },

    // 删除项目
    removeItem: (id) => {
      cachedItems = null; // 清除缓存
      cachedSelectedItems = null;
      set((state) => {
        const newMap = new Map(state.itemsMap);
        newMap.delete(id);

        // 如果删除的是当前选中的元素，从选中集合中移除
        const newSelectedItemIds = new Set(state.selectedItemIds);
        if (newSelectedItemIds.has(id)) {
          newSelectedItemIds.delete(id);
        }

        return {
          itemsMap: newMap,
          selectedItemIds: newSelectedItemIds,
        };
      });
    },

    // 批量删除项目
    removeItems: (ids) => {
      if (ids.length === 0) return;

      cachedItems = null; // 清除缓存
      cachedSelectedItems = null;
      set((state) => {
        const newMap = new Map(state.itemsMap);
        const newSelectedItemIds = new Set(state.selectedItemIds);

        for (const id of ids) {
          newMap.delete(id);
          if (newSelectedItemIds.has(id)) {
            newSelectedItemIds.delete(id);
          }
        }

        return {
          itemsMap: newMap,
          selectedItemIds: newSelectedItemIds,
        };
      });
    },

    // 选择单个项目
    selectItem: (id, isMultiSelect = false) => {
      cachedSelectedItems = null;
      set((state) => {
        let newSelectedItemIds;

        if (isMultiSelect) {
          // 多选模式：切换选中状态
          newSelectedItemIds = new Set(state.selectedItemIds);
          if (newSelectedItemIds.has(id)) {
            newSelectedItemIds.delete(id);
          } else {
            newSelectedItemIds.add(id);
          }
        } else {
          // 单选模式：仅选中当前元素
          newSelectedItemIds = new Set([id]);
        }

        return { selectedItemIds: newSelectedItemIds };
      });
    },

    // 批量选择项目
    selectItems: (ids) => {
      cachedSelectedItems = null;
      set({ selectedItemIds: new Set(ids) });
    },

    // 清除选择
    clearSelection: () => {
      cachedSelectedItems = null;
      set({ selectedItemIds: new Set() });
    },

    // 设置模板项目
    setTemplateItem: (templateItem) => set({ templateItem }),

    // 更新设置
    updateSettings: (newSettings) =>
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

    // 更新相机
    updateCamera: (newCamera) =>
      set((state) => ({
        camera: { ...state.camera, ...newCamera },
      })),

    // 更新交互状态
    updateInteraction: (newInteraction) =>
      set((state) => ({
        interaction: { ...state.interaction, ...newInteraction },
      })),

    // 清空所有元素
    clearItems: () => {
      cachedItems = null;
      cachedSelectedItems = null;
      set({
        itemsMap: new Map(),
        selectedItemIds: new Set(),
      });
    },

    // 导出到JSON
    exportToJSON: () => {
      const state = get();
      const items = state.getItems();

      if (items.length === 0) {
        alert("没有元素可导出");
        return;
      }

      const data = {
        items,
        settings: state.settings,
        camera: state.camera,
      };

      const timestamp = new Date().toLocaleString().replace(/[/:. ]/g, "-");
      const fileName = `visual-layout-${timestamp}.json`;
      const blob = createJSONBlob(data);
      downloadBlob(blob, fileName);
    },

    // 从JSON导入
    importFromJSON: (jsonData) => {
      try {
        const data = JSON.parse(jsonData);

        if (!data.items || !Array.isArray(data.items)) {
          throw new Error("无效的JSON数据格式");
        }

        // 设置项目
        get().setItems(data.items);

        // 可选：导入设置和相机状态
        if (data.settings) {
          get().updateSettings(data.settings);
        }

        if (data.camera) {
          get().updateCamera(data.camera);
        }

        return true;
      } catch (error) {
        console.error("导入JSON失败:", error);
        return false;
      }
    },

    // 保存到LocalStorage
    saveToLocalStorage: () => {
      if (typeof window === "undefined") return false;

      try {
        const state = get();
        const items = state.getItems();

        const data = {
          items,
          settings: state.settings,
          camera: state.camera,
          timestamp: Date.now(),
        };

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));

        // 更新最后保存时间
        state.updateInteraction({ lastSaveTime: Date.now() });

        return true;
      } catch (error) {
        console.error("保存到LocalStorage失败:", error);
        return false;
      }
    },

    // 从LocalStorage加载
    loadFromLocalStorage: () => {
      if (typeof window === "undefined") return false;

      try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);

        if (!savedData) return false;

        const data = JSON.parse(savedData);

        if (!data.items || !Array.isArray(data.items)) {
          return false;
        }

        // 设置项目
        get().setItems(data.items);

        // 导入设置和相机状态
        if (data.settings) {
          get().updateSettings(data.settings);
        }

        if (data.camera) {
          get().updateCamera(data.camera);
        }

        return true;
      } catch (error) {
        console.error("从LocalStorage加载失败:", error);
        return false;
      }
    },

    // 获取items数组 - 使用缓存避免重复创建数组
    getItems: () => {
      const currentMap = get().itemsMap;
      const currentSize = currentMap.size;

      // 如果Map大小没变且已有缓存，直接返回缓存
      if (cachedItems && currentSize === prevMapSize) {
        return cachedItems;
      }

      // 否则重新创建数组并缓存
      cachedItems = Array.from(currentMap.values());
      prevMapSize = currentSize;
      return cachedItems;
    },

    // 获取选中的元素数组 - 使用缓存避免重复创建
    getSelectedItems: () => {
      const state = get();
      const currentSelectedIds = state.selectedItemIds;
      const currentSelectedSize = currentSelectedIds.size;

      // 如果选中项数量没变且已有缓存，直接返回缓存
      if (cachedSelectedItems && currentSelectedSize === prevSelectedSize) {
        return cachedSelectedItems;
      }

      // 否则重新创建数组并缓存
      const items: CanvasItem[] = [];

      for (const id of currentSelectedIds) {
        const item = state.itemsMap.get(id);
        if (item) {
          items.push(item);
        }
      }

      cachedSelectedItems = items;
      prevSelectedSize = currentSelectedSize;
      return cachedSelectedItems;
    },

    // 从模板添加元素
    addItemFromTemplate: (template) => {
      // 生成新的ID
      const objid = generateId();

      const newItem: CanvasItem = {
        objid,
        boxLeft: template.boxLeft ?? Math.random() * 500,
        boxTop: template.boxTop ?? Math.random() * 500,
        boxWidth: template.boxWidth || 100,
        boxHeight: template.boxHeight || 100,
        boxCode: template.boxCode || "",
        equipId: template.equipId || "",
        showColor: template.showColor || "#4682B4",
        boxName: template.boxName || "",
        locId: template.locId || "",
        showType: template.showType || "rectangle",
      };

      get().addItem(newItem);
      return objid;
    },

    // 删除元素
    deleteItemById: (itemId) => {
      const { selectedItemIds, removeItem } = get();

      removeItem(itemId);

      // 如果删除的是当前选中的元素，清除选择
      if (selectedItemIds.has(itemId)) {
        get().clearSelection();
      }
    },

    // 选择元素
    selectItemById: (itemId) => {
      get().selectItem(itemId, false);
    },

    // 清除选择
    clearSelectionAction: () => {
      get().clearSelection();
    },

    // 清除所有元素
    clearAllItems: () => {
      get().clearItems();
    },

    // 更新相机位置
    updateCameraPosition: (position, zoom) => {
      get().updateCamera({
        position: {
          x: position.x,
          y: position.y,
        },
        zoom,
      });
    },

    // 添加相邻元素（快速模式）
    addAdjacentItem: (sourceItemId, direction, template) => {
      const { itemsMap } = get();

      // 直接从 Map 中获取源元素
      const sourceItem = itemsMap.get(sourceItemId);
      if (!sourceItem) return;

      let newPosition = { x: sourceItem.boxLeft, y: sourceItem.boxTop };

      // 根据方向确定位置
      switch (direction) {
        case "up":
          newPosition.y = sourceItem.boxTop - sourceItem.boxHeight;
          break;
        case "down":
          newPosition.y = sourceItem.boxTop + sourceItem.boxHeight;
          break;
        case "left":
          newPosition.x = sourceItem.boxLeft - sourceItem.boxWidth;
          break;
        case "right":
          newPosition.x = sourceItem.boxLeft + sourceItem.boxWidth;
          break;
      }

      // 创建新元素
      const newItemId = get().addItemFromTemplate({
        ...template,
        boxWidth: sourceItem.boxWidth,
        boxHeight: sourceItem.boxHeight,
        showColor: sourceItem.showColor || template.showColor,
        showType: sourceItem.showType || template.showType,
        boxLeft: newPosition.x,
        boxTop: newPosition.y,
      });

      // 选中新元素
      get().selectItem(newItemId, false);
    },
  };
});

// 选择器函数 - 获取所有项目数组
export const useItems = (): CanvasItem[] => {
  return useCanvasStore((state) => state.getItems());
};

// 选择器函数 - 获取选中的项目数组
export const useSelectedItems = (): CanvasItem[] => {
  return useCanvasStore((state) => state.getSelectedItems());
};

// 选择器函数 - 获取是否有多个选中项
export const useHasMultipleSelection = (): boolean => {
  return useCanvasStore((state) => state.selectedItemIds.size > 1);
};