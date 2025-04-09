"use client";
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Plus, Minus, Search } from 'lucide-react';
import { FindItemDialog } from './FindItem';

/**
 * 画布控制栏属性
 */
interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onHightlightItem: (objid: string) => void;
}

/**
 * 画布控制组件
 * 提供缩放、平移、导出等操作的控制界面
 */
const CanvasControls: React.FC<CanvasControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetView,
  onHightlightItem
}) => {

  // 查询相关逻辑
  // const 
  const [openFindDialog, setOpenFindDialog] = useState(false);

  return (
    <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm">
      {/* 左侧缩放控制 */}
      <div className="flex items-center space-x-2">
        <Button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={onZoomOut}
          title="缩小"
          variant="ghost"
        >
          <Minus />
        </Button>

        <div className="text-sm font-medium w-20 text-center">
          {Math.round(zoom * 100)}%
        </div>

        <Button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={onZoomIn}
          title="放大"
          variant="ghost"
        >
          <Plus />
        </Button>

        <FindItemDialog onHightlightItem={onHightlightItem} open={openFindDialog} onOpenChange={setOpenFindDialog} />
        <Button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
          onClick={() => setOpenFindDialog(true)}
          title="查询"
          variant="ghost"
        >
          <Search />
        </Button>

        <Button
          className="ml-2 px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          onClick={onResetView}
          title="重置视图"
          variant="ghost"
        >
          重置视图
        </Button>
      </div>
    </div>
  );
};

export default CanvasControls;