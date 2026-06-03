// ============================================================
// RuleBlockList - 规则块列表组件
//
// 用于节点的规则块管理。
// 每条规则块包含：类型下拉选择器 + 内容文本框 + 删除按钮。
//
// Props：
//   rules    - 当前规则块列表（RuleBlock 数组）
//   onChange - 规则列表变更回调
//
// 支持的规则类型：
//   require / forbid / check / tool / handoff / guard / fallback / ref
// ============================================================

import { useCallback } from 'react';
import type { RuleBlock } from '../types';

/** RuleBlockList 组件 Props */
interface RuleBlockListProps {
  /** 当前规则块列表 */
  rules: RuleBlock[];
  /** 规则列表变更回调 */
  onChange: (rules: RuleBlock[]) => void;
}

/**
 * 规则类型选项定义
 * 包含类型值与中文显示标签
 */
const RULE_TYPES: { value: string; label: string }[] = [
  { value: 'require', label: '必须满足' },
  { value: 'forbid', label: '禁止行为' },
  { value: 'check', label: '需要检查' },
  { value: 'tool', label: '可用工具' },
  { value: 'handoff', label: '交接规则' },
  { value: 'guard', label: '守卫条件' },
  { value: 'fallback', label: '回退策略' },
  { value: 'ref', label: '引用规则' },
];

/**
 * RuleBlockList 规则块列表组件
 *
 * 功能：
 * - 每条规则块显示类型下拉 + 内容文本框 + 删除按钮
 * - 底部"添加规则块"按钮创建默认规则 { type: 'require', content: '' }
 * - 所有变更通过 onChange 回调通知父组件
 */
export function RuleBlockList({ rules, onChange }: RuleBlockListProps) {
  /**
   * 更新规则块类型
   * @param index - 规则块索引
   * @param type  - 新的规则类型
   */
  const handleTypeChange = useCallback(
    (index: number, type: string) => {
      const newRules = rules.map((rule, i) =>
        i === index ? { ...rule, type } : rule,
      );
      onChange(newRules);
    },
    [rules, onChange],
  );

  /**
   * 更新规则块内容
   * @param index   - 规则块索引
   * @param content - 新的规则内容
   */
  const handleContentChange = useCallback(
    (index: number, content: string) => {
      const newRules = rules.map((rule, i) =>
        i === index ? { ...rule, content } : rule,
      );
      onChange(newRules);
    },
    [rules, onChange],
  );

  /**
   * 删除指定规则块
   * @param index - 规则块索引
   */
  const handleRemove = useCallback(
    (index: number) => {
      onChange(rules.filter((_, i) => i !== index));
    },
    [rules, onChange],
  );

  /** 添加新规则块（默认类型为 require） */
  const handleAdd = useCallback(() => {
    onChange([...rules, { type: 'require', content: '' }]);
  }, [rules, onChange]);

  return (
    <div className="rule-block-list">
      {/* 规则块标题 */}
      <label className="rule-block-list__label">规则约束</label>

      {/* 规则块列表 */}
      <div className="rule-block-list__items">
        {rules.map((rule, index) => (
          <div key={index} className="rule-block-list__item">
            {/* 规则块头部：类型下拉 + 删除按钮 */}
            <div className="rule-block-list__item-header">
              <select
                className="rule-block-list__type-select"
                value={rule.type}
                onChange={(e) => handleTypeChange(index, e.target.value)}
              >
                {RULE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
              {/* 删除按钮 */}
              <button
                type="button"
                className="rule-block-list__remove-btn"
                onClick={() => handleRemove(index)}
                title="删除此规则块"
              >
                &#10005;
              </button>
            </div>

            {/* 规则内容文本框（2行） */}
            <textarea
              className="rule-block-list__content-input"
              value={rule.content}
              placeholder="输入规则内容（Markdown 格式）"
              rows={2}
              onChange={(e) => handleContentChange(index, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* 添加规则块按钮 */}
      <button
        type="button"
        className="rule-block-list__add-btn"
        onClick={handleAdd}
        title="添加新规则块"
      >
        + 添加规则块
      </button>
    </div>
  );
}