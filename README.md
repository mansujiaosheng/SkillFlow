# SkillFlow

SkillFlow 是一个本地桌面端 Agent Skill 可视化创建工具，用于通过节点、流程线、资源库和节点模板生成标准化的 `SKILL.md` 与 `workflow.md`。

GitHub: https://github.com/mansujiaosheng/SkillFlow

作者：漫宿骄盛  
邮箱：1967835754@qq.com

## 功能

- 通过画布创建 Skill、全局规则、检查、导出和备注节点。
- 使用流程线描述节点之间的依赖、交接、审查和回退关系。
- 在资源库中管理脚本、参考资料、Asset 和附件。
- 每个节点可以独立配置模板，不会影响其他节点。
- 支持自定义模板字段，并在高级 Markdown 模板中用 `{{字段名}}` 引用。
- 支持项目保存、生成、Lint 检查、撤回和重做。

## 环境要求

- Node.js 20 或更新版本。
- npm。
- Rust stable，桌面端打包需要。
- Windows 桌面端建议安装 WebView2 Runtime。
- Tauri 2 打包依赖，按 Tauri 官方文档安装对应平台依赖。

## 安装依赖

```bash
npm install
```

## Web 预览开发

```bash
npm run dev
```

启动后按终端提示打开本地地址。

## 桌面端开发

```bash
npm run desktop
```

该命令会通过 Tauri 启动桌面窗口。

## 测试

```bash
npm test
```

## 前端构建

```bash
npm run build
```

构建产物输出到 `dist/`。

## 桌面端打包

```bash
npm run tauri build
```

打包成功后，安装包通常位于：

```text
src-tauri/target/release/bundle/
```

Windows 常见输出包括 `.msi`、`.exe` 或 NSIS 安装包，具体取决于本机 Tauri 打包环境。

## Release 发布

1. 运行 `npm test`。
2. 运行 `npm run build`。
3. 运行 `npm run tauri build`。
4. 从 `src-tauri/target/release/bundle/` 取出安装包。
5. 将安装包上传到 GitHub Release。

## 快捷键

- `Ctrl+Z`：撤回。
- `Ctrl+Y`：重做。
- `Ctrl+Shift+Z`：重做。

## 项目数据

桌面端项目保存到本地目录，`.skillflow` 下的 JSON 是项目源数据。生成的 `skills/*/SKILL.md` 和 `workflow.md` 是输出文件。
