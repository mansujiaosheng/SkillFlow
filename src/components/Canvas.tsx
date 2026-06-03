// ============================================================
// Canvas - React Flow 核心画布组件
// 实现完整的可视化编排功能：拖放创建节点、连线、删除、选中
// ============================================================

import { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SkillNode } from './nodes/SkillNode';
import { useAppStore } from '../store/useAppStore';
import type { SkillNodeData, WorkflowNode, WorkflowEdge, EdgeRelation } from '../types';

// ---- 常量定义 ----

/** 默认 Skill 节点数据（拖拽创建时的初始值） */
const DEFAULT_SKILL_DATA: SkillNodeData = {
  name: '新 Skill',
  folder: '',
  description: '',
  whenToUse: [],
  whenNotToUse: [],
  inputs: [],
  outputs: [],
  tools: [],
  steps: [],
  checks: [],
  fallbacks: [],
  references: [],
  rules: [],
  editMode: 'structured',
  manualMarkdown: '',
  aiGeneratedMarkdown: '',
};

/** 默认连线关系类型 */
const DEFAULT_EDGE_RELATION: EdgeRelation = 'before';

// ---- 节点类型注册（将自定义组件映射到类型 key） ----
// React Flow 根据此映射渲染对应类型的节点组件
const nodeTypes = { skill: SkillNode };

/**
 * 将 store 中的 WorkflowNode 数组转换为 React Flow Node 数组
 *
 * 设计说明：
 * React Flow 的 Node 泛型要求 data 满足 Record<string, unknown>，
 * 而 SkillNodeData 是具体的接口类型，不满足该索引签名约束。
 * 因此这里统一使用 Node（即 Node<Record<string, unknown>>），
 * 并将 SkillNodeData 对象存入 data 字段（运行时完全兼容）。
 */
function workflowNodesToFlowNodes(workflowNodes: WorkflowNode[]): Node[] {
  return workflowNodes.map((wn) => ({
    id: wn.id,
    type: wn.type,
    position: wn.position,
    // SkillNodeData 作为 Record<string, unknown> 值存入，运行时不变
    data: wn.data as unknown as Record<string, unknown>,
  }));
}

/**
 * 将 store 中的 WorkflowEdge 数组转换为 React Flow Edge 数组
 * 将自定义字段（relation、handoffData、description、required）存入 edge.data
 */
function workflowEdgesToFlowEdges(workflowEdges: WorkflowEdge[]): Edge[] {
  return workflowEdges.map((we) => ({
    id: we.id,
    source: we.source,
    target: we.target,
    type: 'smoothstep' as const,
    animated: true,
    data: {
      relation: we.relation,
      handoffData: we.handoffData,
      description: we.description,
      required: we.required,
    },
  }));
}

/**
 * 将 React Flow Node 数组转换回 store 的 WorkflowNode 数组
 */
function flowNodesToWorkflowNodes(flowNodes: Node[]): WorkflowNode[] {
  return flowNodes.map((fn) => ({
    id: fn.id,
    type: fn.type ?? 'skill',
    position: fn.position,
    // 从 Record<string, unknown> 转回 SkillNodeData
    data: fn.data as unknown as SkillNodeData,
  }));
}

/**
 * 将 React Flow Edge 数组转换回 store 的 WorkflowEdge 数组
 */
function flowEdgesToWorkflowEdges(flowEdges: Edge[]): WorkflowEdge[] {
  return flowEdges.map((fe) => ({
    id: fe.id,
    source: fe.source,
    target: fe.target,
    relation: (fe.data?.relation as EdgeRelation) ?? DEFAULT_EDGE_RELATION,
    handoffData: (fe.data?.handoffData as string[]) ?? [],
    description: (fe.data?.description as string) ?? '',
    required: (fe.data?.required as boolean) ?? false,
  }));
}

/**
 * Canvas 画布组件
 *
 * 核心功能：
 * 1. 节点拖放创建 - 从 SidebarPalette 拖入节点类型，在画布上生成新节点
 * 2. 连线管理 - 从节点输出句柄拖出连线到另一个节点的输入句柄
 * 3. 节点/连线删除 - Delete/Backspace 键删除选中元素
 * 4. 选中同步 - 选中节点时同步到全局 store，供右侧属性面板使用
 * 5. 数据双向同步 - 画布变动实时更新到 store，store 变动也会反映到画布
 *
 * 双向同步策略（避免死循环）：
 * - 使用 isProgrammaticUpdate ref 标记来自 store 的推送
 * - store -> canvas：workflow 变化时写入 canvas，同时设置标记
 * - canvas -> store：nodes/edges 变化时同步到 store，但跳过标记为 true 的轮次
 */
