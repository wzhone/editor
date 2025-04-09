// src/components/Canvas/Canvas.tsx 中添加大小调整控制点
"use client";
import React, { useState } from 'react';
import CanvasControls from './CanvasControls';
import CanvasStatusBar from './CanvasStatusBar';
import { useCanvas } from '@/hooks/useCanvas';

/**
 * 画布组件 - 最终优化版
 * 使用自定义Hook分离逻辑
 */
export default function Canvas() {

  const {
    canvasRef,
    containerRef,
    dimensions,
    camera,
    isDragOver,
    isSelecting,
    selectionRect,
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
    getPreviewStyle,
    selectedItems,
    isResizing,  // 是否正在调整大小
    resizeHandle,  // 调整大小的控制点
    highlightItem
  } = useCanvas();


  const [openFindDialog, setOpenFindDialog] = useState(false);

  // 渲染调整大小的控制点 - 仅在选中单个元素时显示
  const renderResizeHandles = () => {
    if (selectedItems.length !== 1 || isResizing) return null;

    const item = selectedItems[0];
    const handles: any[] = [];

    // 根据相机缩放和位置计算控制点位置
    const left = item.boxLeft * camera.zoom + camera.position.x;
    const top = item.boxTop * camera.zoom + camera.position.y;
    const width = item.boxWidth * camera.zoom;
    const height = item.boxHeight * camera.zoom;

    // 控制点位置：左上、上中、右上、右中、右下、下中、左下、左中
    const positions = [
      { x: left, y: top, cursor: 'nwse-resize', position: 'nw' },
      { x: left + width / 2, y: top, cursor: 'ns-resize', position: 'n' },
      { x: left + width, y: top, cursor: 'nesw-resize', position: 'ne' },
      { x: left + width, y: top + height / 2, cursor: 'ew-resize', position: 'e' },
      { x: left + width, y: top + height, cursor: 'nwse-resize', position: 'se' },
      { x: left + width / 2, y: top + height, cursor: 'ns-resize', position: 's' },
      { x: left, y: top + height, cursor: 'nesw-resize', position: 'sw' },
      { x: left, y: top + height / 2, cursor: 'ew-resize', position: 'w' }
    ];

    // 渲染8个调整大小的控制点
    positions.forEach((pos, index) => {
      handles.push(
        <div
          key={`resize-handle-${index}`}
          className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full z-50 hover:bg-blue-600 hover:w-3 hover:h-3"
          style={{
            cursor: pos.cursor,
            left: pos.x - 4,  // 控制点尺寸为8px，需要减去一半以居中
            top: pos.y - 4,
            pointerEvents: 'all'  // 确保可点击
          }}
          data-handle={pos.position}
          onMouseDown={(e) => {
            // 阻止事件冒泡，避免触发画布的mouseDown
            e.stopPropagation();
            e.preventDefault();

            // 处理开始调整大小
            if (resizeHandle && typeof resizeHandle.handleResizeStart === 'function') {
              resizeHandle.handleResizeStart(e, pos.position);
            }
          }}
        />
      );
    });

    return handles;
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* 顶部控制栏 */}
      <CanvasControls
        zoom={camera.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetView={resetView}
        onHightlightItem={highlightItem}
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

        {/* 添加调整大小控制点 */}
        {/* {renderResizeHandles()} */}
      </div>
    </div>
  );
};
