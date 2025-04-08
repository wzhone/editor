"use client";
import React from 'react';
import { Line, Group } from 'react-konva';
import { useCanvasStore } from '../../state/store';

interface CanvasGridProps {
  width: number;
  height: number;
  gridSize: number;
}

/**
 * 画布网格组件
 * 渲染背景网格线
 */
const CanvasGrid: React.FC<CanvasGridProps> = ({ width, height, gridSize }) => {
  const { camera } = useCanvasStore();
  
  // 计算网格线的位置和尺寸
  const calculateGridLines = () => {
    const lines = [];
    const gridOpacity = 0.2;
    const gridColor = '#aaaaaa';
    
    // 计算可见区域
    const visibleLeft = -camera.position.x / camera.zoom;
    const visibleTop = -camera.position.y / camera.zoom;
    const visibleRight = visibleLeft + width / camera.zoom;
    const visibleBottom = visibleTop + height / camera.zoom;
    
    // 计算网格起始位置（对齐到网格）
    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    
    // 绘制垂直线
    for (let x = startX; x <= visibleRight; x += gridSize) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, visibleTop, x, visibleBottom]}
          stroke={gridColor}
          strokeWidth={1 / camera.zoom}
          opacity={gridOpacity}
          perfectDrawEnabled={false}
        />
      );
    }
    
    // 绘制水平线
    for (let y = startY; y <= visibleBottom; y += gridSize) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[visibleLeft, y, visibleRight, y]}
          stroke={gridColor}
          strokeWidth={1 / camera.zoom}
          opacity={gridOpacity}
          perfectDrawEnabled={false}
        />
      );
    }
    
    return lines;
  };
  
  return <Group>{calculateGridLines()}</Group>;
};

export default CanvasGrid;