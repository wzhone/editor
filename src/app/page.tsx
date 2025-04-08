"use client";
import React from 'react';
import Canvas from '../components/Canvas/Canvas';
import ControlPanel from '../components/ControlPanel/ControlPanel';
import PropertyPanel from '../components/PropertyPanel/PropertyPanel';

/**
 * 主页面组件
 * 布局和组织整个应用界面
 */
const IndexPage: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* 左侧控制面板 */}
      <ControlPanel />

      {/* 中间画布区域 */}
      <div className="flex-1 overflow-hidden">
        <Canvas />
      </div>

      {/* 右侧属性面板 */}
      <PropertyPanel />
    </div>
  );
};

export default IndexPage;