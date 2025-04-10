// src/components/ControlPanel/DraggableElementCreator.tsx
"use client";
import React from 'react';
import { useCanvasStore } from '../../state/item';

// 元素模板类型
interface ElementTemplate {
  id: string;
  name: string;
  boxWidth: number;
  boxHeight: number;
  showType: "rectangle" | "ellipse";
  showColor: string;
}

/**
 * 可拖拽的元素创建器组件 - 改进版
 * 提供多种预设模板并支持拖拽创建元素
 */
const DraggableElementCreator: React.FC = () => {
  const { templateItem, setTemplateItem } = useCanvasStore();

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

  // 处理拖拽开始事件
  const handleDragStart = (e: React.DragEvent, template: ElementTemplate) => {
    // 设置拖拽数据
    const templateData = {
      ...template,
      boxCode: templateItem.boxCode || '',
      equipId: templateItem.equipId || '',
      boxName: templateItem.boxName || '',
      locId: templateItem.locId || ''
    };

    e.dataTransfer.setData('application/json', JSON.stringify(templateData));
    e.dataTransfer.effectAllowed = 'copy';

    // 创建自定义拖拽图像
    const dragPreview = document.createElement('div');
    dragPreview.style.width = `${template.boxWidth}px`;
    dragPreview.style.height = `${template.boxHeight}px`;
    dragPreview.style.backgroundColor = template.showColor;
    dragPreview.style.border = '1px solid black';
    dragPreview.style.borderRadius = template.showType === 'ellipse' ? '50%' : '0';
    dragPreview.style.position = 'absolute';
    dragPreview.style.opacity = '0.8';
    dragPreview.style.pointerEvents = 'none';
    dragPreview.style.zIndex = '1000';
    document.body.appendChild(dragPreview);

    // 设置拖拽图像
    e.dataTransfer.setDragImage(dragPreview, template.boxWidth / 2, template.boxHeight / 2);

    // 延迟删除拖拽图像
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };

  // 选择模板并更新全局模板项
  const selectTemplate = (template: ElementTemplate) => {
    setTemplateItem({
      ...templateItem,
      boxWidth: template.boxWidth,
      boxHeight: template.boxHeight,
      showType: template.showType,
      showColor: template.showColor
    });
  };

  // 渲染元素模板
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {elementTemplates.map((template) => (
          <div
            key={template.id}
            draggable
            onDragStart={(e) => handleDragStart(e, template)}
            onClick={() => selectTemplate(template)}
            className="flex flex-col items-center justify-center p-2 border border-gray-500 border-dashed rounded cursor-grab hover:bg-gray-50 transition-colors"
            title={`拖拽 ${template.name} 到画布`}
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
              value={templateItem.boxCode || ''}
              onChange={(e) => setTemplateItem({
                ...templateItem,
                boxCode: e.target.value
              })}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="盒子编码"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Equip ID</label>
            <input
              type="text"
              value={templateItem.equipId || ''}
              onChange={(e) => setTemplateItem({
                ...templateItem,
                equipId: e.target.value
              })}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="设备ID"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Box Name</label>
            <input
              type="text"
              value={templateItem.boxName || ''}
              onChange={(e) => setTemplateItem({
                ...templateItem,
                boxName: e.target.value
              })}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="盒子名称"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Loc ID</label>
            <input
              type="text"
              value={templateItem.locId || ''}
              onChange={(e) => setTemplateItem({
                ...templateItem,
                locId: e.target.value
              })}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="位置ID"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableElementCreator;