"use client";
import React from 'react';
import Canvas from '../components/Canvas/Canvas';
import ControlPanel from '../components/ControlPanel/ControlPanel';
import PropertyPanel from '../components/PropertyPanel/PropertyPanel';
import Menu from '@/components/Menu';

/**
 * 主页面组件
 * 布局和组织整个应用界面
 */
const IndexPage: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden">
      {/* 顶部菜单 */}
      <Menu />

      <div className='flex flex-1'>
        {/* 左侧控制面板 */}
        <ControlPanel />

        {/* 中间画布区域 */}
        <div className="flex-1">
          <Canvas />
        </div>

        {/* 右侧属性面板 */}
        <PropertyPanel />
      </div>

    </div>
  );
};

export default IndexPage;