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
  Play,
  Plus,
  Save,
  SearchCheck,
  Settings,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FlowCanvas } from "../components/FlowCanvas";
import { InspectorPanel } from "../components/InspectorPanel";
import { SidebarPalette } from "../components/SidebarPalette";
import { StatusBar } from "../components/StatusBar";
import { generateSkillMarkdown } from "../skill/skillGenerator";
import { lintProject } from "../skill/skillLinter";
import {
  defaultSettings,
  schemaVersion,
  slugify,
  type CreateProjectPayload,
  type LintReport,
  type ProjectState,
  type SaveProjectPayload,
  type SkillFlowEdge,
  type SkillFlowNode,
  type TargetPlatform,
} from "../types/project";

const defaultPlatforms: TargetPlatform[] = ["codex", "generic-agent-skills"];

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
    settings: defaultSettings,
  };
}

export default function App() {
  const [projectState, setProjectState] = useState<ProjectState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [status, setStatus] = useState("准备就绪");
  const [lintReport, setLintReport] = useState<LintReport | undefined>();
  const [preview, setPreview] = useState("");

  const selectedNode = useMemo(
    () => projectState?.workflow.nodes.find((node) => node.id === selectedNodeId),
    [projectState, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => projectState?.workflow.edges.find((edge) => edge.id === selectedEdgeId),
    [projectState, selectedEdgeId],
  );

  const updateWorkflow = (
    patch:
      | Partial<ProjectState["workflow"]>
      | ((workflow: ProjectState["workflow"]) => ProjectState["workflow"]),
  ) => {
    setProjectState((current) => {
      if (!current) return current;
      const workflow =
        typeof patch === "function" ? patch(current.workflow) : { ...current.workflow, ...patch };
      return {
        ...current,
        project: { ...current.project, updatedAt: nowIso() },
        workflow,
      };
    });
  };

  const createProject = async () => {
    const parentDir = await open({ directory: true, multiple: false });
    if (!parentDir || Array.isArray(parentDir)) return;
    const name = window.prompt("项目名称", "Android CTF Skills") || "SkillFlow Project";
    const description =
      window.prompt("项目描述", "用于创建和编排标准化 Agent Skill。") || "";
    const localProject = createLocalProject(name, description, parentDir);
    const payload: CreateProjectPayload = {
      name,
      description,
      parentDir,
      targetPlatforms: defaultPlatforms,
    };
    const created = await invoke<ProjectState>("create_project", { payload }).catch(() => localProject);
    setProjectState(created);
    setStatus(`已创建项目：${created.project.name}`);
  };

  const openProject = async () => {
    const projectRoot = await open({ directory: true, multiple: false });
    if (!projectRoot || Array.isArray(projectRoot)) return;
    const opened = await invoke<ProjectState>("open_project", { projectRoot });
    setProjectState(opened);
    setStatus(`已打开项目：${opened.project.name}`);
  };

  const saveProject = async () => {
    if (!projectState) return;
    const payload: SaveProjectPayload = {
      ...projectState,
      project: { ...projectState.project, updatedAt: nowIso() },
    };
    await invoke("save_project", { payload });
    setProjectState(payload);
    setStatus("项目已保存");
  };

  const generateAll = async () => {
    if (!projectState) return;
    await invoke("generate_skills", { payload: projectState });
    setStatus("已生成全部 SKILL.md 和 workflow.md");
  };

  const lintAll = async () => {
    if (!projectState) return;
    const report = await invoke<LintReport>("lint_project", { payload: projectState }).catch(() =>
      lintProject(projectState.workflow.nodes, projectState.workflow.edges),
    );
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
          <button type="button" disabled>
            最近项目
          </button>
          <button type="button" disabled>
            <Settings size={18} />
            设置
          </button>
        </div>
      </div>
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
          </nav>
        </header>
        <div className="workspace">
          <SidebarPalette />
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
            onGenerateNode={(nodeId) => {
              const node = nodes.find((item) => item.id === nodeId);
              if (!node) return;
              setPreview(generateSkillMarkdown(node, nodes, edges));
              setStatus(`已生成预览：${node.data.name}`);
            }}
            onLintNode={(nodeId) => {
              const node = nodes.find((item) => item.id === nodeId);
              if (!node) return;
              const report = lintProject([node], []);
              setLintReport(report);
              setStatus(`已检查当前 Skill：${node.data.name}`);
            }}
          />
        </div>
        {preview ? (
          <section className="preview-panel">
            <pre>{preview}</pre>
            <button type="button" onClick={() => setPreview("")}>
              关闭预览
            </button>
          </section>
        ) : null}
        <StatusBar message={status} lintReport={lintReport} />
      </div>
    </ReactFlowProvider>
  );
}
