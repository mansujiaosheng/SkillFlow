// ============================================================
// 全局应用状态管理（Zustand）
// 管理当前视图、项目数据、工作流和最近项目列表
// ============================================================

import { create } from 'zustand';
import type { AppView, Project, Workflow, RecentProject } from '../types';

// localStorage 中存储最近项目列表的键名
const RECENT_PROJECTS_KEY = 'skillflow_recent_projects';
// 最多保留的最近项目数量
const MAX_RECENT_PROJECTS = 10;

/** 应用全局状态接口 */
interface AppState {
  // ---- 视图 ----
  /** 当前显示的应用视图（首页或编辑器） */
  view: AppView;
  /** 切换当前视图 */
  setView: (view: AppView) => void;

  // ---- 当前项目 ----
  /** 当前打开的项目数据，null 表示未打开任何项目 */
  currentProject: Project | null;
  /** 设置当前项目 */
  setCurrentProject: (project: Project | null) => void;

  // ---- 工作流 ----
  /** 当前编辑器中的工作流数据（节点 + 连线） */
  workflow: Workflow;
  /** 设置完整的工作流数据 */
  setWorkflow: (workflow: Workflow) => void;

  // ---- 画布选中状态 ----
  /** 当前选中的节点 ID（用于右侧属性面板展示） */
  selectedNodeId: string | null;
  /** 设置当前选中的节点 ID */
  setSelectedNodeId: (id: string | null) => void;
  /** 当前选中的连线 ID */
  selectedEdgeId: string | null;
  /** 设置当前选中的连线 ID */
  setSelectedEdgeId: (id: string | null) => void;

  // ---- 最近项目 ----
  /** 最近打开的项目列表（按最后打开时间倒序） */
  recentProjects: RecentProject[];
  /**
   * 将项目添加到最近项目列表
   * - 自动去重（按 path 去重）
   * - 最多保留 MAX_RECENT_PROJECTS 条
   * - 自动同步到 localStorage
   */
  addRecentProject: (project: RecentProject) => void;
  /** 从 localStorage 加载最近项目列表（应用启动时调用） */
  loadRecentProjects: () => void;
}

/** 创建空工作流的工厂函数 */
function createEmptyWorkflow(): Workflow {
  return { nodes: [], edges: [] };
}

export const useAppStore = create<AppState>((set, get) => ({
  // ---- 视图（默认显示首页） ----
  view: 'home',
  setView: (view: AppView) => set({ view }),

  // ---- 当前项目（初始为 null） ----
  currentProject: null,
  setCurrentProject: (project: Project | null) => set({ currentProject: project }),

  // ---- 工作流（初始为空） ----
  workflow: createEmptyWorkflow(),
  setWorkflow: (workflow: Workflow) => set({ workflow }),

  // ---- 画布选中状态 ----
  selectedNodeId: null,
  setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
  selectedEdgeId: null,
  setSelectedEdgeId: (id: string | null) => set({ selectedEdgeId: id }),

  // ---- 最近项目 ----
  recentProjects: [],

  /**
   * 添加最近项目
   * 1. 按 path 去重：如果已存在相同 path 的记录，移除旧的
   * 2. 将新记录插入到列表头部
   * 3. 截断到最多 MAX_RECENT_PROJECTS 条
   * 4. 持久化到 localStorage
   */
  addRecentProject: (project: RecentProject) => {
    const { recentProjects } = get();

    // 去重：过滤掉 path 相同的旧记录
    const filtered = recentProjects.filter((p) => p.path !== project.path);

    // 添加到列表头部，截断到最大数量
    const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);

    // 更新内存状态
    set({ recentProjects: updated });

    // 持久化到 localStorage
    try {
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
    } catch {
      // localStorage 写入失败时静默处理（例如存储空间已满）
      console.warn('无法将最近项目列表写入 localStorage');
    }
  },

  /**
   * 从 localStorage 加载最近项目列表
   * 在应用初始化时调用，恢复用户之前打开过的项目记录
   */
  loadRecentProjects: () => {
    try {
      const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (stored) {
        const parsed: RecentProject[] = JSON.parse(stored);
        // 验证数据格式并截断
        if (Array.isArray(parsed)) {
          set({ recentProjects: parsed.slice(0, MAX_RECENT_PROJECTS) });
        }
      }
    } catch {
      // 解析失败时静默处理，使用空列表
      console.warn('无法从 localStorage 加载最近项目列表');
    }
  },
}));