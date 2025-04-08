"use client";
import React from 'react';
import './globals.css';
import { Toaster } from "sonner";

/**
 * Next.js应用入口组件
 * 初始化应用程序
 */
export default function VisualLayoutEditorApp({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <head>
        <title>可视化编辑器</title>
        <meta name="description" content="基于Web的可视化布局编辑器，用于创建和管理布局元素" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <Toaster position="top-right" expand={true} richColors />
        {children}
      </body>
    </html>
  );
}