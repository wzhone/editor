import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { useState } from "react"
import { Import, Export } from "./ImportExport"
import { useSettingStore } from "@/state/settings";
import { Menu } from "lucide-react";
import { FindItemDialog } from "./Canvas/FindItem";


export default function MenubarDemo() {

  const settings = useSettingStore();

  // 切换设置
  const handleToggleSetting = (setting: string, value?: boolean) => {
    settings.updateSettings({
      [setting]: value !== undefined ? value : !settings[setting as keyof typeof settings]
    });
  };
  const handleDefaultSetting = () => {
    settings.updateSettings({
      fastMode: false,
      autoMag: true,
      showBoxCode: false,
      showEquipId: false,
      showBoxName: false,
    });
  }


  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [findOpen, setFindOpen] = useState(false)

  return (
    <div>
      <Import open={importOpen} onOpenChange={setImportOpen} />
      <Export open={exportOpen} onOpenChange={setExportOpen} />
      <FindItemDialog open={findOpen} onOpenChange={setFindOpen} />
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>文件</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setImportOpen(true)}>
              导入<MenubarShortcut>Ctrl+O</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => setExportOpen(true)}>
              导出<MenubarShortcut>Ctrl+S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />

          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>操作</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setFindOpen(true)}>
              查找<MenubarShortcut>Ctrl+F</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>设置</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={settings.fastMode}
              onCheckedChange={() => handleToggleSetting('fastMode')}>快速插入模式</MenubarCheckboxItem>
            <MenubarCheckboxItem checked={settings.autoMag}
              onCheckedChange={() => handleToggleSetting('autoMag')}>自动吸附</MenubarCheckboxItem>
            <MenubarCheckboxItem checked={settings.showBoxCode}
              onCheckedChange={() => handleToggleSetting('showBoxCode')}>显示 Box Code</MenubarCheckboxItem>
            <MenubarCheckboxItem checked={settings.showEquipId}
              onCheckedChange={() => handleToggleSetting('showEquipId')}>显示 Equip ID</MenubarCheckboxItem>
            <MenubarCheckboxItem checked={settings.showBoxName}
              onCheckedChange={() => handleToggleSetting('showBoxName')}>显示 Box Name</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarCheckboxItem
              onCheckedChange={() => handleDefaultSetting()}>重置默认设置</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>关于</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Powered by wzh
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  )
}
