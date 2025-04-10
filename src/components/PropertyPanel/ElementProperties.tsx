"use client";
import React, { useState } from 'react';
import { useCanvasStore } from '../../state/item';
import { CanvasItem } from '../../types';
import ColorPicker from './ColorPicker';
import { Input } from "@/components/ui/input";
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

interface ElementPropertiesProps {
  item: CanvasItem;
}

/**
 * 元素属性编辑组件
 * 用于编辑选中元素的各种属性
 */
const ElementProperties: React.FC<ElementPropertiesProps> = ({ item }) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const { removeItem, updateItem } = useCanvasStore();

  // 更新元素属性
  const handleUpdate = (field: string, value: string | number) => {
    updateItem(item.objid, {
      [field]: value
    });
  };

  // 更新元素尺寸
  const handleSizeChange = (width: number, height: number) => {
    updateItem(item.objid, {
      boxWidth: Math.max(5, width),
      boxHeight: Math.max(5, height)
    });
  };

  // 删除元素
  const handleDelete = () => {
    if (isConfirmingDelete) {
      removeItem(item.objid);
    } else {
      setIsConfirmingDelete(true);
      // 自动重置确认状态
      setTimeout(() => setIsConfirmingDelete(false), 3000);
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* ID信息 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">元素ID</label>
        <div className="px-2 py-1 bg-gray-100 rounded text-sm font-mono break-all">
          {item.objid}
        </div>
      </div>

      {/* 图形类型 */}
      <div>
        <label className="block text-xs mb-1">图形类型</label>
        <RadioGroup
          value={item.showType || "rectangle"}
          onValueChange={(value) => handleUpdate('showType', value)}
          className="flex space-x-2"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="rectangle" id="rect-type" />
            <Label htmlFor="rect-type">矩形</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="ellipse" id="ellipse-type" />
            <Label htmlFor="ellipse-type">椭圆</Label>
          </div>
        </RadioGroup>
      </div>

      {/* 位置和尺寸 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1">X坐标</label>
          <input
            type="number"
            value={item.boxLeft}
            onChange={(e) => handleUpdate('boxLeft', parseFloat(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Y坐标</label>
          <input
            type="number"
            value={item.boxTop}
            onChange={(e) => handleUpdate('boxTop', parseFloat(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs mb-1">宽度</label>
          <input
            type="number"
            value={item.boxWidth}
            onChange={(e) => handleUpdate('boxWidth', parseFloat(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
            min={3}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">高度</label>
          <input
            type="number"
            value={item.boxHeight}
            onChange={(e) => handleUpdate('boxHeight', parseFloat(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
            min={3}
          />
        </div>
      </div>

      {/* 业务属性 */}
      <div>
        <label className="block text-xs mb-1">Box Code</label>
        <Input
          type="text"
          value={item.boxCode}
          onChange={(e) => handleUpdate('boxCode', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-xs mb-1">Equip ID</label>
        <Input
          type="text"
          value={item.equipId}
          onChange={(e) => handleUpdate('equipId', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-xs mb-1">Box Name</label>
        <Input
          type="text"
          value={item.boxName || ""}
          onChange={(e) => handleUpdate('boxName', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-xs mb-1">Loc ID</label>
        <Input
          type="text"
          value={item.locId || ""}
          onChange={(e) => handleUpdate('locId', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
        />
      </div>

      {/* 颜色选择器 */}
      <div>
        <label className="block text-xs mb-1">颜色</label>
        <ColorPicker
          color={item.showColor}
          onChange={(color) => handleUpdate('showColor', color)}
        />
      </div>

      {/* 快捷大小设置器 */}
      <div>
        <label className="block text-xs mb-1">快捷尺寸</label>
        <div className="grid grid-cols-4 gap-1">
          <Button variant="ghost" onClick={() => handleSizeChange(15, 15)}>15 x 15</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(20, 20)}>20 x 20</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(20, 15)}>20 x 15</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(15, 20)}>15 x 20</Button>

          <Button variant="ghost" onClick={() => handleSizeChange(40, 20)}>40 x 20</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(30, 20)}>30 x 20</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(30, 10)}>30 x 10</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(40, 10)}>40 x 10</Button>

          <Button variant="ghost" onClick={() => handleSizeChange(item.boxHeight, item.boxWidth)}>旋转</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(item.boxWidth + 5, item.boxHeight + 5)}>放大</Button>
          <Button variant="ghost" onClick={() => handleSizeChange(item.boxWidth - 5, item.boxHeight - 5)}>缩小</Button>
        </div>
      </div>

      {/* 删除按钮 */}
      <div className="pt-2">
        <button
          onClick={handleDelete}
          className={`w-full py-2 rounded transition-colors ${isConfirmingDelete
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-200 hover:bg-gray-300'
            }`}
        >
          {isConfirmingDelete ? '确认删除？' : '删除元素'}
        </button>
      </div>
    </div>
  );
};

export default ElementProperties;