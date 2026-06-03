import { describe, expect, it } from "vitest";
import { createSkillNode } from "../types/project";
import { lintProject } from "./skillLinter";

describe("lintProject", () => {
  it("reports missing fields", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "空 Skill");

    const report = lintProject([node], []);

    expect(report.score).toBeLessThan(100);
    expect(report.warnings.some((item) => item.message === "没有配置输入")).toBe(true);
  });

  it("detects cycle dependency", () => {
    const first = createSkillNode("a", { x: 0, y: 0 }, "A");
    const second = createSkillNode("b", { x: 0, y: 0 }, "B");
    const report = lintProject(
      [first, second],
      [
        { id: "ab", source: "a", target: "b" },
        { id: "ba", source: "b", target: "a" },
      ],
    );

    expect(report.critical.some((item) => item.message === "流程中存在循环依赖")).toBe(true);
  });

  it("reports resource quality issues", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "资源 Skill");
    node.data.scripts = [
      {
        id: "script-1",
        kind: "script",
        name: "脚本",
        path: "",
        resourceType: "ps1",
        description: "",
      },
    ];

    const report = lintProject([node], []);

    expect(report.warnings.some((item) => item.message.includes("缺少路径"))).toBe(true);
    expect(report.warnings.some((item) => item.message.includes("缺少用途说明"))).toBe(true);
  });

  it("reports invalid project resource references", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "资源 Skill");
    node.data.resourceRefs = ["missing"];

    const report = lintProject([node], [], []);

    expect(report.warnings.some((item) => item.message.includes("资源引用失效"))).toBe(true);
  });
});
