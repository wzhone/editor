"use client";
import React from 'react';
import { Group, Rect, Ellipse, Text } from 'react-konva';
import { useCanvasStore, useItems, useSelectedItems } from '../../state/store';
import { CanvasItem } from '../../types';

/**
 * 画布元素渲染组件
 * 渲染所有的画布元素，处理选中状态
 */
const CanvasElements: React.FC = () => {
  // 从store获取元素和选中状态
  const items = useItems();
  const selectedItems = useSelectedItems();
  const selectedItemIds = useCanvasStore(state => state.selectedItemIds);
  const settings = useCanvasStore(state => state.settings);

  return (
    <Group>
      {items.map((item) => (
        <CanvasElement
          key={item.objid}
          item={item}
          isSelected={selectedItemIds.has(item.objid)}
          settings={settings}
        />
      ))}
    </Group>
  );
};

/**
 * 单个画布元素组件
 */
interface CanvasElementProps {
  item: CanvasItem;
  isSelected: boolean;
  settings: any;
}

/**
 * 单个画布元素渲染
 */
const CanvasElement: React.FC<CanvasElementProps> = ({
  item,
  isSelected,
  settings
}) => {
  // 判断元素类型并渲染对应的图形
  const renderShape = () => {
    const commonProps = {
      x: item.boxLeft,
      y: item.boxTop,
      width: item.boxWidth,
      height: item.boxHeight,
      fill: item.showColor,
      stroke: isSelected ? '#0000ff' : '#000000',
      strokeWidth: isSelected ? 2 : 1,
      perfectDrawEnabled: false,
    };

    if (item.showType === 'ellipse') {
      return (
        <Ellipse
          x={item.boxLeft + item.boxWidth / 2}
          y={item.boxTop + item.boxHeight / 2}
          radiusX={item.boxWidth / 2}
          radiusY={item.boxHeight / 2}
          fill={item.showColor}
          stroke={isSelected ? '#0000ff' : '#000000'}
          strokeWidth={isSelected ? 2 : 1}
          perfectDrawEnabled={false}
        />
      );
    }

    // 默认为矩形
    return <Rect {...commonProps} />;
  };

  // 渲染标签文本
  const renderLabels = () => {
    const labels = [];
    const numLabels = [
      settings.showBoxCode && item.boxCode,
      settings.showEquipId && item.equipId,
      settings.showBoxName && item.boxName
    ].filter(Boolean).length;

    // 只有在需要显示标签时才计算位置
    if (numLabels > 0) {
      const spacing = item.boxHeight / (numLabels + 1);
      let positionIndex = 0;

      // 盒子编码
      if (settings.showBoxCode && item.boxCode) {
        positionIndex++;
        labels.push(
          <Text
            key="boxCode"
            x={item.boxLeft}
            y={item.boxTop + spacing * positionIndex - 8} // 垂直居中调整
            text={item.boxCode}
            width={item.boxWidth}
            align="center"
            fontSize={12}
            fill="#000000"
            perfectDrawEnabled={false}
          />
        );
      }

      // 设备ID
      if (settings.showEquipId && item.equipId) {
        positionIndex++;
        labels.push(
          <Text
            key="equipId"
            x={item.boxLeft}
            y={item.boxTop + spacing * positionIndex - 8} // 垂直居中调整
            text={item.equipId}
            width={item.boxWidth}
            align="center"
            fontSize={12}
            fill="#000000"
            perfectDrawEnabled={false}
          />
        );
      }

      // 盒子名称
      if (settings.showBoxName && item.boxName) {
        positionIndex++;
        labels.push(
          <Text
            key="boxName"
            x={item.boxLeft}
            y={item.boxTop + spacing * positionIndex - 8} // 垂直居中调整
            text={item.boxName}
            width={item.boxWidth}
            align="center"
            fontSize={12}
            fill="#000000"
            perfectDrawEnabled={false}
          />
        );
      }
    }

    return labels;
  };

  return (
    <Group>
      {renderShape()}
      {renderLabels()}
    </Group>
  );
};

export default CanvasElements;