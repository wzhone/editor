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
    camera,
    settings,
    updateCamera,
    selectItem,
    selectItems,
    clearSelection,
    updateItem,
    updateItems,
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
  const [itemStartPositions, setItemStartPositions] = useState<Map<string, { left: number; top: number }>>(new Map());


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

      // 更新舞台位置和缩放级别
      // stage.scale({ x: newScale, y: newScale });
      // stage.position(newPos);
    },
    [updateCamera]
  );


  // 检查矩形与元素是否相交
  const rectIntersectsItem = (rect: RectType, item: CanvasItem): boolean => {
    // 矩形相交测试
    const itemRect = {
      x: item.boxLeft,
      y: item.boxTop,
      width: item.boxWidth,
      height: item.boxHeight
    };

    // 检查两个矩形是否相交
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
      const items = getItems();

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

        // 记录鼠标起始位置和当前相机位置
        setIsDraggingCanvas(true);

        // 记录鼠标起始位置（屏幕坐标）
        const stage = stageRef.current;
        const pointerPos = stage.getPointerPosition();
        if (!pointerPos) return;

        setDragStartPos({
          x: pointerPos.x - camera.position.x,
          y: pointerPos.y - camera.position.y
        });

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
      const clickedItem = findItemAtPosition(worldPos);

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
          const item = getItems().find((i) => i.objid === id);
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
    [stageRef, camera.position, findItemAtPosition, selectItem, selectedItemIds, clearSelection, getItems]
  );

  // 处理拖动移动
  const handleDragMove = useCallback(
    (e: any) => {
      if (!stageRef.current) return;

      // 获取当前鼠标位置
      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // 处理右键拖动画布
      if (isDraggingCanvas && dragStartPos) {
        // 计算新的相机位置
        const newPosition = {
          x: pointerPos.x - dragStartPos.x,
          y: pointerPos.y - dragStartPos.y
        };

        // 直接更新相机位置
        updateCamera({
          position: newPosition
        });

        // 更新舞台位置
        stage.position(newPosition);
        return;
      }

      // 转换为世界坐标
      const scale = stage.scaleX();
      const worldPos = {
        x: (pointerPos.x - stage.x()) / scale,
        y: (pointerPos.y - stage.y()) / scale,
      };

      if (isDraggingItem && selectedItemIds.size > 0 && dragStartPoint) {
        // 拖动元素 - 计算偏移量
        const dx = worldPos.x - dragStartPoint.x;
        const dy = worldPos.y - dragStartPoint.y;

        // 对每个选中的元素应用相同的偏移
        const updates: Array<{ id: string; updates: Partial<CanvasItem> }> = [];

        for (const id of selectedItemIds) {
          const startPos = itemStartPositions.get(id);
          if (!startPos) continue;

          // 计算新位置
          let newLeft = startPos.left + dx;
          let newTop = startPos.top + dy;

          updates.push({
            id,
            updates: {
              boxLeft: newLeft,
              boxTop: newTop
            }
          });
        }

        // 批量更新所有元素位置
        for (const update of updates) {
          updateItem(update.id, update.updates);
        }
      } else if (isSelecting && selectionRect && dragStartPoint) {
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
      isDraggingCanvas,
      dragStartPos,
      updateCamera,
      isDraggingItem,
      selectedItemIds,
      dragStartPoint,
      itemStartPositions,
      updateItem,
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
      setIsDraggingItem(false);
      setItemStartPositions(new Map());
    }

    if (isSelecting && selectionRect) {
      // 只有当选择框有实际大小时才进行选择
      if (selectionRect.width > 3 && selectionRect.height > 3) {
        // 获取当前所有元素
        const items = getItems();

        // 选择在区域内的元素
        const selectedItems = items.filter(item => {
          // 检查元素是否与选择框相交
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
  ]);

  // 移动选中元素
  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.size === 0) return;

      const ids = Array.from(selectedItemIds);
      const items = getItems();
      const itemUpdates: Array<{ id: string; updates: Partial<CanvasItem> }> = [];

      // 计算每个选中元素的新位置
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

      // 批量更新所有元素位置
      for (const update of itemUpdates) {
        updateItem(update.id, update.updates);
      }
    },
    [selectedItemIds, getItems, updateItem]
  );

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
  }, [updateCamera]);

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
  }, [updateCamera]);

  // 获取当前鼠标样式
  const getCursorStyle = useCallback(() => {
    if (isDraggingCanvas) return "grabbing";
    if (isDraggingItem) return "move";
    if (isSelecting) return "crosshair";
    return "default";
  }, [isDraggingCanvas, isDraggingItem, isSelecting]);

  // 防止右键菜单
  const handleContextMenu = (e: any) => {
    e.evt.preventDefault();
  };

  // 优化渲染 - 只渲染视口内的元素
  const visibleItems = useMemo(() => {
    const items = getItems();

    // 计算当前视口的世界坐标范围
    const viewLeft = -camera.position.x / camera.zoom;
    const viewTop = -camera.position.y / camera.zoom;
    const viewWidth = dimensions.width / camera.zoom;
    const viewHeight = dimensions.height / camera.zoom;

    // 扩大视口以减少边缘抖动
    const margin = 100;
    const visibleRect = {
      left: viewLeft - margin,
      top: viewTop - margin,
      right: viewLeft + viewWidth + margin,
      bottom: viewTop + viewHeight + margin
    };

    // 过滤出在视口内的元素
    return items.filter(item => {
      const itemRight = item.boxLeft + item.boxWidth;
      const itemBottom = item.boxTop + item.boxHeight;

      return (
        itemRight >= visibleRect.left &&
        item.boxLeft <= visibleRect.right &&
        itemBottom >= visibleRect.top &&
        item.boxTop <= visibleRect.bottom
      );
    });
  }, [getItems, camera, dimensions]);

  // 渲染单个画布元素
  const CanvasElement = useCallback(({
    item,
    isSelected
  }: {
    item: CanvasItem;
    isSelected: boolean;
  }) => {
    // 判断元素类型并渲染对应的图形
    const renderShape = () => {
      if (item.showType === "ellipse") {
        return (
          <Ellipse
            x={item.boxLeft + item.boxWidth / 2}
            y={item.boxTop + item.boxHeight / 2}
            radiusX={item.boxWidth / 2}
            radiusY={item.boxHeight / 2}
            fill={item.showColor}
            stroke={isSelected ? '#0000ff' : '#000000'}
            strokeWidth={isSelected ? 2 / camera.zoom : 1 / camera.zoom}
            perfectDrawEnabled={false}
          />
        );
      }

      // 默认为矩形
      return (
        <Rect
          x={item.boxLeft}
          y={item.boxTop}
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
              x={item.boxLeft}
              y={item.boxTop + spacing * positionIndex - 8}
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
              x={item.boxLeft}
              y={item.boxTop + spacing * positionIndex - 8}
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
              x={item.boxLeft}
              y={item.boxTop + spacing * positionIndex - 8}
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
          touchAction: 'none' // 防止触摸事件引起页面滚动
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
            draggable={false} // 关闭默认拖动，使用自定义右键拖动
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
                {visibleItems.map((item) => (
                  <MemoizedCanvasElement
                    key={item.objid}
                    item={item}
                    isSelected={selectedItemIds.has(item.objid)}
                  />
                ))}
              </Group>
            </Layer>

            {/* 选择框层 */}
            {isSelecting && selectionRect && (
              <Layer>
                <Group>
                  {/* 选择框 */}
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