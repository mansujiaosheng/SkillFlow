import { formatEdgeLabel, relationLabels } from "../flow/edgeLabels";
import type { SkillFlowEdge, SkillFlowNode } from "../types/project";

export function generateWorkflowMarkdown(
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  const nodeName = (id: string) =>
    nodes.find((node) => node.id === id)?.data.name || id;

  const nodeLines = nodes.map(
    (node, index) => {
      const nodeKind = node.data.nodeType === "note" ? "画布备注" : "Skill";
      const generateLabel = node.data.nodeType === "note" ? "不生成 SKILL.md" : "生成 SKILL.md";
      return `${index + 1}. ${node.data.name} (${nodeKind} / ${generateLabel}) - ${
        node.data.description || "未填写描述"
      }`;
    },
  );

  const edgeLines = edges.map((edge) => {
    const data = edge.data;
    const relation = data?.relation || "handoff";
    const handoff = data?.handoffData?.length
      ? `；交接数据：${data.handoffData.join("、")}`
      : "";
    const description = data?.description ? `；说明：${data.description}` : "";
    const required = data?.required ? "；强制" : "；可选";
    return `- ${nodeName(edge.source)} -> ${nodeName(edge.target)}：${
      relationLabels[relation]
    }${required}${handoff}${description}
  - 画布标签：${formatEdgeLabel(edge)}`;
  });

  return `# SkillFlow Workflow

## Skill 节点

${nodeLines.length ? nodeLines.join("\n") : "- 暂无节点"}

## 流程关系

${edgeLines.length ? edgeLines.join("\n") : "- 暂无流程关系"}
`;
}
