import type { SkillFlowEdge } from "../types/project";

export const relationLabels = {
  before: "前置",
  depends_on: "依赖",
  handoff: "交接",
  review_by: "审查",
  fallback_to: "失败回退",
  parallel_with: "并行",
} as const;

export function formatEdgeLabel(edge: Pick<SkillFlowEdge, "data">): string {
  const relation = edge.data?.relation || "handoff";
  const relationText = relationLabels[relation];
  const handoff = edge.data?.handoffData?.filter(Boolean).slice(0, 3).join("、");
  const description = edge.data?.description?.trim();
  const required = edge.data?.required ? "强制" : "可选";

  return [
    relationText,
    required,
    handoff || "未配置数据",
    description ? `说明：${description}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
