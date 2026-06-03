// 声明数据模型模块
mod models;

use models::{OpenProjectResult, Project, Workflow};
use models::workflow::SkillNodeData;

// ============================================================================
// 工具函数
// ============================================================================

/// 将名称转换为 slug 格式（小写、连字符分隔、仅保留字母数字和连字符）
///
/// 示例:
///   "My Agent Project"  -> "my-agent-project"
///   "Hello__World!!"    -> "hello-world"
///   "  Spaces  "        -> "spaces"
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("-")
}

/// 获取当前 UTC 时间的 ISO 8601 格式字符串，例如 "2025-06-03T12:30:45Z"
fn now_iso8601() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// 保留原有的 greet 命令，用于快速验证后端通信
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 创建新项目
///
/// 在指定路径下创建完整的项目目录结构，包括:
///   - .skillflow/        项目元数据目录
///   - skills/            Skill 文件存放目录
///   - references/        参考资料目录
///   - assets/            资源文件目录
///   - exports/           导出目录
///
/// 同时生成 project.json、workflow.json 和 README.md 文件。
///
/// # 参数
/// - `name`: 项目名称
/// - `description`: 项目描述
/// - `target_platforms`: 目标平台列表，如 ["cursor", "codebuddy"]
/// - `save_path`: 项目保存的根目录路径
///
/// # 返回
/// - 成功时返回创建的 `Project` 结构体
/// - 失败时返回错误描述字符串
#[tauri::command]
fn create_project(
    name: String,
    description: String,
    target_platforms: Vec<String>,
    save_path: String,
) -> Result<Project, String> {
    // 1. 生成 project_id：对项目名称做 slug 化处理
    let project_id = slugify(&name);

    // 2. 构建项目根目录路径: save_path/<project_id>/
    let project_dir = std::path::Path::new(&save_path).join(&project_id);

    // 3. 创建项目目录及所有子目录
    //    create_dir_all 会自动创建所有不存在的父目录
    let subdirs = [".skillflow", "skills", "references", "assets", "exports"];
    for sub in &subdirs {
        std::fs::create_dir_all(project_dir.join(sub))
            .map_err(|e| format!("无法创建目录 '{}': {}", sub, e))?;
    }

    // 4. 构建 Project 结构体
    let now = now_iso8601();
    let project = Project {
        schema_version: "1.0".to_string(),
        project_id: project_id.clone(),
        name,
        description,
        target_platforms,
        created_at: now.clone(),
        updated_at: now,
        save_path: save_path.clone(),
    };

    // 5. 写入 project.json 到 .skillflow/ 目录
    let project_json_path = project_dir.join(".skillflow").join("project.json");
    let project_json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("序列化 project.json 失败: {}", e))?;
    std::fs::write(&project_json_path, project_json)
        .map_err(|e| format!("写入 project.json 失败: {}", e))?;

    // 6. 写入空的 workflow.json 到 .skillflow/ 目录
    let workflow_json_path = project_dir.join(".skillflow").join("workflow.json");
    let empty_workflow = Workflow {
        nodes: vec![],
        edges: vec![],
    };
    let workflow_json = serde_json::to_string_pretty(&empty_workflow)
        .map_err(|e| format!("序列化 workflow.json 失败: {}", e))?;
    std::fs::write(&workflow_json_path, workflow_json)
        .map_err(|e| format!("写入 workflow.json 失败: {}", e))?;

    // 7. 生成 README.md
    let readme_path = project_dir.join("README.md");
    let readme_content = format!(
        "# {}\n\n{}\n\n## 项目结构\n\n\
         - `.skillflow/` - 项目元数据\n\
         - `skills/` - Skill 文件\n\
         - `references/` - 参考资料\n\
         - `assets/` - 资源文件\n\
         - `exports/` - 导出目录\n",
        project.project_id, project.description
    );
    std::fs::write(&readme_path, readme_content)
        .map_err(|e| format!("写入 README.md 失败: {}", e))?;

    Ok(project)
}

/// 打开已有项目
///
/// 从磁盘读取项目元数据（project.json）和工作流数据（workflow.json）。
///
/// # 参数
/// - `project_path`: .skillflow/project.json 文件的完整路径
///
/// # 返回
/// - 成功时返回 `OpenProjectResult`，包含 project 和 workflow
/// - 失败时返回错误描述字符串
#[tauri::command]
fn open_project(project_path: String) -> Result<OpenProjectResult, String> {
    let project_json_path = std::path::Path::new(&project_path);

    // 验证传入路径确实指向 project.json
    if !project_json_path.exists() {
        return Err(format!("project.json 不存在: {}", project_path));
    }

    // 1. 读取并反序列化 project.json
    let project_json_str = std::fs::read_to_string(project_json_path)
        .map_err(|e| format!("读取 project.json 失败: {}", e))?;
    let project: Project = serde_json::from_str(&project_json_str)
        .map_err(|e| format!("解析 project.json 失败: {}", e))?;

    // 2. 构建 workflow.json 路径（与 project.json 在同一目录）
    let workflow_json_path = project_json_path
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .join("workflow.json");

    // 3. 读取并反序列化 workflow.json，如果文件不存在则返回空工作流
    let workflow = if workflow_json_path.exists() {
        let workflow_json_str = std::fs::read_to_string(&workflow_json_path)
            .map_err(|e| format!("读取 workflow.json 失败: {}", e))?;
        serde_json::from_str(&workflow_json_str)
            .unwrap_or(Workflow {
                nodes: vec![],
                edges: vec![],
            })
    } else {
        Workflow {
            nodes: vec![],
            edges: vec![],
        }
    };

    Ok(OpenProjectResult { project, workflow })
}

