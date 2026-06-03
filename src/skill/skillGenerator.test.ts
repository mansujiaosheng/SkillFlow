import { describe, expect, it } from "vitest";
import { createSkillNode, createWorkflowEdgeData } from "../types/project";
import { generateSkillMarkdown } from "./skillGenerator";

describe("generateSkillMarkdown", () => {
  it("generates structured SKILL.md with edge handoff context", () => {
    const first = createSkillNode("a", { x: 0, y: 0 }, "静态分析");
    const second = createSkillNode("b", { x: 200, y: 0 }, "动态调试");
    first.data.description = "定位关键类。";
    first.data.whenToUse = ["用户上传 APK"];
    first.data.inputs = ["APK 文件"];
    first.data.outputs = ["关键类"];
    first.data.requires = ["必须先看 Manifest"];
    first.data.forbids = ["禁止编造 flag"];
    first.data.steps = ["分析 Manifest"];
    first.data.checks = ["输出关键类"];

    const edge = {
      id: "edge-a-b",
      source: "a",
      target: "b",
      data: { ...createWorkflowEdgeData(), handoffData: ["关键类"] },
    };

    const markdown = generateSkillMarkdown(first, [first, second], [edge]);

    expect(markdown).toContain("name: 静态分析");
    expect(markdown).toContain("## 下游交接");
    expect(markdown).toContain("动态调试 (handoff)；交接：关键类");
  });

  it("uses manual markdown in manual mode", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "手写 Skill");
    node.data.editMode = "manual";
    node.data.manualMarkdown = "# Manual";

    expect(generateSkillMarkdown(node, [node], [])).toBe("# Manual\n");
  });
});
