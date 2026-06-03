// ============================================================
// 项目创建对话框组件
// 收集项目名称、描述、目标平台和保存路径，调用后端创建项目
// ============================================================

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store/useAppStore';
import type { TargetPlatform, Project } from '../types';
import { TARGET_PLATFORM_LABELS } from '../types';

// 所有可用的目标平台选项
const ALL_PLATFORMS: TargetPlatform[] = [
  'claude-code',
  'codex',
  'trae',
  'generic-agent-skills',
];

interface ProjectCreateDialogProps {
  /** 关闭对话框的回调 */
  onClose: () => void;
}

export function ProjectCreateDialog({ onClose }: ProjectCreateDialogProps) {
  // ---- 表单状态 ----
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetPlatforms, setTargetPlatforms] = useState<Set<TargetPlatform>>(
    new Set(),
  );
  const [savePath, setSavePath] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---- Store ----
  const addRecentProject = useAppStore((s) => s.addRecentProject);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setView = useAppStore((s) => s.setView);

  /**
   * 切换目标平台的选中状态
   */
  const togglePlatform = useCallback((platform: TargetPlatform) => {
    setTargetPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  }, []);

  /**
   * 打开文件夹选择对话框，用于选择项目保存位置
   */
  const handleBrowseFolder = useCallback(async () => {
    try {
      const selected = await open({
        title: '选择项目保存位置',
        directory: true,
        multiple: false,
      });

      if (selected) {
        setSavePath(selected);
      }
    } catch {
      // 用户取消选择或对话框出错时静默处理
    }
  }, []);

  /**
   * 提交创建项目
   * 1. 表单校验
   * 2. 调用后端 create_project 命令
   * 3. 更新 store 并切换到编辑器视图
   */
  const handleCreate = useCallback(async () => {
    // ---- 表单校验 ----
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('请输入项目名称');
      return;
    }
    if (!savePath) {
      setErrorMsg('请选择项目保存位置');
      return;
    }
    if (targetPlatforms.size === 0) {
      setErrorMsg('请至少选择一个目标平台');
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);

    try {
      // 调用后端命令创建项目
      // 注意：create_project 命令需要在 Rust 端实现
      const project: Project = await invoke('create_project', {
        name: trimmedName,
        description: description.trim(),
        targetPlatforms: Array.from(targetPlatforms),
        savePath,
      });

      // 更新全局状态
      setCurrentProject(project);
      addRecentProject({
        name: project.name,
        path: savePath,
        lastOpened: new Date().toISOString(),
      });
      setView('editor');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(`创建项目失败: ${message}`);
    } finally {
      setIsCreating(false);
    }
  }, [
    name,
    description,
    targetPlatforms,
    savePath,
    addRecentProject,
    setCurrentProject,
    setView,
    onClose,
  ]);

  /**
   * 点击遮罩层关闭对话框
   */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 仅当点击的是遮罩层本身（而非对话框内容）时关闭
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // 表单是否有效（用于禁用创建按钮）
  const isFormValid =
    name.trim().length > 0 && savePath.length > 0 && targetPlatforms.size > 0;

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog-container">
        {/* 对话框标题 */}
        <div className="dialog-header">
          <h2 className="dialog-title">新建项目</h2>
          <button
            className="dialog-close-btn"
            onClick={onClose}
            disabled={isCreating}
            title="关闭"
          >
            x
          </button>
        </div>

        {/* 表单内容 */}
        <div className="dialog-body">
          {/* 项目名称 */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="project-name">
              项目名称 <span className="dialog-required">*</span>
            </label>
            <input
              id="project-name"
              className="dialog-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称..."
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* 项目描述 */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="project-desc">
              项目描述
            </label>
            <textarea
              id="project-desc"
              className="dialog-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述项目用途（可选）..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          {/* 目标平台（多选 checkbox） */}
          <div className="dialog-field">
            <label className="dialog-label">
              目标平台 <span className="dialog-required">*</span>
            </label>
            <div className="dialog-platforms">
              {ALL_PLATFORMS.map((platform) => (
                <label key={platform} className="dialog-platform-item">
                  <input
                    type="checkbox"
                    checked={targetPlatforms.has(platform)}
                    onChange={() => togglePlatform(platform)}
                    disabled={isCreating}
                  />
                  <span>{TARGET_PLATFORM_LABELS[platform]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 保存位置 */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="save-path">
              保存位置 <span className="dialog-required">*</span>
            </label>
            <div className="dialog-path-row">
              <input
                id="save-path"
                className="dialog-input dialog-path-input"
                type="text"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="选择或输入保存路径..."
                disabled={isCreating}
              />
              <button
                className="dialog-browse-btn"
                onClick={handleBrowseFolder}
                disabled={isCreating}
              >
                浏览...
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {errorMsg && <div className="dialog-error">{errorMsg}</div>}
        </div>

        {/* 底部按钮 */}
        <div className="dialog-footer">
          <button
            className="dialog-btn dialog-btn-cancel"
            onClick={onClose}
            disabled={isCreating}
          >
            取消
          </button>
          <button
            className="dialog-btn dialog-btn-create"
            onClick={handleCreate}
            disabled={!isFormValid || isCreating}
          >
            {isCreating ? '创建中...' : '创建项目'}
          </button>
        </div>
      </div>
    </div>
  );
}