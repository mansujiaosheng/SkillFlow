// ============================================================
// Editor - 主编辑器组件（三栏布局容器）
//
// 布局结构（flexbox 纵向排列）：
//   顶部工具栏（按钮 + 项目名称）
//   主体三栏：
//     左侧（200px 固定）  |  中间（自适应）  |  右侧（300px 固定）
//     SidebarPalette       |  Canvas           |  InspectorPanel
//   底部状态栏（保存时间、生成状态、Lint 摘要）
// ============================================================

import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { invoke } from '@tauri-apps/api/core';
import { SidebarPalette } from './SidebarPalette';
import { Canvas } from './Canvas';
import { InspectorPanel } from './InspectorPanel';
import { LintPanel } from './LintPanel';
import { useAppStore } from '../store/useAppStore';
import { generateSkillMarkdown, getNodeRelations } from '../skill/skillTemplate';
import { lintAll } from '../skill/skillLinter';
import type { SkillNodeData } from '../types';

/**
 * 状态栏状态接口
 * 管理编辑器底部状态栏的显示信息
 */
interface StatusBarState {
  /** 最后保存时间的格式化字符串，null 表示尚未保存过 */
  lastSaveTime: string | null;
  /** 生成状态：idle（待生成）、generating（生成中）、done（已完成） */
  generationStatus: 'idle' | 'generating' | 'done';
  /** Lint 检查结果简要摘要 */
  lintSummary: string | null;
}

/**
 * Editor 主编辑器组件
 *
 * 使用 ReactFlowProvider 包裹整个编辑器区域，
 * 确保 Canvas 和 SidebarPalette 共享同一个 React Flow 上下文。
 *
 * 工具栏布局：
 * ┌──────────────────────────────────────────────────────────┐
 * │ ← 返回  |  项目名称  |  [保存] [生成全部] [检查全部]        │
 * ├──────────────────────────────────────────────────────────┤
 *
 * 底部状态栏显示：
 * - 最后保存时间
 * - 生成状态（待生成 / 生成中 / 已完成）
 * - Lint 检查结果摘要
 */
