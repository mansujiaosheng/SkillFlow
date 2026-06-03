import type { Edge, Node, XYPosition } from "@xyflow/react";

export const schemaVersion = "0.1.0";

export type TargetPlatform =
  | "claude-code"
  | "codex"
  | "trae"
  | "generic-agent-skills";

export type NodeKind = "skill" | "global_rule" | "check" | "export" | "note";

export type EditMode = "structured" | "manual" | "hybrid";
export type TemplateMode = "simple" | "advanced";
export type TemplateSectionKey =
  | "whenToUse"
  | "whenNotToUse"
  | "inputs"
  | "outputs"
  | "upstream"
  | "downstream"
  | "requires"
  | "forbids"
  | "tools"
  | "steps"
  | "checks"
  | "fallbacks"
  | "references"
  | "scripts"
  | "assets"
  | "attachments";
export type ResourceKind = "script" | "reference" | "asset" | "attachment";

export type RuleType =
  | "require"
  | "forbid"
  | "input"
  | "output"
  | "step"
  | "check"
  | "tool"
  | "guard"
  | "fallback"
  | "handoff"
  | "ref";

export type RuleSeverity = "info" | "warning" | "error";

export type EdgeRelation =
  | "before"
  | "depends_on"
  | "handoff"
  | "review_by"
  | "fallback_to"
  | "parallel_with";

export interface RuleBlock {
  id: string;
  type: RuleType;
  content: string;
  severity: RuleSeverity;
  required: boolean;
  note: string;
}

export interface NodeResource {
  id: string;
  kind: ResourceKind;
  name: string;
  path: string;
  resourceType: string;
  description: string;
}

export interface TemplateSection {
  key: TemplateSectionKey;
  title: string;
  enabled: boolean;
}

export interface SkillNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeKind;
  name: string;
  folder: string;
  description: string;
  whenToUse: string[];
  whenNotToUse: string[];
  inputs: string[];
  outputs: string[];
  tools: string[];
  steps: string[];
  requires: string[];
  forbids: string[];
  checks: string[];
  fallbacks: string[];
  references: string[];
  referenceResources: NodeResource[];
  scripts: NodeResource[];
  assets: NodeResource[];
  attachments: NodeResource[];
  rules: RuleBlock[];
  manualMarkdown: string;
  aiMarkdown: string;
  editMode: EditMode;
}

export interface WorkflowEdgeData extends Record<string, unknown> {
  relation: EdgeRelation;
  description: string;
  handoffData: string[];
  required: boolean;
  note: string;
}

export type SkillFlowNode = Node<SkillNodeData, "skillNode">;
export type SkillFlowEdge = Edge<WorkflowEdgeData>;

