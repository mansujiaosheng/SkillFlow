// ============================================================
// 基础 Linter 检查器
// 对 Skill 节点进行质量检查，包括：
//   - 必填字段检查（name, description）
//   - 弱约束词检查
//   - 规范建议检查
//   - 孤立节点检查
//   - 循环依赖检查（DFS 检测环）
//   - 质量评分计算
// ============================================================

import type { WorkflowNode, WorkflowEdge } from '../types';

/**
 * Lint 检查问题的严重程度
 * - error:     严重问题（如缺少必填字段、循环依赖）
 * - warning:   警告（如缺少使用时机说明、弱约束词）
 * - suggestion: 建议（如建议添加规则块）
 */
export interface LintIssue {
  /** 严重程度 */
  severity: 'error' | 'warning' | 'suggestion';
  /** 问题所在节点 ID */
  nodeId: string;
  /** 问题所在节点名称 */
  nodeName: string;
  /** 问题描述信息 */
  message: string;
}

/**
 * Lint 检查报告
 * 包含评分、分严重程度的问题列表和总结文本
 */
export interface LintReport {
  /** 质量评分（0-100），100 表示完美 */
  score: number;
  /** 严重问题列表 */
  errors: LintIssue[];
  /** 警告列表 */
  warnings: LintIssue[];
  /** 建议列表 */
  suggestions: LintIssue[];
  /** 可读的总结文本 */
  summary: string;
}

/**
 * 弱约束词列表
 * 这些词在 AI 提示词中表达不确定性，应尽量避免
 * 在 description, steps, checks, fallbacks 等字段中搜索
 */
const WEAK_WORDS = ['建议', '尽量', '最好', '可以', '可能', '大概'];

/**
 * 检查单个 Skill 节点
 *
 * 检查项：
 * 1. 必填字段 name - error 级别
 * 2. 必填字段 description - error 级别
 * 3. 弱约束词 - warning 级别（同一种词只报告一次）
 * 4. 缺少 whenToUse - warning 级别
 * 5. 缺少 inputs - warning 级别
 * 6. 缺少 outputs - warning 级别
 * 7. 缺少 require 规则 - suggestion 级别
 * 8. 缺少 forbid 规则 - suggestion 级别
 *
 * @param node - 要检查的节点
 * @param allNodes - 所有节点列表（为未来扩展保留，当前检查不需要）
 * @param edges - 所有连线列表（为未来扩展保留，当前检查不需要）
 * @returns 该节点的问题列表
 */
export function lintNode(
  node: WorkflowNode,
  _allNodes: WorkflowNode[],
  _edges: WorkflowEdge[],
): LintIssue[] {
  const issues: LintIssue[] = [];
  const data = node.data;
  const nodeId = node.id;
  const nodeName = data.name || '未命名节点';

  // ---- 1. 检查必填字段 name ----
  if (!data.name || data.name.trim() === '') {
    issues.push({
      severity: 'error',
      nodeId,
      nodeName,
      message: '缺少技能名称',
    });
  }

  // ---- 2. 检查必填字段 description ----
  if (!data.description || data.description.trim() === '') {
    issues.push({
      severity: 'error',
      nodeId,
      nodeName,
      message: '缺少描述',
    });
  }

  // ---- 3. 检查弱约束词 ----
  // 在 description, steps, checks, fallbacks 等文本字段中搜索弱约束词
  // 这些词表达不确定性，在 AI 提示词中应该避免
  const searchFields = [
    data.description,
    ...(data.steps || []),
    ...(data.checks || []),
    ...(data.fallbacks || []),
  ];

  for (const word of WEAK_WORDS) {
    for (const field of searchFields) {
      if (field && field.includes(word)) {
        issues.push({
          severity: 'warning',
          nodeId,
          nodeName,
          message: `出现弱约束词："${word}"`,
        });
        break; // 同一种弱约束词只报告一次
      }
    }
  }

  // ---- 4. 检查是否缺少 whenToUse ----
  if (!data.whenToUse || data.whenToUse.length === 0) {
    issues.push({
      severity: 'warning',
      nodeId,
      nodeName,
      message: '缺少使用时机说明',
    });
  }

  // ---- 5. 检查是否缺少 inputs ----
  if (!data.inputs || data.inputs.length === 0) {
    issues.push({
      severity: 'warning',
      nodeId,
      nodeName,
      message: '缺少输入定义',
    });
  }

  // ---- 6. 检查是否缺少 outputs ----
  if (!data.outputs || data.outputs.length === 0) {
    issues.push({
      severity: 'warning',
      nodeId,
      nodeName,
      message: '缺少输出定义',
    });
  }

  // ---- 7. 检查是否缺少必须遵守（require 规则） ----
  const hasRequire = data.rules?.some((r) => r.type === 'require');
  if (!hasRequire) {
    issues.push({
      severity: 'suggestion',
      nodeId,
      nodeName,
      message: '建议添加 #require 规则',
    });
  }

  // ---- 8. 检查是否缺少禁止行为（forbid 规则） ----
  const hasForbid = data.rules?.some((r) => r.type === 'forbid');
  if (!hasForbid) {
    issues.push({
      severity: 'suggestion',
      nodeId,
      nodeName,
      message: '建议添加 #forbid 规则',
    });
  }

  return issues;
}

