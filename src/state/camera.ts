import { create } from "zustand";
import { Point } from "../types";

const initialState = {
  camera: {
    position: {
      x: 0,
      y: 0,
    },
    zoom: 1,
  },

  dimension: {
    width: 0,
    height: 0,
  },
};

interface CameraStore {
  camera: typeof initialState.camera;
  dimension: typeof initialState.dimension;

  resetCamera: () => void;
  updateCamera: (camera: Partial<typeof initialState.camera>) => void;
  updateCameraPosition: (position: Point, zoom: number) => void;
  updateDimension: (width: number, height: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useCameraStore = create<CameraStore>((set, get) => {
  return {
    ...initialState,

    // 更新相机
    updateCamera: (newCamera) =>
      set((state) => ({
        camera: { ...state.camera, ...newCamera },
      })),

    updateCameraPosition: (position, zoom) => {
      get().updateCamera({
        position: {
          x: position.x,
          y: position.y,
        },
        zoom,
      });
    },

    updateDimension: (width, height) =>
      set(() => ({
        dimension: { width, height },
      })),

    resetCamera: () =>
      set({
        camera: { position: { x: 0, y: 0 }, zoom: 1 },
      }),

    zoomIn() {
      const oldScale = get().camera.zoom;
      const newScale = Math.min(oldScale * 1.2, 5);

      // 获取视口中心点的屏幕坐标
      const viewportCenterX = get().dimension.width / 2;
      const viewportCenterY = get().dimension.height / 2;

      // 计算视口中心在世界坐标系统中的位置
      const worldCenterX =
        (viewportCenterX + get().camera.position.x) / oldScale;
      const worldCenterY =
        (viewportCenterY + get().camera.position.y) / oldScale;

      // 计算新的相机位置，使缩放中心保持在视口中心
      const newPositionX = worldCenterX * newScale - viewportCenterX;
      const newPositionY = worldCenterY * newScale - viewportCenterY;

      get().updateCamera({
        position: {
          x: newPositionX,
          y: newPositionY,
        },
        zoom: newScale,
      });
    },

    zoomOut() {
      const oldScale = get().camera.zoom;
      const newScale = Math.max(oldScale / 1.2, 0.2);

      // 获取视口中心点的屏幕坐标
      const viewportCenterX = get().dimension.width / 2;
      const viewportCenterY = get().dimension.height / 2;

      // 计算视口中心在世界坐标系统中的位置
      const worldCenterX =
        (viewportCenterX + get().camera.position.x) / oldScale;
      const worldCenterY =
        (viewportCenterY + get().camera.position.y) / oldScale;

      // 计算新的相机位置，使缩放中心保持在视口中心
      const newPositionX = worldCenterX * newScale - viewportCenterX;
      const newPositionY = worldCenterY * newScale - viewportCenterY;

      get().updateCamera({
        position: {
          x: newPositionX,
          y: newPositionY,
        },
        zoom: newScale,
      });
    },

    // ---
  };
});
