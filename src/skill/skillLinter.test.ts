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
});
