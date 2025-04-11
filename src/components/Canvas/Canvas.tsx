"use client";
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import CanvasStatusBar from './CanvasStatusBar';
import { useCanvasStore } from '@/state/item';
import { Point, Rect, CanvasItem } from '@/types';
import * as CanvasUtils from '@/utils/canvasUtils';
import { calculateSnappedPosition } from '@/utils/collisionUtils';
import { useRender } from '@/hooks/useRender';
import { useKeyEvents } from '@/hooks/useKeyEvents';
import { useCameraStore } from '@/state/camera';
import { useSettingStore } from '@/state/settings';

export default function Canvas() {

  // Canvas引用
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用键盘事件Hook
  useKeyEvents();

  // 双缓冲画布 - 提高渲染性能
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 容器尺寸状态
  const {  clearSelection, selectItem } = useCanvasStore();
  const { camera, dimension, updateCamera, updateDimension } = useCameraStore();
  const settings = useSettingStore();

  // 计算可见视口区域
  const visibleViewport = useMemo(() => {
    const { width, height } = dimension;
    const { position, zoom } = camera;

    return {
      left: position.x / zoom,
      top: position.y / zoom,
      right: (position.x + width) / zoom,
      bottom: (position.y + height) / zoom,
      width: width / zoom,
      height: height / zoom,
    };
  }, [dimension, camera]);

  // 坐标转换函数 - 客户端坐标 => 世界坐标
  const clientToWorldPosition = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }
      // 计算相对于canvas的位置
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      // 将位置从屏幕坐标转换为世界坐标
      return {
        x: (canvasX + camera.position.x) / camera.zoom,
        y: (canvasY + camera.position.y) / camera.zoom,
      };
    },
    [camera]
  );

  // 使用渲染Hook
  const { startRendering, stopRendering, visibleItems } =
    useRender({
      canvasRef: canvasRef as any,
      offscreenCanvasRef: offscreenCanvasRef as any,
      visibleViewport,
    });


  // 交互状态
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);
  const [itemStartPositions, setItemStartPositions] = useState<
    Map<string, { left: number; top: number }>
  >(new Map());

  // 处理元素拖拽和自动吸附
  const handleItemDrag = useCallback(
    (worldPos: Point) => {
      const selectedItemIds = useCanvasStore.getState().selectedItemIds;

      if (!isDraggingItem || !dragStartPoint || selectedItemIds.size === 0)
        return;

      const dx = worldPos.x - dragStartPoint.x;
      const dy = worldPos.y - dragStartPoint.y;

      // 存储计算后的新位置
      const itemUpdates: Array<{ id: string; updates: Partial<CanvasItem> }> = [];

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
      itemStartPositions,
      visibleItems,
      visibleViewport,
      settings
    ]
  );

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


  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const selectedItemIds = useCanvasStore.getState().selectedItemIds;

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
    const selectItems = useCanvasStore.getState().selectItems;

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

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // 使用 requestAnimationFrame 确保在下一帧渲染前更新尺寸
        // requestAnimationFrame(() => {
          // 获取容器实际尺寸
          const rect = containerRef.current.getBoundingClientRect();
          const width = Math.floor(rect.width);
          const height = Math.floor(rect.height);

          // 仅当尺寸真正改变时更新状态
          if (width !== dimension.width || height !== dimension.height) {
            // 更新尺寸状态
            updateDimension(width, height);

            // 调整主画布
            if (canvasRef.current) {
              const devicePixelRatio = window.devicePixelRatio || 1;
              // 设置画布元素的CSS尺寸
              // canvasRef.current.style.width = `${width}px`;
              // canvasRef.current.style.height = `${height}px`;
              // 设置画布元素的实际尺寸
              canvasRef.current.width = Math.floor(width * devicePixelRatio);
              canvasRef.current.height = Math.floor(height * devicePixelRatio);
            }

            // 调整离屏画布
            if (!offscreenCanvasRef.current) {
              const canvas = document.createElement("canvas");
              offscreenCanvasRef.current = canvas;
            }

            // 设置离屏画布的尺寸
            const offscreenCanvas = offscreenCanvasRef.current;
            offscreenCanvas.width = Math.floor(width * devicePixelRatio);
            offscreenCanvas.height = Math.floor(height * devicePixelRatio);
          }
        // });
      }
    };

    // 初始尺寸设置 - 使用 setTimeout 确保 DOM 已经渲染
    setTimeout(updateDimensions, 0);

    // 仅使用 ResizeObserver
    const resizeObserver = new ResizeObserver(updateDimensions);

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [dimension, updateDimension]);

  // 启动渲染循环
  useEffect(() => {
    startRendering();
    return () => {
      stopRendering();
    };
  }, [startRendering, stopRendering]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* 画布容器 */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-100"
        style={{
          touchAction: 'none'
        }}
      >
        {dimension.width > 0 && dimension.height > 0 && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
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

        {/* 添加框选矩形显示 */}
        {isSelecting && selectionRect && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-100/20 pointer-events-none"
            style={{
              left: selectionRect.x * camera.zoom - camera.position.x,
              top: selectionRect.y * camera.zoom - camera.position.y,
              width: selectionRect.width * camera.zoom,
              height: selectionRect.height * camera.zoom
            }}
          />
        )}
      </div>
    </div>
  );
}