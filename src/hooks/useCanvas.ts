import { useRef, useState, useEffect, useCallback, RefObject } from "react";
// import { Stage } from "konva/lib/Stage";
// import { Vector2d } from "konva/lib/types";
import { useCanvasStore } from "../state/store";
import { CollisionDetector } from "../utils/collision";
import { CanvasItem, Point, Rect } from "../types";


// 默认画布尺寸
const DEFAULT_CANVAS_WIDTH = 10000;
const DEFAULT_CANVAS_HEIGHT = 10000;

/**
 * useCanvas Hook参数接口
 */
interface UseCanvasOptions {
  stageRef: RefObject<any>;
  minZoom?: number;
  maxZoom?: number;
  gridSize?: number;
}

/**
 * 画布核心逻辑Hook
 */
export const useCanvas = ({
  stageRef,
  minZoom = 0.2,
  maxZoom = 5,
  gridSize = 50,
}: UseCanvasOptions) => {
  // 从Zustand状态中获取数据
  const {
    camera,
    settings,
    interaction,
    selectedItemIds,
    updateCamera,
    updateInteraction,
    selectItem,
    selectItems,
    clearSelection,
    updateItem,
    updateItems,
    removeItems,
    getItems,
  } = useCanvasStore();

  // 碰撞检测器
  const collisionDetectorRef = useRef<CollisionDetector>(
    new CollisionDetector(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT)
  );

  // 状态
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [itemStartPositions, setItemStartPositions] = useState<
    Map<string, { left: number; top: number }>
  >(new Map());

  // 更新碰撞检测器中的项目
  useEffect(() => {
    const items = getItems();
    collisionDetectorRef.current.reset(items);
  }, [getItems]);

  // 处理缩放
  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();

      if (!stageRef.current) return;

      // 计算缩放系数 - 更平滑的缩放
      const scaleBy = 1.1;
      const stage = stageRef.current;

      // 获取指针位置（相对于舞台）
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition() as any; // Vector2D
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      // 计算新的缩放级别
      let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

      // 限制缩放范围
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));

      // 如果缩放级别没有变化，直接返回
      if (newScale === oldScale) return;

      // 更新相机位置，保持鼠标指向的内容不变
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      // 更新状态
      updateCamera({
        position: newPos,
        zoom: newScale,
      });

      // 更新舞台位置和缩放级别
      stage.scale({ x: newScale, y: newScale });
      stage.position(newPos);
    },
    [stageRef, minZoom, maxZoom, updateCamera]
  );

  // 处理舞台拖动开始
  const handleDragStart = useCallback(
    (e: any) => {
      if (!stageRef.current) return;

      // 检查是否按下了右键（用于拖动画布）
      if (e.evt.button === 2) {
        e.evt.preventDefault();
        e.evt.stopPropagation();
        setIsDraggingCanvas(true);
        return;
      }

      // 获取点击的坐标（舞台坐标系，考虑了缩放）
      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // 转换为世界坐标
      const scale = stage.scaleX();
      const worldPos = {
        x: (pointerPos.x - stage.x()) / scale,
        y: (pointerPos.y - stage.y()) / scale,
      };

      // 记录起始点
      setDragStartPoint(worldPos);

      // 检查是否点击了已有元素
      const items = getItems();
      const clickedItem = findItemAtPosition(worldPos, items);

      if (clickedItem) {
        // 是否按下了Ctrl键，用于多选
        if (e.evt.ctrlKey || e.evt.metaKey) {
          selectItem(clickedItem.objid, true); // 切换选中状态
        } else if (!selectedItemIds.has(clickedItem.objid)) {
          selectItem(clickedItem.objid, false); // 单选
        }

        // 准备开始拖动元素
        setIsDraggingItem(true);

        // 记录所有选中元素的起始位置
        const startPositions = new Map<string, { left: number; top: number }>();

        for (const id of selectedItemIds) {
          const item = items.find((i) => i.objid === id);
          if (item) {
            startPositions.set(id, {
              left: item.boxLeft,
              top: item.boxTop,
            });
          }
        }

        // 如果点击的元素不在选中集合中，也记录它的起始位置
        if (!selectedItemIds.has(clickedItem.objid)) {
          startPositions.set(clickedItem.objid, {
            left: clickedItem.boxLeft,
            top: clickedItem.boxTop,
          });
        }

        setItemStartPositions(startPositions);
      } else {
        // 点击了空白处，清除选择
        clearSelection();

        // 准备框选
        setIsSelecting(true);
        setSelectionRect({
          x: worldPos.x,
          y: worldPos.y,
          width: 0,
          height: 0,
        });
      }
    },
    [stageRef, selectItem, selectedItemIds, clearSelection, getItems]
  );

  // 查找指定位置的元素
  const findItemAtPosition = (
    pos: Point,
    items: CanvasItem[]
  ): CanvasItem | undefined => {
    // 按照z-index降序排列，这样可以先检查上层元素
    const sortedItems = [...items].sort(
      (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
    );

    return sortedItems.find((item) => {
      if (item.showType === "ellipse") {
        // 椭圆检测
        const rx = item.boxWidth / 2;
        const ry = item.boxHeight / 2;
        const cx = item.boxLeft + rx;
        const cy = item.boxTop + ry;

        // 使用椭圆公式检测点是否在椭圆内
        const dx = (pos.x - cx) / rx;
        const dy = (pos.y - cy) / ry;
        return dx * dx + dy * dy <= 1;
      } else {
        // 矩形检测
        return (
          pos.x >= item.boxLeft &&
          pos.x <= item.boxLeft + item.boxWidth &&
          pos.y >= item.boxTop &&
          pos.y <= item.boxTop + item.boxHeight
        );
      }
    });
  };

  // 处理拖动移动
  const handleDragMove = useCallback(
    (e: any) => {
      if (!stageRef.current || !dragStartPoint) return;

      // 获取舞台和当前鼠标位置
      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // 转换为世界坐标
      const scale = stage.scaleX();
      const worldPos = {
        x: (pointerPos.x - stage.x()) / scale,
        y: (pointerPos.y - stage.y()) / scale,
      };

      if (isDraggingCanvas) {
        // 拖动画布的逻辑在Stage组件中处理
        return;
      }

      if (isDraggingItem && selectedItemIds.size > 0) {
        // 拖动元素 - 计算偏移量
        const dx = worldPos.x - dragStartPoint.x;
        const dy = worldPos.y - dragStartPoint.y;

        // 对每个选中的元素应用相同的偏移
        const updates: Array<{ id: string; left: number; top: number }> = [];

        for (const id of selectedItemIds) {
          const startPos = itemStartPositions.get(id);
          if (!startPos) continue;

          // 计算新位置
          let newLeft = startPos.left + dx;
          let newTop = startPos.top + dy;

          updates.push({
            id,
            left: newLeft,
            top: newTop,
          });
        }

        // 如果启用了自动吸附
        if (settings.autoMag && updates.length > 0) {
          const mainId = Array.from(selectedItemIds)[0];
          const mainUpdate = updates.find((u) => u.id === mainId);
          const items = getItems();
          const mainItem = items.find((item) => item.objid === mainId);

          if (mainItem && mainUpdate) {
            // 计算吸附位置
            const snapResult =
              collisionDetectorRef.current.calculateSnapPosition(
                {
                  ...mainItem,
                  boxLeft: mainUpdate.left,
                  boxTop: mainUpdate.top,
                },
                10,
                settings.gridSize,
                Array.from(selectedItemIds)
              );

            // 计算吸附调整量
            const snapDx = snapResult.boxLeft - mainUpdate.left;
            const snapDy = snapResult.boxTop - mainUpdate.top;

            // 应用相同的吸附调整到所有选中元素
            for (const update of updates) {
              update.left += snapDx;
              update.top += snapDy;
            }
          }
        }

        // 批量更新所有元素位置
        for (const update of updates) {
          updateItem(update.id, {
            boxLeft: update.left,
            boxTop: update.top,
          });
        }
      } else if (isSelecting && selectionRect) {
        // 框选 - 更新选择框
        const startX = dragStartPoint.x;
        const startY = dragStartPoint.y;

        // 计算框选区域
        const x = Math.min(startX, worldPos.x);
        const y = Math.min(startY, worldPos.y);
        const width = Math.abs(worldPos.x - startX);
        const height = Math.abs(worldPos.y - startY);

        setSelectionRect({ x, y, width, height });
      }
    },
    [
      stageRef,
      dragStartPoint,
      isDraggingCanvas,
      isDraggingItem,
      isSelecting,
      selectionRect,
      selectedItemIds,
      itemStartPositions,
      settings.autoMag,
      settings.gridSize,
      updateItem,
      getItems,
    ]
  );

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
    }

    if (isDraggingItem) {
      setIsDraggingItem(false);
      setItemStartPositions(new Map());
    }

    if (isSelecting && selectionRect) {
      // 完成框选，选中区域内的元素
      const items = getItems();
      const selectedItems =
        collisionDetectorRef.current.findItemsInRect(selectionRect);

      if (selectedItems.length > 0) {
        selectItems(selectedItems.map((item) => item.objid));
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
    getItems,
    selectItems,
  ]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 跳过输入框中的按键事件
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // 移动距离（按住Shift键时移动更大距离）
      const moveDistance = event.shiftKey ? 10 : 1;

      if (selectedItemIds.size === 0) {
        return;
      }

      const ids = Array.from(selectedItemIds);

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
          // 向左移动选中元素
          moveSelectedItems(-moveDistance, 0);
          event.preventDefault();
          break;

        case "ArrowRight":
          // 向右移动选中元素
          moveSelectedItems(moveDistance, 0);
          event.preventDefault();
          break;

        case "ArrowUp":
          // 向上移动选中元素
          moveSelectedItems(0, -moveDistance);
          event.preventDefault();
          break;

        case "ArrowDown":
          // 向下移动选中元素
          moveSelectedItems(0, moveDistance);
          event.preventDefault();
          break;

        // 快速模式的键盘操作
        case "w":
        case "W":
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "up", store.templateItem);
            event.preventDefault();
          }
          break;

        case "a":
        case "A":
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "left", store.templateItem);
            event.preventDefault();
          }
          break;

        case "s":
        case "S":
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "down", store.templateItem);
            event.preventDefault();
          }
          break;

        case "d":
        case "D":
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "right", store.templateItem);
            event.preventDefault();
          }
          break;
      }
    },
    [selectedItemIds, removeItems, clearSelection, settings.fastMode]
  );

  // 移动选中元素
  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.size === 0) return;

      const ids = Array.from(selectedItemIds);
      const items = getItems();
      const itemUpdates: Array<{ id: string; left: number; top: number }> = [];

      // 计算每个选中元素的新位置
      for (const id of ids) {
        const item = items.find((item) => item.objid === id);
        if (!item) continue;

        let newLeft = item.boxLeft + dx;
        let newTop = item.boxTop + dy;

        itemUpdates.push({
          id,
          left: newLeft,
          top: newTop,
        });
      }

      // 批量更新所有元素位置
      for (const update of itemUpdates) {
        updateItem(update.id, {
          boxLeft: update.left,
          boxTop: update.top,
        });
      }
    },
    [selectedItemIds, getItems, updateItem]
  );

  // 绑定键盘事件
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // 重置视图
  const resetView = useCallback(() => {
    if (!stageRef.current) return;

    const newScale = 1;
    const newPos = { x: 0, y: 0 };

    updateCamera({
      position: newPos,
      zoom: newScale,
    });

    stageRef.current.scale({ x: newScale, y: newScale });
    stageRef.current.position(newPos);
  }, [stageRef, updateCamera]);

  // 放大
  const zoomIn = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const newScale = Math.min(oldScale * 1.2, maxZoom);

    // 以画布中心为缩放中心点
    const width = stage.width();
    const height = stage.height();
    const oldPos = stage.position();

    const centerX = width / 2;
    const centerY = height / 2;
    const relX = (centerX - oldPos.x) / oldScale;
    const relY = (centerY - oldPos.y) / oldScale;

    const newPos = {
      x: centerX - relX * newScale,
      y: centerY - relY * newScale,
    };

    updateCamera({
      position: newPos,
      zoom: newScale,
    });

    stage.scale({ x: newScale, y: newScale });
    stage.position(newPos);
  }, [stageRef, maxZoom, updateCamera]);

  // 缩小
  const zoomOut = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const newScale = Math.max(oldScale / 1.2, minZoom);

    // 以画布中心为缩放中心点
    const width = stage.width();
    const height = stage.height();
    const oldPos = stage.position();

    const centerX = width / 2;
    const centerY = height / 2;
    const relX = (centerX - oldPos.x) / oldScale;
    const relY = (centerY - oldPos.y) / oldScale;

    const newPos = {
      x: centerX - relX * newScale,
      y: centerY - relY * newScale,
    };

    updateCamera({
      position: newPos,
      zoom: newScale,
    });

    stage.scale({ x: newScale, y: newScale });
    stage.position(newPos);
  }, [stageRef, minZoom, updateCamera]);

  // 获取当前鼠标样式
  const getCursorStyle = useCallback(() => {
    if (isDraggingCanvas) return "grabbing";
    if (isDraggingItem) return "move";
    if (isSelecting) return "crosshair";
    return "default";
  }, [isDraggingCanvas, isDraggingItem, isSelecting]);

  // 同步相机状态
  useEffect(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    stage.scale({ x: camera.zoom, y: camera.zoom });
    stage.position(camera.position);
  }, [stageRef, camera]);

  return {
    handleWheel,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    resetView,
    zoomIn,
    zoomOut,
    isDraggingCanvas,
    isDraggingItem,
    isSelecting,
    selectionRect,
    getCursorStyle,
  };
};