export function Editor() {
  // ---- 从全局 store 获取状态 ----
  const currentProject = useAppStore((s) => s.currentProject);
  const setView = useAppStore((s) => s.setView);
  const workflow = useAppStore((s) => s.workflow);

  // ---- 本地状态：状态栏信息 ----
  const [statusBar, setStatusBar] = useState<StatusBarState>({
    lastSaveTime: null,
    generationStatus: 'idle',
    lintSummary: null,
  });

  // ---- 本地状态：Lint 弹窗 ----
  const [showLintModal, setShowLintModal] = useState(false);

  // ---- 本地状态：生成结果弹窗 ----
  const [generatedMarkdowns, setGeneratedMarkdowns] = useState<{ name: string; markdown: string }[] | null>(null);

  /**
   * 处理"保存"按钮点击
   *
   * 调用 Tauri 后端 save_project 命令将项目数据写入磁盘
   */
  const handleSave = useCallback(async () => {
    if (!currentProject) return;

    try {
      const result = await invoke('save_project', {
        savePath: currentProject.savePath,
        project: currentProject,
        workflow: workflow,
      });
      console.log('保存结果:', result);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setStatusBar((prev) => ({
        ...prev,
        lastSaveTime: timeStr,
      }));
    } catch (err) {
      console.error('保存失败:', err);
      setStatusBar((prev) => ({
        ...prev,
        lintSummary: `保存失败: ${err}`,
      }));
    }
  }, [workflow, currentProject]);

  /**
   * 处理"生成全部 Skill"按钮点击
   *
   * 调用 Tauri 后端 generate_all_skills 命令，将 SKILL.md 写入磁盘。
   * 同时调用 generate_workflow_md 生成工作流概览文件。
   * 前端同时生成预览内容用于弹窗展示。
   */
  const handleGenerateAll = useCallback(async () => {
    if (!currentProject) return;

    setStatusBar((prev) => ({ ...prev, generationStatus: 'generating' }));

    try {
      // 调用 Tauri 后端：写入 SKILL.md 文件到磁盘
      const result = await invoke('generate_all_skills', {
        savePath: currentProject.savePath,
        workflow: workflow,
      });
      console.log('生成结果:', result);

      // 同时生成 workflow.md
      await invoke('generate_workflow_md', {
        savePath: currentProject.savePath,
        workflow: workflow,
      });

      // 前端预览：收集所有 Skill 的 Markdown 用于弹窗展示
      const results: { name: string; markdown: string }[] = [];
      for (const node of workflow.nodes) {
        const data = node.data as SkillNodeData;
        const { incoming, outgoing } = getNodeRelations(node.id, workflow.nodes, workflow.edges);
        const markdown = generateSkillMarkdown(data, incoming, outgoing);
        results.push({
          name: data.name || node.id,
          markdown,
        });
      }

      setGeneratedMarkdowns(results);
      setStatusBar((prev) => ({
        ...prev,
        generationStatus: 'done',
      }));
    } catch (err) {
      console.error('生成失败:', err);
      setStatusBar((prev) => ({
        ...prev,
        generationStatus: 'idle',
        lintSummary: `生成失败: ${err}`,
      }));
    }
  }, [workflow, currentProject]);

  /**
   * 处理"检查全部"按钮点击
   *
   * 对整个工作流运行 Lint 检查，生成检查报告。
   * 结果通过弹窗展示（LintPanel 组件）。
   * 摘要信息显示在底部状态栏。
   */
  const handleCheckAll = useCallback(() => {
    const report = lintAll(workflow.nodes, workflow.edges);

    // 生成状态栏摘要
    const summaryParts: string[] = [];
    if (report.errors.length > 0) {
      summaryParts.push(`${report.errors.length} 个错误`);
    }
    if (report.warnings.length > 0) {
      summaryParts.push(`${report.warnings.length} 个警告`);
    }
    if (report.suggestions.length > 0) {
      summaryParts.push(`${report.suggestions.length} 个建议`);
    }
    const summary = summaryParts.length > 0
      ? `Lint: ${report.score}分 (${summaryParts.join(', ')})`
      : `Lint: ${report.score}分 (通过)`;

    setStatusBar((prev) => ({
      ...prev,
      lintSummary: summary,
    }));

    // 打开弹窗
    setShowLintModal(true);
  }, [workflow]);

  /**
   * 关闭 Lint 弹窗
   */
  const handleCloseLintModal = useCallback(() => {
    setShowLintModal(false);
  }, []);

  /**
   * 关闭生成结果弹窗
   */
  const handleCloseGeneratedModal = useCallback(() => {
    setGeneratedMarkdowns(null);
  }, []);

  // ---- 状态栏消息拼接 ----
  const statusMessages: string[] = [];
  if (statusBar.lastSaveTime) {
    statusMessages.push(`最后保存：${statusBar.lastSaveTime}`);
  }
  if (statusBar.generationStatus === 'generating') {
    statusMessages.push('生成中...');
  } else if (statusBar.generationStatus === 'done') {
    statusMessages.push(`已生成 ${workflow.nodes.length} 个 Skill`);
  }
  if (statusBar.lintSummary) {
    statusMessages.push(statusBar.lintSummary);
  }

  return (
    <ReactFlowProvider>
      <div className="editor-layout">

        {/* ---- 顶部工具栏 ---- */}
        <div className="editor-toolbar">
          <button
            className="editor-back-btn"
            onClick={() => setView('home')}
            title="返回项目列表"
          >
            {'\u2190'} 返回
          </button>

          <h2 className="editor-toolbar__title">
            {currentProject ? currentProject.name : '未命名项目'}
          </h2>

          <div className="editor-toolbar__spacer" />

          {/* ---- 工具栏操作按钮 ---- */}
          <button
            className="editor-toolbar-btn"
            onClick={handleSave}
            title="保存当前项目"
          >
            {'\uD83D\uDCBE'} 保存
          </button>

          <button
            className="editor-toolbar-btn editor-toolbar-btn--primary"
            onClick={handleGenerateAll}
            disabled={workflow.nodes.length === 0}
            title="为所有 Skill 节点生成 SKILL.md"
          >
            {'\u2699'} 生成全部
          </button>

          <button
            className="editor-toolbar-btn"
            onClick={handleCheckAll}
            disabled={workflow.nodes.length === 0}
            title="检查所有 Skill 节点质量"
          >
            {'\u2714'} 检查全部
          </button>
        </div>

        {/* ---- 三栏主体区域 ---- */}
        <div className="editor-layout__body">
          {/* 左侧：组件库面板 */}
          <div className="editor-layout__left">
            <SidebarPalette />
          </div>

          {/* 中间：React Flow 画布 */}
          <div className="editor-layout__center">
            <Canvas />
          </div>

          {/* 右侧：属性面板 */}
          <div className="editor-layout__right">
            <InspectorPanel />
          </div>
        </div>

        {/* ---- 底部状态栏 ---- */}
        <div className="editor-statusbar">
          {statusMessages.length > 0 ? (
            statusMessages.map((msg, idx) => (
              <span key={idx} className="editor-statusbar__item">
                {msg}
              </span>
            ))
          ) : (
            <span className="editor-statusbar__item editor-statusbar__item--muted">
              就绪
            </span>
          )}
        </div>
      </div>

      {/* ---- Lint 检查结果弹窗 ---- */}
      {showLintModal && (
        <div className="dialog-overlay" onClick={handleCloseLintModal}>
          <div
            className="lint-modal-container"
            onClick={(e) => e.stopPropagation()} // 阻止点击内部关闭
          >
            <LintPanel closable onClose={handleCloseLintModal} />
          </div>
        </div>
      )}

      {/* ---- 生成结果预览弹窗 ---- */}
      {generatedMarkdowns && (
        <div className="dialog-overlay" onClick={handleCloseGeneratedModal}>
          <div
            className="generated-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h3 className="dialog-title">
                生成结果（共 {generatedMarkdowns.length} 个 Skill）
              </h3>
              <button
                className="dialog-close-btn"
                onClick={handleCloseGeneratedModal}
                title="关闭"
              >
                {'\u2715'}
              </button>
            </div>
            <div className="generated-modal-body">
              {generatedMarkdowns.map((item, idx) => (
                <details key={idx} className="generated-modal-item">
                  <summary className="generated-modal-item__title">
                    {item.name}
                  </summary>
                  <pre className="generated-modal-item__content">
                    {item.markdown}
                  </pre>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </ReactFlowProvider>
  );
}