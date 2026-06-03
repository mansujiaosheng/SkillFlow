import { describe, expect, it } from "vitest";
import {
  createDefaultTemplateSections,
  createNodeFromTemplate,
  createSkillNode,
  createWorkflowEdgeData,
  normalizeProjectState,
} from "../types/project";
import { generateSkillMarkdown, resolveSkillFolders } from "./skillGenerator";

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

  it("deduplicates folders for nodes with the same folder", () => {
    const first = createSkillNode("a", { x: 0, y: 0 }, "Skill");
    const second = createSkillNode("b", { x: 0, y: 0 }, "Skill");
    first.data.folder = "same";
    second.data.folder = "same";

    expect(resolveSkillFolders([first, second])).toEqual({ a: "same", b: "same-2" });
  });

  it("renders node resources and advanced templates", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "资源 Skill");
    node.data.scripts = [
      {
        id: "script-1",
        kind: "script",
        name: "检查脚本",
        path: "scripts/check.ps1",
        resourceType: "ps1",
        description: "辅助检查输入",
      },
    ];

    const markdown = generateSkillMarkdown(node, [node], [], {
      theme: "system",
      autoLint: true,
      autoGenerateOnSave: false,
      templateMode: "advanced",
      templateSections: createDefaultTemplateSections(),
      advancedTemplate: "## 脚本\n\n{{scripts}}",
    });

    expect(markdown).toContain("检查脚本 (ps1)：scripts/check.ps1 - 辅助检查输入");
  });

  it("renders linked project resources and skips note nodes", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "资源 Skill");
    node.data.resourceRefs = ["res-1"];

    const markdown = generateSkillMarkdown(node, [node], [], undefined, [
      {
        id: "res-1",
        kind: "script",
        name: "共享脚本",
        path: "scripts/shared.ps1",
        resourceType: "ps1",
        description: "共享检查脚本",
      },
    ]);

    expect(markdown).toContain("共享脚本 (ps1)：scripts/shared.ps1 - 共享检查脚本");

    const note = createNodeFromTemplate("note", { x: 0, y: 0 });
    expect(resolveSkillFolders([node, note])).not.toHaveProperty(note.id);
  });

  it("normalizes old project states without resources", () => {
    const node = createSkillNode("a", { x: 0, y: 0 }, "旧节点");
    const normalized = normalizeProjectState({
      projectRoot: "",
      project: {
        schemaVersion: "0.1.0",
        projectId: "p",
        name: "p",
        description: "",
        targetPlatforms: [],
        createdAt: "",
        updatedAt: "",
      },
      workflow: { nodes: [node], edges: [] },
      rules: [],
      settings: undefined as never,
    } as never);

    expect(normalized.resources).toEqual([]);
    expect(normalized.workflow.nodes[0].data.resourceRefs).toEqual([]);
  });
});
