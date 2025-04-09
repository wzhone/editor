import { useState, useCallback } from "react";
import { useCanvasStore } from "@/state/store";
import { Point, Rect, CanvasItem } from "@/types";
import * as CanvasUtils from "@/utils/canvasUtils";
import { calculateSnappedPosition } from "@/utils/collisionUtils";

interface UseCanvasInteractionProps {
  clientToWorldPosition: (clientX: number, clientY: number) => Point;
  visibleItems: CanvasItem[];
  visibleViewport: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

type ResizeHandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function useCanvasInteraction({
  clientToWorldPosition,
  visibleItems,
  visibleViewport,
}: UseCanvasInteractionProps) {
  // 从Store获取方法和状态
  const {
    camera,
    selectedItemIds,
    settings,
    updateCamera,
    selectItem,
    selectItems,
    clearSelection,
  } = useCanvasStore();

  // 状态
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [itemStartPositions, setItemStartPositions] = useState<
    Map<string, { left: number; top: number }>
  >(new Map());

  // 调整大小相关状态
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandlePosition | null>(
    null
  );
  const [resizeItemOriginal, setResizeItemOriginal] = useState<{
    item: CanvasItem;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);

  // 鼠标点击，查找指定位置的元素
  const findItemAtPosition = useCallback(
    (pos: Point): CanvasItem | undefined => {
      // 点击容差（像素）
      const tolerance = 2 / camera.zoom; // 根据缩放级别动态调整点击容差

      // 按z-index反向排序，优先检测顶层元素
      const sortedItems = [...visibleItems].reverse();

      // 添加容差的检测区域
      const checkRect = {
        x: pos.x - tolerance,
        y: pos.y - tolerance,
        width: tolerance * 2,
        height: tolerance * 2,
      };

      // 首先尝试精确点击
      const exactMatch = sortedItems.find((item) =>
        CanvasUtils.isPointInItem(pos, item)
      );

      if (exactMatch) return exactMatch;

      // 如果没有精确匹配，使用容差区域
      return sortedItems.find((item) => {
        // 矩形检测
        if (item.showType !== "ellipse") {
          return CanvasUtils.rectIntersectsItem(checkRect, item);
        }

        // 椭圆特殊处理 - 考虑边缘容差
        const centerX = item.boxLeft + item.boxWidth / 2;
        const centerY = item.boxTop + item.boxHeight / 2;
        const radiusX = item.boxWidth / 2 + tolerance;
        const radiusY = item.boxHeight / 2 + tolerance;

        const dx = (pos.x - centerX) / radiusX;
        const dy = (pos.y - centerY) / radiusY;
        return dx * dx + dy * dy <= 1;
      });
    },
    [visibleItems, camera.zoom]
  );

  // 处理元素拖拽和自动吸附
  const handleItemDrag = useCallback(
    (worldPos: Point) => {
      if (!isDraggingItem || !dragStartPoint || selectedItemIds.size === 0)
        return;

      const dx = worldPos.x - dragStartPoint.x;
      const dy = worldPos.y - dragStartPoint.y;

      // 存储计算后的新位置
      const itemUpdates: Array<{ id: string; updates: Partial<CanvasItem> }> =
        [];

      // 计算所有选中元素的新位置
      const selectedItemsArray: CanvasItem[] = [];
      const newPositionsArray: {
        id: string;
        item: CanvasItem;
        newLeft: number;
        newTop: number;
      }[] = [];

      for (const id of selectedItemIds) {
        const item = visibleItems.find((item) => item.objid === id);
        const startPos = itemStartPositions.get(id);

        if (!item || !startPos) continue;

        // 基础位置（未吸附）
        const newLeft = startPos.left + dx;
        const newTop = startPos.top + dy;

        selectedItemsArray.push(item);
        newPositionsArray.push({ id, item, newLeft, newTop });
      }

      // 如果启用了自动吸附，计算吸附位置
      if (settings.autoMag && newPositionsArray.length > 0) {
        // 获取第一个元素做为吸附参考
        const {
          item: primaryItem,
          newLeft: primaryLeft,
          newTop: primaryTop,
        } = newPositionsArray[0];

        // 创建一个临时项目来计算吸附
        const tempItem: CanvasItem = {
          ...primaryItem,
          boxLeft: primaryLeft,
          boxTop: primaryTop,
        };

        // 计算吸附位置
        const snappedPos = calculateSnappedPosition(
          tempItem,
          visibleItems,
          selectedItemIds,
          visibleViewport,
          10 // 吸附阈值
        );

        // 计算吸附偏移量
        const snapDx = snappedPos.boxLeft - primaryLeft;
        const snapDy = snappedPos.boxTop - primaryTop;

        // 如果发生了吸附，更新所有选中元素的位置
        if (snapDx !== 0 || snapDy !== 0) {
          // 更新所有元素位置
          for (const { id, newLeft, newTop } of newPositionsArray) {
            itemUpdates.push({
              id,
              updates: {
                boxLeft: newLeft + snapDx,
                boxTop: newTop + snapDy,
              },
            });
          }
        } else {
          // 没有吸附，使用原始计算的位置
          for (const { id, newLeft, newTop } of newPositionsArray) {
            itemUpdates.push({
              id,
              updates: {
                boxLeft: newLeft,
                boxTop: newTop,
              },
            });
          }
        }
      } else {
        // 自动吸附被禁用，使用原始计算的位置
        for (const { id, newLeft, newTop } of newPositionsArray) {
          itemUpdates.push({
            id,
            updates: {
              boxLeft: newLeft,
              boxTop: newTop,
            },
          });
        }
      }

      // 直接更新元素位置
      const store = useCanvasStore.getState();
      store.batchUpdateItems(itemUpdates);
    },
    [
      isDraggingItem,
      dragStartPoint,
      selectedItemIds,
      itemStartPositions,
      settings.autoMag,
      settings.gridSize,
      visibleItems,
      visibleViewport,
    ]
  );
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, position: ResizeHandlePosition) => {
      e.preventDefault();
      e.stopPropagation();

      // 获取选中的元素 (应该只有一个)
      const selectedItems = useCanvasStore.getState().getSelectedItems();
      if (selectedItems.length !== 1) return;

      const item = selectedItems[0];

      // 记录调整开始时的原始位置和尺寸
      setResizeItemOriginal({
        item,
        rect: {
          left: item.boxLeft,
          top: item.boxTop,
          width: item.boxWidth,
          height: item.boxHeight,
        },
      });

      // 设置正在调整大小状态
      setIsResizing(true);
      setResizeHandle(position);

      // 记录起始点
      const worldPos = clientToWorldPosition(e.clientX, e.clientY);
      setDragStartPoint(worldPos);

      // 添加全局鼠标事件，以便可以在画布外拖动
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
    },
    [clientToWorldPosition]
  );

  // 修改 handleResizeMove 函数，确保事件参数类型正确
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (
        !isResizing ||
        !dragStartPoint ||
        !resizeHandle ||
        !resizeItemOriginal
      )
        return;

      // 获取当前鼠标位置
      const worldPos = clientToWorldPosition(e.clientX, e.clientY);

      // 计算拖动的距离
      const dx = worldPos.x - dragStartPoint.x;
      const dy = worldPos.y - dragStartPoint.y;

      // 获取原始矩形
      const original = resizeItemOriginal.rect;

      // 根据不同的控制点位置计算新的位置和尺寸
      let newLeft = original.left;
      let newTop = original.top;
      let newWidth = original.width;
      let newHeight = original.height;

      // 处理不同位置控制点的调整逻辑
      switch (resizeHandle) {
        case "nw": // 左上
          newLeft = original.left + dx;
          newTop = original.top + dy;
          newWidth = original.width - dx;
          newHeight = original.height - dy;
          break;
        case "n": // 上中
          newTop = original.top + dy;
          newHeight = original.height - dy;
          break;
        case "ne": // 右上
          newTop = original.top + dy;
          newWidth = original.width + dx;
          newHeight = original.height - dy;
          break;
        case "e": // 右中
          newWidth = original.width + dx;
          break;
        case "se": // 右下
          newWidth = original.width + dx;
          newHeight = original.height + dy;
          break;
        case "s": // 下中
          newHeight = original.height + dy;
          break;
        case "sw": // 左下
          newLeft = original.left + dx;
          newWidth = original.width - dx;
          newHeight = original.height + dy;
          break;
        case "w": // 左中
          newLeft = original.left + dx;
          newWidth = original.width - dx;
          break;
      }

      // 确保尺寸不小于最小值
      const minSize = 10;
      if (newWidth < minSize) {
        // 如果宽度太小，调整left保持右边不变
        if (["nw", "w", "sw"].includes(resizeHandle)) {
          newLeft = original.left + original.width - minSize;
        }
        newWidth = minSize;
      }

      if (newHeight < minSize) {
        // 如果高度太小，调整top保持底边不变
        if (["nw", "n", "ne"].includes(resizeHandle)) {
          newTop = original.top + original.height - minSize;
        }
        newHeight = minSize;
      }

      // 更新元素属性
      const store = useCanvasStore.getState();
      store.updateItem(resizeItemOriginal.item.objid, {
        boxLeft: newLeft,
        boxTop: newTop,
        boxWidth: newWidth,
        boxHeight: newHeight,
      });
    },
    [
      isResizing,
      dragStartPoint,
      resizeHandle,
      resizeItemOriginal,
      clientToWorldPosition,
    ]
  );

  // 修改 handleResizeEnd 函数，确保正确清除事件监听器
  const handleResizeEnd = useCallback(
    (e: MouseEvent) => {
      // 移除全局鼠标事件
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);

      // 重置状态
      setIsResizing(false);
      setResizeHandle(null);
      setResizeItemOriginal(null);
      setDragStartPoint(null);
    },
    [handleResizeMove]
  );

  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 如果正在调整大小，不处理画布的鼠标按下事件
      if (isResizing) return;

      // 如果是右键，用于拖动画布
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();

        setIsDraggingCanvas(true);
        setDragStartPos({ x: e.clientX, y: e.clientY });
        return;
      }

      // 获取世界坐标
      const worldPos = clientToWorldPosition(e.clientX, e.clientY);
      setDragStartPoint(worldPos);

      // 查找点击位置的元素
      const clickedItem = findItemAtPosition(worldPos);

      if (clickedItem) {
        // 处理元素点击
        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Command + 点击：切换选择
          selectItem(clickedItem.objid, true);
        } else if (!selectedItemIds.has(clickedItem.objid)) {
          // 点击未选中的元素：选中它
          selectItem(clickedItem.objid, false);
        }

        // 开始拖拽
        setIsDraggingItem(true);

        // 记录所有选中元素的起始位置
        const startPositions = new Map<string, { left: number; top: number }>();
        for (const id of selectedItemIds) {
          const item = visibleItems.find((i) => i.objid === id);
          if (item) {
            startPositions.set(id, {
              left: item.boxLeft,
              top: item.boxTop,
            });
          }
        }

        // 如果当前点击的元素不在选中集合中，也记录它的位置
        if (!selectedItemIds.has(clickedItem.objid)) {
          startPositions.set(clickedItem.objid, {
            left: clickedItem.boxLeft,
            top: clickedItem.boxTop,
          });
        }

        setItemStartPositions(startPositions);
      } else {
        // 点击空白区域：清除选择并开始框选
        clearSelection();
        setIsSelecting(true);
        setSelectionRect({
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
        });
      }
    },
    [
      clientToWorldPosition,
      findItemAtPosition,
      selectItem,
      selectedItemIds,
      clearSelection,
      visibleItems,
    ]
  );

  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 处理画布拖动
      if (isDraggingCanvas && dragStartPos) {
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;

        updateCamera({
          position: {
            x: camera.position.x - dx,
            y: camera.position.y - dy,
          },
        });
        setDragStartPos({ x: e.clientX, y: e.clientY });
        return;
      }

      const worldPos = clientToWorldPosition(e.clientX, e.clientY);

      // 处理元素拖拽
      if (isDraggingItem && dragStartPoint) {
        handleItemDrag(worldPos);
      }
      // 处理框选
      else if (isSelecting && selectionRect && dragStartPoint) {
        const startX = dragStartPoint.x;
        const startY = dragStartPoint.y;
        const width = Math.abs(worldPos.x - startX);
        const height = Math.abs(worldPos.y - startY);
        const x = Math.min(startX, worldPos.x);
        const y = Math.min(startY, worldPos.y);

        setSelectionRect({ x, y, width, height });
      }
    },
    [
      isResizing,
      isDraggingCanvas,
      dragStartPos,
      camera.position,
      updateCamera,
      isDraggingItem,
      dragStartPoint,
      isSelecting,
      selectionRect,
      clientToWorldPosition,
      handleItemDrag,
    ]
  );

  // 处理鼠标抬起事件
  const handleMouseUp = useCallback(() => {
    if (isResizing) return;

    // 处理画布拖动结束
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      setDragStartPos(null);
    }

    // 处理元素拖拽结束
    if (isDraggingItem) {
      setIsDraggingItem(false);
      setItemStartPositions(new Map());
    }

    // 处理框选结束
    if (isSelecting && selectionRect) {
      if (selectionRect.width > 3 && selectionRect.height > 3) {
        // 找出与选择框相交的元素
        const selectedItems = visibleItems.filter((item) =>
          CanvasUtils.rectIntersectsItem(selectionRect, item)
        );

        if (selectedItems.length > 0) {
          selectItems(selectedItems.map((item) => item.objid));
        }
      }
      setIsSelecting(false);
      setSelectionRect(null);
    }

    setDragStartPoint(null);
  }, [
    isDraggingCanvas,
    isDraggingItem,
    isSelecting,
    selectionRect,
    visibleItems,
    selectItems,
    isResizing,
  ]);

  // 防止右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // 处理滚轮缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const scaleBy = 1.1;
      const oldScale = camera.zoom;

      // 获取鼠标位置
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 计算鼠标在世界坐标中的位置（使用新的坐标系统）
      const mousePointTo = {
        x: (mouseX + camera.position.x) / oldScale,
        y: (mouseY + camera.position.y) / oldScale,
      };

      // 计算新的缩放级别
      let newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(0.2, Math.min(5, newScale)); // 限制缩放范围

      // 更新相机位置，保持鼠标指向不变
      const newPos = {
        x: mousePointTo.x * newScale - mouseX,
        y: mousePointTo.y * newScale - mouseY,
      };

      // 更新相机状态
      updateCamera({
        position: newPos,
        zoom: newScale,
      });
    },
    [camera.position, camera.zoom, updateCamera]
  );

  return {
    isDraggingCanvas,
    isDraggingItem,
    isSelecting,
    selectionRect,
    isResizing,
    resizeHandle: {
      handleResizeStart,
      handleResizeMove,
      handleResizeEnd,
    },
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel,
  };
}
