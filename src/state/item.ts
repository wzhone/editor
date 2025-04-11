import { create } from "zustand";
import { CanvasItem, Point, Rect } from "../types";
import { generateId, initIdCounter } from "../utils/idGenerator";

// 状态接口
interface CanvasStore {
  // 数据状态
  itemsMap: Map<string, CanvasItem>; // 使用Map存储items提高查询效率
  selectedItemIds: Set<string>; // 使用Set存储选中的多个元素ID

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
  addItem: (item: CanvasItem) => string;
  updateItem: (id: string, updates: Partial<CanvasItem>) => void;
  updateItems: (ids: string[], updates: Partial<CanvasItem>) => void;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
  selectItem: (id: string, isMultiSelect: boolean) => void;
  selectItems: (ids: string[]) => void;
  clearSelection: () => void;
  updateInteraction: (
    interaction: Partial<typeof initialState.interaction>
  ) => void;
  clearItems: () => void;
  getItems: () => CanvasItem[];
  getSelectedItems: () => CanvasItem[];

  // 元素操作方法
  deleteItemById: (itemId: string) => void;
  selectItemById: (itemId: string) => void;
  clearSelectionAction: () => void;
  clearAllItems: () => void;
  addAdjacentItem: (
    sourceItemId: string,
    direction: "up" | "down" | "left" | "right"
  ) => void;

  // 批量操作
  batchUpdateItems: (
    updates: { id: string; updates: Partial<CanvasItem> }[]
  ) => void;
}

// 初始状态
const initialState = {
  itemsMap: new Map<string, CanvasItem>(),
  selectedItemIds: new Set<string>(),

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
      // 初始化ID计数器
      initIdCounter(items);

      // 清除缓存
      cachedItems = null;
      cachedSelectedItems = null;

      set({
        itemsMap: new Map(items.map((item) => [item.objid, item])),
      });
    },

    // 添加项目
    addItem: (item) => {
      cachedItems = null; // 清除缓存
      if (item["objid"] && get().itemsMap.has(item["objid"])) {
        get().updateItem(item["objid"], item);
        return item["objid"];
      }

      if (!item["objid"]) {
        item["objid"] = generateId();
      }

      set((state) => {
        const newMap = new Map(state.itemsMap);
        newMap.set(item["objid"], {
          ...item,
        });
        return { itemsMap: newMap };
      });
      return item["objid"];
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
            boxLeft: Math.round(
              updates.boxLeft !== undefined ? updates.boxLeft : item.boxLeft
            ),
            boxTop: Math.round(
              updates.boxTop !== undefined ? updates.boxTop : item.boxTop
            ),
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
              boxLeft: Math.round(
                updates.boxLeft !== undefined ? updates.boxLeft : item.boxLeft
              ),
              boxTop: Math.round(
                updates.boxTop !== undefined ? updates.boxTop : item.boxTop
              ),
            };
            newMap.set(id, updatedItem);
          }
        }

        return { itemsMap: newMap };
      });
    },

    // 批量操作多个项目
    batchUpdateItems: (itemUpdates) => {
      if (itemUpdates.length === 0) return;

      cachedItems = null; // 清除缓存
      cachedSelectedItems = null;
      set((state) => {
        const newMap = new Map(state.itemsMap);

        for (const { id, updates } of itemUpdates) {
          const item = newMap.get(id);
          if (item) {
            const updatedItem = {
              ...item,
              ...updates,
              boxLeft: Math.round(
                updates.boxLeft !== undefined ? updates.boxLeft : item.boxLeft
              ),
              boxTop: Math.round(
                updates.boxTop !== undefined ? updates.boxTop : item.boxTop
              ),
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

    // 删除元素
    deleteItemById: (itemId) => {
      get().removeItem(itemId);
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

    // 添加相邻元素（快速模式）
    addAdjacentItem: (sourceItemId, direction) => {
      const { itemsMap } = get();

      // 直接从 Map 中获取源元素
      const sourceItem = itemsMap.get(sourceItemId);
      if (!sourceItem) return;

      const newPosition = { x: sourceItem.boxLeft, y: sourceItem.boxTop };

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
      const newItemId = get().addItem({
        ...sourceItem,
        objid: generateId(),
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
