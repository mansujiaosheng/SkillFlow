import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import {
  Copy,
  FolderOpen,
  HelpCircle,
  Play,
  Plus,
  Redo2,
  Save,
  SearchCheck,
  Settings,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlowCanvas } from "../components/FlowCanvas";
import { InspectorPanel } from "../components/InspectorPanel";
import { SidebarPalette } from "../components/SidebarPalette";
import { StatusBar } from "../components/StatusBar";
import {
  generateAllSkillMarkdown,
  generateSkillMarkdown,
  resolveSkillFolders,
} from "../skill/skillGenerator";
import { lintProject } from "../skill/skillLinter";
import { generateWorkflowMarkdown } from "../skill/workflowGenerator";
import {
  defaultSettings,
  createNodeFromTemplate,
  createNodeResource,
  normalizeProjectState,
  normalizeProjectSettings,
  schemaVersion,
  slugify,
  type CreateProjectPayload,
  type GeneratedFile,
  type LintReport,
  type NodeKind,
  type NodeResource,
  type ProjectState,
  type RecentProject,
  type ResourceKind,
  type SaveProjectPayload,
  type SkillFlowEdge,
  type SkillFlowNode,
  type TargetPlatform,
} from "../types/project";

const defaultPlatforms: TargetPlatform[] = ["codex", "generic-agent-skills"];
const localStorageKey = "skillflow:lastProject";
const recentProjectsKey = "skillflow:recentProjects";

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

function nowIso() {
  return new Date().toISOString();
}

