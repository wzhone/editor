// src/hooks/useKeyEvents.ts
import { useCallback, useEffect } from "react";
import { useCanvasStore } from "@/state/item";
import { CanvasItem } from "@/types";
import { useSettingStore } from "@/state/settings";

interface UseKeyEventsProps {
  moveDistanceNormal?: number;
  moveDistanceShift?: number;
}

export function useKeyEvents({
  moveDistanceNormal = 1,
  moveDistanceShift = 10,
}: UseKeyEventsProps = {}) {
  const { selectedItemIds, removeItems, clearSelection } = useCanvasStore();

  const store = useCanvasStore();
  const settings = useSettingStore();

  // 移动选中元素的函数
  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.size === 0) return;

      // const settings = store.settings;
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
    [selectedItemIds]
  );

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

      // 如果没有选中元素，忽略方向键
      if (selectedItemIds.size === 0) {
        return;
      }

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
            store.addAdjacentItem(selectedId, "up", store.templateItem);
            event.preventDefault();
          }
          break;

        case "a":
        case "A":
          // 快速模式：左侧创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "left", store.templateItem);
            event.preventDefault();
          }
          break;

        case "s":
        case "S":
          // 快速模式：下方创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "down", store.templateItem);
            event.preventDefault();
          }
          break;

        case "d":
        case "D":
          // 快速模式：右侧创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            store.addAdjacentItem(selectedId, "right", store.templateItem);
            event.preventDefault();
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
