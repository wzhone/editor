// src/utils/collision.ts
import { CanvasItem, Point, Rect } from "../types";

/**
 * 碰撞检测器类
 * 负责处理元素之间的碰撞和磁性吸附
 */
export class CollisionDetector {
  private canvasWidth: number;
  private canvasHeight: number;
  private items: CanvasItem[] = [];
  private itemsMap: Map<string, CanvasItem> | null = null;

  /**
   * 创建碰撞检测器
   * @param width 画布宽度
   * @param height 画布高度
   */
  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * 重置检测器中的项目
   * @param items 画布元素列表
   */
  reset(items: CanvasItem[]): void {
    this.items = [...items];
    this.itemsMap = new Map(items.map((item) => [item.objid, item]));
  }

  /**
   * 更新画布尺寸
   * @param width 新宽度
   * @param height 新高度
   */
  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /**
   * 检测元素之间的碰撞
   * @param item 要检测的元素
   * @param excludeIds 要排除的元素ID数组
   */
  detectCollision(
    item: Omit<CanvasItem, "objid">,
    excludeIds: string[] = []
  ): CanvasItem | null {
    const itemRect: Rect = {
      x: item.boxLeft,
      y: item.boxTop,
      width: item.boxWidth,
      height: item.boxHeight,
    };

    // 为排除ID创建集合，提高查找效率
    const excludeSet = new Set(excludeIds);

    // 遍历所有元素检查碰撞
    for (const other of this.items) {
      if (excludeSet.has(other.objid)) continue;

      const otherRect: Rect = {
        x: other.boxLeft,
        y: other.boxTop,
        width: other.boxWidth,
        height: other.boxHeight,
      };

      if (this.rectsIntersect(itemRect, otherRect)) {
        return other;
      }
    }

    return null;
  }

  /**
   * 检查两个矩形是否相交
   */
  private rectsIntersect(a: Rect, b: Rect): boolean {
    return !(
      a.x + a.width <= b.x ||
      a.x >= b.x + b.width ||
      a.y + a.height <= b.y ||
      a.y >= b.y + b.height
    );
  }

  /**
   * 计算磁性吸附位置
   * @param item 要吸附的元素
   * @param threshold 吸附阈值
   * @param gridSize 网格尺寸，如果提供则同时启用网格吸附
   * @param excludeIds 要排除的元素ID数组
   */
  calculateSnapPosition(
    item: Omit<CanvasItem, "objid">,
    threshold: number = 10,
    gridSize?: number,
    excludeIds: string[] = []
  ): { boxLeft: number; boxTop: number } {
    // 当前位置
    let snapX = item.boxLeft;
    let snapY = item.boxTop;

    // 获取当前元素的边缘位置
    const left = item.boxLeft;
    const right = item.boxLeft + item.boxWidth;
    const top = item.boxTop;
    const bottom = item.boxTop + item.boxHeight;

    // 创建排除ID集合
    const excludeSet = new Set(excludeIds);

    // 获取附近元素
    const nearbyItems = this.getNearbyItems(item, threshold, excludeIds);

    // 如果没有附近元素且不需要网格吸附，直接返回原位置
    if (nearbyItems.length === 0 && !gridSize) {
      return { boxLeft: left, boxTop: top };
    }

    // 查找最近的吸附位置
    let minDistX = threshold + 1;
    let minDistY = threshold + 1;

    // 遍历附近元素寻找吸附点
    for (const other of nearbyItems) {
      const otherLeft = other.boxLeft;
      const otherRight = other.boxLeft + other.boxWidth;
      const otherTop = other.boxTop;
      const otherBottom = other.boxTop + other.boxHeight;

      // 检查水平对齐
      this.checkAlign(left, otherLeft, threshold, (dist) => {
        if (dist < minDistX) {
          minDistX = dist;
          snapX = otherLeft;
        }
      });

      this.checkAlign(right, otherRight, threshold, (dist) => {
        if (dist < minDistX) {
          minDistX = dist;
          snapX = otherRight - item.boxWidth;
        }
      });

      this.checkAlign(left, otherRight, threshold, (dist) => {
        if (dist < minDistX) {
          minDistX = dist;
          snapX = otherRight;
        }
      });

      this.checkAlign(right, otherLeft, threshold, (dist) => {
        if (dist < minDistX) {
          minDistX = dist;
          snapX = otherLeft - item.boxWidth;
        }
      });

      // 检查水平居中对齐
      const itemCenterX = left + item.boxWidth / 2;
      const otherCenterX = otherLeft + other.boxWidth / 2;
      this.checkAlign(itemCenterX, otherCenterX, threshold, (dist) => {
        if (dist < minDistX) {
          minDistX = dist;
          snapX = otherCenterX - item.boxWidth / 2;
        }
      });

      // 检查垂直对齐
      this.checkAlign(top, otherTop, threshold, (dist) => {
        if (dist < minDistY) {
          minDistY = dist;
          snapY = otherTop;
        }
      });

      this.checkAlign(bottom, otherBottom, threshold, (dist) => {
        if (dist < minDistY) {
          minDistY = dist;
          snapY = otherBottom - item.boxHeight;
        }
      });

      this.checkAlign(top, otherBottom, threshold, (dist) => {
        if (dist < minDistY) {
          minDistY = dist;
          snapY = otherBottom;
        }
      });

      this.checkAlign(bottom, otherTop, threshold, (dist) => {
        if (dist < minDistY) {
          minDistY = dist;
          snapY = otherTop - item.boxHeight;
        }
      });

      // 检查垂直居中对齐
      const itemCenterY = top + item.boxHeight / 2;
      const otherCenterY = otherTop + other.boxHeight / 2;
      this.checkAlign(itemCenterY, otherCenterY, threshold, (dist) => {
        if (dist < minDistY) {
          minDistY = dist;
          snapY = otherCenterY - item.boxHeight / 2;
        }
      });
    }

    // 应用网格吸附（如果启用）
    if (gridSize && gridSize > 0) {
      // 只在没有元素吸附时应用网格吸附
      if (minDistX > threshold) {
        snapX = Math.round(snapX / gridSize) * gridSize;
      }

      if (minDistY > threshold) {
        snapY = Math.round(snapY / gridSize) * gridSize;
      }
    }
    return { boxLeft: snapX, boxTop: snapY };
  }

