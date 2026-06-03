import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("App", () => {
  it("renders home actions", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "SkillFlow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新建项目/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /打开已有项目/ })).toBeInTheDocument();
  });
});
