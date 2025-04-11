"use client";
import React from 'react';
import { useItems, useSelectedItems } from '../../state/item';
import { Check, RotateCcw, Search, Tally4 } from 'lucide-react';
import { Minus, Plus } from "lucide-react";
import { Button } from '../ui/button';
import { useCameraStore } from "@/state/camera";


/**
 * 画布状态栏组件
 * 显示当前画布状态信息，如元素数量、选中元素等
 */
const CanvasStatusBar: React.FC = () => {
  const items = useItems();
  const selectedItems = useSelectedItems();
  const camera = useCameraStore();


  return (
    <>
      {/* 左侧部分 */}
      <div className="absolute bottom-4 left-4 p-2 bg-white bg-opacity-70 rounded shadow text-sm">
        <div className="flex items-center space-x-4">
          {/* 缩放信息 */}
          <div className="flex items-center gap-0.5">
            <Search size={18} className='opacity-75' />
            <span className="font-medium">{Math.round(camera.camera.zoom * 100)}%</span>
          </div>

          {/* 元素数量 */}
          <div className="flex items-center gap-0.5">
            <Tally4 size={18} className='opacity-75' />
            <span className="font-medium">{items.length}</span>
            <span className="text-gray-500 ml-1">元素</span>
          </div>

          {/* 选中元素 */}
          <div className="flex items-center gap-0.5">
            <Check size={18} className='opacity-75' />
            <span className="font-medium">{selectedItems.length}</span>
            <span className="text-gray-500 ml-1">已选择</span>
          </div>
        </div>

        {/* 选中元素详情 - 仅显示单个元素的详情 */}
        {selectedItems.length === 1 && (
          <div className="mt-1 pt-1 border-t border-gray-200 text-xs">
            <span className="font-medium">ID: </span>
            <span className="text-gray-600 font-mono">{selectedItems[0].objid}</span>
            <span className="mx-2">|</span>
            <span className="font-medium">位置: </span>
            <span className="text-gray-600">{Math.round(selectedItems[0].boxLeft)}, {Math.round(selectedItems[0].boxTop)}</span>
            <span className="mx-2">|</span>
            <span className="font-medium">尺寸: </span>
            <span className="text-gray-600">{selectedItems[0].boxWidth} × {selectedItems[0].boxHeight}</span>
          </div>
        )}
      </div>

      {/* 右侧部分 */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-70 rounded shadow text-sm flex items-center">
        <Button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={camera.zoomOut}
          title="缩小"
          variant="ghost"
        >
          <Minus />
        </Button>

        <div className="text-sm font-medium w-20 text-center">
          {Math.round(camera.camera.zoom * 100)}%
        </div>

        <Button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={camera.zoomIn}
          title="放大"
          variant="ghost"
        >
          <Plus />
        </Button>

        <Button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={camera.resetCamera}
          title="重置"
          variant="ghost"
        >
          <RotateCcw />
        </Button>
      </div>
    </>
  );
};

export default CanvasStatusBar;