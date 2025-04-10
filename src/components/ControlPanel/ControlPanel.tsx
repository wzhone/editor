"use client";
import React from 'react';
import { useCanvasStore } from '../../state/item';
import DraggableElementCreator from './ElementCreator';
import GlobalSettings from './GlobalSettings';

/**
 * 左侧控制面板组件 - 优化版
 * 使用可拖拽元素创建器替代原始的点击创建方式
 */
const ControlPanel: React.FC = () => {

  return (
    <div className="w-64  bg-white border-r overflow-y-auto flex flex-col">
      <div className="p-3 border-b">
        <h2 className="text-lg font-semibold">编辑器</h2>
      </div>

      {/* 元素创建 - 使用拖拽创建器 */}
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium mb-2">创建元素</h3>
        <DraggableElementCreator />
      </div>

      {/* 全局设置 */}
      <div className="p-3">
        <h3 className="text-sm font-medium mb-2">全局设置</h3>
        <GlobalSettings />
      </div>

      <div className='flex-1'></div>

      {/* 使用说明 */}
      <div className=" p-3 bg-gray-50 text-xs text-gray-600">
        <h4 className="font-medium mb-1">快捷键:</h4>
        <ul className="space-y-1 ml-2">
          <li>方向键: 移动元素</li>
          <li>Delete: 删除元素</li>
          <li>Esc: 取消选择</li>
          <li>Ctrl+O: 导入</li>
          <li>Ctrl+S: 导出</li>
          <li>快速插入模式下:</li>
          <li className="ml-2">W: 上方创建</li>
          <li className="ml-2">A: 左侧创建</li>
          <li className="ml-2">S: 下方创建</li>
          <li className="ml-2">D: 右侧创建</li>
        </ul>
        <h4 className="font-medium my-1">操作说明:</h4>
        <ul className="space-y-1 ml-2">
          <li>从左侧拖拽元素到画布</li>
          <li>右键拖动平移画布</li>
          <li>鼠标滚轮缩放</li>
          <li>拖拽移动元素（启用自动吸附）</li>
          <li>框选多个元素</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;