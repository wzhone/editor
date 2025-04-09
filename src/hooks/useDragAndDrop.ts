// src/hooks/useDragAndDrop.ts 的优化版本

import { useCallback, useState, useRef } from 'react';
import { useCanvasStore } from '@/state/store';
import { CanvasItem, Point } from '@/types';
import { toast } from 'sonner';

interface UseDragAndDropProps {
  clientToWorldPosition: (clientX: number, clientY: number) => Point;
  camera: {
    position: Point;
    zoom: number;
  };
}

export function useDragAndDrop({ clientToWorldPosition, camera }: UseDragAndDropProps) {
  // 从Store获取方法
  const { addItem, selectItem } = useCanvasStore();
  
  // 拖动状态
  const [isDragOver, setIsDragOver] = useState(false);
  
  // 预览元素
  const [previewItem, setPreviewItem] = useState<Partial<CanvasItem> | null>(null);
  const [previewPosition, setPreviewPosition] = useState<Point | null>(null);
  
  // 鼠标位置跟踪
  const [mouseClientPosition, setMouseClientPosition] = useState<Point | null>(null);
  
  // 拖动开始位置 - 用于计算元素位置偏移
  const dragStartPositionRef = useRef<Point | null>(null);
  
  // 存储拖动数据
  const dragDataRef = useRef<any>(null);
  
  // 获取元素数据
  const getElementData = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const templateData = JSON.parse(jsonData);
        
        // 如果已有预览元素，但鼠标位置变化，则更新预览位置
        if (previewItem) {
          const worldPos = clientToWorldPosition(e.clientX, e.clientY);
          setPreviewPosition(worldPos);
        } else {
          // 新的预览元素
          dragDataRef.current = templateData;
          setPreviewItem(templateData);
          
          // 记录鼠标位置
          setMouseClientPosition({ x: e.clientX, y: e.clientY });
          
          // 记录开始拖动时的世界坐标
          const worldPos = clientToWorldPosition(e.clientX, e.clientY);
          dragStartPositionRef.current = worldPos;
          setPreviewPosition(worldPos);
        }
        
        return templateData;
      }
    } catch (error) {
      // 无法获取数据，这可能是正常的（首次尝试获取）
      console.error('无法获取数据', error);
      return null;
    }
    
    return null;
  }, [clientToWorldPosition, previewItem]);

  // 处理拖拽进入事件
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragOver(true);
    
    // 尝试获取元素数据
    getElementData(e);
  }, [getElementData]);
  
  // 处理拖拽过程中事件
  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 设置允许放置的效果
    e.dataTransfer.dropEffect = 'copy';
    
    // 保持拖拽状态
    setIsDragOver(true);
    
    // 如果鼠标位置变化超过阈值，则更新预览位置
    const dx = mouseClientPosition ? Math.abs(e.clientX - mouseClientPosition.x) : 0;
    const dy = mouseClientPosition ? Math.abs(e.clientY - mouseClientPosition.y) : 0;
    
    if (dx > 5 || dy > 5 || !mouseClientPosition) {
      // 更新鼠标位置
      setMouseClientPosition({ x: e.clientX, y: e.clientY });
      
      // 获取新的世界坐标
      const worldPos = clientToWorldPosition(e.clientX, e.clientY);
      setPreviewPosition(worldPos);
      
      // 如果还没有预览元素，尝试获取
      if (!previewItem) {
        getElementData(e);
      }
    }
  }, [clientToWorldPosition, getElementData, mouseClientPosition, previewItem]);

  // 处理拖拽离开事件
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    // 检查是否真的离开了canvas（而不是进入子元素）
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // 如果鼠标确实离开了画布边界
    if (
      x < rect.left || 
      x > rect.right || 
      y < rect.top || 
      y > rect.bottom
    ) {
      setIsDragOver(false);
      setPreviewItem(null);
      setPreviewPosition(null);
      setMouseClientPosition(null);
      dragStartPositionRef.current = null;
      // 不清除dragDataRef以便在重新进入时能够恢复
    }
  }, []);

  // 处理拖拽放置事件（创建新元素）
  const handleDrop = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // 使用当前缓存的数据或尝试再次获取
    const templateData = dragDataRef.current || getElementData(e);
    if (!templateData) {
      // 清理状态
      setPreviewItem(null);
      setPreviewPosition(null);
      setMouseClientPosition(null);
      dragStartPositionRef.current = null;
      dragDataRef.current = null;
      return;
    }
    
    try {
      // 转换拖放位置为世界坐标
      const worldPos = clientToWorldPosition(e.clientX, e.clientY);
      
      // 创建元素，位置居中于鼠标位置
      const newItem = {
        ...templateData,
        boxLeft: worldPos.x - (templateData.boxWidth / 2),
        boxTop: worldPos.y - (templateData.boxHeight / 2)
      };
      
      // 添加元素并获取ID
      const newItemId = addItem(newItem);
      
      // 选中新创建的元素
      selectItem(newItemId, false);
      
      // 显示成功提示
      toast.success('元素创建成功');
    } catch (error) {
      console.error('拖拽创建元素失败:', error);
      toast.error('创建元素失败');
    } finally {
      // 清理预览状态
      setPreviewItem(null);
      setPreviewPosition(null);
      setMouseClientPosition(null);
      dragStartPositionRef.current = null;
      dragDataRef.current = null;
    }
  }, [clientToWorldPosition, addItem, selectItem, getElementData]);

  // 渲染预览元素的样式
  const getPreviewStyle = useCallback(() => {
    if (!previewItem || !previewPosition) return null;
    
    // 计算预览元素在屏幕上的位置和尺寸
    return {
      position: 'absolute' as const,
      left: previewPosition.x * camera.zoom + camera.position.x - (previewItem.boxWidth || 20) * camera.zoom / 2,
      top: previewPosition.y * camera.zoom + camera.position.y - (previewItem.boxHeight || 20) * camera.zoom / 2,
      width: (previewItem.boxWidth || 20) * camera.zoom,
      height: (previewItem.boxHeight || 20) * camera.zoom,
      backgroundColor: previewItem.showColor || '#4682B4',
      opacity: 0.7,
      borderRadius: previewItem.showType === 'ellipse' ? '50%' : '0',
      border: '2px dashed #000',
      pointerEvents: 'none' as const,
      zIndex: 1000
    };
  }, [previewItem, previewPosition, camera]);

  return {
    isDragOver,
    previewItem, 
    previewPosition,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getPreviewStyle
  };
}