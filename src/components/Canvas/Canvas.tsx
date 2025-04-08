"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Group, Rect } from 'react-konva';
import { useCanvasStore } from '../../state/store';
import { useCanvas } from '../../hooks/useCanvas';
import CanvasControls from './CanvasControls';
import CanvasStatusBar from './CanvasStatusBar';
import CanvasElements from './CanvasElements';
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
  const { camera } = useCanvasStore();

  // 使用Canvas Hook
  const {
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
  } = useCanvas({
    stageRef,
    minZoom: 0.2,
    maxZoom: 5
  });

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

    // 监听窗口大小变化
    window.addEventListener('resize', updateDimensions);

    // 清理事件监听
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 防止右键菜单
  const handleContextMenu = (e: any) => {
    e.evt.preventDefault();
  };

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
            draggable={isDraggingCanvas}
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

            {/* 主要内容层 */}
            <Layer>
              <CanvasElements />
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