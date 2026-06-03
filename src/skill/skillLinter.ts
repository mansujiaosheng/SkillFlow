import type {
  LintIssue,
  LintReport,
  NodeResource,
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
  action?: string,
): LintIssue {
  return {
    id: `${level}-${nodeId || "project"}-${message}`,
    level,
    message,
    nodeId,
    action,
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
  projectResources: NodeResource[] = [],
): LintReport {
  const critical: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const suggestions: LintIssue[] = [];

  nodes.forEach((node) => {
    const markdown = generateSkillMarkdown(node, nodes, edges);

    if (!markdown.startsWith("---")) {
      critical.push(issue("critical", "缺少 YAML frontmatter", node.id, "切换到结构化生成或补齐手写 Markdown 的 frontmatter"));
    }
    if (!node.data.name.trim()) {
      critical.push(issue("critical", "缺少 name", node.id, "填写技能名"));
    }
    if (!node.data.description.trim()) {
      critical.push(issue("critical", "缺少 description", node.id, "填写能说明触发场景的描述"));
    }
    requiredSections.forEach((section) => {
      if (!markdown.includes(section)) {
        critical.push(issue("critical", `缺少 ${section}`, node.id, "在节点配置中补齐对应字段，或调整模板区块"));
      }
    });

    if (!node.data.whenToUse.length) {
      warnings.push(issue("warning", "没有配置使用时机", node.id, "补充什么时候应该使用该 Skill"));
    }
    if (!node.data.inputs.length) {
      warnings.push(issue("warning", "没有配置输入", node.id, "补充该 Skill 需要接收的数据或文件"));
    }
    if (!node.data.outputs.length) {
      warnings.push(issue("warning", "没有配置输出", node.id, "补充该 Skill 产出的结果"));
    }
    if (!node.data.requires.length && !node.data.rules.some((r) => r.type === "require")) {
      warnings.push(issue("warning", "没有必须遵守规则", node.id, "补充 #require 或必须遵守内容"));
    }
    if (!node.data.forbids.length && !node.data.rules.some((r) => r.type === "forbid")) {
      warnings.push(issue("warning", "没有禁止行为", node.id, "补充 #forbid 或禁止行为"));
    }

    weakWords.forEach((word) => {
      if (markdown.includes(word)) {
        warnings.push(issue("warning", `出现弱约束词：“${word}”`, node.id, "改成明确、可检查的强约束表达"));
      }
    });
    dangerousWords.forEach((word) => {
      if (markdown.includes(word)) {
        critical.push(issue("critical", `出现危险行为：“${word}”`, node.id, "删除危险行为，或改成需要用户确认的安全步骤"));
      }
    });

    const connected = edges.some(
      (edge) => edge.source === node.id || edge.target === node.id,
    );
    if (nodes.length > 1 && !connected) {
      warnings.push(issue("warning", "存在孤立节点", node.id, "将该节点连接到上游或下游节点"));
    }

    const outgoing = edges.filter((edge) => edge.source === node.id);
    if (node.data.outputs.length && !outgoing.length) {
      suggestions.push(
        issue("suggestion", "关键节点没有下游交接说明", node.id),
      );
    }
  });

  nodes.forEach((node) => {
    const invalidRefs = node.data.resourceRefs.filter(
      (resourceId) => !projectResources.some((resource) => resource.id === resourceId),
    );
    invalidRefs.forEach((resourceId) => {
      warnings.push(
        issue("warning", `资源引用失效：${resourceId}`, node.id, "重新选择资源库中的资源"),
      );
    });

    const linkedResources = projectResources.filter((resource) =>
      node.data.resourceRefs.includes(resource.id),
    );
    const resources = [
      ...linkedResources,
      ...node.data.scripts,
      ...node.data.referenceResources,
      ...node.data.assets,
      ...node.data.attachments,
    ];
    const seenPaths = new Set<string>();

    resources.forEach((resource) => {
      const label = resource.name || resource.kind;
      if (!resource.path.trim()) {
        warnings.push(
          issue("warning", `资源“${label}”缺少路径或 URL`, node.id, "填写相对路径或 URL"),
        );
      }
      if (resource.kind === "script" && !resource.description.trim()) {
        warnings.push(
          issue("warning", `脚本“${label}”缺少用途说明`, node.id, "说明脚本用途，但不要在 SkillFlow 内执行"),
        );
      }
      if (resource.kind === "reference" && !resource.name.trim()) {
        warnings.push(
          issue("warning", "参考资料缺少标题", node.id, "填写 reference 标题"),
        );
      }
      if (resource.path.trim()) {
        if (seenPaths.has(resource.path.trim())) {
          suggestions.push(
            issue("suggestion", `资源路径重复：${resource.path}`, node.id, "合并重复资源或改成不同路径"),
          );
        }
        seenPaths.add(resource.path.trim());
      }
    });
  });

  if (hasCycle(nodes, edges)) {
    critical.push(issue("critical", "流程中存在循环依赖", undefined, "调整流程线，避免互相依赖"));
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
