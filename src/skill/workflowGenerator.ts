import type { SkillFlowEdge, SkillFlowNode } from "../types/project";

export function generateWorkflowMarkdown(
  nodes: SkillFlowNode[],
  edges: SkillFlowEdge[],
): string {
  const nodeName = (id: string) =>
    nodes.find((node) => node.id === id)?.data.name || id;

  const nodeLines = nodes.map(
    (node, index) =>
      `${index + 1}. ${node.data.name} (${node.data.folder}) - ${
        node.data.description || "未填写描述"
      }`,
  );

  const edgeLines = edges.map((edge) => {
    const data = edge.data;
    const handoff = data?.handoffData?.length
      ? `；交接数据：${data.handoffData.join("、")}`
      : "";
    const description = data?.description ? `；说明：${data.description}` : "";
    return `- ${nodeName(edge.source)} -> ${nodeName(edge.target)}：${
      data?.relation || "handoff"
    }${handoff}${description}`;
  });

  return `# SkillFlow Workflow

## Skill 节点

${nodeLines.length ? nodeLines.join("\n") : "- 暂无节点"}

## 流程关系

${edgeLines.length ? edgeLines.join("\n") : "- 暂无流程关系"}
`;
}
