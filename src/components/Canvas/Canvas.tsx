"use client";
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Group, Rect, Ellipse, Text } from 'react-konva';
import { useCanvasStore } from '../../state/store';
import { CanvasItem, Point, Rect as RectType } from '../../types';
import CanvasControls from './CanvasControls';
import CanvasStatusBar from './CanvasStatusBar';
import CanvasGrid from './CanvasGrid';

/**
 * 画布组件
 * 使用React-Konva实现交互式画布
 */
const Canvas: React.FC = () => {
  // Stage引用
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 容器尺寸状态
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });

  // 从Store获取状态
  const {
    itemsMap,
    camera,
    settings,
    updateCamera,
    selectItem,
    selectItems,
    clearSelection,
    updateItem,
    removeItems,
    getItems,
    selectedItemIds
  } = useCanvasStore();

  // Canvas 交互状态
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<RectType | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  // 右键拖动所需状态
  const [dragStartPos, setDragStartPos] = useState<{ x: number, y: number } | null>(null);
  // 记录选中元素开始拖拽时的位置
  const [itemStartPositions, setItemStartPositions] = useState<Map<string, { left: number; top: number }>>(new Map());
  // 存储拖拽过程中选中元素的临时位置，避免频繁更新全局状态
  const [tempPositions, setTempPositions] = useState<Map<string, { left: number; top: number }>>(new Map());

  // 限制缩放范围
  const minZoom = 0.2;
  const maxZoom = 5;

  // 监听容器尺寸变化
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    // 初始化尺寸
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 处理缩放
  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();

      if (!stageRef.current) return;

      const scaleBy = 1.1;
      const stage = stageRef.current;

      // 获取指针位置（相对于舞台）
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition() as any;

      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      // 计算新的缩放级别
      let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale)); // 限制缩放范围

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
    },
    [updateCamera]
  );

  // 检查矩形与元素是否相交
  const rectIntersectsItem = (rect: RectType, item: CanvasItem): boolean => {
    const itemRect = {
      x: item.boxLeft,
      y: item.boxTop,
      width: item.boxWidth,
      height: item.boxHeight
    };

    return !(
      rect.x > itemRect.x + itemRect.width ||
      rect.x + rect.width < itemRect.x ||
      rect.y > itemRect.y + itemRect.height ||
      rect.y + rect.height < itemRect.y
    );
  };

  // 查找指定位置的元素
  const findItemAtPosition = useCallback(
    (pos: Point): CanvasItem | undefined => {

      console.log("findItemAtPosition", pos);
      const items = getItems();
      const sortedItems = [...items].sort(
        (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
      );
      console.log("findItemAtPosition sorted", pos);

      const i = sortedItems.find((item) => {
        if (item.showType === "ellipse") {
          const rx = item.boxWidth / 2;
          const ry = item.boxHeight / 2;
          const cx = item.boxLeft + rx;
          const cy = item.boxTop + ry;
          const dx = (pos.x - cx) / rx;
          const dy = (pos.y - cy) / ry;
          return dx * dx + dy * dy <= 1;
        } else {
          return (
            pos.x >= item.boxLeft &&
            pos.x <= item.boxLeft + item.boxWidth &&
            pos.y >= item.boxTop &&
            pos.y <= item.boxTop + item.boxHeight
          );
        }
      });
      console.log("findItemAtPosition finded", pos);
      return i
    },
    [getItems]
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
        const stage = stageRef.current;
        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;

        setDragStartPos({
          x: pointerPos.x - camera.position.x,
          y: pointerPos.y - camera.position.y
        });
        return;
      }

      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const scale = stage.scaleX();
      const worldPos = {
        x: (pointerPos.x - stage.x()) / scale,
        y: (pointerPos.y - stage.y()) / scale,
      };

      setDragStartPoint(worldPos);

      const clickedItem = findItemAtPosition(worldPos);

      if (clickedItem) {
        if (e.evt.ctrlKey || e.evt.metaKey) {
          selectItem(clickedItem.objid, true);
        } else if (!selectedItemIds.has(clickedItem.objid)) {
          selectItem(clickedItem.objid, false);
        }

        setIsDraggingItem(true);

        const startPositions = new Map<string, { left: number; top: number }>();

        for (const id of selectedItemIds) {
          const item = getItems().find((i) => i.objid === id);
          if (item) {
            startPositions.set(id, {
              left: item.boxLeft,
              top: item.boxTop,
            });
          }
        }

        if (!selectedItemIds.has(clickedItem.objid)) {
          startPositions.set(clickedItem.objid, {
            left: clickedItem.boxLeft,
            top: clickedItem.boxTop,
          });
        }

        setItemStartPositions(startPositions);
        stage.batchDraw();
      } else {
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
    [camera.position, findItemAtPosition, selectItem, selectedItemIds, clearSelection, getItems]
  );

  // 处理拖动移动
  const handleDragMove = useCallback(
    (e: any) => {
      if (!stageRef.current) return;
      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      if (isDraggingCanvas && dragStartPos) {
        const newPosition = {
          x: pointerPos.x - dragStartPos.x,
          y: pointerPos.y - dragStartPos.y
        };

        updateCamera({
          position: newPosition
        });
        stage.position(newPosition);
        return;
      }

      const scale = stage.scaleX();
      const worldPos = {
        x: (pointerPos.x - stage.x()) / scale,
        y: (pointerPos.y - stage.y()) / scale,
      };

      if (isDraggingItem && selectedItemIds.size > 0 && dragStartPoint) {
        const dx = worldPos.x - dragStartPoint.x;
        const dy = worldPos.y - dragStartPoint.y;
        const newTempPositions = new Map<string, { left: number; top: number }>();
        for (const id of selectedItemIds) {
          const startPos = itemStartPositions.get(id);
          if (!startPos) continue;
          newTempPositions.set(id, {
            left: startPos.left + dx,
            top: startPos.top + dy
          });
        }
        setTempPositions(newTempPositions);
      } else if (isSelecting && selectionRect && dragStartPoint) {
        const startX = dragStartPoint.x;
        const startY = dragStartPoint.y;
        const x = Math.min(startX, worldPos.x);
        const y = Math.min(startY, worldPos.y);
        const width = Math.abs(worldPos.x - startX);
        const height = Math.abs(worldPos.y - startY);
        setSelectionRect({ x, y, width, height });
      }
    },
    [
      isDraggingCanvas,
      dragStartPos,
      updateCamera,
      isDraggingItem,
      selectedItemIds,
      dragStartPoint,
      itemStartPositions,
      isSelecting,
      selectionRect
    ]
  );

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      setDragStartPos(null);
    }

    if (isDraggingItem) {
      // 拖拽结束时，将拖拽过程中保存的临时位置一次性提交到全局 store
      tempPositions.forEach((pos, id) => {
        updateItem(id, { boxLeft: pos.left, boxTop: pos.top });
      });
      setIsDraggingItem(false);
      setTempPositions(new Map());
      setItemStartPositions(new Map());
    }

    if (isSelecting && selectionRect) {
      if (selectionRect.width > 3 && selectionRect.height > 3) {
        const items = getItems();
        const selectedItems = items.filter(item => {
          return rectIntersectsItem(selectionRect, item);
        });

        if (selectedItems.length > 0) {
          selectItems(selectedItems.map(item => item.objid));
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
    getItems,
    selectItems,
    tempPositions,
    updateItem
  ]);

  // 移动选中元素的函数（键盘操作使用）
  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.size === 0) return;

      const ids = Array.from(selectedItemIds);
      const items = getItems();
      const itemUpdates: Array<{ id: string; updates: Partial<CanvasItem> }> = [];

      for (const id of ids) {
        const item = items.find((item) => item.objid === id);
        if (!item) continue;

        let newLeft = item.boxLeft + dx;
        let newTop = item.boxTop + dy;

        itemUpdates.push({
          id,
          updates: {
            boxLeft: newLeft,
            boxTop: newTop
          }
        });
      }

      itemUpdates.forEach(({ id, updates }) => updateItem(id, updates));
    },
    [selectedItemIds, getItems, updateItem]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const moveDistance = event.shiftKey ? 10 : 1;

      if (selectedItemIds.size === 0) {
        return;
      }

      const ids = Array.from(selectedItemIds);

      switch (event.key) {
        case "Delete":
          removeItems(ids);
          break;

        case "Escape":
          clearSelection();
          break;

        case "ArrowLeft":
          moveSelectedItems(-moveDistance, 0);
          event.preventDefault();
          break;

        case "ArrowRight":
          moveSelectedItems(moveDistance, 0);
          event.preventDefault();
          break;

        case "ArrowUp":
          moveSelectedItems(0, -moveDistance);
          event.preventDefault();
          break;

        case "ArrowDown":
          moveSelectedItems(0, moveDistance);
          event.preventDefault();
          break;

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
    [selectedItemIds, removeItems, clearSelection, settings.fastMode, moveSelectedItems]
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
  }, [updateCamera]);

  // 放大
  const zoomIn = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const newScale = Math.min(oldScale * 1.2, maxZoom);

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
  }, [updateCamera]);

  // 缩小
  const zoomOut = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const newScale = Math.max(oldScale / 1.2, minZoom);

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
  }, [updateCamera]);

  // 根据当前交互状态返回鼠标样式
  const getCursorStyle = useCallback(() => {
    if (isDraggingCanvas) return "grabbing";
    if (isDraggingItem) return "move";
    if (isSelecting) return "crosshair";
    return "default";
  }, [isDraggingCanvas, isDraggingItem, isSelecting]);

  // 防止右键菜单
  const handleContextMenu = useCallback((e: any) => {
    e.evt.preventDefault();
  }, []);

  // 渲染单个画布元素，新增 overridePosition 用于拖拽期间覆盖位置数据
  const CanvasElement = useCallback(({
    item,
    isSelected,
    overridePosition,
  }: {
    item: CanvasItem;
    isSelected: boolean;
    overridePosition?: { left: number; top: number };
  }) => {
    const left = overridePosition ? overridePosition.left : item.boxLeft;
    const top = overridePosition ? overridePosition.top : item.boxTop;

    // 根据不同类型渲染图形
    const renderShape = () => {
      if (item.showType === "ellipse") {
        return (
          <Ellipse
            x={left + item.boxWidth / 2}
            y={top + item.boxHeight / 2}
            radiusX={item.boxWidth / 2}
            radiusY={item.boxHeight / 2}
            fill={item.showColor}
            stroke={isSelected ? '#0000ff' : '#000000'}
            strokeWidth={isSelected ? 2 / camera.zoom : 1 / camera.zoom}
            perfectDrawEnabled={false}
          />
        );
      }
      return (
        <Rect
          x={left}
          y={top}
          width={item.boxWidth}
          height={item.boxHeight}
          fill={item.showColor}
          stroke={isSelected ? '#0000ff' : '#000000'}
          strokeWidth={isSelected ? 2 / camera.zoom : 1 / camera.zoom}
          perfectDrawEnabled={false}
        />
      );
    };

    // 渲染标签文本
    const renderLabels = () => {
      const labels = [];
      const numLabels = [
        settings.showBoxCode && item.boxCode,
        settings.showEquipId && item.equipId,
        settings.showBoxName && item.boxName
      ].filter(Boolean).length;

      if (numLabels > 0) {
        const spacing = item.boxHeight / (numLabels + 1);
        let positionIndex = 0;

        if (settings.showBoxCode && item.boxCode) {
          positionIndex++;
          labels.push(
            <Text
              key="boxCode"
              x={left}
              y={top + spacing * positionIndex - 8}
              text={item.boxCode}
              width={item.boxWidth}
              align="center"
              fontSize={12 / camera.zoom}
              fill="#000000"
              perfectDrawEnabled={false}
            />
          );
        }

        if (settings.showEquipId && item.equipId) {
          positionIndex++;
          labels.push(
            <Text
              key="equipId"
              x={left}
              y={top + spacing * positionIndex - 8}
              text={item.equipId}
              width={item.boxWidth}
              align="center"
              fontSize={12 / camera.zoom}
              fill="#000000"
              perfectDrawEnabled={false}
            />
          );
        }

        if (settings.showBoxName && item.boxName) {
          positionIndex++;
          labels.push(
            <Text
              key="boxName"
              x={left}
              y={top + spacing * positionIndex - 8}
              text={item.boxName}
              width={item.boxWidth}
              align="center"
              fontSize={12 / camera.zoom}
              fill="#000000"
              perfectDrawEnabled={false}
            />
          );
        }
      }
      return labels;
    };

    return (
      <Group>
        {renderShape()}
        {renderLabels()}
      </Group>
    );
  }, [camera.zoom, settings]);

  // 使用React.memo优化元素渲染
  const MemoizedCanvasElement = React.memo(CanvasElement);

  // 缓存需要渲染的元素
  const renderItems = useMemo(() => {
    return Array.from(itemsMap).map(([objid, item]) => {
      return (
        <MemoizedCanvasElement
          key={objid}
          item={item}
          isSelected={selectedItemIds.has(objid)}
          overridePosition={
            selectedItemIds.has(objid)
              ? tempPositions.get(objid)
              : undefined
          }
        />
      );
    });
  }, [itemsMap])

  return (
    <div className="flex flex-col h-full w-full">
      {/* 顶部控制栏 */}
      <CanvasControls
        zoom={camera.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
      />

      {/* 画布容器 */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-100"
        style={{
          cursor: getCursorStyle(),
          touchAction: 'none'
        }}
      >
        {dimensions.width > 0 && dimensions.height > 0 && (
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            scaleX={camera.zoom}
            scaleY={camera.zoom}
            x={camera.position.x}
            y={camera.position.y}
            draggable={false}
            onWheel={handleWheel}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onContextMenu={handleContextMenu}
          >
            {/* 背景网格层 */}
            <Layer>
              <CanvasGrid
                width={dimensions.width / camera.zoom}
                height={dimensions.height / camera.zoom}
                gridSize={50}
              />
            </Layer>

            {/* 主要内容层 - 只渲染视口内的元素 */}
            <Layer>
              <Group>
                {renderItems}
              </Group>
            </Layer>

            {/* 选择框层 */}
            {isSelecting && selectionRect && (
              <Layer>
                <Group>
                  <Rect
                    x={selectionRect.x}
                    y={selectionRect.y}
                    width={selectionRect.width}
                    height={selectionRect.height}
                    stroke="#0066cc"
                    strokeWidth={1 / camera.zoom}
                    dash={[5 / camera.zoom, 5 / camera.zoom]}
                    fill="#0066cc"
                    opacity={0.1}
                  />
                </Group>
              </Layer>
            )}
          </Stage>
        )}

        {/* 状态指示器 */}
        <CanvasStatusBar />
      </div>
    </div>
  );
};

export default Canvas;
