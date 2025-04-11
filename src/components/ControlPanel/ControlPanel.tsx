"use client";
import React from 'react';
import DraggableElementCreator from './ElementCreator';
import GlobalSettings from './GlobalSettings';

/**
 * 左侧控制面板组件 - 优化版
 * 使用可拖拽元素创建器替代原始的点击创建方式
 */
const ControlPanel: React.FC = () => {

  return (
    <div className="w-64  bg-white border-r overflow-y-auto flex flex-col">

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
      <div className=" p-3 text-xs text-gray-600">
        <h4 className="font-medium mb-1">快捷键:</h4>
        <ul className="space-y-1 ml-2">
          <li>方向键: 移动元素</li>
          <li>Delete: 删除元素</li>
          <li>Esc: 取消选择</li>
          <li>快速插入模式下:</li>
          <li className="ml-2">W/A/S/D: 快速创建</li>
        </ul>
        <h4 className="font-medium my-1">操作说明:</h4>
        <ul className="space-y-1 ml-2">
          <li>从左侧点击元素添加到画布</li>
          <li>右键拖动平移画布</li>
          <li>鼠标滚轮缩放</li>
          <li>左键拖拽移动元素</li>
          <li>框选多个元素</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;