// src/hooks/useRender.ts 修改版本
import { useCallback, useMemo, useRef, useEffect } from "react";
import { useCanvasStore } from "@/state/item";
import { CanvasItem, Rect } from "@/types";
import * as CanvasUtils from "@/utils/canvasUtils";
import useGrid from "./useGrid";
import { useCameraStore } from "@/state/camera";
import { useSettingStore } from "@/state/settings";

interface UseRenderProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  offscreenCanvasRef: React.RefObject<HTMLCanvasElement>;
  selectionRect: Rect | null;
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
  selectionRect,
  visibleViewport,
}: UseRenderProps) {
  const camera = useCameraStore((state) => state.camera);
  const settings = useSettingStore();

  // 动画帧引用
  const animationFrameRef = useRef<number | null>(null);

  // 上次渲染的时间戳，用于优化帧率
  // const lastRenderTimeRef = useRef<number>(0);

  // 从Store获取状态
  const { selectedItemIds, getItems, itemsMap } = useCanvasStore();

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
  }, [getItems, visibleViewport, itemsMap]); // 添加 itemsMap 作为依赖项，确保元素更新时重新计算

  // 使用记忆化获取选中的元素
  const selectedItems = useMemo(() => {
    return visibleItems.filter((item) => selectedItemIds.has(item.objid));
  }, [visibleItems, selectedItemIds]);

  // 绘制网格
  const drawGridCallback = useGrid();

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      drawGridCallback(
        ctx,
        visibleViewport.left,
        visibleViewport.top,
        visibleViewport.right,
        visibleViewport.bottom,
        camera.zoom
      );
    },
    [camera.zoom, drawGridCallback, visibleViewport]
  );

  // 绘制单个元素
  const drawItem = useCallback(
    (ctx: CanvasRenderingContext2D, item: CanvasItem, isSelected: boolean) => {
      const left = item.boxLeft;
      const top = item.boxTop;
      const width = item.boxWidth;
      const height = item.boxHeight;
      const { zoom } = camera;
      const lineWidth = isSelected ? 2 / zoom : 1 / zoom;
      const strokeStyle = isSelected ? "#0000ff" : "#000000";

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
        settings.showBoxName && item.boxName,
      ].filter(Boolean).length;

      if (numLabels > 0) {
        const spacing = item.boxHeight / (numLabels + 1);
        let positionIndex = 0;
        const fontSize = CanvasUtils.getScaledFontSize(12, zoom);
        ctx.fillStyle = "#000000";

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
    },
    [camera, settings]
  );

  // 主渲染函数
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreenCanvas = offscreenCanvasRef.current;

    if (!canvas || !offscreenCanvas) return;

    // 获取离屏上下文
    const offCtx = offscreenCanvas.getContext("2d");
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
    offCtx.translate(-camera.position.x, -camera.position.y);
    offCtx.scale(camera.zoom, camera.zoom);

    // 绘制背景网格
    drawGrid(offCtx);

    const sortedItems = [...visibleItems];

    // 绘制可见元素
    for (const item of sortedItems) {
      drawItem(offCtx, item, selectedItemIds.has(item.objid));
    }

    // 恢复初始状态
    offCtx.restore();

    // 将离屏画布内容复制到可见画布
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // 清除可见画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 将离屏画布内容绘制到可见画布
      ctx.drawImage(
        offscreenCanvas,
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    // 更新上次渲染时间
    // lastRenderTimeRef.current = performance.now();

    // 请求下一帧动画
    animationFrameRef.current = requestAnimationFrame(render);
  }, [
    camera,
    drawGrid,
    drawItem,
    selectedItemIds,
    selectionRect,
    settings,
    visibleItems,
    canvasRef,
    offscreenCanvasRef,
  ]);

  // 启动和停止渲染循环
  const startRendering = useCallback(() => {
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  const stopRendering = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // 添加 itemsMap 监听，确保元素更新时重新渲染
  useEffect(() => {
    // 我们需要监听 store 中 itemsMap 的变化
    const unsubscribe = useCanvasStore.subscribe(() => {
      // 当 itemsMap 变化时，确保重新渲染
      if (animationFrameRef.current === null) {
        startRendering();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [startRendering]);

  return {
    render,
    startRendering,
    stopRendering,
    visibleItems,
    selectedItems,
    animationFrameRef,
  };
}
