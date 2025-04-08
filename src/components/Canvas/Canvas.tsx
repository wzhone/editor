"use client";
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/state/store';
import { CanvasItem, Point, Rect as RectType } from '@/types';
import CanvasControls from './CanvasControls';
import CanvasStatusBar from './CanvasStatusBar';
import * as CanvasUtils from '@/utils/canvasUtils';
import {
  calculateSnappedPosition,
  getSelectionEdgePoints
} from '@/utils/collisionUtils';
import { toast } from 'sonner';

/**
 * 画布组件
 */
const Canvas: React.FC = () => {
  // Canvas引用
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 双缓冲画布 - 提高渲染性能
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 容器尺寸状态
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 拖拽状态
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingItem, setIsDraggingItem] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<RectType | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point | null>(null);

  // 记录开始拖拽时的元素位置 
  const [itemStartPositions, setItemStartPositions] = useState<Map<string, { left: number; top: number }>>(new Map());

  // 临时位置 - 避免频繁更新全局状态
  const [tempPositions, setTempPositions] = useState<Map<string, { left: number; top: number }>>(new Map());

  // 拖拽外部元素到画布的状态
  const [isDragOver, setIsDragOver] = useState(false);

  // 自动吸附状态
  const [snapGuides, setSnapGuides] = useState<{
    horizontal: number[],
    vertical: number[]
  }>({ horizontal: [], vertical: [] });

  // 限制缩放范围
  const minZoom = 0.2;
  const maxZoom = 5;

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
    selectedItemIds,
    addItemFromTemplate
  } = useCanvasStore();


  // 修正的useEffect，确保画布尺寸正确
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // 获取容器实际尺寸
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // 更新尺寸状态
        setDimensions({ width, height });

        // 调整主画布
        if (canvasRef.current) {
          const devicePixelRatio = window.devicePixelRatio || 1;
          // 设置画布元素的CSS尺寸
          canvasRef.current.style.width = `${width}px`;
          canvasRef.current.style.height = `${height}px`;
          // 设置画布元素的实际尺寸(考虑设备像素比)
          canvasRef.current.width = width * devicePixelRatio;
          canvasRef.current.height = height * devicePixelRatio;
        }

        // 调整离屏画布
        if (!offscreenCanvasRef.current) {
          const canvas = document.createElement('canvas');
          offscreenCanvasRef.current = canvas;
        }

        // 设置离屏画布的尺寸
        const offscreenCanvas = offscreenCanvasRef.current;
        const devicePixelRatio = window.devicePixelRatio || 1;
        offscreenCanvas.width = width * devicePixelRatio;
        offscreenCanvas.height = height * devicePixelRatio;
      }
    };

    // 初始尺寸设置
    updateDimensions();

    // 使用ResizeObserver监听尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      // 使用requestAnimationFrame减少更新频率
      requestAnimationFrame(updateDimensions);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 同时监听窗口大小变化
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 计算可见视口区域
  const visibleViewport = useMemo(() => {
    const { width, height } = dimensions;
    const { position, zoom } = camera;

    return {
      left: -position.x / zoom,
      top: -position.y / zoom,
      right: (-position.x + width) / zoom,
      bottom: (-position.y + height) / zoom,
      width: width / zoom,
      height: height / zoom
    };
  }, [dimensions, camera]);

  // 使用记忆化获取可见元素，避免重复计算
  const visibleItems = useMemo(() => {
    const items = getItems();
    return CanvasUtils.getVisibleItems(
      items,
      visibleViewport.left,
      visibleViewport.top,
      visibleViewport.right,
      visibleViewport.bottom
    );
  }, [getItems, visibleViewport]);

  // 使用记忆化获取选中的元素
  const selectedItems = useMemo(() => {
    return visibleItems.filter(item => selectedItemIds.has(item.objid));
  }, [visibleItems, selectedItemIds]);

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const { gridSize } = settings;

    // 使用工具函数绘制网格
    CanvasUtils.drawGrid(
      ctx,
      visibleViewport.left,
      visibleViewport.top,
      visibleViewport.right,
      visibleViewport.bottom,
      gridSize,
      camera.zoom
    );
  }, [camera.zoom, settings.gridSize, visibleViewport]);

  // 绘制单个元素
  const drawItem = useCallback((
    ctx: CanvasRenderingContext2D,
    item: CanvasItem,
    isSelected: boolean,
    overridePosition?: { left: number; top: number }
  ) => {
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

  // 绘制选择框
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

  // 绘制自动吸附指引线
  const drawSnapGuides = useCallback((ctx: CanvasRenderingContext2D) => {
    const { zoom } = camera;

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([5 / zoom, 5 / zoom]);

    // 绘制水平指引线
    snapGuides.horizontal.forEach(y => {
      ctx.beginPath();
      ctx.moveTo(visibleViewport.left, y);
      ctx.lineTo(visibleViewport.right, y);
      ctx.stroke();
    });

    // 绘制垂直指引线
    snapGuides.vertical.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x, visibleViewport.top);
      ctx.lineTo(x, visibleViewport.bottom);
      ctx.stroke();
    });

    // 重置线型
    ctx.setLineDash([]);
  }, [camera, snapGuides, visibleViewport]);

  // 主渲染函数 - 使用双缓冲提高性能
  // 修正的主渲染函数 - 修复渲染偏移问题
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;

    if (!canvas || !offscreenCanvas) return;

    // 获取离屏上下文
    const offCtx = offscreenCanvas.getContext('2d');
    if (!offCtx) return;

    // 获取设备像素比
    const devicePixelRatio = window.devicePixelRatio || 1;

    // 清除离屏画布
    offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // 保存初始状态
    offCtx.save();

    // 应用设备像素比缩放
    offCtx.scale(devicePixelRatio, devicePixelRatio);

    // 应用相机变换
    offCtx.translate(camera.position.x, camera.position.y);
    offCtx.scale(camera.zoom, camera.zoom);

    // 绘制网格
    if (settings.gridSize > 0) {
      drawGrid(offCtx);
    }

    // 获取并按Z轴排序的可见元素
    const sortedItems = CanvasUtils.sortItemsByZIndex(visibleItems);

    // 绘制可见元素
    for (const item of sortedItems) {
      const isSelected = selectedItemIds.has(item.objid);
      const overridePosition = isSelected ? tempPositions.get(item.objid) : undefined;
      drawItem(offCtx, item, isSelected, overridePosition);
    }

    // 绘制选择框（如果存在）
    if (isSelecting && selectionRect) {
      drawSelectionRect(offCtx, selectionRect);
    }

    // 绘制吸附指引线（如果启用自动吸附且有元素在拖动）
    if (settings.autoMag && isDraggingItem && snapGuides.horizontal.length + snapGuides.vertical.length > 0) {
      drawSnapGuides(offCtx);
    }

    // 恢复初始状态
    offCtx.restore();

    // 将离屏画布内容复制到可见画布
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 清除可见画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 将离屏画布内容绘制到可见画布 - 使用正确的尺寸
      ctx.drawImage(
        offscreenCanvas,
        0, 0, offscreenCanvas.width, offscreenCanvas.height,
        0, 0, canvas.width, canvas.height
      );
    }

    // 请求下一帧动画
    animationFrameRef.current = requestAnimationFrame(render);
  }, [
    camera,
    dimensions,
    drawGrid,
    drawItem,
    drawSelectionRect,
    drawSnapGuides,
    isSelecting,
    isDraggingItem,
    selectedItemIds,
    selectionRect,
    settings.autoMag,
    settings.gridSize,
    snapGuides,
    tempPositions,
    visibleItems
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

  const clientToWorldPosition = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }

      // 修正：正确处理设备像素比和缩放因子
      const devicePixelRatio = window.devicePixelRatio || 1;

      // 计算相对于canvas的位置（考虑边界）
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      // 将位置从屏幕坐标转换为世界坐标
      const worldX = (canvasX - camera.position.x) / camera.zoom;
      const worldY = (canvasY - camera.position.y) / camera.zoom;

      return { x: worldX, y: worldY };
    },
    [camera]
  );



  // 查找指定位置的元素
  const findItemAtPosition = useCallback(
    (pos: Point): CanvasItem | undefined => {
      // 点击容差（像素）
      const tolerance = 2 / camera.zoom; // 根据缩放级别动态调整点击容差

      // 按z-index反向排序，优先检测顶层元素
      const sortedItems = [...visibleItems].sort(
        (a, b) => (b.zIndex || 0) - (a.zIndex || 0)
      );

      // 添加容差的检测区域
      const checkRect = {
        x: pos.x - tolerance,
        y: pos.y - tolerance,
        width: tolerance * 2,
        height: tolerance * 2
      };

      // 首先尝试精确点击
      const exactMatch = sortedItems.find(item =>
        CanvasUtils.isPointInItem(pos, item)
      );

      if (exactMatch) return exactMatch;

      // 如果没有精确匹配，使用容差区域
      return sortedItems.find(item => {
        // 矩形检测
        if (item.showType !== 'ellipse') {
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
      if (!isDraggingItem || !dragStartPoint || selectedItemIds.size === 0) return;

      const dx = worldPos.x - dragStartPoint.x;
      const dy = worldPos.y - dragStartPoint.y;

      // 计算临时位置
      const newTempPositions = new Map<string, { left: number; top: number }>();
      const newSnapGuides = { horizontal: [] as number[], vertical: [] as number[] };

      // 先计算所有选中元素的新位置
      const selectedItemsArray: CanvasItem[] = [];
      const tempPositionsArray: { id: string; item: CanvasItem; newPos: { left: number; top: number } }[] = [];

      for (const id of selectedItemIds) {
        const item = visibleItems.find(item => item.objid === id);
        const startPos = itemStartPositions.get(id);

        if (!item || !startPos) continue;

        // 基础位置（未吸附）
        const newPos = {
          left: startPos.left + dx,
          top: startPos.top + dy
        };

        selectedItemsArray.push(item);
        tempPositionsArray.push({ id, item, newPos });
      }

      // 如果启用了自动吸附，计算吸附位置
      if (settings.autoMag && tempPositionsArray.length > 0) {
        // 获取第一个元素做为吸附参考
        const { id: primaryId, item: primaryItem, newPos: primaryPos } = tempPositionsArray[0];

        // 创建一个临时项目来计算吸附
        const tempItem: CanvasItem = {
          ...primaryItem,
          boxLeft: primaryPos.left,
          boxTop: primaryPos.top
        };

        // 计算吸附位置
        const snappedPos = calculateSnappedPosition(
          tempItem,
          visibleItems,
          selectedItemIds,
          settings.snapToGrid ? settings.gridSize : null,
          visibleViewport,
          10 // 吸附阈值
        );

        // 计算吸附偏移量
        const snapDx = snappedPos.boxLeft - primaryPos.left;
        const snapDy = snappedPos.boxTop - primaryPos.top;

        // 如果发生了吸附，更新所有选中元素的位置
        if (snapDx !== 0 || snapDy !== 0) {
          // 获取生成吸附指引线数据
          for (const item of selectedItemsArray) {
            const snapPoints = getSelectionEdgePoints([{
              ...item,
              boxLeft: item.boxLeft + dx + snapDx,
              boxTop: item.boxTop + dy + snapDy
            }]);

            newSnapGuides.horizontal.push(...snapPoints.horizontal);
            newSnapGuides.vertical.push(...snapPoints.vertical);
          }

          // 更新所有元素位置
          for (const { id, newPos } of tempPositionsArray) {
            newTempPositions.set(id, {
              left: newPos.left + snapDx,
              top: newPos.top + snapDy
            });
          }
        } else {
          // 没有吸附，使用原始计算的位置
          for (const { id, newPos } of tempPositionsArray) {
            newTempPositions.set(id, newPos);
          }
        }
      } else {
        // 自动吸附被禁用，使用原始计算的位置
        for (const { id, newPos } of tempPositionsArray) {
          newTempPositions.set(id, newPos);
        }
      }

      // 更新临时位置和吸附指引线
      setTempPositions(newTempPositions);
      setSnapGuides(newSnapGuides);
    },
    [
      isDraggingItem,
      dragStartPoint,
      selectedItemIds,
      itemStartPositions,
      settings.autoMag,
      settings.snapToGrid,
      settings.gridSize,
      visibleItems,
      visibleViewport
    ]
  );

  // 处理鼠标按下事件
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 记录原始点击坐标（用于调试）
      const originalClientX = e.clientX;
      const originalClientY = e.clientY;

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

      // 调试输出 - 可在控制台检查坐标转换是否正确
      if (process.env.NODE_ENV !== 'production') {
        console.log('Click:', {
          client: { x: e.clientX, y: e.clientY },
          world: worldPos,
          camera: { ...camera }
        });
      }

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
      camera
    ]
  );


  // 处理鼠标移动事件
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 处理画布拖动
      if (isDraggingCanvas && dragStartPos) {
        const dx = e.clientX - dragStartPos.x;
        const dy = e.clientY - dragStartPos.y;

        // 使用 requestAnimationFrame 提高性能
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          updateCamera({
            position: {
              x: camera.position.x + dx,
              y: camera.position.y + dy
            }
          });
          setDragStartPos({ x: e.clientX, y: e.clientY });
        });

        return;
      }

      const worldPos = clientToWorldPosition(e.clientX, e.clientY);

      // 处理元素拖拽
      if (isDraggingItem && dragStartPoint) {
        // 使用 requestAnimationFrame 减少状态更新频率
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          handleItemDrag(worldPos);
        });
      }
      // 处理框选
      else if (isSelecting && selectionRect && dragStartPoint) {
        // 使用 requestAnimationFrame 减少状态更新频率
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const startX = dragStartPoint.x;
          const startY = dragStartPoint.y;
          const width = Math.abs(worldPos.x - startX);
          const height = Math.abs(worldPos.y - startY);
          const x = Math.min(startX, worldPos.x);
          const y = Math.min(startY, worldPos.y);

          setSelectionRect({ x, y, width, height });
        });
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
      handleItemDrag
    ]
  );

  // 处理鼠标抬起事件
  const handleMouseUp = useCallback(() => {
    // 处理画布拖动结束
    if (isDraggingCanvas) {
      setIsDraggingCanvas(false);
      setDragStartPos(null);
    }

    // 处理元素拖拽结束
    if (isDraggingItem) {
      // 拖拽结束时，将临时位置提交到全局 store
      tempPositions.forEach((pos, id) => {
        updateItem(id, { boxLeft: pos.left, boxTop: pos.top });
      });
      setIsDraggingItem(false);
      setTempPositions(new Map());
      setItemStartPositions(new Map());
      setSnapGuides({ horizontal: [], vertical: [] });
    }

    // 处理框选结束
    if (isSelecting && selectionRect) {
      if (selectionRect.width > 3 && selectionRect.height > 3) {
        // 找出与选择框相交的元素
        const selectedItems = visibleItems.filter(item =>
          CanvasUtils.rectIntersectsItem(selectionRect, item)
        );

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
    tempPositions,
    updateItem,
    visibleItems,
    selectItems
  ]);

  // 处理拖拽进入事件（外部元素拖入）
  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  // 处理拖拽离开事件
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // 处理拖拽放置事件（创建新元素）
  const handleDrop = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    // 尝试获取拖拽的元素模板数据
    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) return;

    try {
      const templateData = JSON.parse(jsonData);

      // 转换拖放位置为世界坐标
      const worldPos = clientToWorldPosition(e.clientX, e.clientY);

      // 创建元素，位置居中于鼠标位置
      const newItem = {
        ...templateData,
        boxLeft: worldPos.x - (templateData.boxWidth / 2),
        boxTop: worldPos.y - (templateData.boxHeight / 2)
      };

      // 添加元素并获取ID
      const newItemId = addItemFromTemplate(newItem);

      // 选中新创建的元素
      selectItem(newItemId, false);

      // 显示成功提示
      toast.success('元素创建成功');
    } catch (error) {
      console.error('拖拽创建元素失败:', error);
      toast.error('创建元素失败');
    }
  }, [clientToWorldPosition, addItemFromTemplate, selectItem]);

  // 移动选中元素的函数（键盘操作使用）
  const moveSelectedItems = useCallback(
    (dx: number, dy: number) => {
      if (selectedItemIds.size === 0) return;

      const ids = Array.from(selectedItemIds);
      const itemUpdates: Array<{ id: string; updates: Partial<CanvasItem> }> = [];

      // 计算每个元素的新位置
      for (const id of ids) {
        const item = visibleItems.find((item) => item.objid === id);
        if (!item) continue;

        let newLeft = item.boxLeft + dx;
        let newTop = item.boxTop + dy;

        // 如果启用网格吸附，对齐到网格
        if (settings.snapToGrid && settings.gridSize > 0) {
          newLeft = Math.round(newLeft / settings.gridSize) * settings.gridSize;
          newTop = Math.round(newTop / settings.gridSize) * settings.gridSize;
        }

        itemUpdates.push({
          id,
          updates: {
            boxLeft: newLeft,
            boxTop: newTop
          }
        });
      }

      // 批量更新元素位置
      itemUpdates.forEach(({ id, updates }) => updateItem(id, updates));
    },
    [selectedItemIds, visibleItems, settings.snapToGrid, settings.gridSize, updateItem]
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
      const moveDistance = event.shiftKey ? 10 : 1;

      // 如果没有选中元素，忽略方向键
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
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "up", store.templateItem);
            event.preventDefault();
          }
          break;

        case "a":
        case "A":
          // 快速模式：左侧创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "left", store.templateItem);
            event.preventDefault();
          }
          break;

        case "s":
        case "S":
          // 快速模式：下方创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "down", store.templateItem);
            event.preventDefault();
          }
          break;

        case "d":
        case "D":
          // 快速模式：右侧创建
          if (settings.fastMode && selectedItemIds.size === 1) {
            const selectedId = ids[0];
            const store = useCanvasStore.getState();
            store.addAdjacentItem(selectedId, "right", store.templateItem);
            event.preventDefault();
          }
          break;
      }
    },
    [
      selectedItemIds,
      settings.fastMode,
      removeItems,
      clearSelection,
      moveSelectedItems
    ]
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

  // 处理滚轮缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const scaleBy = 1.1;
      const oldScale = camera.zoom;

      // 获取鼠标位置
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 计算鼠标在画布内容中的位置
      const mousePointTo = {
        x: (mouseX - camera.position.x) / oldScale,
        y: (mouseY - camera.position.y) / oldScale,
      };

      // 计算新的缩放级别
      let newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(minZoom, Math.min(maxZoom, newScale));

      // 如果缩放级别没有变化，直接返回
      if (newScale === oldScale) return;

      // 更新相机位置，保持鼠标指向不变
      const newPos = {
        x: mouseX - mousePointTo.x * newScale,
        y: mouseY - mousePointTo.y * newScale,
      };

      // 更新相机状态
      updateCamera({
        position: newPos,
        zoom: newScale,
      });
    },
    [camera.position, camera.zoom, updateCamera]
  );

  // 重置视图
  const resetView = useCallback(() => {
    updateCamera({
      position: { x: 0, y: 0 },
      zoom: 1,
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

    // 计算新的相机位置
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

    // 计算新的相机位置
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
    if (isDragOver) return "copy";
    return "default";
  }, [isDraggingCanvas, isDraggingItem, isSelecting, isDragOver]);

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
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        )}

        {/* 状态指示器 */}
        <CanvasStatusBar />

        {/* 拖拽提示 */}
        {isDragOver && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-100 bg-opacity-20 pointer-events-none flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded shadow">
              拖放到此处创建元素
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;