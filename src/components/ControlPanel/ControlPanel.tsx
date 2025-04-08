"use client";
import React from 'react';
import { useCanvasStore } from '../../state/store';
import ElementCreator from './ElementCreator';
import GlobalSettings from './GlobalSettings';

/**
 * 左侧控制面板组件
 * 包含元素创建、全局设置、数据控制等功能
 */
const ControlPanel: React.FC = () => {
  const { settings, updateSettings, items } = useCanvasStore();

  // 切换设置
  const handleToggleSetting = (setting: string, value?: boolean) => {
    updateSettings({
      [setting]: value !== undefined ? value : !settings[setting as keyof typeof settings]
    });
  };

  return (
    <div className="w-64 h-full bg-white border-r overflow-y-auto flex flex-col">
      <div className="p-3 border-b">
        <h2 className="text-lg font-semibold">编辑器</h2>
      </div>

      {/* 元素创建 */}
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium mb-2">创建元素</h3>
        <ElementCreator />
      </div>

      {/* 全局设置 */}
      <div className="p-3">
        <h3 className="text-sm font-medium mb-2">全局设置</h3>
        <GlobalSettings
          settings={settings}
          onToggle={handleToggleSetting}
        />
      </div>

      {/* 使用说明 */}
      <div className="mt-auto p-3 bg-gray-50 text-xs text-gray-600">
        <h4 className="font-medium mb-1">快捷键:</h4>
        <ul className="space-y-1 ml-2">
          <li>方向键: 移动元素</li>
          <li>Delete: 删除元素</li>
          <li>Esc: 取消选择</li>
          <li>快速模式下:</li>
          <li className="ml-2">W: 上方创建</li>
          <li className="ml-2">A: 左侧创建</li>
          <li className="ml-2">S: 下方创建</li>
          <li className="ml-2">D: 右侧创建</li>
        </ul>
        <h4 className="font-medium my-1">操作说明:</h4>
        <ul className="space-y-1 ml-2">
          <li>右键拖动平移画布</li>
          <li>鼠标滚轮缩放</li>
          <li>方向键移动元素</li>
          <li>Delete 键删除元素</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;