"use client";
import React, { useState } from 'react';
import { useCanvasStore } from '../../state/store';
import { COLOR_PRESETS } from '../PropertyPanel/ColorPicker';
import { CanvasItem } from '../../types';

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
 * 可拖拽的元素创建器组件
 * 提供多种预设模板并支持拖拽创建元素
 */
const DraggableElementCreator: React.FC = () => {
  const { templateItem, setTemplateItem } = useCanvasStore();
  const [customizing, setCustomizing] = useState<ElementTemplate | null>(null);

  // 预定义的元素模板
  const elementTemplates: ElementTemplate[] = [
    {
      id: 'rect-small',
      name: '小矩形',
      boxWidth: 20,
      boxHeight: 20,
      showType: 'rectangle',
      showColor: '#4682B4'
    },
    {
      id: 'rect-medium',
      name: '中矩形',
      boxWidth: 40,
      boxHeight: 30,
      showType: 'rectangle',
      showColor: '#2E8B57'
    },
    {
      id: 'rect-large',
      name: '大矩形',
      boxWidth: 60,
      boxHeight: 40,
      showType: 'rectangle',
      showColor: '#B22222'
    },
    {
      id: 'ellipse-small',
      name: '小椭圆',
      boxWidth: 20,
      boxHeight: 20,
      showType: 'ellipse',
      showColor: '#9932CC'
    },
    {
      id: 'ellipse-medium',
      name: '中椭圆',
      boxWidth: 40,
      boxHeight: 30,
      showType: 'ellipse',
      showColor: '#FF8C00'
    },
    {
      id: 'ellipse-large',
      name: '大椭圆',
      boxWidth: 60,
      boxHeight: 40,
      showType: 'ellipse',
      showColor: '#20B2AA'
    }
  ];

  // 处理拖拽开始事件
  const handleDragStart = (e: React.DragEvent, template: ElementTemplate) => {
    // 设置拖拽数据
    e.dataTransfer.setData('application/json', JSON.stringify({
      ...template,
      boxCode: templateItem.boxCode || '',
      equipId: templateItem.equipId || '',
      boxName: templateItem.boxName || '',
      locId: templateItem.locId || ''
    }));

    // 设置拖拽效果
    e.dataTransfer.effectAllowed = 'copy';

    // 可选：设置拖拽图像
    const dragImage = document.createElement('div');
    dragImage.style.width = `${template.boxWidth}px`;
    dragImage.style.height = `${template.boxHeight}px`;
    dragImage.style.backgroundColor = template.showColor;
    dragImage.style.border = '1px solid black';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, template.boxWidth / 2, template.boxHeight / 2);

    // 延迟删除拖拽图像
    setTimeout(() => {
      document.body.removeChild(dragImage);
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
      <h3 className="text-sm font-medium mb-2">拖拽元素到画布</h3>

      <div className="grid grid-cols-3 gap-2">
        {elementTemplates.map((template) => (
          <div
            key={template.id}
            draggable
            onDragStart={(e) => handleDragStart(e, template)}
            onClick={() => selectTemplate(template)}
            className="flex flex-col items-center justify-center p-2 border rounded cursor-grab hover:bg-gray-50 transition-colors"
            title={`拖拽 ${template.name} 到画布`}
          >
            <div
              className={`w-8 h-8 mb-1 border ${template.showType === 'ellipse' ? 'rounded-full' : 'rounded'
                }`}
              style={{ backgroundColor: template.showColor }}
            />
            <span className="text-xs">{template.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t">
        <h3 className="text-sm font-medium mb-2">通用属性</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs mb-1">盒子编码</label>
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
            <label className="block text-xs mb-1">设备ID</label>
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
            <label className="block text-xs mb-1">盒子名称</label>
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
            <label className="block text-xs mb-1">位置ID</label>
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

      <div className="text-xs text-gray-500 mt-2">
        拖拽元素到画布或点击选择作为模板
      </div>
    </div>
  );
};

export default DraggableElementCreator;