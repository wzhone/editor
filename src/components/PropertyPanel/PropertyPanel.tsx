"use client";
import React, { useState } from 'react';
import { useCanvasStore, useSelectedItems, useHasMultipleSelection } from '../../state/store';
import ElementProperties from './ElementProperties';
import MultiSelectProperties from './MultiSelectProperties';
import ImportExportPanel from './ImportExportPanel';

/**
 * 右侧属性面板组件
 * 显示和编辑选中元素的属性
 */
const PropertyPanel: React.FC = () => {
  // 使用自定义选择器获取选中的元素
  const selectedItems = useSelectedItems();
  const hasMultipleSelection = useHasMultipleSelection();

  // 面板切换状态
  const [activeTab, setActiveTab] = useState<'properties' | 'import-export'>('properties');

  // 渲染属性面板内容
  const renderContent = () => {
    if (activeTab === 'import-export') {
      return <ImportExportPanel />;
    }

    if (selectedItems.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          <p>未选择元素</p>
          <p className="text-sm mt-2">点击画布中的元素以编辑其属性</p>
        </div>
      );
    }

    if (hasMultipleSelection) {
      return <MultiSelectProperties items={selectedItems} />;
    }

    return <ElementProperties item={selectedItems[0]} />;
  };

  return (
    <div className="w-64 h-full bg-white border-l overflow-hidden flex flex-col">
      {/* 面板标题栏 */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 font-medium text-sm border-b-2 ${activeTab === 'properties'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          onClick={() => setActiveTab('properties')}
        >
          属性面板
        </button>
        <button
          className={`flex-1 py-3 font-medium text-sm border-b-2 ${activeTab === 'import-export'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 hover:text-gray-700 border-transparent'
            }`}
          onClick={() => setActiveTab('import-export')}
        >
          导入/导出
        </button>
      </div>

      {/* 面板内容区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default PropertyPanel;