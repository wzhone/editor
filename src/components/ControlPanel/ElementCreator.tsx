"use client";
import React from 'react';
import { useCanvasStore } from '../../state/store';
import ColorPicker from '../PropertyPanel/ColorPicker';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

/**
 * 元素创建组件
 * 用于创建新的画布元素
 */
const ElementCreator: React.FC = () => {
  const { templateItem, setTemplateItem, addItem } = useCanvasStore();

  // 更新模板属性
  const handleTemplateChange = (field: string, value: string | number) => {
    setTemplateItem({
      ...templateItem,
      [field]: value
    });
  };

  // 添加新元素
  const handleAddElement = () => {
    // 获取当前相机信息
    const store = useCanvasStore.getState();
    const camera = store.camera;

    // 计算相机中心点在世界坐标系中的位置
    const cameraCenterX = -camera.position.x / camera.zoom + window.innerWidth / (2 * camera.zoom);
    const cameraCenterY = -camera.position.y / camera.zoom + window.innerHeight / (2 * camera.zoom);

    // 考虑元素尺寸，使元素中心与相机中心对齐
    const elementWidth = templateItem.boxWidth || 100;
    const elementHeight = templateItem.boxHeight || 100;

    // 创建一个新的模板，位置在相机中心
    const newTemplate = {
      ...templateItem,
      boxLeft: cameraCenterX - elementWidth / 2,
      boxTop: cameraCenterY - elementHeight / 2
    };

    // 使用修改后的模板添加元素
    const newItemId = store.addItem(newTemplate);

    // 选中新创建的元素
    store.selectItem(newItemId, false);
  };

  return (
    <div className="space-y-3">
      {/* 图形类型选择 */}
      <div>
        <label className="block text-xs mb-1">图形类型</label>
        <RadioGroup
          defaultValue={templateItem.showType || "rectangle"}
          onValueChange={(value) => handleTemplateChange('showType', value)}
          className="flex space-x-2"
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="rectangle" id="rectangle" />
            <Label htmlFor="rectangle">矩形</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="ellipse" id="ellipse" />
            <Label htmlFor="ellipse">椭圆</Label>
          </div>
        </RadioGroup>
      </div>

      {/* 尺寸设置 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1">宽度</label>
          <input
            type="number"
            value={templateItem.boxWidth || 20}
            onChange={(e) => handleTemplateChange('boxWidth', parseInt(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
            min={10}
            max={1000}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">高度</label>
          <input
            type="number"
            value={templateItem.boxHeight || 20}
            onChange={(e) => handleTemplateChange('boxHeight', parseInt(e.target.value))}
            className="w-full px-2 py-1 border rounded text-sm"
            min={10}
            max={1000}
          />
        </div>
      </div>

      {/* 业务属性 */}
      <div>
        <label className="block text-xs mb-1">盒子编码</label>
        <input
          type="text"
          value={templateItem.boxCode || ''}
          onChange={(e) => handleTemplateChange('boxCode', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="盒子编码"
        />
      </div>

      <div>
        <label className="block text-xs mb-1">设备ID</label>
        <input
          type="text"
          value={templateItem.equipId || ''}
          onChange={(e) => handleTemplateChange('equipId', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="设备ID"
        />
      </div>

      {/* 新增字段 */}
      <div>
        <label className="block text-xs mb-1">盒子名称</label>
        <input
          type="text"
          value={templateItem.boxName || ''}
          onChange={(e) => handleTemplateChange('boxName', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="盒子名称"
        />
      </div>

      <div>
        <label className="block text-xs mb-1">位置ID</label>
        <input
          type="text"
          value={templateItem.locId || ''}
          onChange={(e) => handleTemplateChange('locId', e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="位置ID"
        />
      </div>

      {/* 颜色选择 */}
      <div>
        <label className="block text-xs mb-1">颜色</label>
        <ColorPicker
          color={templateItem.showColor || '#4682B4'}
          onChange={(color) => handleTemplateChange('showColor', color)}
        />
      </div>

      {/* 创建按钮 */}
      <Button
        onClick={handleAddElement}
        className="bg-blue-500 hover:bg-blue-600 w-full"
      >
        创建元素
      </Button>
    </div>
  );
};

export default ElementCreator;