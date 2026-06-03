# SkillFlow MVP 开发规范

## Why
SkillFlow 是一个本地桌面端的 Agent Skill 可视化创建、规范化生成与流程编排工具。当前 GitHub 仓库为空，需要从零搭建一个基于 Tauri + React + React Flow + TypeScript 的桌面应用，实现 Skill 节点的可视化拖拽编排与 SKILL.md 标准化生成。

## What Changes
- 初始化 Tauri + React + TypeScript 项目工程
- 实现项目创建、文件夹落地的完整闭环（V0.1）
- 实现 React Flow 画布，支持节点拖拽与连线（V0.2）
- 实现右侧属性面板，支持节点字段编辑（V0.3）
- 实现规则块系统（#require/#forbid/#check/#tool/#handoff）（V0.4）
- 实现 SKILL.md 模板生成器与文件落地（V0.5）
- 实现基础 Linter 质量检查（V0.6）
- 预留 AI 生成接口（第二阶段）

## Impact
- Affected specs: 无（全新项目）
- Affected code: 全部代码从零创建
- GitHub 仓库: `https://github.com/mansujiaosheng/SkillFlow.git`

## ADDED Requirements

### Requirement: 项目初始化与环境配置
系统 SHALL 基于 Tauri v2 + React + TypeScript + React Flow 搭建可运行的桌面应用骨架。

#### Scenario: 环境检查通过
- **WHEN** 开发者执行环境检查命令
- **THEN** 系统输出 Node.js、Rust、cargo 版本信息，确认所有依赖就绪

#### Scenario: 项目启动成功
- **WHEN** 开发者执行 `npm run tauri dev`
- **THEN** 桌面窗口打开，显示 React 渲染的空白首页

---

### Requirement: 项目创建与文件落地
系统 SHALL 支持用户创建 Skill 项目，选择保存位置后自动生成标准化目录结构和配置文件。

#### Scenario: 新建项目成功
- **WHEN** 用户在首页点击"新建项目"，填写项目名称、描述、目标平台、保存位置后确认
- **THEN** 系统在指定目录创建项目文件夹，包含 `.skillflow/`（project.json）、`skills/`、`references/`、`assets/`、`exports/`、`README.md`

#### Scenario: 打开已有项目
- **WHEN** 用户点击"打开已有项目"并选择 `.skillflow/project.json`
- **THEN** 系统加载项目数据并进入主编辑界面

---

### Requirement: React Flow 画布与拖拽
系统 SHALL 提供基于 React Flow 的可视化画布，支持从左侧组件库拖拽节点、移动、删除、连线。

#### Scenario: 拖拽 Skill 节点到画布
- **WHEN** 用户从左侧组件库拖拽"Skill 节点"到画布
- **THEN** 画布上出现一个新的 Skill 节点，位置为鼠标释放坐标

#### Scenario: 节点连线
- **WHEN** 用户从一个节点的输出句柄拖拽连线到另一个节点的输入句柄
- **THEN** 两个节点之间出现带箭头的连线

#### Scenario: 删除节点
- **WHEN** 用户选中节点后按 Delete 键或右键删除
- **THEN** 节点及其关联连线从画布移除

#### Scenario: 画布持久化
- **WHEN** 用户保存项目后关闭并重新打开
- **THEN** 画布恢复之前保存的节点位置和连线

---

### Requirement: 右侧属性面板
系统 SHALL 在右侧提供属性面板，用户点击节点后可编辑技能名、描述、使用时机、输入、输出、执行步骤、规则等内容。

#### Scenario: 编辑 Skill 节点属性
- **WHEN** 用户点击画布上的 Skill 节点
- **THEN** 右侧面板显示该节点的可编辑字段（名称、目录名、描述、whenToUse、inputs、outputs、steps、checks、fallbacks 等）

#### Scenario: 编辑流程线属性
- **WHEN** 用户点击画布上的连线
- **THEN** 右侧面板显示关系类型下拉框（before/depends_on/handoff/review_by/fallback_to/parallel_with）、交接数据、说明等字段

---

### Requirement: 规则块系统
系统 SHALL 支持为 Skill 节点添加规则块（#require、#forbid、#check、#tool、#handoff），第一版通过按钮添加。

#### Scenario: 添加规则块
- **WHEN** 用户在属性面板中点击"添加规则块"，选择类型后填写内容
- **THEN** 该节点的规则列表新增一条规则

#### Scenario: 删除规则块
- **WHEN** 用户点击规则块旁的删除按钮
- **THEN** 该规则块从节点移除

---

### Requirement: SKILL.md 生成与落地
系统 SHALL 根据节点的结构化字段和规则块，按照统一模板生成 SKILL.md 并保存到 `skills/<skill-folder>/SKILL.md`。

#### Scenario: 生成单个 Skill
- **WHEN** 用户点击"生成 SKILL.md"
- **THEN** 系统根据模板渲染 SKILL.md，包含 YAML frontmatter、使用时机、输入输出、规则、执行流程、完成标准等全部章节

#### Scenario: 生成全部 Skill
- **WHEN** 用户点击"生成全部 Skill"
- **THEN** 系统遍历所有 Skill 节点，为每个节点生成 SKILL.md，同时生成 workflow.md

---

### Requirement: 基础 Linter 检查
系统 SHALL 对生成的 Skill 进行质量检查，检测缺失字段、弱约束词、孤立节点、循环依赖等。

#### Scenario: Linter 检查通过
- **WHEN** 用户点击"检查当前 Skill"
- **THEN** 系统输出检查报告，包含严重问题、警告、建议及质量评分

#### Scenario: 检测弱约束词
- **WHEN** Skill 内容包含"建议""尽量""最好"等词汇
- **THEN** Linter 报告标注为警告

#### Scenario: 检测循环依赖
- **WHEN** 节点连线形成 A→B→C→A 的环
- **THEN** Linter 报告标注循环依赖为严重问题

---

### Requirement: AI 生成接口预留
系统 SHALL 预留 AI 生成接口的数据结构（Prompt Builder），第二阶段实现 AI 补全和生成功能。

#### Scenario: Prompt Builder 输出 JSON 上下文
- **WHEN** 调用 Prompt Builder
- **THEN** 返回包含项目信息、当前节点字段、上下游关系的 JSON 上下文