// src/components/ControlPanel/ElementCreator.tsx
"use client";
import React from 'react';
import { useCanvasStore } from '../../state/item';
import { useCameraStore } from '@/state/camera'; // 添加这一行引入视口状态
import { generateId } from '@/utils/idGenerator';

// 元素模板类型
interface ElementTemplate {
  id: string;
  name: string;
  boxWidth: number;
  boxHeight: number;
  showType: "rectangle" | "ellipse";
  showColor: string;
}

export default function ElementCreator() {
  const { addItem } = useCanvasStore();
  const { camera, dimension } = useCameraStore(); // 添加这一行获取相机状态

  const [boxCode, setBoxCode] = React.useState('');
  const [equipId, setEquipId] = React.useState('');
  const [boxName, setBoxName] = React.useState('');
  const [locId, setLocId] = React.useState('');


  // 预定义的元素模板
  const elementTemplates: ElementTemplate[] = [
    {
      id: 'rect',
      name: '矩形',
      boxWidth: 20,
      boxHeight: 20,
      showType: 'rectangle',
      showColor: '#ffffff'
    },
    {
      id: 'ellipse',
      name: '圆形',
      boxWidth: 20,
      boxHeight: 20,
      showType: 'ellipse',
      showColor: '#ffffff'
    }
  ];


  // 创建元素方法
  const createItem = (template: ElementTemplate) => {

    // 计算视口中心的世界坐标
    const viewportCenterX = dimension.width / 2;
    const viewportCenterY = dimension.height / 2;

    // 转换为世界坐标
    const worldX = (viewportCenterX + camera.position.x) / camera.zoom;
    const worldY = (viewportCenterY + camera.position.y) / camera.zoom;

    // 调整元素位置使其中心位于视口中心
    const boxLeft = Math.round(worldX - template.boxWidth / 2);
    const boxTop = Math.round(worldY - template.boxHeight / 2);

    // 创建新元素
    const newItem = {
      objid: generateId(),
      ...template,
      boxLeft,
      boxTop,
      boxCode,
      equipId,
      boxName,
      locId
    };

    // 添加元素到画布
    const newItemId = addItem(newItem);

    // 选中新创建的元素
    useCanvasStore.getState().selectItem(newItemId, false);
  };

  // 渲染元素模板
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {elementTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => createItem(template)}
            className="flex flex-col items-center justify-center p-2 border border-gray-500 border-dashed rounded cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div
              className={`w-8 h-8 mb-1 border border-black ${template.showType === 'ellipse' ? 'rounded-full' : 'rounded-sm'}`}
              style={{ backgroundColor: template.showColor }}
            />
            <span className="text-xs">{template.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3">
        <div className="space-y-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs mb-1">Box Code</label>
            <input
              type="text"
              value={boxCode}
              onChange={(e) => setBoxCode(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="盒子编码"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Equip ID</label>
            <input
              type="text"
              value={equipId}
              onChange={(e) => setEquipId(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="设备ID"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Box Name</label>
            <input
              type="text"
              value={boxName}
              onChange={(e) => setBoxName(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="盒子名称"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Loc ID</label>
            <input
              type="text"
              value={locId}
              onChange={(e) => setLocId(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="位置ID"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
