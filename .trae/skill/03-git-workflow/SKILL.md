---
name: Git 分支提交与 PR Skill
description: 当用户询问创建分支、从集成分支开发、提交 commit、push、发起 PR、同步分支、解决冲突、提交信息规范、避免误提交时调用。
---

# Git 分支提交与 PR Skill

## 通用执行约束

- 本 Skill 面向任意软件项目、数据项目、自动化项目或 AI 协作项目，不绑定具体业务、仓库名、目录名、团队名或技术栈。
- 回答或修改前，必须先基于当前仓库的真实文件、用户本次目标和已有约定判断；禁止臆造不存在的目录、接口、配置、数据或团队规则。
- 用户指令与仓库事实、公开接口、安全底线、可回滚原则或已明确的验收标准冲突时，必须先指出冲突点和风险，再给出更稳妥的替代方案。
- 用户坚持继续时，也只能执行可回滚、可测试、不会破坏公开接口和安全底线的部分；禁止删除测试、伪造结果、绕过保护机制或扩大任务范围。
- 多个方案都可行时，必须选择影响范围更小、依赖更少、测试更明确、回滚更容易的方案。

## 功能定位

用于约束通用 Git 协作流程，避免直接改保护分支、混入无关文件、提交信息不可追踪或 PR 无法 review。

## 通用分支模型

```text
main / master     稳定分支，保存可发布状态
└── dev / develop 集成分支，承接功能分支合并
    ├── feat/<name>   新功能
    ├── fix/<name>    缺陷修复
    ├── docs/<name>   文档
    ├── test/<name>   测试
    ├── refactor/<name> 重构
    └── chore/<name>  工程维护
```

如项目没有 `dev`，以仓库实际默认分支和协作约定为准。

## 从零开始

```bash
git clone <repo-url>
cd <repo-dir>
git fetch origin
git checkout <base-branch>
git pull --ff-only origin <base-branch>
git checkout -b feat/<short-task-name>
```

## 提交前检查

```bash
git status
git diff
```

只暂存本次任务相关文件：

```bash
git add path/to/file1 path/to/file2
# 或交互式暂存
git add -p
```

只有确认全部变更都属于本次任务时，才允许使用 `git add .`。

## Commit 信息

推荐格式：

```text
<type>(<scope>): <summary>
```

常用 type：`feat`、`fix`、`docs`、`test`、`refactor`、`chore`、`perf`、`ci`。

示例：

```bash
git commit -m "feat(parser): add csv input validation"
git commit -m "fix(api): handle empty response payload"
git commit -m "test(scoring): cover boundary values"
```

禁止空泛提交：

```bash
git commit -m "update"
git commit -m "fix bug"
git commit -m "final"
```

## Push 与 PR

```bash
git push -u origin <branch-name>
```

PR 描述必须包含：

```markdown
## 改动目的
## 改动范围
## 测试情况
## 风险点
## 回滚方式
## 是否修改公开接口 / 配置 / schema / 文档
```

## 同步集成分支

```bash
git fetch origin
git checkout <base-branch>
git pull --ff-only origin <base-branch>
git checkout <work-branch>
git merge --no-ff <base-branch>
# 或按项目约定使用 rebase
git rebase <base-branch>
```

## 禁止事项

- 禁止直接在保护分支上开发。
- 禁止把多个无关任务塞进一个分支或一个 PR。
- 禁止提交密钥、缓存、构建产物、日志、大数据文件。
- 禁止未看 diff 就提交。
- 禁止为通过检查而删除测试或降低测试标准。

## 通用输出要求

- 先给结论，再给步骤。
- 涉及命令时，给出可直接复制的命令。
- 涉及代码改动时，说明影响范围、需要补充的测试、是否需要更新文档或变更记录。
- 信息不足时，指出需要读取的项目文件或需要确认的事实；不得用猜测替代项目事实。
