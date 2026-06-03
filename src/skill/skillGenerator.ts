import type {
  NodeResource,
  ProjectSettings,
  SkillFlowEdge,
  SkillFlowNode,
  SkillNodeData,
  TemplateSection,
  TemplateSectionKey,
} from "../types/project";
import { createDefaultTemplateSections, slugify } from "../types/project";

function yamlEscape(value: string): string {
  return value.replace(/"/g, '\\"');
}

function renderList(items: string[], fallback = "- 未配置"): string {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  return filtered.length ? filtered.map((item) => `- ${item}`).join("\n") : fallback;
}

function renderResources(resources: NodeResource[], fallback = "- 未配置"): string {
  const filtered = resources.filter(
    (resource) =>
      resource.name.trim() ||
      resource.path.trim() ||
      resource.resourceType.trim() ||
      resource.description.trim(),
  );
  if (!filtered.length) return fallback;

  return filtered
    .map((resource) => {
      const type = resource.resourceType ? ` (${resource.resourceType})` : "";
      const path = resource.path ? `：${resource.path}` : "";
      const description = resource.description ? ` - ${resource.description}` : "";
      return `- ${resource.name || "未命名资源"}${type}${path}${description}`;
    })
    .join("\n");
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

function sectionContent(
  key: TemplateSectionKey,
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  const data = node.data;
  const requires = [...data.requires, ...rulesOf(data, "require")];
  const forbids = [...data.forbids, ...rulesOf(data, "forbid")];
  const checks = [...data.checks, ...rulesOf(data, "check")];
  const tools = [...data.tools, ...rulesOf(data, "tool")];
  const fallbacks = [...data.fallbacks, ...rulesOf(data, "fallback")];
  const references = [
    ...data.references,
    ...rulesOf(data, "ref"),
    ...data.referenceResources.map((resource) => {
      const path = resource.path ? `：${resource.path}` : "";
      const description = resource.description ? ` - ${resource.description}` : "";
      return `${resource.name || "未命名参考资料"}${path}${description}`;
    }),
  ];

  const map: Record<TemplateSectionKey, string> = {
    whenToUse: renderList(data.whenToUse),
    whenNotToUse: renderList(data.whenNotToUse),
    inputs: renderList(data.inputs),
    outputs: renderList(data.outputs),
    upstream: renderIncoming(node, nodes, edges),
    downstream: renderOutgoing(node, nodes, edges),
    requires: renderList(requires),
    forbids: renderList(forbids),
    tools: renderList(tools),
    steps: renderList(data.steps),
    checks: renderList(checks),
    fallbacks: renderList(fallbacks),
    references: renderList(references),
    scripts: renderResources(data.scripts),
    assets: renderResources(data.assets),
    attachments: renderResources(data.attachments),
  };

  return map[key];
}

function renderSection(
  section: TemplateSection,
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  if (!section.enabled) return "";
  return `## ${section.title}\n\n${sectionContent(section.key, node, nodes, edges)}`;
}

function placeholderValues(
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): Record<string, string> {
  const data = node.data;
  const values: Record<string, string> = {
    name: data.name,
    description: data.description,
    whenToUse: sectionContent("whenToUse", node, nodes, edges),
    whenNotToUse: sectionContent("whenNotToUse", node, nodes, edges),
    inputs: sectionContent("inputs", node, nodes, edges),
    outputs: sectionContent("outputs", node, nodes, edges),
    upstream: sectionContent("upstream", node, nodes, edges),
    downstream: sectionContent("downstream", node, nodes, edges),
    requires: sectionContent("requires", node, nodes, edges),
    forbids: sectionContent("forbids", node, nodes, edges),
    tools: sectionContent("tools", node, nodes, edges),
    steps: sectionContent("steps", node, nodes, edges),
    checks: sectionContent("checks", node, nodes, edges),
    fallbacks: sectionContent("fallbacks", node, nodes, edges),
    references: sectionContent("references", node, nodes, edges),
    scripts: sectionContent("scripts", node, nodes, edges),
    assets: sectionContent("assets", node, nodes, edges),
    attachments: sectionContent("attachments", node, nodes, edges),
  };
  return values;
}

function renderAdvancedTemplate(
  template: string,
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  const values = placeholderValues(node, nodes, edges);
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return values[key] ?? match;
  });
}

export function resolveSkillFolders(nodes: SkillFlowNode[]): Record<string, string> {
  const counts = new Map<string, number>();
  const result: Record<string, string> = {};

  nodes.forEach((node) => {
    const base = slugify(node.data.folder || node.data.name) || slugify(node.id) || "skill";
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    result[node.id] = count === 0 ? base : `${base}-${count + 1}`;
  });

  return result;
}

export function generateSkillMarkdown(
  node: SkillFlowNode,
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
  settings?: ProjectSettings,
): string {
  if (node.data.editMode === "manual" && node.data.manualMarkdown.trim()) {
    return node.data.manualMarkdown.trimEnd() + "\n";
  }

  const data = node.data;
  const description =
    data.description ||
    `${data.name}，在相关任务触发时用于生成规范化 Agent Skill。`;
  const frontmatter = `---\nname: ${data.name}\ndescription: "${yamlEscape(description)}"\n---`;

  const body =
    settings?.templateMode === "advanced" && settings.advancedTemplate.trim()
      ? renderAdvancedTemplate(settings.advancedTemplate, node, nodes, edges)
      : (settings?.templateSections?.length
          ? settings.templateSections
          : createDefaultTemplateSections()
        )
          .map((section) => renderSection(section, node, nodes, edges))
          .filter(Boolean)
          .join("\n\n");

  const hybridAddition =
    node.data.editMode === "hybrid" && node.data.manualMarkdown.trim()
      ? `\n\n## 手写补充\n\n${node.data.manualMarkdown.trim()}`
      : "";

  return `${frontmatter}\n\n# ${data.name}\n\n${body}${hybridAddition}\n`;
}

export function generateAllSkillMarkdown(
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
  settings?: ProjectSettings,
): Record<string, string> {
  return Object.fromEntries(
    nodes
      .filter((node) => node.data.nodeType === "skill")
      .map((node) => [node.id, generateSkillMarkdown(node, nodes, edges, settings)]),
  );
}
