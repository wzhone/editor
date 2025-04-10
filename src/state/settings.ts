import { create } from "zustand";

const initialState = {
  fastMode: false,
  autoMag: true,
  showBoxCode: false,
  showEquipId: false,
  showBoxName: false,
  gridSize: 50,
};

interface SettingsStore {
  fastMode: boolean;
  autoMag: boolean;
  showBoxCode: boolean;
  showEquipId: boolean;
  showBoxName: boolean;
  gridSize: number;

  updateSettings: (settings: Partial<typeof initialState>) => void;
}

export const useSettingStore = create<SettingsStore>((set, get) => {
  return {
    ...initialState,

    // 更新设置
    updateSettings: (newSettings: Partial<typeof initialState>) =>
      set((state) => ({
        ...state,
        ...newSettings,
      })),
  };
});
