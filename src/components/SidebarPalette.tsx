import {
  CheckCircle2,
  Download,
  FileText,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

const paletteItems = [
  { type: "skill", label: "Skill 节点", icon: FileText },
  { type: "global_rule", label: "全局规则", icon: ShieldCheck },
  { type: "check", label: "检查节点", icon: CheckCircle2 },
  { type: "export", label: "导出节点", icon: Download },
  { type: "note", label: "备注节点", icon: MessageSquareText },
];

interface SidebarPaletteProps {
  onAddNode: (type: string) => void;
}

export function SidebarPalette({ onAddNode }: SidebarPaletteProps) {
  return (
    <aside className="palette">
      <div className="panel-title">组件库</div>
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
            </div>
          );
        })}
      </div>
      <div className="panel-title secondary">规则块</div>
      <div className="rule-tags">
        {["#require", "#forbid", "#check", "#tool", "#handoff"].map((rule) => (
          <span key={rule}>{rule}</span>
        ))}
      </div>
    </aside>
  );
}
