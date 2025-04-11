import { CanvasItem } from "../types";

/**
 * 查找给定位置最近的对齐点
 * @param value 当前位置
 * @param snapPoints 吸附点数组
 * @param threshold 吸附阈值
 * @returns 最近的吸附点，若无则返回原值
 */
export function findNearestSnapPoint(
  value: number,
  snapPoints: number[],
  threshold: number
): number {
  let minDist = threshold + 1;
  let nearestPoint = value;

  for (const point of snapPoints) {
    const dist = Math.abs(value - point);
    if (dist < minDist) {
      minDist = dist;
      nearestPoint = point;
    }
  }

  return nearestPoint;
}

/**
 * 计算元素的吸附边界点
 */
export function getItemSnapPoints(item: CanvasItem): {
  horizontal: number[];
  vertical: number[];
} {
  const left = item.boxLeft;
  const right = item.boxLeft + item.boxWidth;
  const top = item.boxTop;
  const bottom = item.boxTop + item.boxHeight;
  const centerX = left + item.boxWidth / 2;
  const centerY = top + item.boxHeight / 2;

  return {
    horizontal: [left, centerX, right],
    vertical: [top, centerY, bottom]
  };
}

/**
 * 计算网格吸附点
 */
export function getGridSnapPoints(
  gridSize: number,
  viewportLeft: number,
  viewportTop: number,
  viewportRight: number,
  viewportBottom: number
): { horizontal: number[]; vertical: number[] } {
  const horizontalPoints: number[] = [];
  const verticalPoints: number[] = [];

  // 水平网格线
  for (
    let x = Math.floor(viewportLeft / gridSize) * gridSize;
    x <= viewportRight;
    x += gridSize
  ) {
    horizontalPoints.push(x);
  }

  // 垂直网格线
  for (
    let y = Math.floor(viewportTop / gridSize) * gridSize;
    y <= viewportBottom;
    y += gridSize
  ) {
    verticalPoints.push(y);
  }

  return { horizontal: horizontalPoints, vertical: verticalPoints };
}

/**
 * 计算元素吸附位置
 */
export function calculateSnappedPosition(
  item: CanvasItem,
  allItems: CanvasItem[],
  selectedItemIds: Set<string>,
  viewportBounds: { left: number; top: number; right: number; bottom: number },
  threshold: number = 10
): { boxLeft: number; boxTop: number } {
  // 初始位置
  let snapLeft = item.boxLeft;
  let snapTop = item.boxTop;

  // 当前元素的边界点
  const itemEdges = {
    left: item.boxLeft,
    right: item.boxLeft + item.boxWidth,
    top: item.boxTop,
    bottom: item.boxTop + item.boxHeight,
    centerX: item.boxLeft + item.boxWidth / 2,
    centerY: item.boxTop + item.boxHeight / 2
  };

  // 收集所有可能的吸附点
  const horizontalSnapPoints: number[] = [];
  const verticalSnapPoints: number[] = [];

  // 添加其他元素的吸附点
  for (const other of allItems) {
    // 跳过自身和其他被选中的元素
    if (other.objid === item.objid || selectedItemIds.has(other.objid)) {
      continue;
    }

    // 其他元素的边界点
    const otherEdges = {
      left: other.boxLeft,
      right: other.boxLeft + other.boxWidth,
      top: other.boxTop,
      bottom: other.boxTop + other.boxHeight,
      centerX: other.boxLeft + other.boxWidth / 2,
      centerY: other.boxTop + other.boxHeight / 2
    };

    // 添加水平吸附点 - 左、中、右对齐
    horizontalSnapPoints.push(otherEdges.left);
    horizontalSnapPoints.push(otherEdges.centerX);
    horizontalSnapPoints.push(otherEdges.right);
    
    // 特殊吸附点 - 左对右、右对左
    horizontalSnapPoints.push(otherEdges.left - item.boxWidth);
    horizontalSnapPoints.push(otherEdges.right);

    // 添加垂直吸附点 - 上、中、下对齐
    verticalSnapPoints.push(otherEdges.top);
    verticalSnapPoints.push(otherEdges.centerY);
    verticalSnapPoints.push(otherEdges.bottom);
    
    // 特殊吸附点 - 上对下、下对上
    verticalSnapPoints.push(otherEdges.top - item.boxHeight);
    verticalSnapPoints.push(otherEdges.bottom);
  }

  // 查找最近的水平吸附点
  const snappedLeft = findNearestSnapPoint(
    itemEdges.left,
    horizontalSnapPoints,
    threshold
  );
  
  // 如果找到了水平吸附点，更新位置
  if (snappedLeft !== itemEdges.left) {
    snapLeft = snappedLeft;
  }

  // 查找最近的垂直吸附点
  const snappedTop = findNearestSnapPoint(
    itemEdges.top,
    verticalSnapPoints,
    threshold
  );
  
  // 如果找到了垂直吸附点，更新位置
  if (snappedTop !== itemEdges.top) {
    snapTop = snappedTop;
  }

  return { boxLeft: snapLeft, boxTop: snapTop };
}

/**
 * 收集选中元素的所有边缘点用于自动吸附显示
 */
export function getSelectionEdgePoints(
  selectedItems: CanvasItem[]
): { horizontal: number[]; vertical: number[] } {
  const horizontalPoints: number[] = [];
  const verticalPoints: number[] = [];

  for (const item of selectedItems) {
    const { horizontal, vertical } = getItemSnapPoints(item);
    horizontalPoints.push(...horizontal);
    verticalPoints.push(...vertical);
  }

  return { horizontal: horizontalPoints, vertical: verticalPoints };
}