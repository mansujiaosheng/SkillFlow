// ============================================================
// InspectorPanel - 右侧属性面板（三种显示模式）
//
// 模式 A: 未选中任何对象 - 显示提示文字
// 模式 B: 选中 Skill 节点 - 显示完整编辑表单
// 模式 C: 选中连线 - 显示连线编辑表单
//
// 数据更新逻辑：
//   - 所有字段变更通过 store 的 setWorkflow 更新
//   - 修改节点数据时，找到 workflow.nodes 中对应 id 的节点并更新其 data 字段
//   - 修改连线数据时，找到 workflow.edges 中对应 id 的连线并更新其字段
//
// 底部操作按钮：
//   - 生成 SKILL.md: 对当前节点生成完整 Markdown 内容，在弹窗中预览
//   - 检查当前 Skill: 对当前节点运行 Lint 检查
//   - 保存当前 Skill: 保存当前节点的数据
// ============================================================

import { useCallback, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { EditableList } from './EditableList';
import { RuleBlockList } from './RuleBlockList';
import { LintPanel } from './LintPanel';
import { generateSkillMarkdown, getNodeRelations } from '../skill/skillTemplate';
import type { SkillNodeData, EdgeRelation, RuleBlock } from '../types';

/**
 * 连线关系类型的中文显示标签映射
 */
const EDGE_RELATION_LABELS: Record<EdgeRelation, string> = {
  before: '顺序执行（A 在 B 之前）',
  depends_on: '依赖关系（B 依赖 A）',
  handoff: '交接（A 移交 B）',
  review_by: '审核（A 由 B 审核）',
  fallback_to: '回退（A 失败回退 B）',
  parallel_with: '并行（A 与 B 并行）',
};

/**
 * 编辑模式选项
 */
const EDIT_MODE_OPTIONS: { value: SkillNodeData['editMode']; label: string }[] = [
  { value: 'structured', label: '结构化编辑' },
  { value: 'manual', label: '手动 Markdown' },
  { value: 'hybrid', label: '混合模式' },
];

/**
 * 区域折叠标题组件
 * @param label - 标题文字
 */
function SectionHeader({ label }: { label: string }) {
  return <h4 className="inspector-section__title">{label}</h4>;
}

/**
 * InspectorPanel 右侧属性面板组件
 */
export function InspectorPanel() {
  // ---- 从全局 store 获取状态 ----
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectedEdgeId = useAppStore((s) => s.selectedEdgeId);
  const workflow = useAppStore((s) => s.workflow);
  const setWorkflow = useAppStore((s) => s.setWorkflow);

  // ---- 本地状态：生成结果弹窗 ----
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState('');

  // ---- 本地状态：Lint 检查弹窗 ----
  const [showLintPreview, setShowLintPreview] = useState(false);

  // ---- 根据选中的 ID 查找对应的节点和连线数据 ----
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, workflow.nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return workflow.edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [selectedEdgeId, workflow.edges]);

  // ============================================================
  // 节点数据更新函数
  // ============================================================

  /**
   * 更新选中节点的单个 data 字段
   * 使用 useCallback 缓存，依赖 selectedNodeId 和 workflow
   *
   * @param field - 要更新的 SkillNodeData 字段名
   * @param value - 新值
   */
  const updateNodeData = useCallback(
    (field: string, value: unknown) => {
      if (!selectedNodeId) return;
      const newNodes = workflow.nodes.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, [field]: value } };
        }
        return node;
      });
      setWorkflow({ ...workflow, nodes: newNodes });
    },
    [selectedNodeId, workflow, setWorkflow],
  );

  // ============================================================
  // 连线数据更新函数
  // ============================================================

  /**
   * 更新选中连线的单个字段
   *
   * @param field - 要更新的 WorkflowEdge 字段名
   * @param value - 新值
   */
  const updateEdgeData = useCallback(
    (field: string, value: unknown) => {
      if (!selectedEdgeId) return;
      const newEdges = workflow.edges.map((edge) => {
        if (edge.id === selectedEdgeId) {
          return { ...edge, [field]: value };
        }
        return edge;
      });
      setWorkflow({ ...workflow, edges: newEdges });
    },
    [selectedEdgeId, workflow, setWorkflow],
  );

  // ============================================================
  // 底部按钮处理函数
  // ============================================================

  /**
   * 处理"生成 SKILL.md"按钮点击
   *
   * 对当前选中的 Skill 节点，调用 generateSkillMarkdown 生成完整的
   * Markdown 内容，然后在弹窗中展示预览结果。
   *
   * 注意：当前阶段仅在前端生成 Markdown 字符串，
   * 后续会通过 Tauri 后端将 SKILL.md 落地到磁盘。
   */
  const handleGenerateSkill = useCallback(() => {
    if (!selectedNodeId || !selectedNode) return;

    const data = selectedNode.data as SkillNodeData;

    // 获取当前节点的上下游关系
    const { incoming, outgoing } = getNodeRelations(
      selectedNodeId,
      workflow.nodes,
      workflow.edges,
    );

    // 生成 SKILL.md 内容
    const markdown = generateSkillMarkdown(data, incoming, outgoing);

    setGeneratedMarkdown(markdown);
    setShowGeneratedPreview(true);
  }, [selectedNodeId, selectedNode, workflow]);

  /**
   * 处理"检查当前 Skill"按钮点击
   *
   * 对当前选中的 Skill 节点运行 lintNode 单节点检查，
   * 结果通过 LintPanel 弹窗展示。
   */
  const handleCheckSkill = useCallback(() => {
    if (!selectedNodeId || !selectedNode) return;
    setShowLintPreview(true);
  }, [selectedNodeId, selectedNode]);

  /**
   * 处理"保存当前 Skill"按钮点击
   *
   * 当前阶段仅打印日志，后续集成 Tauri 后端持久化。
   */
  const handleSaveSkill = useCallback(() => {
    if (!selectedNodeId || !selectedNode) return;
    const data = selectedNode.data as SkillNodeData;
    console.log('保存当前 Skill', { nodeId: selectedNodeId, name: data.name, data });
  }, [selectedNodeId, selectedNode]);

  // ============================================================
  // 面板头部（公共）
  // ============================================================
  const panelHeader = (
    <div className="inspector-panel__header">
      <h3 className="inspector-panel__title">属性面板</h3>
    </div>
  );

  // ============================================================
  // 模式 A: 未选中任何对象
  // ============================================================
  if (!selectedNodeId && !selectedEdgeId) {
    return (
      <aside className="inspector-panel">
        {panelHeader}
        <div className="inspector-panel__body">
          <p className="inspector-panel__empty">点击节点或连线查看属性</p>
        </div>
      </aside>
    );
  }

  // ============================================================
  // 模式 B: 选中 Skill 节点
  // ============================================================
  if (selectedNode && selectedNode.data) {
    const data = selectedNode.data;

    return (
      <aside className="inspector-panel">
        {panelHeader}
        <div className="inspector-panel__body inspector-panel__body--scrollable">

          {/* ======== 节点 ID 信息 ======== */}
          <div className="inspector-field">
            <label className="inspector-field__label">节点 ID</label>
            <input
              type="text"
              className="inspector-field__input inspector-field__input--readonly"
              value={selectedNode.id}
              readOnly
            />
          </div>

          {/* ======== 基础信息区 ======== */}
          <section className="inspector-section">
            <SectionHeader label="基础信息" />

            {/* 技能名（必填） */}
            <div className="inspector-field">
              <label className="inspector-field__label">
                技能名 <span className="inspector-field__required">*</span>
              </label>
              <input
                type="text"
                className="inspector-field__input"
                value={data.name}
                placeholder="输入技能名称"
                onChange={(e) => updateNodeData('name', e.target.value)}
              />
            </div>

            {/* 目录名（自动 slug 化） */}
            <div className="inspector-field">
              <label className="inspector-field__label">目录名</label>
              <input
                type="text"
                className="inspector-field__input"
                value={data.folder}
                placeholder="自动生成文件夹名"
                onChange={(e) => updateNodeData('folder', e.target.value)}
              />
            </div>

            {/* 描述（3行 textarea） */}
            <div className="inspector-field">
              <label className="inspector-field__label">描述</label>
              <textarea
                className="inspector-field__textarea"
                value={data.description}
                placeholder="输入技能描述"
                rows={3}
                onChange={(e) => updateNodeData('description', e.target.value)}
              />
            </div>

            {/* 编辑模式 */}
            <div className="inspector-field">
              <label className="inspector-field__label">编辑模式</label>
              <select
                className="inspector-field__select"
                value={data.editMode}
                onChange={(e) => updateNodeData('editMode', e.target.value as SkillNodeData['editMode'])}
              >
                {EDIT_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ======== 触发条件区 ======== */}
          <section className="inspector-section">
            <SectionHeader label="触发条件" />

            {/* 适用场景（多行文本列表，每行一项，可增删） */}
            <EditableList
              items={data.whenToUse}
              onChange={(items) => updateNodeData('whenToUse', items)}
              placeholder="描述适用场景..."
              label="什么时候使用"
            />

            {/* 不适用场景 */}
            <EditableList
              items={data.whenNotToUse}
              onChange={(items) => updateNodeData('whenNotToUse', items)}
              placeholder="描述不适用场景..."
              label="不适用场景"
            />
          </section>

          {/* ======== 输入输出区 ======== */}
          <section className="inspector-section">
            <SectionHeader label="输入输出" />

            {/* 输入 */}
            <EditableList
              items={data.inputs}
              onChange={(items) => updateNodeData('inputs', items)}
              placeholder="输入参数..."
              label="输入"
            />

            {/* 输出 */}
            <EditableList
              items={data.outputs}
              onChange={(items) => updateNodeData('outputs', items)}
              placeholder="输出结果..."
              label="输出"
            />

            {/* 可用工具 */}
            <EditableList
              items={data.tools}
              onChange={(items) => updateNodeData('tools', items)}
              placeholder="工具名称..."
              label="可用工具"
            />
          </section>

          {/* ======== 执行流程区 ======== */}
          <section className="inspector-section">
            <SectionHeader label="执行流程" />

            {/* 执行步骤（可增删） */}
            <EditableList
              items={data.steps}
              onChange={(items) => updateNodeData('steps', items)}
              placeholder="执行步骤..."
              label="执行步骤"
            />
          </section>

          {/* ======== 规则约束区 ======== */}
          <section className="inspector-section">
            <RuleBlockList
              rules={data.rules}
              onChange={(rules: RuleBlock[]) => updateNodeData('rules', rules)}
            />
          </section>

          {/* ======== 完成标准区 ======== */}
          <section className="inspector-section">
            <SectionHeader label="完成标准" />

            {/* 检查项 */}
            <EditableList
              items={data.checks}
              onChange={(items) => updateNodeData('checks', items)}
              placeholder="检查项..."
              label="完成标准"
            />

            {/* 失败处理 */}
            <EditableList
              items={data.fallbacks}
              onChange={(items) => updateNodeData('fallbacks', items)}
              placeholder="失败处理方案..."
              label="失败处理"
            />

            {/* 参考资料 */}
            <EditableList
              items={data.references}
              onChange={(items) => updateNodeData('references', items)}
              placeholder="参考资料..."
              label="参考资料"
            />
          </section>

          {/* ======== 手写模式区（仅 manual 模式显示） ======== */}
          {data.editMode === 'manual' && (
            <section className="inspector-section">
              <SectionHeader label="手写 Markdown" />
              <textarea
                className="inspector-field__textarea inspector-field__textarea--large"
                value={data.manualMarkdown}
                placeholder="在此手写完整 Markdown 内容..."
                rows={10}
                onChange={(e) => updateNodeData('manualMarkdown', e.target.value)}
              />
            </section>
          )}

          {/* ======== AI 生成预览区（仅 hybrid 模式显示） ======== */}
          {data.editMode === 'hybrid' && data.aiGeneratedMarkdown && (
            <section className="inspector-section">
              <SectionHeader label="AI 生成预览" />
              <pre className="inspector-markdown-preview">
                {data.aiGeneratedMarkdown}
              </pre>
            </section>
          )}

          {/* ======== 底部按钮区 ======== */}
          <div className="inspector-actions">
            <button
              type="button"
              className="inspector-btn inspector-btn--primary"
              onClick={handleGenerateSkill}
            >
              生成 SKILL.md
            </button>
            <button
              type="button"
              className="inspector-btn inspector-btn--secondary"
              onClick={handleCheckSkill}
            >
              检查当前 Skill
            </button>
            <button
              type="button"
              className="inspector-btn inspector-btn--secondary"
              onClick={handleSaveSkill}
            >
              保存当前 Skill
            </button>
          </div>
        </div>

        {/* ---- 生成 SKILL.md 预览弹窗 ---- */}
        {showGeneratedPreview && (
          <div className="dialog-overlay" onClick={() => setShowGeneratedPreview(false)}>
            <div
              className="generated-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dialog-header">
                <h3 className="dialog-title">
                  SKILL.md 预览 - {data.name || selectedNode.id}
                </h3>
                <button
                  className="dialog-close-btn"
                  onClick={() => setShowGeneratedPreview(false)}
                  title="关闭"
                >
                  {'\u2715'}
                </button>
              </div>
              <div className="generated-modal-body">
                <pre className="generated-modal-item__content">
                  {generatedMarkdown}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ---- Lint 检查弹窗 ---- */}
        {showLintPreview && (
          <div className="dialog-overlay" onClick={() => setShowLintPreview(false)}>
            <div
              className="lint-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <LintPanel
                nodeId={selectedNodeId ?? undefined}
                closable
                onClose={() => setShowLintPreview(false)}
              />
            </div>
          </div>
        )}
      </aside>
    );
  }

  // ============================================================
  // 模式 C: 选中连线
  // ============================================================
  if (selectedEdge) {
    // 查找上下游节点名称
    const sourceNode = workflow.nodes.find((n) => n.id === selectedEdge.source);
    const targetNode = workflow.nodes.find((n) => n.id === selectedEdge.target);
    const sourceName = sourceNode?.data?.name ?? selectedEdge.source;
    const targetName = targetNode?.data?.name ?? selectedEdge.target;

    return (
      <aside className="inspector-panel">
        {panelHeader}
        <div className="inspector-panel__body inspector-panel__body--scrollable">

          {/* 连线 ID */}
          <div className="inspector-field">
            <label className="inspector-field__label">连线 ID</label>
            <input
              type="text"
              className="inspector-field__input inspector-field__input--readonly"
              value={selectedEdge.id}
              readOnly
            />
          </div>

          {/* 关系类型（下拉选择器） */}
          <div className="inspector-field">
            <label className="inspector-field__label">关系类型</label>
            <select
              className="inspector-field__select"
              value={selectedEdge.relation}
              onChange={(e) => updateEdgeData('relation', e.target.value as EdgeRelation)}
            >
              {(Object.entries(EDGE_RELATION_LABELS) as [EdgeRelation, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* 上游节点（只读） */}
          <div className="inspector-field">
            <label className="inspector-field__label">上游节点</label>
            <input
              type="text"
              className="inspector-field__input inspector-field__input--readonly"
              value={sourceName}
              readOnly
            />
          </div>

          {/* 下游节点（只读） */}
          <div className="inspector-field">
            <label className="inspector-field__label">下游节点</label>
            <input
              type="text"
              className="inspector-field__input inspector-field__input--readonly"
              value={targetName}
              readOnly
            />
          </div>

          {/* 交接数据（可增删列表） */}
          <div className="inspector-section">
            <EditableList
              items={selectedEdge.handoffData}
              onChange={(items) => updateEdgeData('handoffData', items)}
              placeholder="交接数据字段..."
              label="交接数据"
            />
          </div>

          {/* 说明（文本框） */}
          <div className="inspector-field">
            <label className="inspector-field__label">说明</label>
            <textarea
              className="inspector-field__textarea"
              value={selectedEdge.description}
              placeholder="连线描述..."
              rows={2}
              onChange={(e) => updateEdgeData('description', e.target.value)}
            />
          </div>

          {/* 是否强制（checkbox） */}
          <div className="inspector-field inspector-field--checkbox">
            <label className="inspector-field__checkbox-label">
              <input
                type="checkbox"
                className="inspector-field__checkbox"
                checked={selectedEdge.required}
                onChange={(e) => updateEdgeData('required', e.target.checked)}
              />
              是否强制
            </label>
          </div>
        </div>
      </aside>
    );
  }

  // 理论上不会到达这里（兜底）：
  // selectedNodeId 或 selectedEdgeId 非空但找不到对应数据
  return (
    <aside className="inspector-panel">
      {panelHeader}
      <div className="inspector-panel__body">
        <p className="inspector-panel__empty">未找到选中对象的数据</p>
      </div>
    </aside>
  );
}