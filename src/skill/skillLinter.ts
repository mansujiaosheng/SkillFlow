import type {
  LintIssue,
  LintReport,
  SkillFlowEdge,
  SkillFlowNode,
} from "../types/project";
import { generateSkillMarkdown } from "./skillGenerator";

const requiredSections = [
  "## 使用时机",
  "## 输入",
  "## 输出",
  "## 必须遵守",
  "## 禁止行为",
  "## 执行流程",
  "## 完成标准",
];

const weakWords = ["可以", "建议", "尽量", "最好", "maybe", "should"];
const dangerousWords = ["自动删除文件", "自动发送敏感信息", "执行未知脚本"];

function issue(
  level: LintIssue["level"],
  message: string,
  nodeId?: string,
): LintIssue {
  return {
    id: `${level}-${nodeId || "project"}-${message}`,
    level,
    message,
    nodeId,
  };
}

function hasCycle(nodes: SkillFlowNode[], edges: SkillFlowEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges
    .filter((edge) => edge.data?.relation !== "parallel_with")
    .forEach((edge) => adjacency.get(edge.source)?.push(edge.target));

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of adjacency.get(id) || []) {
      if (visit(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  return nodes.some((node) => visit(node.id));
}

export function lintProject(
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): LintReport {
  const critical: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const suggestions: LintIssue[] = [];

  nodes.forEach((node) => {
    const markdown = generateSkillMarkdown(node, nodes, edges);

    if (!markdown.startsWith("---")) {
      critical.push(issue("critical", "缺少 YAML frontmatter", node.id));
    }
    if (!node.data.name.trim()) {
      critical.push(issue("critical", "缺少 name", node.id));
    }
    if (!node.data.description.trim()) {
      critical.push(issue("critical", "缺少 description", node.id));
    }
    requiredSections.forEach((section) => {
      if (!markdown.includes(section)) {
        critical.push(issue("critical", `缺少 ${section}`, node.id));
      }
    });

    if (!node.data.whenToUse.length) {
      warnings.push(issue("warning", "没有配置使用时机", node.id));
    }
    if (!node.data.inputs.length) {
      warnings.push(issue("warning", "没有配置输入", node.id));
    }
    if (!node.data.outputs.length) {
      warnings.push(issue("warning", "没有配置输出", node.id));
    }
    if (!node.data.requires.length && !node.data.rules.some((r) => r.type === "require")) {
      warnings.push(issue("warning", "没有必须遵守规则", node.id));
    }
    if (!node.data.forbids.length && !node.data.rules.some((r) => r.type === "forbid")) {
      warnings.push(issue("warning", "没有禁止行为", node.id));
    }

    weakWords.forEach((word) => {
      if (markdown.includes(word)) {
        warnings.push(issue("warning", `出现弱约束词：“${word}”`, node.id));
      }
    });
    dangerousWords.forEach((word) => {
      if (markdown.includes(word)) {
        critical.push(issue("critical", `出现危险行为：“${word}”`, node.id));
      }
    });

    const connected = edges.some(
      (edge) => edge.source === node.id || edge.target === node.id,
    );
    if (nodes.length > 1 && !connected) {
      warnings.push(issue("warning", "存在孤立节点", node.id));
    }

    const outgoing = edges.filter((edge) => edge.source === node.id);
    if (node.data.outputs.length && !outgoing.length) {
      suggestions.push(
        issue("suggestion", "关键节点没有下游交接说明", node.id),
      );
    }
  });

  if (hasCycle(nodes, edges)) {
    critical.push(issue("critical", "流程中存在循环依赖"));
  }

  const penalty = critical.length * 14 + warnings.length * 5 + suggestions.length * 2;
  const score = Math.max(0, 100 - penalty);

  return {
    score,
    critical,
    warnings,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
}
