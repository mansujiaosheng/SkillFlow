// ============================================================
// SkillFlow 核心类型定义
// 定义项目中所有数据结构、枚举和接口
// ============================================================

/** 目标 AI 编码平台 */
export type TargetPlatform = 'claude-code' | 'codex' | 'trae' | 'generic-agent-skills';

/** 目标平台的中文显示标签映射 */
export const TARGET_PLATFORM_LABELS: Record<TargetPlatform, string> = {
  'claude-code': 'Claude Code',
  'codex': 'OpenAI Codex',
  'trae': 'Trae',
  'generic-agent-skills': '通用 Agent Skills',
};

/** SkillFlow 项目 */
export interface Project {
  /** 项目 schema 版本号，用于兼容性管理 */
  schemaVersion: string;
  /** 项目唯一标识符（UUID） */
  projectId: string;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description: string;
  /** 目标平台列表 */
  targetPlatforms: TargetPlatform[];
  /** 项目创建时间（ISO 8601 格式） */
  createdAt: string;
  /** 项目最后更新时间（ISO 8601 格式） */
  updatedAt: string;
  /** 项目保存路径（绝对路径） */
  savePath: string;
}

/**
 * 规则块
 * 表示 Skill 文件中的一个规则段落
 */
export interface RuleBlock {
  /**
   * 规则类型：
   * - require:    必须满足的前置条件
   * - forbid:     禁止的行为
   * - check:      需要检查的条件
   * - tool:       可使用的工具声明
   * - handoff:    交接规则
   * - guard:      守卫条件
   * - fallback:   回退策略
   * - ref:        引用其他规则
   */
  type: string;
  /** 规则的具体内容（Markdown 格式） */
  content: string;
}

/** Skill 节点携带的自定义数据 */
export interface SkillNodeData {
  /** Skill 名称（作为节点标题显示） */
  name: string;
  /** Skill 文件所在的文件夹名称 */
  folder: string;
  /** Skill 功能描述 */
  description: string;
  /** 适用场景列表 */
  whenToUse: string[];
  /** 不适用场景列表 */
  whenNotToUse: string[];
  /** 输入参数列表 */
  inputs: string[];
  /** 输出结果列表 */
  outputs: string[];
  /** 可用工具列表 */
  tools: string[];
  /** 执行步骤列表 */
  steps: string[];
  /** 检查项列表 */
  checks: string[];
  /** 回退方案列表 */
  fallbacks: string[];
  /** 引用资源列表 */
  references: string[];
  /** 规则块列表 */
  rules: RuleBlock[];
  /** 编辑模式：structured（结构化表单）/ manual（手动 Markdown）/ hybrid（混合模式） */
  editMode: 'structured' | 'manual' | 'hybrid';
  /** 手动模式下的完整 Markdown 内容 */
  manualMarkdown: string;
  /** AI 自动生成的 Markdown 内容（只读预览） */
  aiGeneratedMarkdown: string;
}

/** 画布上的坐标位置 */
export interface Position {
  x: number;
  y: number;
}

/** React Flow 工作流节点 */
export interface WorkflowNode {
  /** 节点唯一标识 */
  id: string;
  /** 节点类型（对应 React Flow 的自定义节点类型） */
  type: string;
  /** 节点在画布中的位置 */
  position: Position;
  /** 节点携带的 Skill 数据 */
  data: SkillNodeData;
}

/**
 * 连线关系类型
 * - before:        A 在 B 之前执行（顺序关系）
 * - depends_on:    B 依赖 A 的输出
 * - handoff:       A 将控制权移交给 B
 * - review_by:     A 的输出需要 B 审核
 * - fallback_to:   A 失败时回退到 B
 * - parallel_with: A 与 B 并行执行
 */
export type EdgeRelation =
  | 'before'
  | 'depends_on'
  | 'handoff'
  | 'review_by'
  | 'fallback_to'
  | 'parallel_with';

/** React Flow 工作流连线 */
export interface WorkflowEdge {
  /** 连线唯一标识 */
  id: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 连线关系 */
  relation: EdgeRelation;
  /** handoff 交接的数据字段列表 */
  handoffData: string[];
  /** 连线描述 */
  description: string;
  /** 是否为必需连线 */
  required: boolean;
}

/** 完整工作流 */
export interface Workflow {
  /** 节点列表 */
  nodes: WorkflowNode[];
  /** 连线列表 */
  edges: WorkflowEdge[];
}

/** 应用视图状态 */
export type AppView = 'home' | 'editor';

/** 最近打开的项目记录（持久化到 localStorage） */
export interface RecentProject {
  /** 项目名称 */
  name: string;
  /** 项目文件绝对路径 */
  path: string;
  /** 最后打开时间（ISO 8601 格式） */
  lastOpened: string;
}