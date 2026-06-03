import {
  CheckCircle2,
  Download,
  FileText,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { NodeKind, NodeResource, ResourceKind } from "../types/project";
import { createNodeResource } from "../types/project";

const paletteItems: Array<{
  type: NodeKind;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { type: "skill", label: "Skill 节点", description: "普通 Skill，生成 SKILL.md", icon: FileText },
  { type: "global_rule", label: "全局规则", description: "带全局约束和禁止行为", icon: ShieldCheck },
  { type: "check", label: "检查节点", description: "默认包含检查标准和问题输出", icon: CheckCircle2 },
  { type: "export", label: "导出节点", description: "整理交付和资源清单", icon: Download },
  { type: "note", label: "备注节点", description: "画布说明，不生成 Skill", icon: MessageSquareText },
];

const resourceLabels: Record<ResourceKind, string> = {
  script: "脚本",
  reference: "Reference",
  asset: "Asset",
  attachment: "附件",
};

interface SidebarPaletteProps {
  resources: NodeResource[];
  onAddNode: (type: NodeKind) => void;
  onUpdateResources: (resources: NodeResource[]) => void;
  onImportResource: (kind: ResourceKind) => void;
}

export function SidebarPalette({
  resources,
  onAddNode,
  onUpdateResources,
  onImportResource,
}: SidebarPaletteProps) {
  const [tab, setTab] = useState<"nodes" | "resources">("nodes");

  const updateResource = (id: string, patch: Partial<NodeResource>) => {
    onUpdateResources(
      resources.map((resource) => (resource.id === id ? { ...resource, ...patch } : resource)),
    );
  };

  return (
    <aside className="palette">
      <div className="palette-tabs">
        <button className={tab === "nodes" ? "active" : ""} type="button" onClick={() => setTab("nodes")}>
          节点模板
        </button>
        <button className={tab === "resources" ? "active" : ""} type="button" onClick={() => setTab("resources")}>
          资源库
        </button>
      </div>

      {tab === "nodes" ? (
        <div className="palette-list">
          {paletteItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                className="palette-item"
                draggable
                key={item.type}
                onClick={() => onAddNode(item.type)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/skillflow", item.type);
                  event.dataTransfer.setData("text/plain", item.type);
                  event.dataTransfer.effectAllowed = "move";
                }}
                title="拖到画布，或单击添加到画布"
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <small>{item.description}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="resource-library">
          <div className="resource-kind-row">
            {Object.entries(resourceLabels).map(([kind, label]) => (
              <button key={kind} type="button" onClick={() => onImportResource(kind as ResourceKind)}>
                <Plus size={14} />
                {label}
              </button>
            ))}
          </div>
          {resources.length ? (
            resources.map((resource) => (
              <div className="resource-library-item" key={resource.id}>
                <select
                  value={resource.kind}
                  onChange={(event) =>
                    updateResource(resource.id, { kind: event.target.value as ResourceKind })
                  }
                >
                  {Object.entries(resourceLabels).map(([kind, label]) => (
                    <option key={kind} value={kind}>
                      {label}
                    </option>
                  ))}
                </select>
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
                <textarea
                  placeholder="用途说明"
                  value={resource.description}
                  onChange={(event) =>
                    updateResource(resource.id, { description: event.target.value })
                  }
                />
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => onUpdateResources(resources.filter((item) => item.id !== resource.id))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <p className="empty-copy">还没有资源。添加资源后，可在节点“绑定资源”里选择。</p>
          )}
          <button
            type="button"
            onClick={() => onUpdateResources([...resources, createNodeResource("reference")])}
          >
            <Plus size={16} />
            手动新增资源
          </button>
        </div>
      )}
    </aside>
  );
}
