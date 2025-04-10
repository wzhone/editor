"use client";
import React, { useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettingStore } from '@/state/settings';

/**
 * 全局设置组件
 * 控制画布的全局设置和显示选项
 */
export default function GlobalSettings() {

  const settings = useSettingStore()

  // 切换设置
  const onToggle = useCallback((setting: string, value?: boolean) => {
    settings.updateSettings({
      [setting]: value !== undefined ? value : !settings[setting as keyof typeof settings]
    });
  }, [settings]);

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
        <Label htmlFor="show-box-code">显示 Box Code</Label>
        <Switch id="show-box-code" checked={settings.showBoxCode} onCheckedChange={() => onToggle('showBoxCode')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="show-equip-id">显示 Equip ID</Label>
        <Switch id="show-equip-id" checked={settings.showEquipId} onCheckedChange={() => onToggle('showEquipId')} />
      </div>
      <div className="flex items-center space-x-2 justify-between">
        <Label htmlFor="show-box-name">显示 Box Name</Label>
        <Switch id="show-box-name" checked={settings.showBoxName} onCheckedChange={() => onToggle('showBoxName')} />
      </div>
    </div>
  );
};