/// 保存项目
///
/// 将项目元数据和工作流数据序列化后写入磁盘。
///
/// # 参数
/// - `save_path`: 项目根目录路径
/// - `project`: 要保存的 Project 结构体
/// - `workflow`: 要保存的 Workflow 结构体
///
/// # 返回
/// - 成功时返回操作结果消息
/// - 失败时返回错误描述字符串
#[tauri::command]
fn save_project(
    save_path: String,
    project: Project,
    workflow: Workflow,
) -> Result<String, String> {
    let project_dir = std::path::Path::new(&save_path);
    let skillflow_dir = project_dir.join(".skillflow");

    // 确保 .skillflow 目录存在
    if !skillflow_dir.exists() {
        std::fs::create_dir_all(&skillflow_dir)
            .map_err(|e| format!("无法创建 .skillflow 目录: {}", e))?;
    }

    // 1. 更新时间戳
    let mut updated_project = project.clone();
    updated_project.updated_at = now_iso8601();

    // 2. 写入 project.json
    let project_json_path = skillflow_dir.join("project.json");
    let project_json = serde_json::to_string_pretty(&updated_project)
        .map_err(|e| format!("序列化 project.json 失败: {}", e))?;
    std::fs::write(&project_json_path, project_json)
        .map_err(|e| format!("写入 project.json 失败: {}", e))?;

    // 3. 写入 workflow.json
    let workflow_json_path = skillflow_dir.join("workflow.json");
    let workflow_json = serde_json::to_string_pretty(&workflow)
        .map_err(|e| format!("序列化 workflow.json 失败: {}", e))?;
    std::fs::write(&workflow_json_path, workflow_json)
        .map_err(|e| format!("写入 workflow.json 失败: {}", e))?;

    Ok(format!(
        "项目 '{}' 已成功保存到 {}",
        updated_project.project_id, save_path
    ))
}

/// 生成所有 Skill 的 SKILL.md 文件并写入磁盘
///
/// 遍历工作流中的所有节点，为每个节点在 skills/<folder>/ 下生成 SKILL.md。
/// 同时根据连线关系自动填充上游依赖和下游交接信息。
///
/// # 参数
/// - `save_path`: 项目根目录路径
/// - `workflow`: 当前工作流数据
///
/// # 返回
/// - 成功时返回生成的 Skill 数量
#[tauri::command]
fn generate_all_skills(save_path: String, workflow: Workflow) -> Result<String, String> {
    let skills_dir = std::path::Path::new(&save_path).join("skills");
    std::fs::create_dir_all(&skills_dir)
        .map_err(|e| format!("无法创建 skills 目录: {}", e))?;

    let mut generated_count = 0;

    for node in &workflow.nodes {
        let folder_name = if node.data.folder.is_empty() {
            slugify(&node.data.name)
        } else {
            node.data.folder.clone()
        };

        let skill_dir = skills_dir.join(&folder_name);
        std::fs::create_dir_all(&skill_dir)
            .map_err(|e| format!("无法创建目录 '{}': {}", folder_name, e))?;

        // 查找上下游关系
        let incoming: Vec<_> = workflow
            .edges
            .iter()
            .filter(|e| e.target == node.id)
            .map(|e| {
                let from_name = workflow
                    .nodes
                    .iter()
                    .find(|n| n.id == e.source)
                    .map(|n| n.data.name.as_str())
                    .unwrap_or("未知节点");
                serde_json::json!({
                    "from": from_name,
                    "relation": e.relation,
                    "handoffData": e.handoff_data,
                })
            })
            .collect();

        let outgoing: Vec<_> = workflow
            .edges
            .iter()
            .filter(|e| e.source == node.id)
            .map(|e| {
                let to_name = workflow
                    .nodes
                    .iter()
                    .find(|n| n.id == e.target)
                    .map(|n| n.data.name.as_str())
                    .unwrap_or("未知节点");
                serde_json::json!({
                    "to": to_name,
                    "relation": e.relation,
                    "handoffData": e.handoff_data,
                })
            })
            .collect();

        let markdown = build_skill_markdown(&node.data, &incoming, &outgoing);

        let skill_md_path = skill_dir.join("SKILL.md");
        std::fs::write(&skill_md_path, &markdown)
            .map_err(|e| format!("写入 SKILL.md 失败 ({}): {}", folder_name, e))?;

        generated_count += 1;
    }

    Ok(format!("成功生成 {} 个 SKILL.md 文件", generated_count))
}

