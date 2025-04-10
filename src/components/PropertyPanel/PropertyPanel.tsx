"use client";
import React, { useState, useEffect } from 'react';
import { useCanvasStore, useSelectedItems, useHasMultipleSelection } from '../../state/item';
import ElementProperties from './ElementProperties';
import MultiSelectProperties from './MultiSelectProperties';

/**
 * 右侧属性面板组件 - 优化版
 * 改进实时更新和性能表现
 */
const PropertyPanel: React.FC = () => {
  // 使用自定义选择器获取选中的元素
  const selectedItems = useSelectedItems();
  const hasMultipleSelection = useHasMultipleSelection();

  // 面板切换状态
  const [activeTab, setActiveTab] = useState<'properties' | 'import-export'>('properties');

  // 实时更新的元素属性缓存
  const [syncedItems, setSyncedItems] = useState(selectedItems);

  // 监听元素变化，保持属性面板同步更新
  useEffect(() => {
    const items = useCanvasStore.getState().getItems();

    // 从items中找出当前选中的元素，确保使用最新的属性
    const updatedSelectedItems = selectedItems.map(selectedItem => {
      const latestItem = items.find(item => item.objid === selectedItem.objid);
      return latestItem || selectedItem; // 如果找不到，使用当前状态
    });

    setSyncedItems(updatedSelectedItems);
  }, [selectedItems, useCanvasStore]);

  // 监听全局更新
  useEffect(() => {
    // 订阅store变化
    const unsubscribe = useCanvasStore.subscribe(
      () => {
        if (selectedItems.length > 0) {
          const items = useCanvasStore.getState().getItems();

          // 从items中找出当前选中的元素
          const updatedSelectedItems = selectedItems.map(selectedItem => {
            const latestItem = items.find(item => item.objid === selectedItem.objid);
            return latestItem || selectedItem;
          });

          setSyncedItems(updatedSelectedItems);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedItems]);

  // 渲染属性面板内容
  const renderContent = () => {

    if (syncedItems.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          <p>未选择元素</p>
          <p className="text-sm mt-2">点击画布中的元素以编辑其属性</p>
        </div>
      );
    }

    if (hasMultipleSelection) {
      return <MultiSelectProperties items={syncedItems} />;
    }

    return <ElementProperties item={syncedItems[0]} />;
  };

  return (
    <div className="w-64 h-full bg-white border-l overflow-hidden flex flex-col">
      {/* 面板内容区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default PropertyPanel;