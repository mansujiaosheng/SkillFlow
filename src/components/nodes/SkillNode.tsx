// ============================================================
// SkillNode - 自定义 Skill 节点组件
// 显示在 React Flow 画布上的可视化节点，包含名称、描述、输入/输出句柄
// ============================================================

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SkillNodeData } from '../../types';

/**
 * SkillNode 自定义节点
 *
 * 布局结构（从上到下）：
 *   - 顶部类型标签（蓝色背景条）
 *   - 中间技能名称（粗体大字）
 *   - 底部描述摘要（小字、单行截断）
 *
 * 句柄：
 *   - 左侧：Target Handle（接收来自其他节点的连线）
 *   - 右侧：Source Handle（从本节点向外连线）
 *
 * 选中态：边框变为蓝色高亮（React Flow 自动添加 .selected class）
 */
export function SkillNode({ data, selected }: NodeProps) {
  // 从 data 中解构 SkillNodeData 的字段
  // React Flow 的 data 类型是 Record<string, unknown>，需要通过 unknown 中间转换
  const { name, description } = data as unknown as SkillNodeData;

  return (
    <div className={`skill-node ${selected ? 'skill-node--selected' : ''}`}>
      {/* ---- 顶部类型标签 ---- */}
      <div className="skill-node__header">
        <span className="skill-node__type-badge">Skill 节点</span>
      </div>

      {/* ---- 中间技能名称 ---- */}
      <div className="skill-node__body">
        <h3 className="skill-node__name">{name || '未命名 Skill'}</h3>
      </div>

      {/* ---- 底部描述摘要（单行截断） ---- */}
      {description && (
        <div className="skill-node__footer">
          <p className="skill-node__description">{description}</p>
        </div>
      )}

      {/* ---- 左侧输入句柄（接收连线） ---- */}
      <Handle
        type="target"
        position={Position.Left}
        className="skill-node__handle skill-node__handle--target"
      />

      {/* ---- 右侧输出句柄（发出连线） ---- */}
      <Handle
        type="source"
        position={Position.Right}
        className="skill-node__handle skill-node__handle--source"
      />
    </div>
  );
}