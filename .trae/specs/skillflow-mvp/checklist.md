# Checklist

## 阶段一：环境检查与工程初始化
- [ ] Node.js ≥ 18 已安装且版本正确
- [ ] Rust 工具链（rustc、cargo）已安装且版本正确
- [ ] Windows 环境下 WebView2 运行时可用
- [ ] `npm run tauri dev` 能成功启动桌面窗口
- [ ] Git 仓库已初始化并关联远程仓库
- [ ] `.gitignore` 已包含 Rust target、node_modules、dist 等忽略项

## 阶段二：GUI 画布与拖拽
- [ ] 首页显示"新建项目""打开已有项目""最近项目"三个入口
- [ ] 新建项目对话框包含名称、描述、目标平台、保存位置字段
- [ ] 选择保存位置后自动创建目录结构（.skillflow/、skills/ 等）
- [ ] project.json 按规范格式生成
- [ ] 左侧组件库可以拖拽 Skill 节点到画布
- [ ] 画布节点支持移动、选中、删除操作
- [ ] 节点之间可以连线，连线带箭头
- [ ] 重新打开项目后画布恢复之前的节点和连线

## 阶段三：人工编写 Skill 的完整体验
- [ ] 点击节点后右侧面板显示完整编辑表单
- [ ] 节点字段（名称、描述、whenToUse、inputs、outputs、steps 等）均可编辑
- [ ] inputs/outputs/steps 支持增删列表项
- [ ] 点击连线后右侧面板显示关系类型下拉框
- [ ] 连线关系类型支持 before/depends_on/handoff/review_by/fallback_to/parallel_with
- [ ] 节点属性面板可以添加/删除规则块
- [ ] 规则块类型至少支持 require、forbid、check、tool、handoff
- [ ] SKILL.md 按统一模板生成，包含 YAML frontmatter 和全部章节
- [ ] 生成的 SKILL.md 保存到正确的 `skills/<folder>/SKILL.md` 路径
- [ ] 生成全部 Skill 后同时生成 workflow.md
- [ ] Linter 能检测缺失的必填字段（name、description）
- [ ] Linter 能检测弱约束词（建议、尽量、最好、可以）
- [ ] Linter 能检测孤立节点（无连线的 Skill 节点）
- [ ] Linter 能检测循环依赖（DFS 环检测）
- [ ] Linter 输出 lint-report.json 且前端可以展示
- [ ] 顶部工具栏保存/生成/检查按钮功能正常
- [ ] 底部状态栏显示文件落地状态

## 阶段四：AI 辅助生成
- [ ] Prompt Builder 能输出包含项目、节点、上下游的 JSON 上下文
- [ ] AI API 调用接口预留（aiClient.ts）
- [ ] AI 补全当前节点功能可用
- [ ] AI 重写当前 Skill 功能可用
- [ ] AI 生成全部 Skill 功能可用
- [ ] AI 检查规则冲突功能可用