import type { Edge, Node, XYPosition } from "@xyflow/react";

export const schemaVersion = "0.1.0";

export type TargetPlatform =
  | "claude-code"
  | "codex"
  | "trae"
  | "generic-agent-skills";

export type NodeKind = "skill" | "global_rule" | "check" | "export" | "note";

export type EditMode = "structured" | "manual" | "hybrid";

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
};

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
    rules: [],
    manualMarkdown: "",
    aiMarkdown: "",
    editMode: "structured",
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
