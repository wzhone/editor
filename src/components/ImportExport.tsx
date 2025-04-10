"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore, useItems } from '../state/item';
import { createJSONBlob, downloadBlob, readFileAsText } from '../utils/file';
import { Button } from './ui/button';
import { toast } from 'sonner';


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MenubarItem } from '@radix-ui/react-menubar';
import { MenubarShortcut } from './ui/menubar';
import { CanvasItem } from '@/types';
import { initIdCounter } from '@/utils/idGenerator';
import { useCameraStore } from '@/state/camera';

export function Import({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {

  const fileInputRef = useRef<HTMLInputElement>(null);  
  const items = useCanvasStore()
  const camera = useCameraStore()


  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [fileInputRef.current]);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      try {
        const data = JSON.parse(content);

        if (!data.items || !Array.isArray(data.items)) {
          throw new Error("无效的JSON数据格式");
        }

        // 初始化ID计数器
        initIdCounter(data.items);

        // 设置项目
        items.setItems(data.items);
        const itemsCount = data.items.length;
        camera.resetCamera(); // 回到一开始的相机位置
        toast.success(`成功导入布局数据，包含 ${itemsCount} 个元素`, { position: 'top-center' });
        onOpenChange(false);
      } catch (error) {
        console.error("导入JSON失败:", error);
        toast.error('导入失败：无效的JSON数据格式', { position: 'top-center' });

        return false;
      }
    } catch (err) {
      toast.error(`导入失败：${(err as Error).message}`, { position: 'top-center' });

    } finally {
      // 清除文件输入，以便可以重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 注册全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault(); // 阻止默认打开文件行为
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>导入</DialogTitle>
          <DialogDescription>
            从JSON文件加载之前导出的配置文件或从服务器加载
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 隐藏的文件输入控件 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button onClick={handleImportClick}>从JSON文件导入</Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}

export function Export({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  // 从store获取方法和数据
  const state = useCanvasStore();

  // 注册全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); // 阻止默认行为
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  // 导出到JSON文件
  const handleJSONExport = () => {
    try {
      const items = state.getItems();
      if (items.length === 0) {
        toast.error("没有元素可导出", { position: 'top-center' });
        return;
      }
      const data = {
        items,
        saveTime: Date.now(),
      };
      const timestamp = new Date().toLocaleString().replace(/[/:. ]/g, "-");
      const fileName = `visual-layout-${timestamp}.json`;
      const blob = createJSONBlob(data);
      downloadBlob(blob, fileName);

      toast.success('成功导出为JSON文件', { position: 'top-center' });
      onOpenChange(false);
    } catch (err) {
      toast.error(`导出失败：${(err as Error).message}`, { position: 'top-center' });
    }
  };


  const handleSqlExport = () => {
    try {
      const items = state.getItems();
      if (items.length === 0) {
        toast.error("没有元素可导出", { position: 'top-center' });
        return;
      }
      const sqlStatements = generateSQLStatements(items);
      const blob = new Blob([sqlStatements.join('\n')], {
        type: 'text/plain;charset=utf-8',
      });
      const timestamp = new Date().toLocaleString().replace(/[/:. ]/g, "-");
      const fileName = `scada-export-${timestamp}.sql`;
      downloadBlob(blob, fileName);

      toast.success('成功导出为 SQL 文件', { position: 'top-center' });
      onOpenChange(false);
    } catch (err) {
      toast.error(`导出失败：${(err as Error).message}`, { position: 'top-center' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>导出</DialogTitle>
          <DialogDescription>
            导出当前布局到文件或SQL
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button onClick={handleJSONExport}>导出JSON配置</Button>
          <Button onClick={handleSqlExport}>导出SQL脚本</Button>
          <Label className='text-gray-500 text-xs justify-center'><span>导出的SQL脚本无法再次导入</span></Label>
        </div>
      </DialogContent>
    </Dialog>
  )
}




const fieldMapping: {
  [jsonKey in keyof CanvasItem]: string;
} = {
  objid: 'objid',
  equipId: 'equip_id',
  locId: 'loc_id',
  boxCode: 'box_code',
  boxName: 'box_name',
  boxWidth: 'box_width',
  boxHeight: 'box_height',
  boxLeft: 'box_left',
  boxTop: 'box_top',
  showColor: 'show_color',
  showType: 'show_type',
};

const otherFields: Record<string, any> = {
  loc_id: 0,
  equip_id: 0,
  box_top: 0,
  box_left: 0,
  box_width: 0,
  box_height: 0,
  box_index: 1,
  create_time: () => new Date(),
  update_time: () => new Date(),
  use_flag: 1,
  box_type: 2,
  remark_memo: '立库',
  show_name: '1',
  show_border: null,
  show_code: null,
  warning_code: null,
  warning_name: null,
  parent_id: null
};

// 字符串转义
const escapeValue = (val: any): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return val.toString();
};
export const generateSQLStatements = (items: any[]): string[] => {
  const sqls: string[] = [];

  for (const item of items) {
    const objid = item.objid;
    if (!objid) {
      console.warn(`跳过无 objid 的项:`, item);
      continue;
    }

    const now = new Date();

    // 1. 提取主字段
    const mappedFields: Record<string, any> = Object.fromEntries(
      Object.entries(fieldMapping).map(([jsonKey, dbField]) => [dbField, item[jsonKey]])
    );

    // 2. 提取补充字段（使用当前时间替换函数值）
    const extraFields: Record<string, any> = Object.fromEntries(
      Object.entries(otherFields).map(([key, val]) => [key, typeof val === 'function' ? val() : val])
    );

    // 3. 合并字段（后者会覆盖前者）
    const row: Record<string, any> = {
      objid,
      ...mappedFields,
      ...extraFields,
      update_time: now // 强制更新时间
    };

    const columns = Object.keys(row);
    const values = columns.map(col => escapeValue(row[col]));

    sqls.push(
      `DELETE FROM [dbo].[scada_box] WHERE objid = ${escapeValue(objid)};`,
      `INSERT INTO [dbo].[scada_box] (${columns.join(', ')}) VALUES (${values.join(', ')});`
    );
  }

  return sqls;
};
