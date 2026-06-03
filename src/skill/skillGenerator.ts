import type { SkillFlowEdge, SkillFlowNode, SkillNodeData } from "../types/project";

function yamlEscape(value: string): string {
  return value.replace(/"/g, '\\"');
}

function renderList(items: string[], fallback = "- 未配置"): string {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  return filtered.length ? filtered.map((item) => `- ${item}`).join("\n") : fallback;
}

function rulesOf(node: SkillNodeData, type: string): string[] {
  return node.rules
    .filter((rule) => rule.type === type && rule.content.trim())
    .map((rule) => rule.content.trim());
}

function nodeNameById(nodes: SkillFlowNode[], id: string): string {
  return nodes.find((node) => node.id === id)?.data.name || id;
}

function renderIncoming(
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  const incoming = edges.filter((edge) => edge.target === node.id);
  if (!incoming.length) return "- 无上游依赖";

  return incoming
    .map((edge) => {
      const sourceName = nodeNameById(nodes, edge.source);
      const handoff = edge.data?.handoffData?.length
        ? `；交接：${edge.data.handoffData.join("、")}`
        : "";
      return `- ${sourceName} (${edge.data?.relation || "handoff"})${handoff}`;
    })
    .join("\n");
}

function renderOutgoing(
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  const outgoing = edges.filter((edge) => edge.source === node.id);
  if (!outgoing.length) return "- 无下游交接";

  return outgoing
    .map((edge) => {
      const targetName = nodeNameById(nodes, edge.target);
      const handoff = edge.data?.handoffData?.length
        ? `；交接：${edge.data.handoffData.join("、")}`
        : "";
      return `- ${targetName} (${edge.data?.relation || "handoff"})${handoff}`;
    })
    .join("\n");
}

export function generateSkillMarkdown(
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  if (node.data.editMode === "manual" && node.data.manualMarkdown.trim()) {
    return node.data.manualMarkdown.trimEnd() + "\n";
  }

  const data = node.data;
  const requires = [...data.requires, ...rulesOf(data, "require")];
  const forbids = [...data.forbids, ...rulesOf(data, "forbid")];
  const checks = [...data.checks, ...rulesOf(data, "check")];
  const tools = [...data.tools, ...rulesOf(data, "tool")];
  const fallbacks = [...data.fallbacks, ...rulesOf(data, "fallback")];
  const references = [...data.references, ...rulesOf(data, "ref")];
  const description =
    data.description ||
    `${data.name}，在相关任务触发时用于生成规范化 Agent Skill。`;

  return `---
name: ${data.name}
description: "${yamlEscape(description)}"
---

# ${data.name}

## 使用时机

${renderList(data.whenToUse)}

## 不适用场景

${renderList(data.whenNotToUse)}

## 输入

${renderList(data.inputs)}

## 输出

${renderList(data.outputs)}

## 上游依赖

${renderIncoming(node, nodes, edges)}

## 下游交接

${renderOutgoing(node, nodes, edges)}

## 必须遵守

${renderList(requires)}

## 禁止行为

${renderList(forbids)}

## 可用工具

${renderList(tools)}

## 执行流程

${renderList(data.steps)}

## 完成标准

${renderList(checks)}

## 失败处理

${renderList(fallbacks)}

## 参考资料

${renderList(references)}
`;
}

export function generateAllSkillMarkdown(
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): Record<string, string> {
  return Object.fromEntries(
    nodes
      .filter((node) => node.data.nodeType === "skill")
      .map((node) => [node.id, generateSkillMarkdown(node, nodes, edges)]),
  );
}
