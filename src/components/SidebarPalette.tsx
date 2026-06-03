// ============================================================
// SidebarPalette - 左侧组件库面板
// 显示可拖拽到画布的节点类型列表，拖入画布后触发节点创建
// ============================================================

import type { DragEvent } from 'react';

/**
 * 可拖拽节点类型定义
 * - type: 节点类型标识（对应 React Flow 的 nodeTypes 注册 key）
 * - label: 面板中显示的标签文字
 * - icon: 图标符号（用于视觉区分）
 * - disabled: 是否禁用拖拽（第二版功能先做 UI 占位）
 */
interface PaletteItem {
  /** 节点类型标识，拖入画布时通过 event.dataTransfer 传递 */
  type: string;
  /** 面板中显示的中文标签 */
  label: string;
  /** 图标符号 */
  icon: string;
  /** 是否禁用拖拽（尚未实现的功能） */
  disabled: boolean;
  /** 禁用时的提示文字 */
  disabledHint?: string;
}

/**
 * 组件库项目列表
 * - skill: Skill 节点（已实现，可拖拽）
 * - note: 备注节点（第二版实现，当前仅 UI 占位）
 */
const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'skill',
    label: 'Skill 节点',
    icon: 'S',
    disabled: false,
  },
  {
    type: 'note',
    label: '备注节点',
    icon: 'N',
    disabled: true,
    disabledHint: '第二版实现',
  },
];

/**
 * SidebarPalette 组件
 *
 * 功能：
 * 1. 展示可拖拽的节点类型列表
 * 2. 通过 HTML5 Drag API 设置拖拽数据（`application/reactflow`）
 * 3. 禁用的项目仅做 UI 展示，不可拖拽
 *
 * 面板尺寸：宽度约 200px，固定在编辑器左侧
 */
export function SidebarPalette() {
  /**
   * 拖拽开始事件处理
   * 将节点类型标识写入 dataTransfer，供画布 onDrop 读取
   *
   * @param event - React 拖拽事件
   * @param nodeType - 要创建的节点类型字符串（如 'skill'）
   */
  const onDragStart = (event: DragEvent, nodeType: string) => {
    // 设置拖拽数据类型为 application/reactflow，React Flow 约定使用此 MIME 类型
    event.dataTransfer.setData('application/reactflow', nodeType);
    // 设置拖拽效果为"移动"
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar-palette">
      {/* ---- 面板标题 ---- */}
      <div className="sidebar-palette__header">
        <h3 className="sidebar-palette__title">组件库</h3>
        <p className="sidebar-palette__hint">拖拽节点到画布</p>
      </div>

      {/* ---- 可拖拽节点列表 ---- */}
      <div className="sidebar-palette__list">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            className={`sidebar-palette__item${item.disabled ? ' sidebar-palette__item--disabled' : ''}`}
            // 只有非禁用项目才可拖拽
            draggable={!item.disabled}
            onDragStart={(e) => {
              if (!item.disabled) {
                onDragStart(e, item.type);
              }
            }}
            title={item.disabled ? item.disabledHint : `拖拽创建 ${item.label}`}
          >
            {/* 节点图标 */}
            <span className="sidebar-palette__item-icon">{item.icon}</span>
            {/* 节点标签 */}
            <span className="sidebar-palette__item-label">{item.label}</span>
            {/* 禁用提示角标 */}
            {item.disabled && item.disabledHint && (
              <span className="sidebar-palette__item-badge">{item.disabledHint}</span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}