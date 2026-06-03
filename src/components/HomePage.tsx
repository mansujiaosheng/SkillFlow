// ============================================================
// 首页组件
// 提供新建项目、打开已有项目和最近项目列表三个入口
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store/useAppStore';
import { ProjectCreateDialog } from './ProjectCreateDialog';
import type { RecentProject, Project } from '../types';

export function HomePage() {
  // ---- 本地状态 ----
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ---- 从 Store 读取 ----
  const recentProjects = useAppStore((s) => s.recentProjects);
  const loadRecentProjects = useAppStore((s) => s.loadRecentProjects);
  const addRecentProject = useAppStore((s) => s.addRecentProject);
  const setCurrentProject = useAppStore((s) => s.setCurrentProject);
  const setView = useAppStore((s) => s.setView);

  // 组件挂载时加载最近项目列表
  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  /**
   * 通过 Tauri 文件对话框打开已有项目
   * 用户选择 .skillflow/project.json 文件后，调用后端 open_project 命令
   */
  const handleOpenProject = useCallback(async () => {
    setIsOpening(true);
    setErrorMsg(null);

    try {
      // 打开文件选择对话框，筛选 JSON 文件
      const selectedPath = await open({
        title: '选择项目文件',
        filters: [
          {
            name: 'SkillFlow 项目',
            extensions: ['json'],
          },
        ],
        // 允许多选设为 false（默认即为 false）
        multiple: false,
      });

      // 用户取消了选择
      if (!selectedPath) {
        return;
      }

      // 调用后端命令打开项目
      // 注意：open_project 命令需要在 Rust 端实现
      const project: Project = await invoke('open_project', {
        path: selectedPath,
      });

      // 更新全局状态
      setCurrentProject(project);
      addRecentProject({
        name: project.name,
        path: selectedPath,
        lastOpened: new Date().toISOString(),
      });
      setView('editor');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(`打开项目失败: ${message}`);
    } finally {
      setIsOpening(false);
    }
  }, [addRecentProject, setCurrentProject, setView]);

  /**
   * 点击最近项目快速打开
   */
  const handleOpenRecent = useCallback(
    async (recent: RecentProject) => {
      setIsOpening(true);
      setErrorMsg(null);

      try {
        const project: Project = await invoke('open_project', {
          path: recent.path,
        });

        setCurrentProject(project);
        addRecentProject({
          name: project.name,
          path: recent.path,
          lastOpened: new Date().toISOString(),
        });
        setView('editor');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setErrorMsg(`打开项目失败: ${message}`);
      } finally {
        setIsOpening(false);
      }
    },
    [addRecentProject, setCurrentProject, setView],
  );

  return (
    <div className="home-page">
      {/* 标题区域 */}
      <div className="home-header">
        <h1 className="home-title">SkillFlow</h1>
        <p className="home-subtitle">AI Agent Skills 工作流编排工具</p>
      </div>

      {/* 操作按钮区域 */}
      <div className="home-actions">
        <button
          className="home-btn home-btn-primary"
          onClick={() => setShowCreateDialog(true)}
          disabled={isOpening}
        >
          <span className="home-btn-icon">+</span>
          新建项目
        </button>

        <button
          className="home-btn home-btn-secondary"
          onClick={handleOpenProject}
          disabled={isOpening}
        >
          <span className="home-btn-icon">{isOpening ? '...' : '\u2191'}</span>
          打开已有项目
        </button>
      </div>

      {/* 错误提示 */}
      {errorMsg && <div className="home-error">{errorMsg}</div>}

      {/* 最近项目列表 */}
      {recentProjects.length > 0 && (
        <div className="home-recent">
          <h2 className="home-recent-title">最近项目</h2>
          <ul className="home-recent-list">
            {recentProjects.map((item) => (
              <li key={item.path} className="home-recent-item">
                <button
                  className="home-recent-btn"
                  onClick={() => handleOpenRecent(item)}
                  disabled={isOpening}
                  title={item.path}
                >
                  <span className="home-recent-name">{item.name}</span>
                  <span className="home-recent-path">{item.path}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 项目创建对话框 */}
      {showCreateDialog && (
        <ProjectCreateDialog onClose={() => setShowCreateDialog(false)} />
      )}
    </div>
  );
}