export interface ProjectMeta {
  schemaVersion: string;
  projectId: string;
  name: string;
  description: string;
  targetPlatforms: TargetPlatform[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowData {
  nodes: SkillFlowNode[];
  edges: SkillFlowEdge[];
}

export interface ProjectState {
  projectRoot: string;
  project: ProjectMeta;
  workflow: WorkflowData;
  rules: RuleBlock[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  theme: "system" | "light" | "dark";
  autoLint: boolean;
  autoGenerateOnSave: boolean;
  templateMode: TemplateMode;
  templateSections: TemplateSection[];
  advancedTemplate: string;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  parentDir: string;
  targetPlatforms: TargetPlatform[];
}

export interface SaveProjectPayload {
  projectRoot: string;
  project: ProjectMeta;
  workflow: WorkflowData;
  rules: RuleBlock[];
  settings: ProjectSettings;
}

export interface LintIssue {
  id: string;
  level: "critical" | "warning" | "suggestion";
  message: string;
  nodeId?: string;
  action?: string;
}

export interface LintReport {
  score: number;
  critical: LintIssue[];
  warnings: LintIssue[];
  suggestions: LintIssue[];
  generatedAt: string;
}

export const defaultSettings: ProjectSettings = {
  theme: "system",
  autoLint: true,
  autoGenerateOnSave: false,
  templateMode: "simple",
  templateSections: createDefaultTemplateSections(),
  advancedTemplate: "",
};

export function createDefaultTemplateSections(): TemplateSection[] {
  return [
    { key: "whenToUse", title: "使用时机", enabled: true },
    { key: "whenNotToUse", title: "不适用场景", enabled: true },
    { key: "inputs", title: "输入", enabled: true },
    { key: "outputs", title: "输出", enabled: true },
    { key: "upstream", title: "上游依赖", enabled: true },
    { key: "downstream", title: "下游交接", enabled: true },
    { key: "requires", title: "必须遵守", enabled: true },
    { key: "forbids", title: "禁止行为", enabled: true },
    { key: "tools", title: "可用工具", enabled: true },
    { key: "steps", title: "执行流程", enabled: true },
    { key: "checks", title: "完成标准", enabled: true },
    { key: "fallbacks", title: "失败处理", enabled: true },
    { key: "references", title: "参考资料", enabled: true },
    { key: "scripts", title: "绑定脚本", enabled: true },
    { key: "assets", title: "绑定资源", enabled: true },
    { key: "attachments", title: "其他附件", enabled: true },
  ];
}

export function createNodeResource(kind: ResourceKind): NodeResource {
  return {
    id: `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    name: "",
    path: "",
    resourceType: "",
    description: "",
  };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createDefaultSkillData(name = "新 Skill"): SkillNodeData {
  const folder = slugify(name) || `skill-${Date.now()}`;

  return {
    label: name,
    nodeType: "skill",
    name,
    folder,
    description: "",
    whenToUse: [],
    whenNotToUse: [],
    inputs: [],
    outputs: [],
    tools: [],
    steps: [],
    requires: [],
    forbids: [],
    checks: [],
    fallbacks: [],
    references: [],
    referenceResources: [],
    scripts: [],
    assets: [],
    attachments: [],
    rules: [],
    manualMarkdown: "",
    aiMarkdown: "",
    editMode: "structured",
  };
}

export function normalizeSkillData(data: Partial<SkillNodeData>): SkillNodeData {
  return {
    ...createDefaultSkillData(data.name || "新 Skill"),
    ...data,
    label: data.label || data.name || "新 Skill",
    nodeType: data.nodeType || "skill",
    whenToUse: data.whenToUse || [],
    whenNotToUse: data.whenNotToUse || [],
    inputs: data.inputs || [],
    outputs: data.outputs || [],
    tools: data.tools || [],
    steps: data.steps || [],
    requires: data.requires || [],
    forbids: data.forbids || [],
    checks: data.checks || [],
    fallbacks: data.fallbacks || [],
    references: data.references || [],
    referenceResources: data.referenceResources || [],
    scripts: data.scripts || [],
    assets: data.assets || [],
    attachments: data.attachments || [],
    rules: data.rules || [],
    manualMarkdown: data.manualMarkdown || "",
    aiMarkdown: data.aiMarkdown || "",
    editMode: data.editMode || "structured",
  };
}

export function normalizeProjectSettings(
  settings?: Partial<ProjectSettings>,
): ProjectSettings {
  return {
    ...defaultSettings,
    ...settings,
    templateSections:
      settings?.templateSections?.length
        ? settings.templateSections
        : createDefaultTemplateSections(),
    advancedTemplate: settings?.advancedTemplate || "",
  };
}

export function normalizeProjectState(state: ProjectState): ProjectState {
  return {
    ...state,
    settings: normalizeProjectSettings(state.settings),
    workflow: {
      nodes: state.workflow.nodes.map((node) => ({
        ...node,
        data: normalizeSkillData(node.data),
      })),
      edges: state.workflow.edges,
    },
  };
}

export function createSkillNode(
  id: string,
  position: XYPosition,
  name?: string,
): SkillFlowNode {
  return {
    id,
    type: "skillNode",
    position,
    data: createDefaultSkillData(name),
  };
}

export function createWorkflowEdgeData(): WorkflowEdgeData {
  return {
    relation: "handoff",
    description: "",
    handoffData: [],
    required: true,
    note: "",
  };
}
