"use client";
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GlobalSettingsProps {
  settings: {
    fastMode: boolean;
    autoMag: boolean;
    showBoxCode: boolean;
    showEquipId: boolean;
    showBoxName: boolean;
    gridSize: number;
    snapToGrid: boolean;
  };
  onToggle: (setting: string, value?: boolean) => void;
}

/**
 * 全局设置组件
 * 控制画布的全局设置和显示选项
 */
const GlobalSettings: React.FC<GlobalSettingsProps> = ({
  settings,
  onToggle
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="fast-mode">快速插入模式</Label>
        <Switch id="fast-mode" checked={settings.fastMode} onCheckedChange={() => onToggle('fastMode')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="auto-mag">自动吸附</Label>
        <Switch id="auto-mag" checked={settings.autoMag} onCheckedChange={() => onToggle('autoMag')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="snap-to-grid">网格吸附</Label>
        <Switch id="snap-to-grid" checked={settings.snapToGrid} onCheckedChange={() => onToggle('snapToGrid')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="show-box-code">显示盒子编码</Label>
        <Switch id="show-box-code" checked={settings.showBoxCode} onCheckedChange={() => onToggle('showBoxCode')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="show-equip-id">显示设备ID</Label>
        <Switch id="show-equip-id" checked={settings.showEquipId} onCheckedChange={() => onToggle('showEquipId')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="show-box-name">显示盒子名称</Label>
        <Switch id="show-box-name" checked={settings.showBoxName} onCheckedChange={() => onToggle('showBoxName')} />
      </div>
    </div>
  );
};

export default GlobalSettings;