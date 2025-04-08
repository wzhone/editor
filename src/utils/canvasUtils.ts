import { CanvasItem, Point, Rect } from "../types";

/**
 * 判断点是否在矩形内
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 判断点是否在椭圆内
 */
export function isPointInEllipse(
  point: Point,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): boolean {
  const dx = (point.x - centerX) / radiusX;
  const dy = (point.y - centerY) / radiusY;
  return dx * dx + dy * dy <= 1;
}

/**
 * 判断矩形是否相交
 */
export function doRectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    a.x >= b.x + b.width ||
    a.y + a.height <= b.y ||
    a.y >= b.y + b.height
  );
}

/**
 * 检查矩形是否与元素相交
 */
export function rectIntersectsItem(rect: Rect, item: CanvasItem): boolean {
  const itemRect: Rect = {
    x: item.boxLeft,
    y: item.boxTop,
    width: item.boxWidth,
    height: item.boxHeight
  };

  return doRectsIntersect(rect, itemRect);
}

/**
 * 判断点是否在项目内部
 */
export function isPointInItem(point: Point, item: CanvasItem): boolean {
  if (item.showType === "ellipse") {
    const centerX = item.boxLeft + item.boxWidth / 2;
    const centerY = item.boxTop + item.boxHeight / 2;
    const radiusX = item.boxWidth / 2;
    const radiusY = item.boxHeight / 2;
    return isPointInEllipse(point, centerX, centerY, radiusX, radiusY);
  } else {
    return isPointInRect(point, {
      x: item.boxLeft,
      y: item.boxTop,
      width: item.boxWidth,
      height: item.boxHeight
    });
  }
}

/**
 * 计算是否在视口内
 * 用于裁剪视口外的项目，提高渲染性能
 */
export function isItemInViewport(
  item: CanvasItem,
  viewportLeft: number,
  viewportTop: number,
  viewportRight: number,
  viewportBottom: number
): boolean {
  const itemRight = item.boxLeft + item.boxWidth;
  const itemBottom = item.boxTop + item.boxHeight;

  return !(
    itemRight < viewportLeft ||
    item.boxLeft > viewportRight ||
    itemBottom < viewportTop ||
    item.boxTop > viewportBottom
  );
}

/**
 * 清除画布
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * 绘制网格
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewportLeft: number,
  viewportTop: number,
  viewportRight: number,
  viewportBottom: number,
  gridSize: number,
  zoom: number,
  color: string = "#aaaaaa",
  opacity: number = 0.2
): void {
  // 计算网格起始位置（对齐到网格）
  const startX = Math.floor(viewportLeft / gridSize) * gridSize;
  const startY = Math.floor(viewportTop / gridSize) * gridSize;

  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();

  // 绘制垂直线
  for (let x = startX; x <= viewportRight; x += gridSize) {
    ctx.moveTo(x, viewportTop);
    ctx.lineTo(x, viewportBottom);
  }

  // 绘制水平线
  for (let y = startY; y <= viewportBottom; y += gridSize) {
    ctx.moveTo(viewportLeft, y);
    ctx.lineTo(viewportRight, y);
  }

  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

/**
 * 绘制矩形
 */
export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number
): void {
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fill();
  ctx.stroke();
}

/**
 * 绘制椭圆
 */
export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  fillStyle: string,
  strokeStyle: string,
  lineWidth: number
): void {
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * 绘制文本
 */
export function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  fontFamily: string = "Arial"
): void {
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y, maxWidth);
}

/**
 * 绘制选择框
 */
export function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  strokeStyle: string = "#0066cc",
  fillStyle: string = "rgba(0, 102, 204, 0.1)",
  lineWidth: number = 1,
  dashPattern: number[] = [5, 5]
): void {
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  
  // 绘制填充矩形
  ctx.fillRect(x, y, width, height);
  
  // 绘制虚线边框
  ctx.setLineDash(dashPattern);
  ctx.strokeRect(x, y, width, height);
  ctx.setLineDash([]);
}

/**
 * 优化渲染 - 仅渲染视口内的项目
 */
export function getVisibleItems(
  items: CanvasItem[],
  viewportLeft: number,
  viewportTop: number,
  viewportRight: number,
  viewportBottom: number
): CanvasItem[] {
  return items.filter(item => 
    isItemInViewport(item, viewportLeft, viewportTop, viewportRight, viewportBottom)
  );
}

/**
 * 客户端坐标转换为画布世界坐标
 */
export function clientToWorldPosition(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  cameraPosition: Point,
  zoom: number
): Point {
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;
  
  return {
    x: (canvasX - cameraPosition.x) / zoom,
    y: (canvasY - cameraPosition.y) / zoom,
  };
}

/**
 * 世界坐标转换为客户端坐标
 */
export function worldToClientPosition(
  worldX: number,
  worldY: number,
  canvasRect: DOMRect,
  cameraPosition: Point,
  zoom: number
): Point {
  return {
    x: worldX * zoom + cameraPosition.x + canvasRect.left,
    y: worldY * zoom + cameraPosition.y + canvasRect.top,
  };
}

/**
 * 根据当前缩放级别计算适当的文字大小，以保持可读性
 */
export function getScaledFontSize(baseFontSize: number, zoom: number): number {
  return baseFontSize / zoom;
}