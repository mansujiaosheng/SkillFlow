// ============================================================
// LintPanel - Lint 检查结果展示面板
//
// 功能：
// 1. 从 store 获取工作流数据，调用 lintAll 生成检查报告
// 2. 展示质量评分（大号数字，颜色按阈值变化）
// 3. 展示分类问题列表（严重问题/警告/建议，各有颜色图标）
// 4. 可选的紧凑模式（仅显示部分摘要信息）
//
// 使用场景：
// - 在 InspectorPanel 底部按钮中点击"检查当前 Skill"时显示
// - 在 Editor 工具栏中点击"检查全部"时，作为弹窗或侧边面板显示
// ============================================================

import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { lintAll, lintNode, type LintIssue, type LintReport } from '../skill/skillLinter';

/**
 * 根据评分确定 CSS 类名和颜色方案
 * - 100 分: 绿色（优秀）
 * - 80-99 分: 黄色（良好）
 * - 0-79 分: 红色（需要改进）
 *
 * @param score - 质量评分 (0-100)
 * @returns 包含颜色相关 CSS 类名的对象
 */
function getScoreClass(score: number) {
  if (score === 100) return { className: 'lint-score--perfect', color: 'var(--accent-success)' };
  if (score >= 80) return { className: 'lint-score--good', color: '#d29922' };
  return { className: 'lint-score--poor', color: 'var(--accent-danger)' };
}

/**
 * LintPanel 组件 Props
 */
interface LintPanelProps {
  /** 是否仅显示单个节点的检查结果（传入节点 ID） */
  nodeId?: string;
  /** 是否可关闭（为 true 时显示关闭按钮） */
  closable?: boolean;
  /** 关闭回调函数 */
  onClose?: () => void;
}

/**
 * 单个问题行组件
 * 根据严重程度显示不同的颜色图标
 */
function IssueRow({ issue }: { issue: LintIssue }) {
  // 根据严重程度选择图标和颜色
  const iconConfig = {
    error: { icon: '\u2716', label: '严重', className: 'lint-issue--error' },
    warning: { icon: '\u26A0', label: '警告', className: 'lint-issue--warning' },
    suggestion: { icon: '\u2139', label: '建议', className: 'lint-issue--suggestion' },
  };

  const config = iconConfig[issue.severity];

  return (
    <div className={`lint-issue ${config.className}`}>
      <span className="lint-issue__icon" title={config.label}>
        {config.icon}
      </span>
      <span className="lint-issue__node">{issue.nodeName}</span>
      <span className="lint-issue__message">{issue.message}</span>
    </div>
  );
}

/**
 * 问题分组展示区块组件
 * 包含标题（含数量统计）和问题列表
 */
function IssueSection({
  title,
  issues,
}: {
  title: string;
  issues: LintIssue[];
}) {
  if (issues.length === 0) return null;

  return (
    <div className="lint-section">
      <div className="lint-section__header">
        <span className="lint-section__title">
          {title} ({issues.length})
        </span>
      </div>
      <div className="lint-section__body">
        {issues.map((issue, idx) => (
          <IssueRow key={`${issue.nodeId}-${idx}`} issue={issue} />
        ))}
      </div>
    </div>
  );
}

/**
 * LintPanel 主组件
 *
 * 两种模式：
 * 1. 全量模式（不带 nodeId）：对整个工作流运行 lintAll
 * 2. 单节点模式（带 nodeId）：仅对指定节点运行 lintNode 检查
 *
 * 在单节点模式下，不检查孤立节点和循环依赖（这些是全局检查项）。
 */
export function LintPanel({ nodeId, closable, onClose }: LintPanelProps) {
  const workflow = useAppStore((s) => s.workflow);

  // 根据是否指定 nodeId 决定运行全量检查还是单节点检查
  const report: LintReport = useMemo(() => {
    if (nodeId) {
      // 单节点模式：只检查指定节点
      const singleNode = workflow.nodes.find((n) => n.id === nodeId);
      if (!singleNode) {
        return {
          score: 100,
          errors: [],
          warnings: [],
          suggestions: [],
          summary: '未找到指定节点',
        };
      }
      // 单节点模式：使用 lintNode 进行逐项检查
      const issues = lintNode(singleNode, workflow.nodes, workflow.edges);
      const errors = issues.filter((i: LintIssue) => i.severity === 'error');
      const warnings = issues.filter((i: LintIssue) => i.severity === 'warning');
      const suggestions = issues.filter((i: LintIssue) => i.severity === 'suggestion');
      const rawScore =
        100 - errors.length * 20 - warnings.length * 5 - suggestions.length * 1;
      return {
        score: Math.max(0, Math.min(100, rawScore)),
        errors,
        warnings,
        suggestions,
        summary:
          `质量评分：${Math.max(0, Math.min(100, rawScore))} / 100\n\n` +
          `严重问题：${errors.length} 个\n` +
          `警告：${warnings.length} 个\n` +
          `建议：${suggestions.length} 个`,
      };
    }
    // 全量模式：对整个工作流运行检查
    return lintAll(workflow.nodes, workflow.edges);
  }, [workflow, nodeId]);

  const scoreStyle = getScoreClass(report.score);

  // 标题根据模式变化
  const title = nodeId ? 'Skill 检查' : '全局检查';

  // 如果没有问题，显示通过信息
  const allClear = report.errors.length === 0 && report.warnings.length === 0 && report.suggestions.length === 0;

  return (
    <div className="lint-panel">
      {/* ---- 面板头部 ---- */}
      <div className="lint-panel__header">
        <h3 className="lint-panel__title">{title}</h3>
        {closable && onClose && (
          <button className="lint-panel__close-btn" onClick={onClose} title="关闭">
            {'\u2715'}
          </button>
        )}
      </div>

      {/* ---- 评分展示 ---- */}
      <div className="lint-panel__score-section">
        <div className={`lint-score ${scoreStyle.className}`}>
          {report.score}
        </div>
        <div className="lint-score__hint">质量评分 / 100</div>
      </div>

      {/* ---- 通过提示 ---- */}
      {allClear && (
        <div className="lint-panel__all-clear">
          {'\u2714'} 检查通过，未发现问题
        </div>
      )}

      {/* ---- 问题列表（按严重程度分组） ---- */}
      <div className="lint-panel__body">
        <IssueSection
          title="严重问题"
          issues={report.errors}
        />
        <IssueSection
          title="警告"
          issues={report.warnings}
        />
        <IssueSection
          title="建议"
          issues={report.suggestions}
        />
      </div>
    </div>
  );
}