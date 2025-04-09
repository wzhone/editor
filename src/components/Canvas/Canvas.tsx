"use client";
import React from 'react';
import CanvasControls from './CanvasControls';
import CanvasStatusBar from './CanvasStatusBar';
import { useCanvas } from '@/hooks/useCanvas';

/**
 * 画布组件 - 最终优化版
 * 使用自定义Hook分离逻辑
 */
const Canvas: React.FC = () => {
  const {
    canvasRef,
    containerRef,
    dimensions,
    camera,
    isDragOver,
    isSelecting,    // 确保接收此状态
    selectionRect,  // 确保接收此状态
    previewItem,
    previewPosition,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    zoomIn,
    zoomOut,
    resetView,
    getCursorStyle,
    getPreviewStyle
  } = useCanvas();

  // 记录性能
  // useEffect(() => {
  //   const now = performance.now();

  //   return () => {
  //     // 组件卸载时计算渲染时间
  //     const renderTime = performance.now() - now;
  //     console.log(`Canvas render time: ${renderTime.toFixed(2)}ms`);
  //   };
  // }, []);

  // 获取预览元素样式
  const previewStyle = getPreviewStyle ? getPreviewStyle() : null;

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

        {/* 仅当没有预览元素时显示拖拽提示遮罩 */}
        {isDragOver && !previewItem && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-100/20  pointer-events-none flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded shadow">
              拖放到此处创建元素
            </div>
          </div>
        )}

        {/* 添加框选矩形显示 - 关键修复部分 */}
        {isSelecting && selectionRect && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-100/20 pointer-events-none"
            style={{
              left: selectionRect.x * camera.zoom + camera.position.x,
              top: selectionRect.y * camera.zoom + camera.position.y,
              width: selectionRect.width * camera.zoom,
              height: selectionRect.height * camera.zoom
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Canvas;