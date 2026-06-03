import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type {
  EdgeRelation,
  EditMode,
  NodeResource,
  ProjectTemplate,
  ResourceKind,
  RuleBlock,
  RuleType,
  SkillFlowEdge,
  SkillFlowNode,
  SkillNodeData,
  TemplateSection,
  TemplateSectionKey,
} from "../types/project";
import { createNodeResource, createProjectTemplate, createTemplateField } from "../types/project";

const primaryFields: Array<[keyof SkillNodeData, string]> = [
  ["whenToUse", "使用时机"],
  ["inputs", "输入"],
  ["outputs", "输出"],
  ["steps", "执行流程"],
  ["requires", "必须遵守"],
  ["forbids", "禁止行为"],
  ["checks", "完成标准"],
];

const extraFields: Array<[keyof SkillNodeData, string]> = [
  ["whenNotToUse", "不适用场景"],
  ["tools", "可用工具"],
  ["fallbacks", "失败处理"],
  ["references", "参考资料"],
];

const relationLabels: Record<EdgeRelation, string> = {
  before: "前置",
  depends_on: "依赖",
  handoff: "交接",
  review_by: "审查",
  fallback_to: "失败回退",
  parallel_with: "并行",
};

const editModeLabels: Record<EditMode, string> = {
  structured: "结构化生成",
  manual: "手写 Markdown",
  hybrid: "混合编辑",
};

const editModeHelp: Record<EditMode, string> = {
  structured: "按字段和项目模板生成 SKILL.md。",
  manual: "完全使用下面手写内容，不读取结构化字段。",
  hybrid: "先生成结构化内容，再追加手写补充。",
};

const ruleTypes: RuleType[] = ["require", "forbid", "check", "tool", "handoff"];

interface InspectorPanelProps {
  selectedNode?: SkillFlowNode;
  selectedEdge?: SkillFlowEdge;
  resources: NodeResource[];
  templates: ProjectTemplate[];
  onUpdateNode: (node: SkillFlowNode) => void;
  onUpdateEdge: (edge: SkillFlowEdge) => void;
  onUpdateTemplates: (templates: ProjectTemplate[], node?: SkillFlowNode) => void;
  onGenerateNode: (nodeId: string) => void;
  onLintNode: (nodeId: string) => void;
}

function listToText(value: unknown): string {
  return Array.isArray(value) ? value.join("\n") : "";
}

function textToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function templateFromNode(node: SkillFlowNode, name: string): ProjectTemplate {
  return {
    ...createProjectTemplate(name),
    templateMode: node.data.templateMode,
    templateSections: node.data.templateSections,
    advancedTemplate: node.data.advancedTemplate,
    customFields: node.data.customFields,
  } as ProjectTemplate;
}

function applyTemplateToNode(node: SkillFlowNode, template: ProjectTemplate): SkillFlowNode {
  return {
    ...node,
    data: {
      ...node.data,
      templateId: template.id,
      templateMode: template.templateMode,
      templateSections: template.templateSections,
      advancedTemplate: template.advancedTemplate,
      customFields: template.customFields,
    },
  };
}

function placeholdersInTemplate(template: string): Set<string> {
  return new Set(Array.from(template.matchAll(/\{\{(\w+)\}\}/g), (match) => match[1]));
}

const fieldToSectionKey: Partial<Record<keyof SkillNodeData, TemplateSectionKey>> = {
  whenToUse: "whenToUse",
  inputs: "inputs",
  outputs: "outputs",
  steps: "steps",
  requires: "requires",
  forbids: "forbids",
  checks: "checks",
  whenNotToUse: "whenNotToUse",
  tools: "tools",
  fallbacks: "fallbacks",
  references: "references",
};

function shouldShowField(node: SkillFlowNode, field: keyof SkillNodeData): boolean {
  const sectionKey = fieldToSectionKey[field];
  if (!sectionKey) return true;
  return shouldShowSectionKey(node, sectionKey);
}

function shouldShowSectionKey(node: SkillFlowNode, sectionKey: TemplateSectionKey): boolean {
  if (node.data.templateMode === "advanced") {
    return placeholdersInTemplate(node.data.advancedTemplate).has(sectionKey);
  }
  return node.data.templateSections.some((section) => section.key === sectionKey && section.enabled);
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="inspector-section" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="inspector-section-body">{children}</div>
    </details>
  );
}

