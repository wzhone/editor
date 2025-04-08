"use client";
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../../state/store';
import { CanvasItem, Point, Rect as RectType } from '../../types';
import CanvasControls from './CanvasControls';
import CanvasStatusBar from './CanvasStatusBar';
import PerformanceMonitor from './PerformanceMonitor.tsx';
import * as CanvasUtils from '../../utils/canvasUtils';

/**
 * 画布组件
 * 使用原生Canvas API实现交互式画布
 */
const Canvas: React.FC = () => {
  // Canvas引用
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 动画帧ID，用于取消动画
  const animationFrameRef = useRef<number | null>(null);

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

  // 渲染函数：绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = dimensions;
    const { position, zoom } = camera;
    const gridSize = settings.gridSize;
    
    // 计算可见区域
    const visibleLeft = -position.x / zoom;
    const visibleTop = -position.y / zoom;
    const visibleRight = visibleLeft + width / zoom;
    const visibleBottom = visibleTop + height / zoom;
    
    // 使用工具函数绘制网格
    CanvasUtils.drawGrid(
      ctx,
      visibleLeft,
      visibleTop,
      visibleRight,
      visibleBottom,
      gridSize,
      zoom
    );
  }, [camera, dimensions, settings.gridSize]);

  // 渲染函数：绘制单个元素
  const drawItem = useCallback((ctx: CanvasRenderingContext2D, item: CanvasItem, isSelected: boolean, overridePosition?: { left: number; top: number }) => {
    const left = overridePosition ? overridePosition.left : item.boxLeft;
    const top = overridePosition ? overridePosition.top : item.boxTop;
    const width = item.boxWidth;
    const height = item.boxHeight;
    const { zoom } = camera;
    const lineWidth = isSelected ? 2 / zoom : 1 / zoom;
    const strokeStyle = isSelected ? '#0000ff' : '#000000';

    // 根据不同类型绘制图形
    if (item.showType === "ellipse") {
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const radiusX = width / 2;
      const radiusY = height / 2;
      
      CanvasUtils.drawEllipse(
        ctx,
        centerX,
        centerY,
        radiusX,
        radiusY,
        item.showColor,
        strokeStyle,
        lineWidth
      );
    } else {
      // 默认为矩形
      CanvasUtils.drawRect(
        ctx,
        left,
        top,
        width,
        height,
        item.showColor,
        strokeStyle,
        lineWidth
      );
    }

    // 绘制标签文本
    const numLabels = [
      settings.showBoxCode && item.boxCode,
      settings.showEquipId && item.equipId,
      settings.showBoxName && item.boxName
    ].filter(Boolean).length;

    if (numLabels > 0) {
      const spacing = item.boxHeight / (numLabels + 1);
      let positionIndex = 0;
      const fontSize = CanvasUtils.getScaledFontSize(12, zoom);
      ctx.fillStyle = '#000000';

      if (settings.showBoxCode && item.boxCode) {
        positionIndex++;
        CanvasUtils.drawCenteredText(
          ctx,
          item.boxCode,
          left + width / 2,
          top + spacing * positionIndex,
          width,
          fontSize
        );
      }

      if (settings.showEquipId && item.equipId) {
        positionIndex++;
        CanvasUtils.drawCenteredText(
          ctx,
          item.equipId,
          left + width / 2,
          top + spacing * positionIndex,
          width,
          fontSize
        );
      }

      if (settings.showBoxName && item.boxName) {
        positionIndex++;
        CanvasUtils.drawCenteredText(
          ctx,
          item.boxName,
          left + width / 2,
          top + spacing * positionIndex,
          width,
          fontSize
        );
      }
    }
  }, [camera, settings]);

  // 渲染函数：绘制选择框
  const drawSelectionRect = useCallback((ctx: CanvasRenderingContext2D, rect: RectType) => {
    const { zoom } = camera;
    
    CanvasUtils.drawSelectionRect(
      ctx,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      '#0066cc',
      'rgba(0, 102, 204, 0.1)',
      1 / zoom,
      [5 / zoom, 5 / zoom]
    );
  }, [camera]);

  // 渲染主函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 调整Canvas分辨率以匹配设备像素比
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * devicePixelRatio;
    canvas.height = dimensions.height * devicePixelRatio;
    
    // 应用设备像素比缩放
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // 清除画布
    CanvasUtils.clearCanvas(ctx, dimensions.width, dimensions.height);
    
    // 保存初始状态
    ctx.save();
    
    // 应用相机变换
    ctx.translate(camera.position.x, camera.position.y);
    ctx.scale(camera.zoom, camera.zoom);
    
    // 计算可见视口区域（世界坐标）
    const visibleLeft = -camera.position.x / camera.zoom;
    const visibleTop = -camera.position.y / camera.zoom;
    const visibleRight = visibleLeft + dimensions.width / camera.zoom;
    const visibleBottom = visibleTop + dimensions.height / camera.zoom;
    
    // 绘制网格
    drawGrid(ctx);

    // 获取元素列表
    const items = getItems();
    
    // 获取视口内的元素并按Z轴排序
    const visibleItems = CanvasUtils.getVisibleItems(
      items,
      visibleLeft,
      visibleTop,
      visibleRight,
      visibleBottom
    );
    
    const sortedItems = CanvasUtils.sortItemsByZIndex(visibleItems);
    
    // 绘制可见元素
    for (const item of sortedItems) {
      const isSelected = selectedItemIds.has(item.objid);
      const overridePosition = isSelected ? tempPositions.get(item.objid) : undefined;
      drawItem(ctx, item, isSelected, overridePosition);
    }
    
    // 绘制选择框（如果存在）
    if (isSelecting && selectionRect) {
      drawSelectionRect(ctx, selectionRect);
    }
    
    // 恢复初始状态
    ctx.restore();
    
    // 请求下一帧动画
    animationFrameRef.current = requestAnimationFrame(render);
  }, [
    camera, 
    dimensions, 
    drawGrid, 
    drawItem, 
    drawSelectionRect, 
    getItems, 
    isSelecting, 
    selectedItemIds, 
    selectionRect, 
    tempPositions
  ]);

  // 设置渲染循环
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, render]);

  // 处理缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const scaleBy = 1.1;
      const oldScale = camera.zoom;
      
      // 获取画布上的鼠标位置
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 计算鼠标位置相对于画布内容的位置
      const mousePointTo = {
        x: (mouseX - camera.position.x) / oldScale,
        y: (mouseY - camera.position.y) / oldScale,
      };

      // 计算新的缩放级别
      let newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale)); // 限制缩放范围

      // 如果缩放级别没有变化，直接返回
      if (newScale === oldScale) return;

      // 更新相机位置，保持鼠标指向的内容不变
      const newPos = {
        x: mouseX - mousePointTo.x * newScale,
        y: mouseY - mousePointTo.y * newScale,
      };

      // 更新状态
      updateCamera({
        position: newPos,
        zoom: newScale,
      });
    },
    [camera.position, camera.zoom, updateCamera]
  );
  
  // 检查矩形与元素是否相交
  const rectIntersectsItem = useCallback((rect: RectType, item: CanvasItem): boolean => {
    return CanvasUtils.rectIntersectsItem(rect, item);
  }, []);

  // 查找指定位置的元素
  const findItemAtPosition = useCallback(
    (pos: Point): CanvasItem | undefined => {
      const items = getItems();
      
      // 按z-index反向排序，这样可以先检测顶层元素
      const sortedItems = [...items].sort(
        (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
      );

      return sortedItems.find((item) => CanvasUtils.isPointInItem(pos, item));
    },
    [getItems]
  );

  // 将客户端坐标转换为画布世界坐标
  const clientToWorldPosition = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }
      
      return CanvasUtils.clientToWorldPosition(
        clientX,
        clientY,
        rect,
        camera.position,
        camera.zoom
      );
    },
    [camera]
  );

  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 检查是否按下了右键（用于拖动画布）
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();

        setIsDraggingCanvas(true);
        const pointerPos = { x: e.clientX, y: e.clientY };
        
        setDragStartPos({
          x: pointerPos.x - camera.position.x,
          y: pointerPos.y - camera.position.y
        });
        return;
      }

      const worldPos = clientToWorldPosition(e.clientX, e.clientY);
      setDragStartPoint(worldPos);

      const clickedItem = findItemAtPosition(worldPos);

      if (clickedItem) {
        if (e.ctrlKey || e.metaKey) {
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
    [
      camera.position, 
      clientToWorldPosition, 
      findItemAtPosition, 
      selectItem, 
      selectedItemIds, 
      clearSelection, 
      getItems
    ]
  );

  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pointerPos = { x: e.clientX, y: e.clientY };
      
      if (isDraggingCanvas && dragStartPos) {
        const newPosition = {
          x: pointerPos.x - dragStartPos.x,
          y: pointerPos.y - dragStartPos.y
        };

        updateCamera({
          position: newPosition
        });
        return;
      }

      const worldPos = clientToWorldPosition(e.clientX, e.clientY);

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
      clientToWorldPosition,
      isDraggingItem,
      selectedItemIds,
      dragStartPoint,
      itemStartPositions,
      isSelecting,
      selectionRect
    ]
  );

  // 处理鼠标抬起事件
  const handleMouseUp = useCallback(() => {
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
    rectIntersectsItem,
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

  // 防止右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // 重置视图
  const resetView = useCallback(() => {
    const newScale = 1;
    const newPos = { x: 0, y: 0 };

    updateCamera({
      position: newPos,
      zoom: newScale,
    });
  }, [updateCamera]);

  // 放大
  const zoomIn = useCallback(() => {
    const oldScale = camera.zoom;
    const newScale = Math.min(oldScale * 1.2, maxZoom);

    // 计算画布中心
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // 计算画布中心在世界坐标中的位置
    const worldCenterX = (centerX - camera.position.x) / oldScale;
    const worldCenterY = (centerY - camera.position.y) / oldScale;
    
    // 计算新的相机位置，保持画布中心对准相同的世界坐标
    const newPos = {
      x: centerX - worldCenterX * newScale,
      y: centerY - worldCenterY * newScale,
    };

    updateCamera({
      position: newPos,
      zoom: newScale,
    });
  }, [camera, dimensions, updateCamera]);

  // 缩小
  const zoomOut = useCallback(() => {
    const oldScale = camera.zoom;
    const newScale = Math.max(oldScale / 1.2, minZoom);

    // 计算画布中心
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // 计算画布中心在世界坐标中的位置
    const worldCenterX = (centerX - camera.position.x) / oldScale;
    const worldCenterY = (centerY - camera.position.y) / oldScale;
    
    // 计算新的相机位置，保持画布中心对准相同的世界坐标
    const newPos = {
      x: centerX - worldCenterX * newScale,
      y: centerY - worldCenterY * newScale,
    };

    updateCamera({
      position: newPos,
      zoom: newScale,
    });
  }, [camera, dimensions, updateCamera]);

  // 根据当前交互状态返回鼠标样式
  const getCursorStyle = useCallback(() => {
    if (isDraggingCanvas) return "grabbing";
    if (isDraggingItem) return "move";
    if (isSelecting) return "crosshair";
    return "default";
  }, [isDraggingCanvas, isDraggingItem, isSelecting]);

  // 监控开发环境中的性能
  const isDev = process.env.NODE_ENV === 'development';

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
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{
              width: '100%',
              height: '100%'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
          />
        )}

        {/* 状态指示器 */}
        <CanvasStatusBar />
        
        {/* 性能监视器 - 仅在开发环境中显示 */}
        {isDev && <PerformanceMonitor enabled={true} />}
      </div>
    </div>
  );
};

export default Canvas;