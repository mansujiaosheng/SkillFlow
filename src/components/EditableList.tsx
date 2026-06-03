// ============================================================
// EditableList - 可增删列表组件
//
// 用于 inputs、outputs、steps、checks、fallbacks、
// whenToUse、whenNotToUse、tools、references、handoffData
// 等字段的可增删编辑。
//
// Props：
//   items       - 当前列表项（字符串数组）
//   onChange    - 列表变更回调，父组件负责更新状态
//   placeholder - 输入框占位文字，默认为 "输入内容..."
//   label       - 列表标签（显示在顶部，可选）
// ============================================================

import { useCallback } from 'react';

/** EditableList 组件 Props */
interface EditableListProps {
  /** 当前列表项（字符串数组） */
  items: string[];
  /** 列表变更回调：每次增删后通知父组件 */
  onChange: (items: string[]) => void;
  /** 输入框占位文字 */
  placeholder?: string;
  /** 列表标签（显示在顶部） */
  label?: string;
}

/**
 * EditableList 可增删列表组件
 *
 * 功能：
 * - 每行显示一个文本输入框 + 删除按钮
 * - 底部有"添加"按钮，点击添加空字符串项
 * - 所有变更通过 onChange 回调通知父组件
 */
export function EditableList({ items, onChange, placeholder = '输入内容...', label }: EditableListProps) {
  /**
   * 更新单行内容
   * @param index - 行索引
   * @param value - 新值
   */
  const handleItemChange = useCallback(
    (index: number, value: string) => {
      const newItems = [...items];
      newItems[index] = value;
      onChange(newItems);
    },
    [items, onChange],
  );

  /**
   * 删除指定行
   * @param index - 行索引
   */
  const handleRemove = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange],
  );

  /** 添加新行（空字符串） */
  const handleAdd = useCallback(() => {
    onChange([...items, '']);
  }, [items, onChange]);

  return (
    <div className="editable-list">
      {/* 标签（可选） */}
      {label && <label className="editable-list__label">{label}</label>}

      {/* 列表项 */}
      <div className="editable-list__items">
        {items.map((item, index) => (
          <div key={index} className="editable-list__row">
            <input
              type="text"
              className="editable-list__input"
              value={item}
              placeholder={placeholder}
              onChange={(e) => handleItemChange(index, e.target.value)}
            />
            {/* 删除按钮 */}
            <button
              type="button"
              className="editable-list__remove-btn"
              onClick={() => handleRemove(index)}
              title="删除此项"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <button
        type="button"
        className="editable-list__add-btn"
        onClick={handleAdd}
        title="添加新项"
      >
        + 添加
      </button>
    </div>
  );
}