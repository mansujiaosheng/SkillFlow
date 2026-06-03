import { Plus, Trash2 } from "lucide-react";
import type {
  EdgeRelation,
  RuleBlock,
  RuleType,
  SkillFlowEdge,
  SkillFlowNode,
  SkillNodeData,
} from "../types/project";

const arrayFields: Array<[keyof SkillNodeData, string]> = [
  ["whenToUse", "使用时机"],
  ["whenNotToUse", "不适用场景"],
  ["inputs", "输入"],
  ["outputs", "输出"],
  ["tools", "可用工具"],
  ["steps", "执行流程"],
  ["requires", "必须遵守"],
  ["forbids", "禁止行为"],
  ["checks", "完成标准"],
  ["fallbacks", "失败处理"],
  ["references", "参考资料"],
];

const relationOptions: EdgeRelation[] = [
  "before",
  "depends_on",
  "handoff",
  "review_by",
  "fallback_to",
  "parallel_with",
];

const ruleTypes: RuleType[] = ["require", "forbid", "check", "tool", "handoff"];

interface InspectorPanelProps {
  selectedNode?: SkillFlowNode;
  selectedEdge?: SkillFlowEdge;
  onUpdateNode: (node: SkillFlowNode) => void;
  onUpdateEdge: (edge: SkillFlowEdge) => void;
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

export function InspectorPanel({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
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
            {relationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
        <label className="checkbox">
          <input
            checked={Boolean(data?.required)}
            type="checkbox"
            onChange={(event) =>
              onUpdateEdge({
                ...selectedEdge,
                data: { ...data!, required: event.target.checked },
              })
            }
          />
          强制关系
        </label>
      </aside>
    );
  }

  if (!selectedNode) {
    return (
      <aside className="inspector empty">
        <div className="panel-title">属性面板</div>
        <p>选择节点或流程线后编辑配置。</p>
      </aside>
    );
  }

  const updateData = (patch: Partial<SkillNodeData>) => {
    const data = { ...selectedNode.data, ...patch };
    data.label = data.name;
    onUpdateNode({ ...selectedNode, data });
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
          <option value="structured">structured</option>
          <option value="manual">manual</option>
          <option value="hybrid">hybrid</option>
        </select>
      </label>
      {arrayFields.map(([field, label]) => (
        <label key={String(field)}>
          {label}
          <textarea
            value={listToText(selectedNode.data[field])}
            onChange={(event) =>
              updateData({ [field]: textToList(event.target.value) })
            }
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
