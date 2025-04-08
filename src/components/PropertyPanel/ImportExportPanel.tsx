"use client";
import React, { useRef, useState } from 'react';
import { useCanvasStore, useItems } from '../../state/store';
import { readFileAsText } from '../../utils/file';
import { saveLayout, loadLayout } from '../../utils/api';
import { Button } from '../ui/button';
import { toast } from 'sonner';

/**
 * 导入导出面板组件
 * 提供画布数据的导入导出和保存加载功能
 */
const ImportExportPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 从store获取方法和数据
  const {
    exportToJSON,
    importFromJSON,
    clearItems,
    saveToLocalStorage,
    loadFromLocalStorage,
    setItems
  } = useCanvasStore();

  // 获取当前项目数量
  const items = useItems();
  const itemCount = items.length;

  // 显示文件选择对话框
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const content = await readFileAsText(file);
      const success = importFromJSON(content);

      if (success) {
        const store = useCanvasStore.getState();
        const itemsCount = store.getItems().length;
        toast.success(`成功导入布局数据，包含 ${itemsCount} 个元素`);
      } else {
        setError('导入失败：无效的JSON数据格式');
      }
    } catch (err) {
      setError(`导入失败：${(err as Error).message}`);
    } finally {
      setLoading(false);
      // 清除文件输入，以便可以重复选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 导出到JSON文件
  const handleExport = () => {
    if (itemCount === 0) {
      setError('导出失败：没有元素可导出');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      exportToJSON();
      setSuccess('成功导出为JSON文件');
    } catch (err) {
      setError(`导出失败：${(err as Error).message}`);
    }
  };

  // 清空画布
  const handleClear = () => {
    if (itemCount === 0) {
      setError('画布已经是空的');
      return;
    }

    if (window.confirm(`确定要清空画布吗？将删除全部 ${itemCount} 个元素，此操作不可恢复。`)) {
      clearItems();
      setSuccess('画布已清空');
      setError(null);
    }
  };

  // 保存到LocalStorage
  const handleSaveToLocalStorage = () => {
    if (itemCount === 0) {
      setError('保存失败：没有元素可保存');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const result = saveToLocalStorage();
      if (result) {
        setSuccess(`成功保存 ${itemCount} 个元素到本地存储`);
      } else {
        setError('保存到本地存储失败');
      }
    } catch (err) {
      setError(`保存失败：${(err as Error).message}`);
    }
  };

  // 从LocalStorage加载
  const handleLoadFromLocalStorage = () => {
    setError(null);
    setSuccess(null);

    try {
      const result = loadFromLocalStorage();
      if (result) {
        const store = useCanvasStore.getState();
        const itemsCount = store.getItems().length;
        setSuccess(`成功从本地存储加载 ${itemsCount} 个元素`);
      } else {
        setError('本地存储中没有找到保存的数据');
      }
    } catch (err) {
      setError(`加载失败：${(err as Error).message}`);
    }
  };

  // 保存布局到服务器
  const handleSaveToServer = async () => {
    if (items.length === 0) {
      toast.warning('没有元素可保存');
      return;
    }

    setLoading(true);
    try {
      const response = await saveLayout(items);
      if (response.success) {
        toast.success('保存成功');
        setSuccess('布局保存到服务器成功');
      } else {
        toast.error(`保存失败: ${response.error}`);
        setError(`保存到服务器失败: ${response.error}`);
      }
    } catch (error) {
      toast.error(`保存失败: ${(error as Error).message}`);
      setError(`保存到服务器失败: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // 从服务器加载布局
  const handleLoadFromServer = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await loadLayout();

      // 检查数据完整性和正确性
      data.forEach((item) => {
        if (!item.objid) {
          throw new Error('数据不完整：缺少 objid');
        }

        // 限定showType
        if (item.showType !== 'rectangle' && item.showType !== 'ellipse') {
          throw new Error(
            '数据不完整：showType 只能为 rectangle 或 ellipse'
          )
        }
      })

      // 设置数据到store
      setItems(data);

      toast.success('布局加载成功');
      setSuccess(`成功从服务器加载 ${data.length} 个元素`);
    } catch (error) {
      toast.error(`加载失败: ${(error as Error).message}`);
      setError(`从服务器加载失败: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium text-lg mb-2">数据导入导出</h3>

      {/* 错误和成功消息 */}
      {error && (
        <div className="p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2 bg-green-50 text-green-600 rounded text-sm">
          {success}
        </div>
      )}

      {/* 当前状态 */}
      <div className="p-2 bg-gray-50 rounded">
        <div className="text-sm">当前元素数量：<span className="font-bold">{itemCount}</span></div>
      </div>

      {/* 文件操作按钮组 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">文件操作</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleImportClick}
            disabled={loading}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            {loading ? '导入中...' : '导入'}
          </Button>

          <Button
            onClick={handleExport}
            disabled={itemCount === 0 || loading}
            className="bg-green-500 text-white hover:bg-green-600"
          >
            导出
          </Button>
        </div>
      </div>

      {/* 本地存储操作按钮组 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">本地存储</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleSaveToLocalStorage}
            disabled={itemCount === 0 || loading}
            className="bg-indigo-500 text-white hover:bg-indigo-600"
          >
            保存到本地
          </Button>

          <Button
            onClick={handleLoadFromLocalStorage}
            disabled={loading}
            className="bg-purple-500 text-white hover:bg-purple-600"
          >
            从本地加载
          </Button>
        </div>
      </div>

      {/* 服务器操作按钮组 */}
      {/* <div className="space-y-3">
        <h4 className="text-sm font-medium">服务器操作</h4>
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={handleSaveToServer}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading ? '处理中...' : '保存到服务器'}
          </Button>

          <Button
            onClick={handleLoadFromServer}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading ? '处理中...' : '从服务器加载'}
          </Button>
        </div>
      </div> */}

      {/* 其他操作 */}
      <div className="pt-2">
        <Button
          onClick={handleClear}
          disabled={itemCount === 0 || loading}
          className="w-full bg-red-500 text-white hover:bg-red-600"
        >
          清空画布
        </Button>
      </div>

      {/* 隐藏的文件输入控件 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 说明文字 */}
      <div className="text-xs text-gray-500 mt-4">
        <p className="mb-1">• 导出的JSON文件可以保存为备份，或分享给其他人</p>
        <p className="mb-1">• 服务器保存需要连接到后端API服务</p>
      </div>
    </div>
  );
};

export default ImportExportPanel;