function ResourceEditor({
  title,
  kind,
  resources,
  onChange,
}: {
  title: string;
  kind: ResourceKind;
  resources: NodeResource[];
  onChange: (resources: NodeResource[]) => void;
}) {
  const updateResource = (id: string, patch: Partial<NodeResource>) => {
    onChange(resources.map((resource) => (resource.id === id ? { ...resource, ...patch } : resource)));
  };

  return (
    <div className="resource-group">
      <div className="rule-header">
        <span>{title}</span>
        <button type="button" onClick={() => onChange([...resources, createNodeResource(kind)])}>
          <Plus size={16} />
          添加
        </button>
      </div>
      {resources.map((resource) => (
        <div className="resource-editor" key={resource.id}>
          <input
            placeholder="名称"
            value={resource.name}
            onChange={(event) => updateResource(resource.id, { name: event.target.value })}
          />
          <input
            placeholder="相对路径或 URL"
            value={resource.path}
            onChange={(event) => updateResource(resource.id, { path: event.target.value })}
          />
          <input
            placeholder="类型，例如 ps1 / md / image"
            value={resource.resourceType}
            onChange={(event) => updateResource(resource.id, { resourceType: event.target.value })}
          />
          <textarea
            placeholder="用途说明"
            value={resource.description}
            onChange={(event) => updateResource(resource.id, { description: event.target.value })}
          />
          <button
            aria-label="删除资源"
            className="icon-button"
            type="button"
            onClick={() => onChange(resources.filter((item) => item.id !== resource.id))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  resources,
  templates,
  onUpdateNode,
  onUpdateEdge,
  onUpdateTemplates,
  onGenerateNode,
  onLintNode,
}: InspectorPanelProps) {
  if (selectedEdge) {
    const data = selectedEdge.data;
    return (
      <aside className="inspector">
        <div className="panel-title">流程线配置</div>
        <label>
          关系类型
          <select
            value={data?.relation || "handoff"}
            onChange={(event) =>
              onUpdateEdge({
                ...selectedEdge,
                data: { ...data!, relation: event.target.value as EdgeRelation },
              })
            }
          >
            {Object.entries(relationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input
            checked={data?.required ?? true}
            type="checkbox"
            onChange={(event) =>
              onUpdateEdge({
                ...selectedEdge,
                data: { ...data!, required: event.target.checked },
              })
            }
          />
          这条流程线是强制步骤
        </label>
        <label>
          说明
          <textarea
            value={data?.description || ""}
            onChange={(event) =>
              onUpdateEdge({
                ...selectedEdge,
                data: { ...data!, description: event.target.value },
              })
            }
          />
        </label>
        <label>
          传递数据
          <textarea
            value={listToText(data?.handoffData)}
            onChange={(event) =>
              onUpdateEdge({
                ...selectedEdge,
                data: { ...data!, handoffData: textToList(event.target.value) },
              })
            }
          />
        </label>
      </aside>
    );
  }

  if (!selectedNode) {
    return (
      <aside className="inspector empty">
        <div className="panel-title">属性面板</div>
        <p>选择节点或流程线后编辑配置。节点之间从右侧连接点拖到另一个节点左侧连接点即可连线。</p>
      </aside>
    );
  }

  const updateData = (patch: Partial<SkillNodeData>) => {
    const data = { ...selectedNode.data, ...patch };
    data.label = data.name;
    onUpdateNode({ ...selectedNode, data });
  };

  const moveTemplateSection = (index: number, direction: -1 | 1) => {
    const next = [...selectedNode.data.templateSections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateData({ templateSections: next });
  };

  const updateTemplateSection = (section: TemplateSection, patch: Partial<TemplateSection>) => {
    updateData({
      templateSections: selectedNode.data.templateSections.map((item) =>
        item.key === section.key ? { ...item, ...patch } : item,
      ),
    });
  };

  const selectedTemplate = templates.find((template) => template.id === selectedNode.data.templateId);

  const selectTemplate = (templateId: string) => {
    if (!templateId) {
      updateData({ templateId: "" });
      return;
    }
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    onUpdateNode(applyTemplateToNode(selectedNode, template));
  };

  const saveAsTemplate = () => {
    const name = window.prompt("模板名称", selectedNode.data.name || "自定义模板")?.trim();
    if (!name) return;
    const template = templateFromNode(selectedNode, name);
    onUpdateTemplates([...templates, template], {
      ...selectedNode,
      data: { ...selectedNode.data, templateId: template.id },
    });
  };

  const updateCurrentTemplate = () => {
    if (!selectedTemplate) return;
    const template = {
      ...templateFromNode(selectedNode, selectedTemplate.name),
      id: selectedTemplate.id,
      description: selectedTemplate.description,
    };
    onUpdateTemplates(templates.map((item) => (item.id === template.id ? template : item)));
  };

  const deleteCurrentTemplate = () => {
    if (!selectedTemplate || !window.confirm(`删除模板“${selectedTemplate.name}”？`)) return;
    onUpdateTemplates(templates.filter((item) => item.id !== selectedTemplate.id));
    updateData({ templateId: "" });
  };

  const addRule = () => {
    const rule: RuleBlock = {
      id: `rule-${Date.now()}`,
      type: "require",
      content: "",
      severity: "warning",
      required: true,
      note: "",
    };
    updateData({ rules: [...selectedNode.data.rules, rule] });
  };

  const updateRule = (ruleId: string, patch: Partial<RuleBlock>) => {
    updateData({
      rules: selectedNode.data.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule,
      ),
    });
  };

  return (
    <aside className="inspector">
      <div className="panel-title">当前节点配置</div>
      <label>
        技能名
        <input
          value={selectedNode.data.name}
          onChange={(event) => updateData({ name: event.target.value })}
        />
      </label>
      <label>
        目录名
        <input
          value={selectedNode.data.folder}
          onChange={(event) => updateData({ folder: event.target.value })}
        />
      </label>
      <label>
        描述
        <textarea
          value={selectedNode.data.description}
          onChange={(event) => updateData({ description: event.target.value })}
        />
      </label>

      <Section title="节点模板" defaultOpen>
        <label>
          选择模板
          <select value={selectedNode.data.templateId} onChange={(event) => selectTemplate(event.target.value)}>
            <option value="">当前节点自定义模板</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <span className="field-help">
            选择模板会复制模板到当前节点；之后改当前节点不会影响模板，除非点击“更新当前模板”。
          </span>
        </label>
        <div className="template-actions">
          <button type="button" onClick={saveAsTemplate}>保存为模板</button>
          <button type="button" onClick={updateCurrentTemplate} disabled={!selectedTemplate}>更新当前模板</button>
          <button type="button" onClick={saveAsTemplate}>另存为新模板</button>
          <button type="button" onClick={deleteCurrentTemplate} disabled={!selectedTemplate}>删除模板</button>
        </div>
        <details className="template-edit-details" open={!selectedNode.data.templateId}>
          <summary>编辑当前节点模板选项</summary>
          <label>
            模板模式
            <select
              value={selectedNode.data.templateMode}
              onChange={(event) =>
                updateData({
                  templateMode: event.target.value as SkillNodeData["templateMode"],
                })
              }
            >
              <option value="simple">简单模式：调整区块顺序</option>
              <option value="advanced">高级模式：手写模板</option>
            </select>
            <span className="field-help">模板只影响当前节点，不会改变其他节点。</span>
          </label>
          {selectedNode.data.templateMode === "simple" ? (
            <div className="template-section-list">
              {selectedNode.data.templateSections.map((section, index) => (
                <div className="template-section-item" key={section.key}>
                  <label className="checkbox">
                    <input
                      checked={section.enabled}
                      type="checkbox"
                      onChange={(event) =>
                        updateTemplateSection(section, { enabled: event.target.checked })
                      }
                    />
                    <input
                      value={section.title}
                      onChange={(event) => updateTemplateSection(section, { title: event.target.value })}
                    />
                  </label>
                  <div className="template-section-actions">
                    <button type="button" onClick={() => moveTemplateSection(index, -1)}>
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveTemplateSection(index, 1)}>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <label>
              Markdown 模板
              <textarea
                className="markdown-box"
                placeholder="{{name}}, {{description}}, {{inputs}}, {{outputs}}, {{scripts}}, {{assets}}"
                value={selectedNode.data.advancedTemplate}
                onChange={(event) => updateData({ advancedTemplate: event.target.value })}
              />
            </label>
          )}
        </details>
        <div className="rule-header">
          <span>自定义字段</span>
          <button
            type="button"
            onClick={() => updateData({ customFields: [...selectedNode.data.customFields, createTemplateField()] })}
          >
            <Plus size={16} />
            添加
          </button>
        </div>
        {selectedNode.data.customFields.map((field) => (
          <div className="custom-field-editor" key={field.id}>
            <input
              placeholder="字段名称"
              value={field.name}
              onChange={(event) =>
                updateData({
                  customFields: selectedNode.data.customFields.map((item) =>
                    item.id === field.id ? { ...item, name: event.target.value } : item,
                  ),
                })
              }
            />
            <input
              placeholder="占位符，例如 customField"
              value={field.key}
              onChange={(event) =>
                updateData({
                  customFields: selectedNode.data.customFields.map((item) =>
                    item.id === field.id ? { ...item, key: event.target.value } : item,
                  ),
                })
              }
            />
            <textarea
              placeholder="字段内容，可在高级模板中用 {{占位符}} 引用"
              value={field.value}
              onChange={(event) =>
                updateData({
                  customFields: selectedNode.data.customFields.map((item) =>
                    item.id === field.id ? { ...item, value: event.target.value } : item,
                  ),
                })
              }
            />
            <button
              aria-label="删除自定义字段"
              className="icon-button"
              type="button"
              onClick={() =>
                updateData({
                  customFields: selectedNode.data.customFields.filter((item) => item.id !== field.id),
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </Section>
      <label>
        编辑模式
        <select
          value={selectedNode.data.editMode}
          onChange={(event) =>
            updateData({
              editMode: event.target.value as SkillNodeData["editMode"],
            })
          }
        >
          {Object.entries(editModeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="field-help">{editModeHelp[selectedNode.data.editMode]}</span>
      </label>

      {primaryFields.filter(([field]) => shouldShowField(selectedNode, field)).map(([field, label]) => (
        <label key={String(field)}>
          {label}
          <textarea
            value={listToText(selectedNode.data[field])}
            onChange={(event) => updateData({ [field]: textToList(event.target.value) })}
          />
        </label>
      ))}

      <Section title="更多字段">
        {extraFields.filter(([field]) => shouldShowField(selectedNode, field)).map(([field, label]) => (
          <label key={String(field)}>
            {label}
            <textarea
              value={listToText(selectedNode.data[field])}
              onChange={(event) => updateData({ [field]: textToList(event.target.value) })}
            />
          </label>
        ))}
        <div className="rule-header">
          <span>规则块</span>
          <button type="button" onClick={addRule}>
            <Plus size={16} />
            添加
          </button>
        </div>
        {selectedNode.data.rules.map((rule) => (
          <div className="rule-editor" key={rule.id}>
            <select
              value={rule.type}
              onChange={(event) =>
                updateRule(rule.id, { type: event.target.value as RuleType })
              }
            >
              {ruleTypes.map((type) => (
                <option key={type} value={type}>
                  #{type}
                </option>
              ))}
            </select>
            <textarea
              placeholder="规则内容"
              value={rule.content}
              onChange={(event) => updateRule(rule.id, { content: event.target.value })}
            />
            <button
              aria-label="删除规则"
              className="icon-button"
              type="button"
              onClick={() =>
                updateData({
                  rules: selectedNode.data.rules.filter((item) => item.id !== rule.id),
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <label>
          手写 Markdown
          <textarea
            className="markdown-box"
            value={selectedNode.data.manualMarkdown}
            onChange={(event) => updateData({ manualMarkdown: event.target.value })}
          />
        </label>
      </Section>

      <Section title="绑定资源">
        <div className="resource-ref-list">
          <div className="rule-header">
            <span>项目资源库</span>
          </div>
          {resources.length ? (
            resources.map((resource) => (
              <label className="checkbox" key={resource.id}>
                <input
                  checked={selectedNode.data.resourceRefs.includes(resource.id)}
                  type="checkbox"
                  onChange={(event) => {
                    const refs = event.target.checked
                      ? [...selectedNode.data.resourceRefs, resource.id]
                      : selectedNode.data.resourceRefs.filter((id) => id !== resource.id);
                    updateData({ resourceRefs: refs });
                  }}
                />
                {resource.name || resource.path || "未命名资源"} · {resource.path || "未设置路径"}
              </label>
            ))
          ) : (
            <p className="empty-copy">资源库为空。请在左侧“资源库”添加。</p>
          )}
        </div>
        {shouldShowSectionKey(selectedNode, "scripts") ? (
          <ResourceEditor
            title="脚本"
            kind="script"
            resources={selectedNode.data.scripts}
            onChange={(scripts) => updateData({ scripts })}
          />
        ) : null}
        {shouldShowSectionKey(selectedNode, "references") ? (
          <ResourceEditor
            title="References"
            kind="reference"
            resources={selectedNode.data.referenceResources}
            onChange={(referenceResources) => updateData({ referenceResources })}
          />
        ) : null}
        {shouldShowSectionKey(selectedNode, "assets") ? (
          <ResourceEditor
            title="Assets"
            kind="asset"
            resources={selectedNode.data.assets}
            onChange={(assets) => updateData({ assets })}
          />
        ) : null}
        {shouldShowSectionKey(selectedNode, "attachments") ? (
          <ResourceEditor
            title="其他附件"
            kind="attachment"
            resources={selectedNode.data.attachments}
            onChange={(attachments) => updateData({ attachments })}
          />
        ) : null}
      </Section>

      <div className="action-row">
        <button type="button" onClick={() => onGenerateNode(selectedNode.id)}>
          生成 SKILL.md
        </button>
        <button type="button" onClick={() => onLintNode(selectedNode.id)}>
          检查当前 Skill
        </button>
      </div>
    </aside>
  );
}
