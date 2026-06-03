// ============================================================
// SKILL.md 模板生成器
// 根据节点数据渲染 Markdown 字符串
// 参考需求文档第 15 节的 SKILL.md 模板格式
// ============================================================

import type { SkillNodeData, WorkflowEdge, WorkflowNode } from '../types';

/**
 * 将字符串数组渲染为 Markdown 列表
 * 每个元素前面添加 "- " 前缀
 * 空数组返回 "（无）"
 *
 * @param items - 要渲染的字符串数组
 * @returns Markdown 格式的列表字符串
 */
function renderList(items: string[]): string {
  if (!items || items.length === 0) return '（无）';
  return items.map((item) => `- ${item}`).join('\n');
}

/**
 * 根据节点名称查找节点
 * 在节点列表中查找指定 ID 的节点并返回其名称
 *
 * @param nodeId - 节点唯一标识
 * @param nodes - 所有节点列表
 * @returns 节点名称，如果找不到则返回 nodeId
 */
function findNodeName(nodeId: string, nodes: WorkflowNode[]): string {
  const node = nodes.find((n) => n.id === nodeId);
  return node?.data?.name || nodeId;
}

/**
 * 获取节点的上下游关系信息
 * 根据节点 ID 在所有连线中查找指向该节点和从该节点出发的连线
 *
 * @param nodeId - 目标节点 ID
 * @param nodes - 所有节点列表（用于显示节点名称）
 * @param edges - 所有连线列表
 * @returns 包含 incoming（上游）和 outgoing（下游）两大类关系的对象
 */
export function getNodeRelations(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): {
  incoming: { from: string; relation: string; handoffData: string[] }[];
  outgoing: { to: string; relation: string; handoffData: string[] }[];
} {
  // 入边：其他节点 -> 当前节点
  const incoming = edges
    .filter((e) => e.target === nodeId)
    .map((e) => ({
      from: findNodeName(e.source, nodes),
      relation: e.relation,
      handoffData: e.handoffData,
    }));

  // 出边：当前节点 -> 其他节点
  const outgoing = edges
    .filter((e) => e.source === nodeId)
    .map((e) => ({
      to: findNodeName(e.target, nodes),
      relation: e.relation,
      handoffData: e.handoffData,
    }));

  return { incoming, outgoing };
}

/**
 * 生成单个 SKILL.md 的 Markdown 内容
 *
 * 根据 SkillNodeData 中的结构化字段，按标准 SKILL.md 模板格式
 * 渲染完整的 Markdown 字符串。模板包含以下章节：
 *   - YAML frontmatter（name, description）
 *   - 使用时机 / 不适用场景
 *   - 输入 / 输出
 *   - 上游依赖 / 下游交接
 *   - 必须遵守 / 禁止行为（来自 rules 中 type 为 require/forbid 的规则块）
 *   - 可用工具
 *   - 执行流程
 *   - 完成标准
 *   - 失败处理
 *   - 参考资料
 *
 * @param nodeData - Skill 节点的结构化数据
 * @param incomingEdges - 上游连线信息（入边）
 * @param outgoingEdges - 下游连线信息（出边）
 * @returns 完整的 SKILL.md Markdown 字符串
 */
export function generateSkillMarkdown(
  nodeData: SkillNodeData,
  incomingEdges: { from: string; relation: string; handoffData: string[] }[],
  outgoingEdges: { to: string; relation: string; handoffData: string[] }[],
): string {
  const lines: string[] = [];

  // ---- YAML frontmatter ----
  lines.push('---');
  lines.push(`name: ${nodeData.name || '未命名 Skill'}`);
  lines.push(`description: ${nodeData.description || ''}`);
  lines.push('---');
  lines.push('');

  // ---- 标题 ----
  lines.push(`# ${nodeData.name || '未命名 Skill'}`);
  lines.push('');

  // ---- 使用时机 ----
  lines.push('## 使用时机');
  lines.push(renderList(nodeData.whenToUse));
  lines.push('');

  // ---- 不适用场景 ----
  lines.push('## 不适用场景');
  lines.push(renderList(nodeData.whenNotToUse));
  lines.push('');

  // ---- 输入 ----
  lines.push('## 输入');
  lines.push(renderList(nodeData.inputs));
  lines.push('');

  // ---- 输出 ----
  lines.push('## 输出');
  lines.push(renderList(nodeData.outputs));
  lines.push('');

  // ---- 上游依赖 ----
  lines.push('## 上游依赖');
  if (incomingEdges.length === 0) {
    lines.push('（无）');
  } else {
    for (const edge of incomingEdges) {
      lines.push(`- **${edge.from}** (关系: ${edge.relation})`);
      if (edge.handoffData.length > 0) {
        lines.push(`  - 交接数据: ${edge.handoffData.join(', ')}`);
      }
    }
  }
  lines.push('');

  // ---- 下游交接 ----
  lines.push('## 下游交接');
  if (outgoingEdges.length === 0) {
    lines.push('（无）');
  } else {
    for (const edge of outgoingEdges) {
      lines.push(`- **${edge.to}** (关系: ${edge.relation})`);
      if (edge.handoffData.length > 0) {
        lines.push(`  - 交接数据: ${edge.handoffData.join(', ')}`);
      }
    }
  }
  lines.push('');

  // ---- 必须遵守（从 rules 中提取 type 为 'require' 的规则块） ----
  const requireRules = nodeData.rules.filter((r) => r.type === 'require');
  lines.push('## 必须遵守');
  if (requireRules.length === 0) {
    lines.push('（无）');
  } else {
    for (const rule of requireRules) {
      lines.push(`- ${rule.content}`);
    }
  }
  lines.push('');

  // ---- 禁止行为（从 rules 中提取 type 为 'forbid' 的规则块） ----
  const forbidRules = nodeData.rules.filter((r) => r.type === 'forbid');
  lines.push('## 禁止行为');
  if (forbidRules.length === 0) {
    lines.push('（无）');
  } else {
    for (const rule of forbidRules) {
      lines.push(`- ${rule.content}`);
    }
  }
  lines.push('');

  // ---- 可用工具 ----
  lines.push('## 可用工具');
  lines.push(renderList(nodeData.tools));
  lines.push('');

  // ---- 执行流程 ----
  lines.push('## 执行流程');
  lines.push(renderList(nodeData.steps));
  lines.push('');

  // ---- 完成标准 ----
  lines.push('## 完成标准');
  lines.push(renderList(nodeData.checks));
  lines.push('');

  // ---- 失败处理 ----
  lines.push('## 失败处理');
  lines.push(renderList(nodeData.fallbacks));
  lines.push('');

  // ---- 参考资料 ----
  lines.push('## 参考资料');
  lines.push(renderList(nodeData.references));

  return lines.join('\n');
}