// 绘制背景的网格
import React, { useCallback } from "react";
import { useCanvasStore } from "@/state/store";

export default function useGrid() {
  const { settings } = useCanvasStore();

  return useCallback(
    (
      ctx: CanvasRenderingContext2D,
      viewportLeft: number,
      viewportTop: number,
      viewportRight: number,
      viewportBottom: number,
      zoom: number,
      color: string = "#aaaaaa",
      opacity: number = 0.3
    ) => {
      const gridSize = settings.gridSize;

      if (settings.gridSize <= 0) {
        return;
      }

      // 确定网格起始位置 - 从0开始，而非负数区域
      const startX = Math.max(
        0,
        Math.floor(viewportLeft / gridSize) * gridSize
      );
      const startY = Math.max(0, Math.floor(viewportTop / gridSize) * gridSize);

      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();

      // 绘制垂直线 - 从0或视口左边界开始（取较大值）
      for (let x = startX; x <= viewportRight; x += gridSize) {
        // 只绘制正坐标区域的线条
        if (x >= 0) {
          // 垂直线从顶部开始，但如果顶部是负数，则从0开始
          const lineStartY = Math.max(0, viewportTop);
          ctx.moveTo(x, lineStartY);
          ctx.lineTo(x, viewportBottom);
        }
      }

      // 绘制水平线 - 从0或视口顶部边界开始（取较大值）
      for (let y = startY; y <= viewportBottom; y += gridSize) {
        // 只绘制正坐标区域的线条
        if (y >= 0) {
          // 水平线从左侧开始，但如果左侧是负数，则从0开始
          const lineStartX = Math.max(0, viewportLeft);
          ctx.moveTo(lineStartX, y);
          ctx.lineTo(viewportRight, y);
        }
      }

      // 特别绘制坐标轴（可选，使坐标轴更明显）
      if (viewportLeft <= 0 && viewportRight >= 0) {
        ctx.moveTo(0, Math.max(0, viewportTop));
        ctx.lineTo(0, viewportBottom);
      }

      if (viewportTop <= 0 && viewportBottom >= 0) {
        ctx.moveTo(Math.max(0, viewportLeft), 0);
        ctx.lineTo(viewportRight, 0);
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;
    },
    [settings]
  );
}
