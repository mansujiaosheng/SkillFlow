import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createProjectTemplate, createSkillNode } from "../types/project";
import { InspectorPanel } from "./InspectorPanel";

describe("InspectorPanel templates", () => {
  it("hides fields disabled by the current simple template", () => {
    const node = createSkillNode("node-a", { x: 0, y: 0 }, "测试 Skill");
    node.data.templateSections = node.data.templateSections.map((section) =>
      section.key === "inputs" ? { ...section, enabled: false } : section,
    );

    render(
      <InspectorPanel
        resources={[]}
        selectedNode={node}
        templates={[]}
        onGenerateNode={vi.fn()}
        onLintNode={vi.fn()}
        onUpdateEdge={vi.fn()}
        onUpdateNode={vi.fn()}
        onUpdateTemplates={vi.fn()}
      />,
    );

    expect(screen.queryByText("输入")).not.toBeInTheDocument();
    expect(screen.getByText("输出")).toBeInTheDocument();
  });

  it("applies a selected saved template to the node", () => {
    const node = createSkillNode("node-a", { x: 0, y: 0 }, "测试 Skill");
    const template = createProjectTemplate("脚本模板");
    template.templateMode = "advanced";
    template.advancedTemplate = "## 脚本\n\n{{scripts}}";
    const onUpdateNode = vi.fn();

    render(
      <InspectorPanel
        resources={[]}
        selectedNode={node}
        templates={[template]}
        onGenerateNode={vi.fn()}
        onLintNode={vi.fn()}
        onUpdateEdge={vi.fn()}
        onUpdateNode={onUpdateNode}
        onUpdateTemplates={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/选择模板/), { target: { value: template.id } });

    expect(onUpdateNode).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateId: template.id,
          templateMode: "advanced",
          advancedTemplate: "## 脚本\n\n{{scripts}}",
        }),
      }),
    );
  });
});