/**
 * 查找孤立节点
 *
 * 孤立节点是指没有任何连线连接（既无入边也无出边）的节点。
 * 当只有一个节点时不报孤立（单节点工作流是合法的）。
 * 在多人协作场景中，孤立节点可能意味着遗漏了连线关系。
 *
 * @param nodes - 所有节点列表
 * @param edges - 所有连线列表
 * @returns 孤立节点的问题列表
 */
export function findOrphanNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): LintIssue[] {
  // 收集所有有连线关系的节点 ID
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  // 只有一个节点时不报孤立
  if (nodes.length <= 1) return [];

  // 找出不在 connectedNodeIds 中的节点
  return nodes
    .filter((n) => !connectedNodeIds.has(n.id))
    .map((n) => ({
      severity: 'warning' as const,
      nodeId: n.id,
      nodeName: n.data.name || '未命名节点',
      message: '孤立节点：没有与其他节点连线',
    }));
}

/**
 * 检查循环依赖（使用 DFS 检测环）
 *
 * 在 Skill 工作流中，循环依赖会导致死循环，
 * 例如 A -> B -> C -> A 的环状依赖。
 * 使用 DFS（深度优先搜索）+ inStack（递归栈）检测有向图中的环。
 *
 * 算法说明：
 * - 构建邻接表（source -> target[]）
 * - 对每个未访问的节点执行 DFS
 * - visited 记录已访问过的所有节点（不论是否完成）
 * - inStack 记录当前 DFS 递归路径上的节点
 * - 如果遇到 inStack 中的节点，说明找到了一个环
 *
 * @param nodes - 所有节点列表
 * @param edges - 所有连线列表
 * @returns 循环依赖节点的问题列表
 */
export function findCircularDependencies(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): LintIssue[] {
  // 构建邻接表：source -> [target1, target2, ...]
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const issues: LintIssue[] = [];
  const visited = new Set<string>();  // 全局已访问集合
  const inStack = new Set<string>();  // 当前递归路径上的节点

  /**
   * DFS 深度优先搜索检测环
   * @param nodeId - 当前节点 ID
   * @param path - 到当前节点为止的路径
   * @returns 是否找到环
   */
  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        // 未访问过的邻居，递归深入
        if (dfs(neighbor, [...path])) return true;
      } else if (inStack.has(neighbor)) {
        // 邻居在递归栈中，说明有环
        const cycleStart = path.indexOf(neighbor);
        const cycleNodes = path.slice(cycleStart);

        // 用节点名称构建可读的环描述
        const nodeNames = cycleNodes.map((id) => {
          const n = nodes.find((nd) => nd.id === id);
          return n?.data.name || id;
        });
        const currentNode = nodes.find((n) => n.id === nodeId);

        issues.push({
          severity: 'error',
          nodeId,
          nodeName: currentNode?.data.name || '未知节点',
          message: `循环依赖：${nodeNames.join(' \u2192 ')} \u2192 ${neighbor}`,
        });
        return true;
      }
    }

    // 回溯：从当前递归栈中移除
    inStack.delete(nodeId);
    return false;
  }

  // 对每个未访问过的节点执行 DFS
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return issues;
}

/**
 * 对全部 Skill 节点运行 Lint 检查，生成完整的 LintReport
 *
 * 检查流程：
 * 1. 对每个节点运行 lintNode 逐项检查
 * 2. 运行 findOrphanNodes 检查孤立节点
 * 3. 运行 findCircularDependencies 检查循环依赖
 * 4. 汇总所有问题，按严重程度分类
 * 5. 计算质量评分
 *
 * 评分规则：
 * - 基础分 100 分
 * - 每个 error -20 分
 * - 每个 warning -5 分
 * - 每个 suggestion -1 分
 * - 最低 0 分
 *
 * @param nodes - 所有 Skill 节点
 * @param edges - 所有连线
 * @returns 完整的 LintReport 报告对象
 */
export function lintAll(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): LintReport {
  const allIssues: LintIssue[] = [];

  // 1. 对每个节点运行逐项检查
  for (const node of nodes) {
    allIssues.push(...lintNode(node, nodes, edges));
  }

  // 2. 检查孤立节点
  allIssues.push(...findOrphanNodes(nodes, edges));

  // 3. 检查循环依赖
  allIssues.push(...findCircularDependencies(nodes, edges));

  // 4. 按严重程度分类
  const errors = allIssues.filter((i) => i.severity === 'error');
  const warnings = allIssues.filter((i) => i.severity === 'warning');
  const suggestions = allIssues.filter((i) => i.severity === 'suggestion');

  // 5. 计算评分
  const rawScore =
    100 -
    errors.length * 20 -
    warnings.length * 5 -
    suggestions.length * 1;
  const score = Math.max(0, Math.min(100, rawScore));

  // 6. 生成总结文本
  const summary =
    `质量评分：${score} / 100\n\n` +
    `严重问题：${errors.length} 个\n` +
    `警告：${warnings.length} 个\n` +
    `建议：${suggestions.length} 个`;

  return {
    score,
    errors,
    warnings,
    suggestions,
    summary,
  };
}