// src/hooks/useKeyEvents.ts
import { useCallback, useEffect, useState } from "react";
import { useCanvasStore } from "@/state/item";
import { CanvasItem } from "@/types";
import { useSettingStore } from "@/state/settings";
import { useCameraStore } from "@/state/camera";
import { generateId } from "@/utils/idGenerator";

interface UseKeyEventsProps {
  moveDistanceNormal?: number;
  moveDistanceShift?: number;
}

export function useKeyEvents({
  moveDistanceNormal = 1,
  moveDistanceShift = 10,
}: UseKeyEventsProps = {}) {
  const {
    addItem,
    selectItems,
    itemsMap,
    selectedItemIds,
    removeItems,
    clearSelection,
  } = useCanvasStore();

  const store = useCanvasStore();
  const settings = useSettingStore();
  const camera = useCameraStore();

  // 移动选中元素的函数
  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.size === 0) return;

      const visibleItems = store.getItems();
      const ids = Array.from(selectedItemIds);
      const itemUpdates: Array<{ id: string; updates: Partial<CanvasItem> }> =
        [];

      // 计算每个元素的新位置
      for (const id of ids) {
        const item = visibleItems.find((item) => item.objid === id);
        if (!item) continue;

        const newLeft = item.boxLeft + dx;
        const newTop = item.boxTop + dy;

        itemUpdates.push({
          id,
          updates: {
            boxLeft: newLeft,
            boxTop: newTop,
          },
        });
      }

      // 批量更新元素位置
      store.batchUpdateItems(itemUpdates);
    },
    [selectedItemIds, store]
  );

  const [clipboard, setClipboard] = useState<CanvasItem[]>([]);

  // 复制选中的元素
  const copySelectedItems = useCallback(() => {
    if (selectedItemIds.size === 0) return;

    const selectedItems: CanvasItem[] = [];
    const ids = Array.from(selectedItemIds);

    // 收集所有选中的元素
    ids.forEach((id) => {
      const item = itemsMap.get(id);
      if (item) {
        // 创建深拷贝避免引用问题
        selectedItems.push({ ...item });
      }
    });

    if (selectedItems.length > 0) {
      setClipboard(selectedItems);
      console.log("已复制到剪贴板", selectedItems);
    }
  }, [selectedItemIds, itemsMap]);

  // 粘贴剪贴板中的元素
  const pasteItems = useCallback(() => {
    if (clipboard.length === 0) return;

    // console.log("剪贴板里有", clipboard.length, "个元素");

    // const start = performance.now();

    // 使用视口中心作为粘贴位置
    const { width, height } = camera.dimension;
    const { position, zoom } = camera.camera;

    const referenceX = (position.x + width / 2) / zoom;
    const referenceY = (position.y + height / 2) / zoom;

    // 计算剪贴板元素的中心点
    let clipboardCenterX = 0;
    let clipboardCenterY = 0;
    clipboard.forEach((item) => {
      clipboardCenterX += item.boxLeft + item.boxWidth / 2;
      clipboardCenterY += item.boxTop + item.boxHeight / 2;
    });
    clipboardCenterX /= clipboard.length;
    clipboardCenterY /= clipboard.length;

    // 计算偏移量
    const offsetX = referenceX - clipboardCenterX;
    const offsetY = referenceY - clipboardCenterY;

    // 清除当前选择
    clearSelection();

    // 新创建的元素ID集合
    const newItemIds: string[] = [];

    // 粘贴每个元素并应用偏移
    clipboard.forEach((originalItem) => {
      // 创建新元素，生成新ID
      const newItem: CanvasItem = {
        ...originalItem,
        objid: generateId(),
        boxLeft: originalItem.boxLeft + offsetX,
        boxTop: originalItem.boxTop + offsetY,
      };

      // 添加到画布
      const newId = addItem(newItem);
      newItemIds.push(newId);
    });

    // 选中新创建的元素
    if (newItemIds.length > 0) {
      selectItems(newItemIds);
    }
    // const end = performance.now();
    // console.log(`执行时间: ${end - start} 毫秒`);
  }, [
    clipboard,
    clearSelection,
    selectItems,
    addItem,
    camera,
  ]);

  const removeSelectedItems = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    removeItems(ids);
    clearSelection();
  }, [selectedItemIds, removeItems, clearSelection]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 忽略输入控件中的按键事件
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // 计算移动距离
      const moveDistance = event.shiftKey
        ? moveDistanceShift
        : moveDistanceNormal;

      const ids = Array.from(selectedItemIds);
      const store = useCanvasStore.getState();

      switch (event.key) {
        case "Delete":
          // 删除选中元素
          removeItems(ids);
          break;

        case "Escape":
          // 取消选择
          clearSelection();
          break;

        case "ArrowLeft":
          // 向左移动
          moveSelectedItems(-moveDistance, 0);
          event.preventDefault();
          break;

        case "ArrowRight":
          // 向右移动
          moveSelectedItems(moveDistance, 0);
          event.preventDefault();
          break;

        case "ArrowUp":
          // 向上移动
          moveSelectedItems(0, -moveDistance);
          event.preventDefault();
          break;

        case "ArrowDown":
          // 向下移动
          moveSelectedItems(0, moveDistance);
          event.preventDefault();
          break;

        case "w":
        case "W":
          // 快速模式：上方创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "up");
            event.preventDefault();
          }
          break;

        case "a":
        case "A":
          // 快速模式：左侧创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "left");
            event.preventDefault();
          }
          break;

        case "s":
        case "S":
          // 快速模式：下方创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "down");
            event.preventDefault();
          }
          break;

        case "d":
        case "D":
          // 快速模式：右侧创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "right");
            event.preventDefault();
          }
          break;

        case "c":
        case "C":
          if (event.ctrlKey) {
            copySelectedItems();
          }
          break;
        case "v":
        case "V":
          if (event.ctrlKey) {
            pasteItems();
          }
          break;
        case "x":
        case "X":
          if (event.ctrlKey) {
            copySelectedItems();
            removeSelectedItems();
          }
          break;
      }
    },
    [
      selectedItemIds,
      moveDistanceNormal,
      moveDistanceShift,
      removeItems,
      clearSelection,
      moveSelectedItems,
      copySelectedItems,
      pasteItems,
      removeSelectedItems,
      settings,
    ]
  );

  // 绑定和解绑键盘事件
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    moveSelectedItems,
  };
}
