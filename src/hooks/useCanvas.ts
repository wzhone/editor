// src/hooks/useCanvas.ts 修改版本
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useCanvasStore } from '@/state/store';
import { Point } from '@/types';
import { useRender } from './useRender';
import { useKeyEvents } from './useKeyEvents';
import { useDragAndDrop } from './useDragAndDrop';
import { useCanvasInteraction } from './useCanvasInteraction';

export function useCanvas() {
  // Canvas引用
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 双缓冲画布 - 提高渲染性能
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 容器尺寸状态
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // 从Store获取状态
  const { camera, updateCamera } = useCanvasStore();

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
      const worldX = (canvasX - camera.position.x) / camera.zoom;
      const worldY = (canvasY - camera.position.y) / camera.zoom;

      return { x: worldX, y: worldY };
    },
    [camera]
  );

  // 使用渲染Hook
  const { 
    startRendering, 
    stopRendering, 
    visibleItems, 
    selectedItems 
  } = useRender({
    canvasRef: canvasRef as any,
    offscreenCanvasRef: offscreenCanvasRef as any,
    dimensions,
    camera,
    isSelecting: false,  // 这些值会从交互Hook中更新
    selectionRect: null,
    isDraggingItem: false,
    visibleViewport
  });
  const _ = useKeyEvents();

  const {
    isDraggingCanvas,
    isDraggingItem,
    isSelecting,
    selectionRect,
    isResizing,
    resizeHandle,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel
  } = useCanvasInteraction({
    clientToWorldPosition,
    visibleItems,
    visibleViewport
  });

  // 使用拖放Hook
  const {
    isDragOver,
    previewItem,
    previewPosition,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getPreviewStyle
  } = useDragAndDrop({
    clientToWorldPosition,
    camera
  });

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

  // 启动渲染循环
  useEffect(() => {
    startRendering();
    return () => {
      stopRendering();
    };
  }, [startRendering, stopRendering]);

  // 缩放控制函数
  const zoomIn = useCallback(() => {
    const oldScale = camera.zoom;
    const newScale = Math.min(oldScale * 1.2, 5);

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
    const newScale = Math.max(oldScale / 1.2, 0.2);

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

  // 重置视图
  const resetView = useCallback(() => {
    updateCamera({
      position: { x: 0, y: 0 },
      zoom: 1,
    });
  }, [updateCamera]);

  // 根据当前交互状态返回鼠标样式
  const getCursorStyle = useCallback(() => {
    if (isDraggingCanvas) return "grabbing";
    if (isDraggingItem) return "move";
    if (isSelecting) return "crosshair";
    if (isDragOver) return "copy";
    return "default";
  }, [isDraggingCanvas, isDraggingItem, isSelecting, isDragOver]);

  return {
    // 引用
    canvasRef,
    containerRef,
    
    // 状态
    dimensions,
    camera,
    visibleViewport,
    visibleItems,
    selectedItems,
    isDraggingCanvas,
    isDraggingItem,
    isSelecting,
    selectionRect,
    isDragOver,
    previewItem,
    previewPosition,
    isResizing,
    resizeHandle,
    
    // 事件处理
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleWheel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // 功能函数
    zoomIn,
    zoomOut,
    resetView,
    getCursorStyle,
    clientToWorldPosition,
    getPreviewStyle
  };
}