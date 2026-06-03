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

export interface TemplateField {
  id: string;
  name: string;
  key: string;
  value: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  templateMode: TemplateMode;
  templateSections: TemplateSection[];
  advancedTemplate: string;
  customFields: TemplateField[];
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
  resourceRefs: string[];
  referenceResources: NodeResource[];
  scripts: NodeResource[];
  assets: NodeResource[];
  attachments: NodeResource[];
  rules: RuleBlock[];
  manualMarkdown: string;
  aiMarkdown: string;
  editMode: EditMode;
  templateId: string;
  templateMode: TemplateMode;
  templateSections: TemplateSection[];
  advancedTemplate: string;
  customFields: TemplateField[];
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
  resources: NodeResource[];
  templates: ProjectTemplate[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  theme: "system" | "light" | "dark";
  autoLint: boolean;
  autoGenerateOnSave: boolean;
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
  resources: NodeResource[];
  templates: ProjectTemplate[];
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

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface WriteGeneratedFilesPayload {
  projectRoot: string;
  projectState: ProjectState;
  files: GeneratedFile[];
}

export interface RecentProject {
  projectRoot: string;
  name: string;
  lastOpenedAt: string;
}

export const defaultSettings: ProjectSettings = {
  theme: "system",
  autoLint: true,
  autoGenerateOnSave: false,
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

export function createTemplateField(): TemplateField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: "自定义字段",
    key: "customField",
    value: "",
  };
}

export function createProjectTemplate(name = "自定义模板"): ProjectTemplate {
  return {
    id: `template-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    description: "",
    templateMode: "simple",
    templateSections: createDefaultTemplateSections(),
    advancedTemplate: "",
    customFields: [],
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
    resourceRefs: [],
    referenceResources: [],
    scripts: [],
    assets: [],
    attachments: [],
    rules: [],
    manualMarkdown: "",
    aiMarkdown: "",
    editMode: "structured",
    templateId: "",
    templateMode: "simple",
    templateSections: createDefaultTemplateSections(),
    advancedTemplate: "",
    customFields: [],
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
    resourceRefs: data.resourceRefs || [],
    referenceResources: data.referenceResources || [],
    scripts: data.scripts || [],
    assets: data.assets || [],
    attachments: data.attachments || [],
    rules: data.rules || [],
    manualMarkdown: data.manualMarkdown || "",
    aiMarkdown: data.aiMarkdown || "",
    editMode: data.editMode || "structured",
    templateId: data.templateId || "",
    templateMode: data.templateMode || "simple",
    templateSections: data.templateSections?.length
      ? data.templateSections
      : createDefaultTemplateSections(),
    advancedTemplate: data.advancedTemplate || "",
    customFields: data.customFields || [],
  };
}

export function normalizeProjectSettings(
  settings?: Partial<ProjectSettings>,
): ProjectSettings {
  return {
    ...defaultSettings,
    ...settings,
  };
}

export function normalizeProjectState(state: ProjectState): ProjectState {
  return {
    ...state,
    resources: state.resources || [],
    templates: state.templates || [],
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

export function createNodeFromTemplate(
  templateType: NodeKind,
  position: XYPosition,
): SkillFlowNode {
  const node = createSkillNode(`node-${Date.now()}`, position, "新 Skill");
  node.data.nodeType = templateType;

  if (templateType === "global_rule") {
    node.data.name = "全局规则";
    node.data.label = "全局规则";
    node.data.folder = "00-global-rules";
    node.data.description = "定义整个 Skill 项目必须遵守的全局约束。";
    node.data.requires = ["所有 Skill 必须遵守本节点定义的全局规则。"];
    node.data.forbids = ["禁止覆盖用户明确写下的规则。"];
    node.data.outputs = ["全局约束清单"];
  } else if (templateType === "check") {
    node.data.name = "质量检查";
    node.data.label = "质量检查";
    node.data.folder = "quality-check";
    node.data.description = "检查上游 Skill 输出是否完整、可执行、可交接。";
    node.data.inputs = ["上游 Skill 产物", "检查标准"];
    node.data.outputs = ["检查问题列表", "修复建议"];
    node.data.steps = ["读取上游输出", "逐项核对完成标准", "输出问题和建议"];
    node.data.checks = ["必须列出严重问题、警告和建议"];
  } else if (templateType === "export") {
    node.data.name = "导出交付";
    node.data.label = "导出交付";
    node.data.folder = "export-delivery";
    node.data.description = "整理 Skill、workflow 和资源引用，形成最终交付。";
    node.data.inputs = ["已生成 Skill", "workflow.md", "绑定资源"];
    node.data.outputs = ["交付目录", "资源清单"];
    node.data.steps = ["汇总生成物", "核对资源相对路径", "输出交付说明"];
  } else if (templateType === "note") {
    node.data.name = "备注";
    node.data.label = "备注";
    node.data.folder = "note";
    node.data.description = "画布说明节点，不生成 Skill。";
    node.data.outputs = [];
  }

  return node;
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
