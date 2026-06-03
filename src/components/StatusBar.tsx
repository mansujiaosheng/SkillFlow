import type { LintReport } from "../types/project";

interface StatusBarProps {
  message: string;
  lintReport?: LintReport;
}

export function StatusBar({ message, lintReport }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span>{message}</span>
      {lintReport ? (
        <span>
          Lint {lintReport.score}/100 · 严重 {lintReport.critical.length} · 警告{" "}
          {lintReport.warnings.length}
        </span>
      ) : (
        <span>Lint 未运行</span>
      )}
    </footer>
  );
}
