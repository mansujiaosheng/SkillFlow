import { describe, expect, it } from "vitest";
import { formatEdgeLabel } from "./edgeLabels";

describe("formatEdgeLabel", () => {
  it("renders relation, handoff data and description", () => {
    expect(
      formatEdgeLabel({
        data: {
          relation: "handoff",
          required: true,
          handoffData: ["类名", "函数名"],
          description: "交给动态调试",
          note: "",
        },
      }),
    ).toBe("交接 · 类名、函数名 · 说明：交给动态调试");
  });
});
