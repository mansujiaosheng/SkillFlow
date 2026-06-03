import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import type { SkillFlowNode } from "../types/project";

export function SkillNode({ data, selected }: NodeProps<SkillFlowNode>) {
  return (
    <div className={`skill-node ${selected ? "skill-node-selected" : ""}`}>
      <Handle
        className="skill-node-handle skill-node-handle-in"
        id="in"
        isConnectable
        type="target"
        position={Position.Left}
      />
      <span className="handle-label handle-label-in">输入</span>
      <div className="skill-node-header">
        <FileText size={16} />
        <span>{data.name || "未命名 Skill"}</span>
      </div>
      <p>{data.description || "点击右侧面板编辑 Skill 描述"}</p>
      <div className="skill-node-meta">
        <span>{data.folder || "skill-folder"}</span>
        <span>{data.rules.length} rules</span>
      </div>
      <span className="handle-label handle-label-out">输出</span>
      <Handle
        className="skill-node-handle skill-node-handle-out"
        id="out"
        isConnectable
        type="source"
        position={Position.Right}
      />
    </div>
  );
}
