"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";

/**
 * 颜色选择器组件属性
 */
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

// 预定义的颜色选项
export const COLOR_PRESETS = [
  { name: '钢蓝色', value: '#4682B4' },
  { name: '海洋绿', value: '#2E8B57' },
  { name: '砖红色', value: '#B22222' },
  { name: '金色', value: '#FFD700' },
  { name: '深兰花紫', value: '#9932CC' },
  { name: '深橙色', value: '#FF8C00' },
  { name: '浅海洋绿', value: '#20B2AA' },
  { name: '印度红', value: '#CD5C5C' }
];

/**
 * 颜色选择器组件
 * 支持预设颜色、颜色输入和颜色选择器
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  disabled = false
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [inputColor, setInputColor] = useState(color);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 同步外部颜色变化
  useEffect(() => {
    setInputColor(color);
  }, [color]);

  // 处理输入框变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputColor(value);

    // 验证是否为有效颜色（简单验证十六进制格式）
    if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
      onChange(value);
    }
  };

  // 处理输入框失焦
  const handleInputBlur = () => {
    // 如果输入的颜色无效，恢复原来的颜色
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(inputColor)) {
      setInputColor(color);
    } else {
      onChange(inputColor);
    }
  };

  // 处理预设颜色选择
  const handleColorPresetClick = (presetColor: string) => {
    onChange(presetColor);
    setShowColorPicker(false);
  };

  // 处理点击外部关闭颜色选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${disabled ? 'opacity-50' : ''}`} ref={pickerRef}>
      <div className="flex items-center">
        {/* 颜色预览 */}
        <div
          className={`w-8 h-8 border cursor-pointer rounded ${disabled ? 'cursor-not-allowed' : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => !disabled && setShowColorPicker(!showColorPicker)}
        />

        {/* 颜色输入框 */}
        <Input
          value={inputColor}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          className={`ml-2 flex-1 px-2 py-1 border rounded text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          placeholder="#RRGGBB"
        />
      </div>

      {/* 颜色选择面板 */}
      {showColorPicker && !disabled && (
        <div className="absolute z-10 mt-2 p-2 bg-white rounded shadow-lg border">
          {/* 预设颜色格子 */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {COLOR_PRESETS.map((colorPreset) => (
              <div
                key={colorPreset.value}
                className="w-6 h-6 border cursor-pointer rounded hover:scale-110 transition-transform"
                style={{ backgroundColor: colorPreset.value }}
                title={colorPreset.name}
                onClick={() => handleColorPresetClick(colorPreset.value)}
              />
            ))}
          </div>

          {/* 操作栏 */}
          <div className="mt-4 pt-2 border-t flex justify-between">
            <button
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => setShowColorPicker(false)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;