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
import { SemanticEdge } from "./SemanticEdge";
import {
  createNodeFromTemplate,
  createWorkflowEdgeData,
  type SkillFlowEdge,
  type SkillFlowNode,
} from "../types/project";

const nodeTypes = {
  skillNode: SkillNode,
};

const edgeTypes = {
  semantic: SemanticEdge,
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
            type: "semantic",
            data: createWorkflowEdgeData(),
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
      const type =
        event.dataTransfer.getData("application/skillflow") ||
        event.dataTransfer.getData("text/plain");
      if (!type) return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const node = createNodeFromTemplate(type as SkillFlowNode["data"]["nodeType"], position);
      onNodesUpdate([...nodes, node]);
    },
    [nodes, onNodesUpdate, reactFlow],
  );

  return (
    <main className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={onDrop}
        defaultEdgeOptions={{
          style: { stroke: "#8fb7aa", strokeWidth: 2 },
        }}
        connectionLineStyle={{ stroke: "#d8f3e8", strokeWidth: 2 }}
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