export function Canvas() {
  // ---- 从全局 store 获取工作流数据和选中状态设置方法 ----
  const workflow = useAppStore((s) => s.workflow);
  const setWorkflow = useAppStore((s) => s.setWorkflow);
  const setSelectedNodeId = useAppStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useAppStore((s) => s.setSelectedEdgeId);

  // ---- React Flow 节点/连线状态管理 ----
  // 使用 React Flow 提供的 hooks 管理内部状态，初始化数据来自 store
  const initialNodes = useMemo(() => workflowNodesToFlowNodes(workflow.nodes), []);
  const initialEdges = useMemo(() => workflowEdgesToFlowEdges(workflow.edges), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ---- React Flow 实例（用于坐标转换等操作） ----
  const { screenToFlowPosition } = useReactFlow();

  // ---- 标记：当前一轮的 nodes/edges 变更是否来自 store 推送 ----
  // 当标志为 true 时，跳过 canvas -> store 的同步，避免死循环
  const isProgrammaticUpdate = useRef(false);

  // ---- 当 store 中的 workflow 被外部更新时（如加载项目），同步到画布 ----
  useEffect(() => {
    // 设置标记：本轮画布节点/连线变更是由 store 推送触发
    isProgrammaticUpdate.current = true;
    setNodes(workflowNodesToFlowNodes(workflow.nodes));
    setEdges(workflowEdgesToFlowEdges(workflow.edges));
  }, [workflow, setNodes, setEdges]);

  // ---- 当画布 nodes/edges 发生变更时，同步到 store ----
  // 通过 useEffect 监听 nodes 和 edges 的变化，这是最可靠的同步方式
  useEffect(() => {
    // 如果本轮变更是由 store 推送引起的（isProgrammaticUpdate 为 true），
    // 跳过回写以避免死循环（store -> canvas -> store -> canvas ...）
    if (isProgrammaticUpdate.current) {
      isProgrammaticUpdate.current = false;
      return;
    }

    // 将当前画布状态序列化为 store 格式并写入
    const wfNodes = flowNodesToWorkflowNodes(nodes);
    const wfEdges = flowEdgesToWorkflowEdges(edges);
    setWorkflow({ nodes: wfNodes, edges: wfEdges });
  }, [nodes, edges, setWorkflow]);

  /**
   * 处理拖拽经过画布事件
   * 必须调用 preventDefault 以允许 drop 事件触发
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * 处理从 SidebarPalette 拖入节点的 drop 事件
   *
   * 流程：
   * 1. 从 dataTransfer 读取节点类型
   * 2. 将屏幕坐标转换为画布坐标（screenToFlowPosition）
   * 3. 创建新的 Node（含默认 SkillNodeData）
   * 4. 调用 setNodes 追加到数组，触发的 useEffect 会自动同步到 store
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // 读取 SidebarPalette onDragStart 时设置的节点类型
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      // 将浏览器屏幕坐标转换为 React Flow 画布坐标
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 生成唯一节点 ID
      const newNodeId = crypto.randomUUID();

      // 创建新节点
      const newNode: Node = {
        id: newNodeId,
        type: nodeType,
        position,
        // SkillNodeData 对象存入 data 字段（运行时完全兼容）
        data: { ...DEFAULT_SKILL_DATA } as unknown as Record<string, unknown>,
      };

      // 追加新节点（useEffect 会自动同步到 store）
      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes],
  );

  /**
   * 处理连线创建
   *
   * 当用户从源节点的输出句柄拖线到目标节点的输入句柄时触发。
   * 创建一条带有默认 relation="before" 和流动动画的贝塞尔连线。
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      // 手动创建连线（不使用 addEdge，以便添加自定义 edge.data）
      const newEdge: Edge = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'smoothstep',
        animated: true,
        data: {
          relation: DEFAULT_EDGE_RELATION,
          handoffData: [] as string[],
          description: '',
          required: false,
        },
      };

      setEdges((eds) => [...eds, newEdge]);
    },
    [setEdges],
  );

  /**
   * 处理节点点击选中
   * 将选中的节点 ID 存入全局 store，供右侧属性面板使用
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null); // 清除连线选中
    },
    [setSelectedNodeId, setSelectedEdgeId],
  );

  /**
   * 处理连线点击选中
   */
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null); // 清除节点选中
    },
    [setSelectedEdgeId, setSelectedNodeId],
  );

  /**
   * 点击画布空白区域时清除所有选中
   */
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  // ---- 默认连线样式（贝塞尔曲线 + 动画） ----
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep' as const,
      animated: true,
    }),
    [],
  );

  return (
    <div className="canvas-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        // Delete / Backspace 键删除选中元素
        deleteKeyCode={['Delete', 'Backspace']}
        // Shift 键 + 点击进行多选
        multiSelectionKeyCode="Shift"
        // 初始时自动适配视图（居中显示所有节点）
        fitView
      >
        {/* ---- 背景：点状网格（20px 间距，大小 1） ---- */}
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#30363d" />

        {/* ---- 缩放控件（右下角） ---- */}
        <Controls
          className="canvas-controls"
          position="bottom-right"
        />

        {/* ---- 小地图（右下角，Skill 节点蓝色，其他灰色） ---- */}
        <MiniMap
          className="canvas-minimap"
          position="bottom-right"
          nodeColor={(node) => {
            return node.type === 'skill' ? '#1f6feb' : '#6e7681';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  );
}