function createLocalProject(name: string, description: string, parentDir: string): ProjectState {
  const timestamp = nowIso();
  const projectId = slugify(name) || `skillflow-${Date.now()}`;

  return {
    projectRoot: `${parentDir}\\${projectId}`,
    project: {
      schemaVersion,
      projectId,
      name,
      description,
      targetPlatforms: defaultPlatforms,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    workflow: { nodes: [], edges: [] },
    rules: [],
    resources: [],
    templates: [],
    settings: normalizeProjectSettings(defaultSettings),
  };
}

function normalizeRecentProjects(items: RecentProject[]): RecentProject[] {
  const seen = new Set<string>();
  return items
    .filter((item) => item.projectRoot && item.name)
    .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
    .filter((item) => {
      const key = item.projectRoot.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function buildGeneratedFiles(projectState: ProjectState): GeneratedFile[] {
  const folders = resolveSkillFolders(projectState.workflow.nodes);
  const markdownByNode = generateAllSkillMarkdown(
    projectState.workflow.nodes,
    projectState.workflow.edges,
    projectState.settings,
    projectState.resources,
  );
  const skillFiles = Object.entries(markdownByNode).map(([nodeId, content]) => ({
    path: `skills/${folders[nodeId]}/SKILL.md`,
    content,
  }));

  return [
    ...skillFiles,
    {
      path: "workflow.md",
      content: generateWorkflowMarkdown(projectState.workflow.nodes, projectState.workflow.edges),
    },
  ];
}

export default function App() {
  const [projectState, setProjectState] = useState<ProjectState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [status, setStatus] = useState("准备就绪");
  const [lintReport, setLintReport] = useState<LintReport | undefined>();
  const [preview, setPreview] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultProjectSettings, setDefaultProjectSettings] = useState(() =>
    normalizeProjectSettings(defaultSettings),
  );
  const [pastStates, setPastStates] = useState<ProjectState[]>([]);
  const [futureStates, setFutureStates] = useState<ProjectState[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    const cached = window.localStorage.getItem(recentProjectsKey);
    return cached ? normalizeRecentProjects(JSON.parse(cached) as RecentProject[]) : [];
  });

  const selectedNode = useMemo(
    () => projectState?.workflow.nodes.find((node) => node.id === selectedNodeId),
    [projectState, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => projectState?.workflow.edges.find((edge) => edge.id === selectedEdgeId),
    [projectState, selectedEdgeId],
  );

  useEffect(() => {
    const theme = projectState?.settings.theme || "system";
    document.documentElement.dataset.theme = theme;
  }, [projectState?.settings.theme]);

  const resetHistory = () => {
    setPastStates([]);
    setFutureStates([]);
  };

  const pushHistory = (state: ProjectState) => {
    setPastStates((items) => [...items.slice(-49), state]);
    setFutureStates([]);
  };

  const undo = useCallback(() => {
    setProjectState((current) => {
      if (!current || !pastStates.length) return current;
      const previous = pastStates[pastStates.length - 1];
      setPastStates((items) => items.slice(0, -1));
      setFutureStates((items) => [current, ...items.slice(0, 49)]);
      setSelectedNodeId(undefined);
      setSelectedEdgeId(undefined);
      setStatus("已撤回上一步操作");
      return previous;
    });
  }, [pastStates]);

  const redo = useCallback(() => {
    setProjectState((current) => {
      if (!current || !futureStates.length) return current;
      const next = futureStates[0];
      setFutureStates((items) => items.slice(1));
      setPastStates((items) => [...items.slice(-49), current]);
      setSelectedNodeId(undefined);
      setSelectedEdgeId(undefined);
      setStatus("已重做上一步操作");
      return next;
    });
  }, [futureStates]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (!projectState || editing || !(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [projectState, redo, undo]);

  const updateWorkflow = (
    patch:
      | Partial<ProjectState["workflow"]>
      | ((workflow: ProjectState["workflow"]) => ProjectState["workflow"]),
  ) => {
    setProjectState((current) => {
      if (!current) return current;
      pushHistory(current);
      const workflow =
        typeof patch === "function" ? patch(current.workflow) : { ...current.workflow, ...patch };
      return {
        ...current,
        project: { ...current.project, updatedAt: nowIso() },
        workflow,
      };
    });
  };

  const persistRecentProjects = async (items: RecentProject[]) => {
    const normalized = normalizeRecentProjects(items);
    setRecentProjects(normalized);
    window.localStorage.setItem(recentProjectsKey, JSON.stringify(normalized));
    if (isTauriRuntime()) {
      await invoke("save_recent_projects", { recentProjects: normalized }).catch(() => undefined);
    }
  };

  const rememberProject = async (state: ProjectState) => {
    await persistRecentProjects([
      {
        projectRoot: state.projectRoot,
        name: state.project.name,
        lastOpenedAt: nowIso(),
      },
      ...recentProjects,
    ]);
  };

  const loadRecentProjects = async () => {
    if (isTauriRuntime()) {
      const loaded = await invoke<RecentProject[]>("load_recent_projects").catch(
        () => recentProjects,
      );
      await persistRecentProjects(loaded);
      setStatus(loaded.length ? "已刷新最近项目" : "暂无最近项目");
      return;
    }
    setStatus(recentProjects.length ? "已显示浏览器缓存的最近项目" : "暂无最近项目");
  };

  const openRecentProject = async (recent: RecentProject) => {
    if (!isTauriRuntime()) {
      const cached = window.localStorage.getItem(localStorageKey);
      if (!cached) {
        setStatus("浏览器预览模式下没有可打开的项目缓存");
        return;
      }
      setProjectState(normalizeProjectState(JSON.parse(cached) as ProjectState));
      resetHistory();
      setStatus(`已打开最近项目：${recent.name}`);
      return;
    }

    const opened = await invoke<ProjectState>("open_project", {
      projectRoot: recent.projectRoot,
    }).catch(async () => {
      await persistRecentProjects(
        recentProjects.filter((item) => item.projectRoot !== recent.projectRoot),
      );
      setStatus(`最近项目路径失效，已移除：${recent.name}`);
      return undefined;
    });
    if (!opened) return;
    const normalized = normalizeProjectState(opened);
    setProjectState(normalized);
    resetHistory();
    await rememberProject(normalized);
    setStatus(`已打开最近项目：${opened.project.name}`);
  };

  const createProject = async () => {
    const selectedDir = isTauriRuntime()
      ? await open({ directory: true, multiple: false }).catch(() => null)
      : null;
    const parentDir =
      selectedDir && !Array.isArray(selectedDir)
        ? selectedDir
        : window.prompt("浏览器预览模式：输入一个项目保存位置标签", "browser-preview");
    if (!parentDir) return;
    const name = window.prompt("项目名称", "Android CTF Skills") || "SkillFlow Project";
    const description =
      window.prompt("项目描述", "用于创建和编排标准化 Agent Skill。") || "";
    const localProject = createLocalProject(name, description, parentDir);
    localProject.settings = defaultProjectSettings;
    const payload: CreateProjectPayload = {
      name,
      description,
      parentDir,
      targetPlatforms: defaultPlatforms,
    };
    const created = isTauriRuntime()
      ? await invoke<ProjectState>("create_project", { payload }).catch(() => localProject)
      : localProject;
    const normalized = normalizeProjectState(created);
    setProjectState(normalized);
    resetHistory();
    await rememberProject(normalized);
    setStatus(
      isTauriRuntime()
        ? `已创建项目：${created.project.name}`
        : `浏览器预览项目已创建：${created.project.name}`,
    );
  };

  const openProject = async () => {
    if (!isTauriRuntime()) {
      const cached = window.localStorage.getItem(localStorageKey);
      if (!cached) {
        setStatus("浏览器预览模式下没有可打开的本地缓存项目");
        return;
      }
      setProjectState(normalizeProjectState(JSON.parse(cached) as ProjectState));
      resetHistory();
      setStatus("已打开浏览器缓存项目");
      return;
    }

    const projectRoot = await open({ directory: true, multiple: false }).catch(() => null);
    if (!projectRoot || Array.isArray(projectRoot)) return;
    const opened = await invoke<ProjectState>("open_project", { projectRoot });
    const normalized = normalizeProjectState(opened);
    setProjectState(normalized);
    resetHistory();
    await rememberProject(normalized);
    setStatus(`已打开项目：${opened.project.name}`);
  };

  const saveProject = async () => {
    if (!projectState) return;
    const payload: SaveProjectPayload = {
      ...projectState,
      project: { ...projectState.project, updatedAt: nowIso() },
    };
    if (isTauriRuntime()) {
      await invoke("save_project", { payload });
      if (payload.settings.autoGenerateOnSave) {
        await invoke("write_generated_files", {
          payload: { projectRoot: payload.projectRoot, projectState: payload, files: buildGeneratedFiles(payload) },
        }).catch(() => undefined);
      }
    } else {
      window.localStorage.setItem(localStorageKey, JSON.stringify(payload));
      if (payload.settings.autoGenerateOnSave) {
        setPreview(buildGeneratedFiles(payload)[0]?.content || "");
      }
    }
    setProjectState(payload);
    await rememberProject(payload);
    setStatus(isTauriRuntime() ? "项目已保存" : "项目已保存到浏览器缓存");
  };

  const generateAll = async () => {
    if (!projectState) return;
    const nextState: ProjectState = {
      ...projectState,
      project: { ...projectState.project, updatedAt: nowIso() },
    };
    const files = buildGeneratedFiles(nextState);
    if (isTauriRuntime()) {
      await invoke("write_generated_files", {
        payload: { projectRoot: nextState.projectRoot, projectState: nextState, files },
      });
      setProjectState(nextState);
      await rememberProject(nextState);
      setStatus("已生成全部 SKILL.md 和 workflow.md");
      return;
    }
    const firstNode = nextState.workflow.nodes[0];
    if (firstNode) {
      setPreview(
        generateSkillMarkdown(
          firstNode,
          nextState.workflow.nodes,
          nextState.workflow.edges,
          nextState.settings,
          nextState.resources,
        ),
      );
    }
    setStatus("浏览器预览模式：已生成预览，桌面端会写入文件");
  };

  const lintAll = async () => {
    if (!projectState) return;
    const report = lintProject(
      projectState.workflow.nodes,
      projectState.workflow.edges,
      projectState.resources,
    );
    if (isTauriRuntime()) {
      await invoke("write_lint_report", {
        projectRoot: projectState.projectRoot,
        report,
      }).catch(() => undefined);
    }
    setLintReport(report);
    setStatus("Lint 检查完成");
  };

  const duplicateSelected = () => {
    if (!selectedNode || !projectState) return;
    const node: SkillFlowNode = {
      ...selectedNode,
      id: `node-${Date.now()}`,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      data: {
        ...selectedNode.data,
        name: `${selectedNode.data.name} Copy`,
        label: `${selectedNode.data.name} Copy`,
      },
    };
    updateWorkflow({ nodes: [...projectState.workflow.nodes, node] });
  };

  const addPaletteNode = (type: NodeKind) => {
    if (!projectState) return;
    const index = projectState.workflow.nodes.length;
    const node = createNodeFromTemplate(type, { x: 140 + index * 36, y: 120 + index * 28 });
    updateWorkflow({ nodes: [...projectState.workflow.nodes, node] });
    setSelectedNodeId(node.id);
    setSelectedEdgeId(undefined);
    setStatus(`已添加节点：${node.data.name}`);
  };

  const updateResources = (resources: NodeResource[]) => {
    setProjectState((current) =>
      {
        if (!current) return current;
        pushHistory(current);
        return {
          ...current,
          project: { ...current.project, updatedAt: nowIso() },
          resources,
        };
      },
    );
  };

  const importResource = async (kind: ResourceKind) => {
    const resource = createNodeResource(kind);
    if (isTauriRuntime() && projectState) {
      const selected = await open({ multiple: false }).catch(() => null);
      if (!selected || Array.isArray(selected)) return;
      resource.path = selected;
      resource.name = selected.split(/[\\/]/).pop() || resource.kind;
      const imported = await invoke<NodeResource>("import_resource", {
        projectRoot: projectState.projectRoot,
        resource,
      }).catch(() => resource);
      updateResources([...projectState.resources, imported]);
      return;
    }
    const name = window.prompt("资源名称", resource.kind) || "";
    const path = window.prompt("相对路径或 URL", "") || "";
    updateResources([...projectState!.resources, { ...resource, name, path }]);
  };

  const updateSettings = (settings: ProjectState["settings"]) => {
    if (!projectState) {
      setDefaultProjectSettings(settings);
      return;
    }
    setProjectState((current) =>
      {
        if (!current) return current;
        pushHistory(current);
        return {
          ...current,
          project: { ...current.project, updatedAt: nowIso() },
          settings,
        };
      },
    );
  };

  const selectLintNode = (nodeId?: string) => {
    if (!nodeId) return;
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(undefined);
  };

  const renderHelpDialog = () => (
    <div className="modal-backdrop" role="presentation" onClick={() => setShowHelp(false)}>
      <section className="modal-panel help-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>帮助与关于</h2>
          <button type="button" onClick={() => setShowHelp(false)}>关闭</button>
        </div>
        <div className="help-grid">
          <article><strong>新建/打开/保存</strong><p>创建、载入和保存 SkillFlow 项目。桌面端会写入本地项目目录。</p></article>
          <article><strong>生成</strong><p>根据节点内容、节点模板和流程线生成 SKILL.md 与 workflow.md。</p></article>
          <article><strong>检查</strong><p>运行内置 Lint，提示缺少描述、输入输出、资源路径等问题。</p></article>
          <article><strong>复制</strong><p>复制当前选中节点，便于快速创建相似 Skill。</p></article>
          <article><strong>撤回/重做</strong><p>使用 Ctrl+Z 撤回，Ctrl+Y 或 Ctrl+Shift+Z 重做。</p></article>
          <article><strong>节点模板</strong><p>每个节点可单独选择简单模板或高级 Markdown 模板，也可添加自定义字段。</p></article>
          <article><strong>资源库</strong><p>集中管理脚本、参考资料、Asset 和附件，再在节点中勾选绑定。</p></article>
          <article><strong>画布连线</strong><p>从节点右侧输出点拖到另一个节点左侧输入点，右侧面板可配置关系、说明和是否强制。</p></article>
          <article><strong>设置</strong><p>配置主题、自动检查和保存时自动生成。</p></article>
          <article><strong>关于</strong><p>GitHub：<a href="https://github.com/mansujiaosheng/SkillFlow" target="_blank" rel="noreferrer">github.com/mansujiaosheng/SkillFlow</a><br />作者：漫宿骄盛<br />邮箱：1967835754@qq.com</p></article>
        </div>
      </section>
    </div>
  );

  const renderSettingsDialog = () => {
    const settings = projectState?.settings || defaultProjectSettings;
    return (
      <div className="modal-backdrop" role="presentation" onClick={() => setShowSettings(false)}>
        <section className="modal-panel settings-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header">
            <h2>设置</h2>
            <button type="button" onClick={() => setShowSettings(false)}>关闭</button>
          </div>
          <label>
            主题
            <select
              value={settings.theme}
              onChange={(event) => updateSettings({ ...settings, theme: event.target.value as ProjectState["settings"]["theme"] })}
            >
              <option value="system">跟随系统</option>
              <option value="dark">深色</option>
              <option value="light">浅色</option>
            </select>
          </label>
          <label className="checkbox">
            <input
              checked={settings.autoLint}
              type="checkbox"
              onChange={(event) => updateSettings({ ...settings, autoLint: event.target.checked })}
            />
            自动检查项目
          </label>
          <label className="checkbox">
            <input
              checked={settings.autoGenerateOnSave}
              type="checkbox"
              onChange={(event) => updateSettings({ ...settings, autoGenerateOnSave: event.target.checked })}
            />
            保存项目时自动生成文件
          </label>
        </section>
      </div>
    );
  };

  const renderHome = () => (
    <div className="home">
      <div className="home-panel">
        <h1>SkillFlow</h1>
        <p>本地桌面端 Agent Skill 可视化创建、规范化生成与流程编排工具。</p>
        <div className="home-actions">
          <button type="button" onClick={createProject}>
            <Plus size={18} />
            新建项目
          </button>
          <button type="button" onClick={openProject}>
            <FolderOpen size={18} />
            打开已有项目
          </button>
          <button
            type="button"
            onClick={loadRecentProjects}
          >
            最近项目
          </button>
          <button type="button" onClick={() => setShowSettings(true)}>
            <Settings size={18} />
            设置
          </button>
          <button type="button" onClick={() => setShowHelp(true)}>
            <HelpCircle size={18} />
            帮助
          </button>
        </div>
        {recentProjects.length ? (
          <div className="recent-projects">
            <h2>最近项目</h2>
            {recentProjects.map((recent) => (
              <button
                className="recent-project-item"
                key={recent.projectRoot}
                type="button"
                onClick={() => openRecentProject(recent)}
              >
                <span>
                  <strong>{recent.name}</strong>
                  <small>{recent.projectRoot}</small>
                </span>
                <small>{new Date(recent.lastOpenedAt).toLocaleString()}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="home-about">
        <a href="https://github.com/mansujiaosheng/SkillFlow" target="_blank" rel="noreferrer">GitHub</a>
        <span>作者：漫宿骄盛</span>
        <span>1967835754@qq.com</span>
      </div>
      {showHelp ? renderHelpDialog() : null}
      {showSettings ? renderSettingsDialog() : null}
    </div>
  );

  if (!projectState) return renderHome();

  const nodes = projectState.workflow.nodes;
  const edges = projectState.workflow.edges;

  return (
    <ReactFlowProvider>
      <div className="app-shell">
        <header className="topbar">
          <div>
            <strong>{projectState.project.name}</strong>
            <span>{projectState.projectRoot}</span>
          </div>
          <nav>
            <button type="button" onClick={() => setShowHelp(true)}>
              <HelpCircle size={16} />
              帮助
            </button>
            <button type="button" onClick={undo} disabled={!pastStates.length}>
              <Undo2 size={16} />
              撤回
            </button>
            <button type="button" onClick={redo} disabled={!futureStates.length}>
              <Redo2 size={16} />
              重做
            </button>
            <button type="button" onClick={createProject}>
              <Plus size={16} />
              新建
            </button>
            <button type="button" onClick={openProject}>
              <FolderOpen size={16} />
              打开
            </button>
            <button type="button" onClick={saveProject}>
              <Save size={16} />
              保存
            </button>
            <button type="button" onClick={generateAll}>
              <Play size={16} />
              生成
            </button>
            <button type="button" onClick={lintAll}>
              <SearchCheck size={16} />
              检查
            </button>
            <button type="button" onClick={duplicateSelected} disabled={!selectedNode}>
              <Copy size={16} />
              复制
            </button>
            <button type="button" onClick={() => setShowSettings(true)}>
              <Settings size={16} />
              设置
            </button>
          </nav>
        </header>
        <div className="workspace">
          <SidebarPalette
            resources={projectState.resources}
            onAddNode={addPaletteNode}
            onImportResource={importResource}
            onUpdateResources={updateResources}
          />
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes: NodeChange<SkillFlowNode>[]) =>
              updateWorkflow((workflow) => ({
                ...workflow,
                nodes: applyNodeChanges(changes, workflow.nodes),
              }))
            }
            onEdgesChange={(changes: EdgeChange<SkillFlowEdge>[]) =>
              updateWorkflow((workflow) => ({
                ...workflow,
                edges: applyEdgeChanges(changes, workflow.edges),
              }))
            }
            onNodesUpdate={(nextNodes) => updateWorkflow({ nodes: nextNodes })}
            onEdgesUpdate={(nextEdges) => updateWorkflow({ edges: nextEdges })}
            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
              setSelectedNodeId(selectedNodes[0]?.id);
              setSelectedEdgeId(selectedEdges[0]?.id);
            }}
          />
          <InspectorPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            resources={projectState.resources}
            templates={projectState.templates}
            onUpdateNode={(node) =>
              updateWorkflow({
                nodes: nodes.map((item) => (item.id === node.id ? node : item)),
              })
            }
            onUpdateEdge={(edge) =>
              updateWorkflow({
                edges: edges.map((item) => (item.id === edge.id ? edge : item)),
              })
            }
            onUpdateTemplates={(templates, node) => {
              setProjectState((current) => {
                if (!current) return current;
                pushHistory(current);
                return {
                  ...current,
                  project: { ...current.project, updatedAt: nowIso() },
                  workflow: node
                    ? {
                        ...current.workflow,
                        nodes: current.workflow.nodes.map((item) =>
                          item.id === node.id ? node : item,
                        ),
                      }
                    : current.workflow,
                  templates,
                };
              });
            }}
            onGenerateNode={(nodeId) => {
              const node = nodes.find((item) => item.id === nodeId);
              if (!node) return;
              setPreview(
                generateSkillMarkdown(
                  node,
                  nodes,
                  edges,
                  projectState.settings,
                  projectState.resources,
                ),
              );
              setStatus(`已生成预览：${node.data.name}`);
            }}
            onLintNode={(nodeId) => {
              const node = nodes.find((item) => item.id === nodeId);
              if (!node) return;
              const report = lintProject([node], [], projectState.resources);
              setLintReport(report);
              setStatus(`已检查当前 Skill：${node.data.name}`);
            }}
          />
        </div>
        {lintReport ? (
          <section className="bottom-problems-panel">
            <div className="lint-panel-header">
              <strong>
                Lint 结果 · {lintReport.score}/100 · 严重 {lintReport.critical.length} · 警告{" "}
                {lintReport.warnings.length} · 建议 {lintReport.suggestions.length}
              </strong>
              <button type="button" onClick={() => setLintReport(undefined)}>
                关闭
              </button>
            </div>
            <div className="lint-panel-content">
              {[
                ["严重问题", lintReport.critical],
                ["警告", lintReport.warnings],
                ["建议", lintReport.suggestions],
              ].map(([title, issues]) => (
                <div className="lint-group" key={title as string}>
                  <h3>{title as string}</h3>
                  {(issues as typeof lintReport.critical).length ? (
                    (issues as typeof lintReport.critical).map((issue) => {
                      const nodeName =
                        nodes.find((node) => node.id === issue.nodeId)?.data.name ||
                        issue.nodeId ||
                        "项目";
                      return (
                        <button
                          className="lint-item"
                          key={issue.id}
                          type="button"
                          onClick={() => selectLintNode(issue.nodeId)}
                        >
                          <span>{nodeName}</span>
                          <strong>{issue.message}</strong>
                          {issue.action ? <small>{issue.action}</small> : null}
                        </button>
                      );
                    })
                  ) : (
                    <p>暂无</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {preview ? (
          <section className="preview-panel">
            <pre>{preview}</pre>
            <button type="button" onClick={() => setPreview("")}>
              关闭预览
            </button>
          </section>
        ) : null}
        {showHelp ? renderHelpDialog() : null}
        {showSettings ? renderSettingsDialog() : null}
        <StatusBar message={status} lintReport={lintReport} />
      </div>
    </ReactFlowProvider>
  );
}
