import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback } from "react";
import { SkillNode } from "./SkillNode";
import {
  createSkillNode,
  createWorkflowEdgeData,
  type SkillFlowEdge,
  type SkillFlowNode,
} from "../types/project";

const nodeTypes = {
  skillNode: SkillNode,
};

interface FlowCanvasProps {
  nodes: SkillFlowNode[];
  edges: SkillFlowEdge[];
  onNodesChange: (changes: NodeChange<SkillFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<SkillFlowEdge>[]) => void;
  onNodesUpdate: (nodes: SkillFlowNode[]) => void;
  onEdgesUpdate: (edges: SkillFlowEdge[]) => void;
  onSelectionChange: (selection: { nodes: SkillFlowNode[]; edges: SkillFlowEdge[] }) => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodesUpdate,
  onEdgesUpdate,
  onSelectionChange,
}: FlowCanvasProps) {
  const reactFlow = useReactFlow<SkillFlowNode, SkillFlowEdge>();

  const onConnect = useCallback(
    (connection: Connection) => {
      onEdgesUpdate(
        addEdge(
          {
            ...connection,
            id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
            data: createWorkflowEdgeData(),
            animated: true,
          },
          edges,
        ),
      );
    },
    [edges, onEdgesUpdate],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/skillflow");
      if (!type) return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const node = createSkillNode(`node-${Date.now()}`, position, "新 Skill");
      node.data.nodeType = type === "skill" ? "skill" : (type as SkillFlowNode["data"]["nodeType"]);
      node.data.label = node.data.name;
      onNodesUpdate([...nodes, node]);
    },
    [nodes, onNodesUpdate, reactFlow],
  );

  return (
    <main className="canvas" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift"]}
      >
        <Background />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </main>
  );
}