  /**
   * 检查两个位置是否在阈值范围内可以对齐
   */
  private checkAlign(
    pos1: number,
    pos2: number,
    threshold: number,
    callback: (distance: number) => void
  ): void {
    const distance = Math.abs(pos1 - pos2);
    if (distance <= threshold) {
      callback(distance);
    }
  }

  /**
   * 获取附近的元素
   */
  private getNearbyItems(
    item: Omit<CanvasItem, "objid">,
    threshold: number,
    excludeIds: string[] = []
  ): CanvasItem[] {
    const excludeSet = new Set(excludeIds);

    return this.items.filter((other) => {
      if (excludeSet.has(other.objid)) return false;

      // 快速检查是否在大致范围内（优化性能）
      const maxDistance = threshold * 2;
      const otherLeft = other.boxLeft;
      const otherRight = other.boxLeft + other.boxWidth;
      const otherTop = other.boxTop;
      const otherBottom = other.boxTop + other.boxHeight;

      // 检查两个矩形中心的距离
      const centerDeltaX = Math.abs(
        item.boxLeft + item.boxWidth / 2 - (otherLeft + other.boxWidth / 2)
      );
      const centerDeltaY = Math.abs(
        item.boxTop + item.boxHeight / 2 - (otherTop + other.boxHeight / 2)
      );

      if (
        centerDeltaX > (item.boxWidth + other.boxWidth) / 2 + maxDistance ||
        centerDeltaY > (item.boxHeight + other.boxHeight) / 2 + maxDistance
      ) {
        return false;
      }

      // 检查是否在阈值范围内
      return (
        Math.abs(item.boxLeft - otherLeft) <= threshold ||
        Math.abs(item.boxLeft + item.boxWidth - otherRight) <= threshold ||
        Math.abs(item.boxLeft - otherRight) <= threshold ||
        Math.abs(item.boxLeft + item.boxWidth - otherLeft) <= threshold ||
        Math.abs(item.boxTop - otherTop) <= threshold ||
        Math.abs(item.boxTop + item.boxHeight - otherBottom) <= threshold ||
        Math.abs(item.boxTop - otherBottom) <= threshold ||
        Math.abs(item.boxTop + item.boxHeight - otherTop) <= threshold
      );
    });
  }

  /**
   * 查找与给定矩形相交的所有元素
   * @param rect 矩形区域
   * @param fullOverlap 是否要求完全包含（默认为false，即只需要相交）
   */
  findItemsInRect(rect: Rect, fullOverlap: boolean = false): CanvasItem[] {
    return this.items.filter((item) => {
      const itemRect = {
        x: item.boxLeft,
        y: item.boxTop,
        width: item.boxWidth,
        height: item.boxHeight,
      };

      if (fullOverlap) {
        // 要求矩形完全包含元素
        return (
          itemRect.x >= rect.x &&
          itemRect.y >= rect.y &&
          itemRect.x + itemRect.width <= rect.x + rect.width &&
          itemRect.y + itemRect.height <= rect.y + rect.height
        );
      } else {
        // 只要求相交
        return this.rectsIntersect(rect, itemRect);
      }
    });
  }
}
