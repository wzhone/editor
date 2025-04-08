"use client";
import React, { useState, useEffect, useRef } from 'react';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

/**
 * 性能监视器组件
 * 用于在屏幕上显示FPS和渲染时间信息，帮助开发时监控性能
 */
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ enabled = true }) => {
  const [fps, setFps] = useState<number>(0);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  
  // 最近30帧的渲染时间记录
  const maxFrameHistory = 30;
  
  useEffect(() => {
    if (!enabled) return;
    
    let animationFrameId: number;
    
    const updateStats = () => {
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      
      // 更新帧计数器
      frameCountRef.current++;
      
      // 记录这一帧的渲染时间
      const frameTime = elapsed;
      frameTimesRef.current.push(frameTime);
      
      // 保持历史记录在指定长度内
      if (frameTimesRef.current.length > maxFrameHistory) {
        frameTimesRef.current.shift();
      }
      
      // 每秒更新一次统计数据
      if (elapsed >= 1000) {
        // 计算FPS
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        
        // 计算平均渲染时间
        const averageRenderTime = frameTimesRef.current.reduce((sum, time) => sum + time, 0) / 
                                  frameTimesRef.current.length;
        setRenderTime(Math.round(averageRenderTime * 100) / 100);
        
        // 尝试获取内存使用情况（仅Chrome支持）
        if (window.performance && (performance as any).memory) {
          const memory = (performance as any).memory;
          setMemoryUsage(Math.round(memory.usedJSHeapSize / (1024 * 1024)));
        }
        
        // 重置计数器
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      animationFrameId = requestAnimationFrame(updateStats);
    };
    
    animationFrameId = requestAnimationFrame(updateStats);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);
  
  if (!enabled) return null;
  
  return (
    <div className="fixed top-0 right-0 m-2 p-2 bg-black bg-opacity-75 text-white rounded text-xs z-50 font-mono">
      <div>FPS: <span className={fps < 30 ? 'text-red-400' : fps < 55 ? 'text-yellow-400' : 'text-green-400'}>
        {fps}
      </span></div>
      <div>渲染时间: <span className={renderTime > 16 ? 'text-red-400' : 'text-green-400'}>
        {renderTime.toFixed(2)} ms
      </span></div>
      {memoryUsage !== null && (
        <div>内存: {memoryUsage} MB</div>
      )}
    </div>
  );
};

export default PerformanceMonitor;