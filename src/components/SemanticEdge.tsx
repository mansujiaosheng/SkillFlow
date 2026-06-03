import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { formatEdgeLabel } from "../flow/edgeLabels";
import type { SkillFlowEdge } from "../types/project";

export function SemanticEdge(props: EdgeProps<SkillFlowEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath(props);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{
          stroke: props.selected ? "#f5c16c" : "#8fb7aa",
          strokeWidth: props.selected ? 3 : 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${props.selected ? "edge-label-selected" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {formatEdgeLabel(props)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