/// 根据 Skill 节点数据构建 SKILL.md 内容
///
/// 按照统一模板渲染 Markdown，包含 YAML frontmatter 和全部标准章节。
fn build_skill_markdown(
    data: &SkillNodeData,
    incoming: &[serde_json::Value],
    outgoing: &[serde_json::Value],
) -> String {
    // 渲染列表项
    let render_list = |items: &[String]| -> String {
        if items.is_empty() {
            "（无）".to_string()
        } else {
            items.iter().map(|i| format!("- {}", i)).collect::<Vec<_>>().join("\n")
        }
    };

    // 渲染规则块
    let render_rules = |rule_type: &str, label: &str| -> String {
        let items: Vec<_> = data.rules.iter().filter(|r| r.rule_type == rule_type).collect();
        if items.is_empty() {
            format!("（未设置{}）", label)
        } else {
            items.iter().map(|r| format!("- {}", r.content)).collect::<Vec<_>>().join("\n")
        }
    };

    // 渲染上下游
    let render_relations = |relations: &[serde_json::Value]| -> String {
        if relations.is_empty() {
            "（无）".to_string()
        } else {
            relations
                .iter()
                .map(|r| {
                    let name = r["from"].as_str().or(r["to"].as_str()).unwrap_or("未知");
                    let relation = r["relation"].as_str().unwrap_or("before");
                    let data = r["handoffData"]
                        .as_array()
                        .map(|a| {
                            a.iter()
                                .filter_map(|v| v.as_str())
                                .collect::<Vec<_>>()
                                .join("、")
                        })
                        .unwrap_or_default();
                    format!("- {}（关系: {}，交接: {}）", name, relation, data)
                })
                .collect::<Vec<_>>()
                .join("\n")
        }
    };

    // 渲染 YAML frontmatter
    let frontmatter = format!(
        "---\nname: {}\ndescription: {}\n---\n",
        data.name, data.description
    );

    // 渲染完整 SKILL.md
    format!(
        "{}\n\
         # {}\n\n\
         ## 使用时机\n\n{}\n\n\
         ## 不适用场景\n\n{}\n\n\
         ## 输入\n\n{}\n\n\
         ## 输出\n\n{}\n\n\
         ## 上游依赖\n\n{}\n\n\
         ## 下游交接\n\n{}\n\n\
         ## 必须遵守\n\n{}\n\n\
         ## 禁止行为\n\n{}\n\n\
         ## 可用工具\n\n{}\n\n\
         ## 执行流程\n\n{}\n\n\
         ## 完成标准\n\n{}\n\n\
         ## 失败处理\n\n{}\n\n\
         ## 参考资料\n\n{}\n",
        frontmatter,
        data.name,
        render_list(&data.when_to_use),
        render_list(&data.when_not_to_use),
        render_list(&data.inputs),
        render_list(&data.outputs),
        render_relations(incoming),
        render_relations(outgoing),
        render_rules("require", "必须遵守"),
        render_rules("forbid", "禁止行为"),
        render_list(&data.tools),
        render_list(&data.steps),
        render_list(&data.checks),
        render_list(&data.fallbacks),
        render_list(&data.references),
    )
}

/// 生成 workflow.md 文件
///
/// 根据节点和连线数据生成工作流概览文档。
#[tauri::command]
fn generate_workflow_md(save_path: String, workflow: Workflow) -> Result<String, String> {
    let mut content = String::from("# 工作流概览\n\n");

    // 节点列表
    content.push_str("## 节点列表\n\n");
    for node in &workflow.nodes {
        content.push_str(&format!("- **{}** (`{}`)\n", node.data.name, node.id));
        if !node.data.description.is_empty() {
            content.push_str(&format!("  {}\n", node.data.description));
        }
    }

    // 连线列表
    content.push_str("\n## 流程关系\n\n");
    for edge in &workflow.edges {
        let source_name = workflow
            .nodes
            .iter()
            .find(|n| n.id == edge.source)
            .map(|n| n.data.name.as_str())
            .unwrap_or("未知");
        let target_name = workflow
            .nodes
            .iter()
            .find(|n| n.id == edge.target)
            .map(|n| n.data.name.as_str())
            .unwrap_or("未知");
        content.push_str(&format!(
            "- **{}** → **{}**（关系: {}）\n",
            source_name, target_name, edge.relation
        ));
    }

    let workflow_path = std::path::Path::new(&save_path).join("workflow.md");
    std::fs::write(&workflow_path, &content)
        .map_err(|e| format!("写入 workflow.md 失败: {}", e))?;

    Ok("workflow.md 生成成功".to_string())
}

// ============================================================================
// 应用入口
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            create_project,
            open_project,
            save_project,
            generate_all_skills,
            generate_workflow_md
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}