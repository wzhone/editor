"use client";
import React from 'react';
import { useCanvasStore } from '../../state/store';
import { CanvasItem } from '../../types';
import ColorPicker from './ColorPicker';
import { Button } from '../ui/button';

/**
 * 多选属性编辑组件属性
 */
interface MultiSelectPropertiesProps {
  items: CanvasItem[];
}

/**
 * 多选属性编辑组件
 * 用于同时编辑多个选中元素的共同属性
 */
const MultiSelectProperties: React.FC<MultiSelectPropertiesProps> = ({ items }) => {
  const { updateItems, removeItems, clearSelection } = useCanvasStore();

  // 计算是否所有选中元素颜色相同
  const sameColor = React.useMemo(() => {
    if (items.length <= 1) return true;

    const firstColor = items[0].showColor;
    return items.every(item => item.showColor === firstColor);
  }, [items]);

  // 获取要显示的颜色值（如果所有元素颜色相同）
  const getColor = () => {
    if (items.length === 0) return '#4682B4';
    return sameColor ? items[0].showColor : '#808080';
  };

  // 更新所有选中元素的颜色
  const handleColorChange = (color: string) => {
    const itemIds = items.map(item => item.objid);
    updateItems(itemIds, { showColor: color });
  };

  // 删除所有选中元素
  const handleDelete = () => {
    if (window.confirm(`确定要删除选中的${items.length}个元素吗?`)){
      const itemIds = items.map(item => item.objid);
      removeItems(itemIds);
      clearSelection();
    }
  };

  // 如果没有选中元素，显示提示
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>未选择元素</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* 多选信息 */}
      <div className="px-3 py-2 bg-blue-50 rounded text-blue-700 text-sm">
        <div className="font-medium">已选择 {items.length} 个元素</div>
        <div className="text-xs mt-1">在多选模式下，仅支持修改颜色</div>
      </div>

      {/* 批量颜色设置 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">设置所有元素颜色</label>
        <ColorPicker
          color={getColor()}
          onChange={handleColorChange}
        />
        {!sameColor && (
          <div className="text-xs text-amber-600 mt-1">
            选中的元素当前有不同的颜色
          </div>
        )}
      </div>

      {/* 删除按钮 */}
      <div className="pt-2">
        <Button
          onClick={handleDelete}
          className={'w-full py-2 rounded transition-colors text-black hover:text-white bg-gray-200 hover:bg-red-600'}
        >
          删除所有选中元素
        </Button>
      </div>
    </div>
  );
};

export default MultiSelectProperties;