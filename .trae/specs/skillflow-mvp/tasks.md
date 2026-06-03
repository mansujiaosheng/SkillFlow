# Tasks

## 阶段一：环境检查与工程初始化

- [ ] Task 1: 检查本地开发环境
  - 检查 Node.js 版本（≥18）
  - 检查 Rust 工具链（rustc、cargo）
  - 检查 Tauri 系统依赖（Windows: WebView2、MSVC Build Tools）
  - 输出环境检查报告

- [ ] Task 2: 初始化 Tauri + React + TypeScript 工程
  - 使用 `npm create tauri-app@latest` 创建项目骨架
  - 配置 TypeScript 严格模式
  - 安装 React Flow、@tauri-apps/api 等核心依赖
  - 验证 `npm run tauri dev` 能启动桌面窗口

- [ ] Task 3: 初始化 Git 仓库并推送
  - `git init` 初始化本地仓库
  - 添加 `.gitignore`（Rust target、node_modules 等）
  - 关联远程仓库 `https://github.com/mansujiaosheng/SkillFlow.git`
  - 完成首次 commit 和 push

## 阶段二：GUI 画布与拖拽

- [ ] Task 4: 实现首页（HomePage）
  - 新建项目按钮 + 对话框（项目名称、描述、目标平台多选、保存位置）
  - 打开已有项目按钮 + 文件选择器
  - 最近项目列表（本地存储）

- [ ] Task 5: 实现项目创建与文件落地（Tauri 后端）
  - 编写 `create_project` Tauri command：创建目录结构、生成 project.json、README.md
  - 编写 `open_project` Tauri command：读取 project.json 返回项目数据
  - 编写 `save_project` Tauri command：保存 workflow.json、nodes.json、rules.json

- [ ] Task 6: 实现左侧组件库（SidebarPalette）
  - 可拖拽的节点列表：Skill 节点、备注节点
  - 使用 React Flow 的拖拽机制，从侧边栏拖入画布

- [ ] Task 7: 实现主画布（Canvas）
  - 集成 React Flow，支持节点拖拽、移动、选中
  - 自定义 SkillNode 组件（显示技能名、描述摘要）
  - 支持节点连线（带箭头的贝塞尔曲线）
  - 支持节点删除（Delete 键 / 右键菜单）
  - 画布数据与 workflow.json 双向同步

## 阶段三：人工编写 Skill 的完整体验

- [ ] Task 8: 实现右侧属性面板（InspectorPanel）
  - 点击节点显示节点编辑表单：技能名、目录名、描述、whenToUse（多行）、whenNotToUse、inputs（可增删列表）、outputs（可增删列表）、steps（可增删列表）、checks、fallbacks、references
  - 点击连线显示连线编辑表单：关系类型下拉框、交接数据（可增删列表）、说明、是否强制
  - 点击空白区域显示项目级属性

- [ ] Task 9: 实现规则块系统
  - 节点属性面板中"添加规则块"按钮
  - 支持类型：require、forbid、check、tool、handoff、guard、fallback、ref
  - 每条规则块：类型下拉 + 内容文本框 + 删除按钮
  - 规则块数据持久化到节点的 rules 数组

- [ ] Task 10: 实现 SKILL.md 生成器
  - 编写模板渲染函数，使用需求文档第 15 节模板
  - 根据节点关系自动生成上游依赖和下游交接章节
  - Tauri command `generate_skill_md`：接收节点数据，返回渲染后的 Markdown 字符串
  - Tauri command `generate_all_skills`：遍历所有节点，写入 `skills/<folder>/SKILL.md`

- [ ] Task 11: 实现基础 Linter
  - 检查必填字段：name、description
  - 检查弱约束词：建议、尽量、最好、可以
  - 检查孤立节点（无连线的 Skill 节点）
  - 检查循环依赖（DFS 检测环）
  - 输出 lint-report.json，前端展示检查结果

- [ ] Task 12: 实现保存与文件落地完整闭环
  - 顶部工具栏：保存、生成全部 Skill、检查全部
  - 底部状态栏：文件落地状态、生成日志
  - 生成 workflow.md、README.md

## 阶段四：AI 辅助生成（第二阶段）

- [ ] Task 13: 实现 Prompt Builder
  - 收集项目上下文、当前节点字段、上下游关系
  - 输出标准化 JSON 上下文结构
  - 预留 AI API 调用接口（aiClient.ts）

- [ ] Task 14: 实现 AI 单节点生成
  - AI 补全当前节点（根据已有字段补全缺失内容）
  - AI 重写当前 Skill（根据规则约束重写）
  - AI 优化 description 触发条件

- [ ] Task 15: 实现 AI 批量生成
  - AI 根据流程生成全部 Skill
  - AI 检查规则冲突
  - AI 生成 workflow.md

# Task Dependencies
- Task 2 依赖 Task 1（环境检查通过后才能初始化工程）
- Task 3 依赖 Task 2（工程创建后才能 git 操作）
- Task 5 依赖 Task 2（Tauri 工程就绪后才能写 command）
- Task 6、Task 7 依赖 Task 2（React 工程就绪后才能写组件）
- Task 8 依赖 Task 7（画布节点就绪后才能点击编辑）
- Task 9 依赖 Task 8（属性面板就绪后才能添加规则块）
- Task 10 依赖 Task 5、Task 8、Task 9（项目保存、节点数据、规则块都就绪后才能生成）
- Task 11 依赖 Task 10（SKILL.md 生成后才能检查）
- Task 12 依赖 Task 10、Task 11（生成和检查就绪后才能完成闭环）
- Task 13 依赖 Task 10（SKILL.md 生成器就绪后才能构建 AI prompt）
- Task 14、Task 15 依赖 Task 13（Prompt Builder 就绪后才能 AI 生成）