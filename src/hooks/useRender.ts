// src/hooks/useRender.ts
import { useCallback, useMemo, useRef } from 'react';
import { useCanvasStore } from '@/state/store';
import { CanvasItem, Point, Rect } from '@/types';
import * as CanvasUtils from '@/utils/canvasUtils';
import { CameraState } from '@/types';

interface UseRenderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  offscreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  dimensions: { width: number; height: number };
  camera: CameraState;
  isSelecting: boolean;
  selectionRect: Rect | null;
  isDraggingItem: boolean;
  tempPositions: Map<string, { left: number; top: number }>;
  snapGuides: { horizontal: number[], vertical: number[] };
  visibleViewport: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}

export function useRender({
  canvasRef,
  offscreenCanvasRef,
  dimensions,
  camera,
  isSelecting,
  selectionRect,
  isDraggingItem,
  tempPositions,
  snapGuides,
  visibleViewport
}: UseRenderProps) {
  // 动画帧引用
  const animationFrameRef = useRef<number | null>(null);
  
  // 从Store获取状态
  const {
    settings,
    selectedItemIds,
    getItems
  } = useCanvasStore();

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
  const drawSelectionRect = useCallback((ctx: CanvasRenderingContext2D, rect: Rect) => {
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

  // 主渲染函数
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

      // 将离屏画布内容绘制到可见画布
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
    visibleItems,
    canvasRef,
    offscreenCanvasRef
  ]);

  // 启动和停止渲染循环
  const startRendering = useCallback(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    }
  }, [dimensions, render]);

  const stopRendering = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  return {
    render,
    startRendering,
    stopRendering,
    visibleItems,
    selectedItems,
    animationFrameRef
  };
}