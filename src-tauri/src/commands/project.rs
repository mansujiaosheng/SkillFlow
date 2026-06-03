use crate::models::project::{
    CreateProjectPayload, LintIssue, LintReport, ProjectMeta, ProjectSettings, ProjectState,
    WorkflowData,
};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn iso_now() -> String {
    format!("{}Z", unix_timestamp())
}

fn slugify(value: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;

    for ch in value.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_dash = false;
        } else if (ch.is_whitespace() || ch == '_' || ch == '-') && !last_dash {
            slug.push('-');
            last_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

fn project_dir(parent_dir: &str, name: &str) -> PathBuf {
    let slug = slugify(name);
    Path::new(parent_dir).join(if slug.is_empty() {
        format!("skillflow-{}", unix_timestamp())
    } else {
        slug
    })
}

fn ensure_inside_project(root: &Path, target: &Path) -> Result<(), String> {
    let root = root
        .canonicalize()
        .map_err(|err| format!("项目根目录无效：{err}"))?;
    let target_parent = target.parent().unwrap_or(target);
    let canonical_parent = if target_parent.exists() {
        target_parent
            .canonicalize()
            .map_err(|err| format!("目标路径无效：{err}"))?
    } else {
        target_parent
            .parent()
            .unwrap_or(target_parent)
            .canonicalize()
            .map_err(|err| format!("目标父目录无效：{err}"))?
    };

    if canonical_parent.starts_with(&root) {
        Ok(())
    } else {
        Err("拒绝写入项目目录之外的路径".to_string())
    }
}

fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let content =
        serde_json::to_string_pretty(value).map_err(|err| format!("序列化 JSON 失败：{err}"))?;
    fs::write(path, content).map_err(|err| format!("写入文件失败 {}：{err}", path.display()))
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T, String> {
    let content =
        fs::read_to_string(path).map_err(|err| format!("读取文件失败 {}：{err}", path.display()))?;
    serde_json::from_str(&content).map_err(|err| format!("解析 JSON 失败 {}：{err}", path.display()))
}

fn initial_state(payload: CreateProjectPayload, root: &Path) -> ProjectState {
    let created_at = iso_now();
    ProjectState {
        project_root: root.to_string_lossy().to_string(),
        project: ProjectMeta {
            schema_version: "0.1.0".to_string(),
            project_id: slugify(&payload.name),
            name: payload.name,
            description: payload.description,
            target_platforms: payload.target_platforms,
            created_at: created_at.clone(),
            updated_at: created_at,
        },
        workflow: WorkflowData {
            nodes: Vec::new(),
            edges: Vec::new(),
        },
        rules: Vec::new(),
        settings: ProjectSettings {
            theme: "system".to_string(),
            auto_lint: true,
            auto_generate_on_save: false,
        },
    }
}

fn skill_data(node: &Value) -> Option<&Value> {
    node.get("data")
}

fn array_field(data: &Value, key: &str) -> Vec<String> {
    data.get(key)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

fn string_field(data: &Value, key: &str) -> String {
    data.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn render_list(items: &[String], fallback: &str) -> String {
    if items.is_empty() {
        fallback.to_string()
    } else {
        items
            .iter()
            .map(|item| format!("- {item}"))
            .collect::<Vec<_>>()
            .join("\n")
    }
}

fn rule_contents(data: &Value, rule_type: &str) -> Vec<String> {
    data.get("rules")
        .and_then(Value::as_array)
        .map(|rules| {
            rules
                .iter()
                .filter(|rule| {
                    rule.get("type")
                        .and_then(Value::as_str)
                        .is_some_and(|value| value == rule_type)
                })
                .filter_map(|rule| rule.get("content").and_then(Value::as_str))
                .map(str::trim)
                .filter(|item| !item.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

fn edge_data<'a>(edge: &'a Value, key: &str) -> Option<&'a Value> {
    edge.get("data").and_then(|data| data.get(key))
}

fn node_name_by_id(nodes: &[Value], id: &str) -> String {
    nodes
        .iter()
        .find(|node| node.get("id").and_then(Value::as_str) == Some(id))
        .and_then(skill_data)
        .map(|data| string_field(data, "name"))
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| id.to_string())
}

fn render_incoming(node: &Value, nodes: &[Value], edges: &[Value]) -> String {
    let node_id = node.get("id").and_then(Value::as_str).unwrap_or_default();
    let lines = edges
        .iter()
        .filter(|edge| edge.get("target").and_then(Value::as_str) == Some(node_id))
        .map(|edge| {
            let source = edge.get("source").and_then(Value::as_str).unwrap_or_default();
            let relation = edge_data(edge, "relation")
                .and_then(Value::as_str)
                .unwrap_or("handoff");
            let handoff = edge_data(edge, "handoffData")
                .and_then(Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .filter_map(Value::as_str)
                        .collect::<Vec<_>>()
                        .join("、")
                })
                .filter(|value| !value.is_empty())
                .map(|value| format!("；交接：{value}"))
                .unwrap_or_default();
            format!("- {} ({relation}){handoff}", node_name_by_id(nodes, source))
        })
        .collect::<Vec<_>>();

    if lines.is_empty() {
        "- 无上游依赖".to_string()
    } else {
        lines.join("\n")
    }
}

fn render_outgoing(node: &Value, nodes: &[Value], edges: &[Value]) -> String {
    let node_id = node.get("id").and_then(Value::as_str).unwrap_or_default();
    let lines = edges
        .iter()
        .filter(|edge| edge.get("source").and_then(Value::as_str) == Some(node_id))
        .map(|edge| {
            let target = edge.get("target").and_then(Value::as_str).unwrap_or_default();
            let relation = edge_data(edge, "relation")
                .and_then(Value::as_str)
                .unwrap_or("handoff");
            let handoff = edge_data(edge, "handoffData")
                .and_then(Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .filter_map(Value::as_str)
                        .collect::<Vec<_>>()
                        .join("、")
                })
                .filter(|value| !value.is_empty())
                .map(|value| format!("；交接：{value}"))
                .unwrap_or_default();
            format!("- {} ({relation}){handoff}", node_name_by_id(nodes, target))
        })
        .collect::<Vec<_>>();

    if lines.is_empty() {
        "- 无下游交接".to_string()
    } else {
        lines.join("\n")
    }
}

fn generate_skill_markdown(node: &Value, nodes: &[Value], edges: &[Value]) -> Option<String> {
    let data = skill_data(node)?;
    let edit_mode = string_field(data, "editMode");
    let manual = string_field(data, "manualMarkdown");
    if edit_mode == "manual" && !manual.is_empty() {
        return Some(format!("{}\n", manual.trim_end()));
    }

    let name = string_field(data, "name");
    let description = string_field(data, "description");
    let description = if description.is_empty() {
        format!("{name}，在相关任务触发时用于生成规范化 Agent Skill。")
    } else {
        description
    };

    let mut requires = array_field(data, "requires");
    requires.extend(rule_contents(data, "require"));
    let mut forbids = array_field(data, "forbids");
    forbids.extend(rule_contents(data, "forbid"));
    let mut checks = array_field(data, "checks");
    checks.extend(rule_contents(data, "check"));
    let mut tools = array_field(data, "tools");
    tools.extend(rule_contents(data, "tool"));
    let mut fallbacks = array_field(data, "fallbacks");
    fallbacks.extend(rule_contents(data, "fallback"));
    let mut references = array_field(data, "references");
    references.extend(rule_contents(data, "ref"));

    Some(format!(
        "---\nname: {name}\ndescription: \"{}\"\n---\n\n# {name}\n\n## 使用时机\n\n{}\n\n## 不适用场景\n\n{}\n\n## 输入\n\n{}\n\n## 输出\n\n{}\n\n## 上游依赖\n\n{}\n\n## 下游交接\n\n{}\n\n## 必须遵守\n\n{}\n\n## 禁止行为\n\n{}\n\n## 可用工具\n\n{}\n\n## 执行流程\n\n{}\n\n## 完成标准\n\n{}\n\n## 失败处理\n\n{}\n\n## 参考资料\n\n{}\n",
        description.replace('"', "\\\""),
        render_list(&array_field(data, "whenToUse"), "- 未配置"),
        render_list(&array_field(data, "whenNotToUse"), "- 未配置"),
        render_list(&array_field(data, "inputs"), "- 未配置"),
        render_list(&array_field(data, "outputs"), "- 未配置"),
        render_incoming(node, nodes, edges),
        render_outgoing(node, nodes, edges),
        render_list(&requires, "- 未配置"),
        render_list(&forbids, "- 未配置"),
        render_list(&tools, "- 未配置"),
        render_list(&array_field(data, "steps"), "- 未配置"),
        render_list(&checks, "- 未配置"),
        render_list(&fallbacks, "- 未配置"),
        render_list(&references, "- 未配置"),
    ))
}

fn generate_workflow_markdown(nodes: &[Value], edges: &[Value]) -> String {
    let node_lines = nodes
        .iter()
        .enumerate()
        .filter_map(|(index, node)| {
            let data = skill_data(node)?;
            Some(format!(
                "{}. {} ({}) - {}",
                index + 1,
                string_field(data, "name"),
                string_field(data, "folder"),
                string_field(data, "description")
            ))
        })
        .collect::<Vec<_>>();

    let edge_lines = edges
        .iter()
        .map(|edge| {
            let source = edge.get("source").and_then(Value::as_str).unwrap_or_default();
            let target = edge.get("target").and_then(Value::as_str).unwrap_or_default();
            let relation = edge_data(edge, "relation")
                .and_then(Value::as_str)
                .unwrap_or("handoff");
            format!(
                "- {} -> {}：{}",
                node_name_by_id(nodes, source),
                node_name_by_id(nodes, target),
                relation
            )
        })
        .collect::<Vec<_>>();

    format!(
        "# SkillFlow Workflow\n\n## Skill 节点\n\n{}\n\n## 流程关系\n\n{}\n",
        if node_lines.is_empty() {
            "- 暂无节点".to_string()
        } else {
            node_lines.join("\n")
        },
        if edge_lines.is_empty() {
            "- 暂无流程关系".to_string()
        } else {
            edge_lines.join("\n")
        }
    )
}

fn lint_issue(level: &str, message: &str, node_id: Option<&str>) -> LintIssue {
    LintIssue {
        id: format!("{}-{}-{}", level, node_id.unwrap_or("project"), message),
        level: level.to_string(),
        message: message.to_string(),
        node_id: node_id.map(ToOwned::to_owned),
    }
}

fn has_cycle(nodes: &[Value], edges: &[Value]) -> bool {
    let mut graph: HashMap<String, Vec<String>> = HashMap::new();
    for node in nodes {
        if let Some(id) = node.get("id").and_then(Value::as_str) {
            graph.insert(id.to_string(), Vec::new());
        }
    }
    for edge in edges {
        let relation = edge_data(edge, "relation")
            .and_then(Value::as_str)
            .unwrap_or("handoff");
        if relation == "parallel_with" {
            continue;
        }
        if let (Some(source), Some(target)) = (
            edge.get("source").and_then(Value::as_str),
            edge.get("target").and_then(Value::as_str),
        ) {
            graph.entry(source.to_string()).or_default().push(target.to_string());
        }
    }

    fn visit(
        id: &str,
        graph: &HashMap<String, Vec<String>>,
        visiting: &mut HashSet<String>,
        visited: &mut HashSet<String>,
    ) -> bool {
        if visiting.contains(id) {
            return true;
        }
        if visited.contains(id) {
            return false;
        }
        visiting.insert(id.to_string());
        for next in graph.get(id).into_iter().flatten() {
            if visit(next, graph, visiting, visited) {
                return true;
            }
        }
        visiting.remove(id);
        visited.insert(id.to_string());
        false
    }

    let mut visiting = HashSet::new();
    let mut visited = HashSet::new();
    graph
        .keys()
        .any(|id| visit(id, &graph, &mut visiting, &mut visited))
}

fn lint_state(state: &ProjectState) -> LintReport {
    let mut critical = Vec::new();
    let mut warnings = Vec::new();
    let mut suggestions = Vec::new();
    let weak_words = ["可以", "建议", "尽量", "最好", "maybe", "should"];
    let dangerous_words = ["自动删除文件", "自动发送敏感信息", "执行未知脚本"];

    for node in &state.workflow.nodes {
        let node_id = node.get("id").and_then(Value::as_str).unwrap_or_default();
        let Some(data) = skill_data(node) else {
            critical.push(lint_issue("critical", "节点缺少 data", Some(node_id)));
            continue;
        };
        let markdown = generate_skill_markdown(node, &state.workflow.nodes, &state.workflow.edges)
            .unwrap_or_default();

        if !markdown.starts_with("---") {
            critical.push(lint_issue("critical", "缺少 YAML frontmatter", Some(node_id)));
        }
        if string_field(data, "name").is_empty() {
            critical.push(lint_issue("critical", "缺少 name", Some(node_id)));
        }
        if string_field(data, "description").is_empty() {
            critical.push(lint_issue("critical", "缺少 description", Some(node_id)));
        }
        for (field, message) in [
            ("whenToUse", "没有配置使用时机"),
            ("inputs", "没有配置输入"),
            ("outputs", "没有配置输出"),
            ("requires", "没有必须遵守规则"),
            ("forbids", "没有禁止行为"),
            ("steps", "没有执行流程"),
            ("checks", "没有完成标准"),
        ] {
            if array_field(data, field).is_empty() {
                warnings.push(lint_issue("warning", message, Some(node_id)));
            }
        }
        for word in weak_words {
            if markdown.contains(word) {
                warnings.push(lint_issue(
                    "warning",
                    &format!("出现弱约束词：“{word}”"),
                    Some(node_id),
                ));
            }
        }
        for word in dangerous_words {
            if markdown.contains(word) {
                critical.push(lint_issue(
                    "critical",
                    &format!("出现危险行为：“{word}”"),
                    Some(node_id),
                ));
            }
        }
        let connected = state.workflow.edges.iter().any(|edge| {
            edge.get("source").and_then(Value::as_str) == Some(node_id)
                || edge.get("target").and_then(Value::as_str) == Some(node_id)
        });
        if state.workflow.nodes.len() > 1 && !connected {
            warnings.push(lint_issue("warning", "存在孤立节点", Some(node_id)));
        }
        let has_outgoing = state
            .workflow
            .edges
            .iter()
            .any(|edge| edge.get("source").and_then(Value::as_str) == Some(node_id));
        if !array_field(data, "outputs").is_empty() && !has_outgoing {
            suggestions.push(lint_issue(
                "suggestion",
                "关键节点没有下游交接说明",
                Some(node_id),
            ));
        }
    }

    if has_cycle(&state.workflow.nodes, &state.workflow.edges) {
        critical.push(lint_issue("critical", "流程中存在循环依赖", None));
    }

    let penalty = critical.len() as i32 * 14 + warnings.len() as i32 * 5 + suggestions.len() as i32 * 2;
    let score = 0.max(100 - penalty) as u16;

    LintReport {
        score,
        critical,
        warnings,
        suggestions,
        generated_at: iso_now(),
    }
}

#[tauri::command]
pub fn create_project(payload: CreateProjectPayload) -> Result<ProjectState, String> {
    let root = project_dir(&payload.parent_dir, &payload.name);
    fs::create_dir_all(root.join(".skillflow")).map_err(|err| format!("创建目录失败：{err}"))?;
    for dir in ["skills", "references", "assets", "exports"] {
        fs::create_dir_all(root.join(dir)).map_err(|err| format!("创建目录失败：{err}"))?;
    }

    let state = initial_state(payload, &root);
    save_project(state.clone())?;
    fs::write(
        root.join("README.md"),
        format!("# {}\n\n{}\n", state.project.name, state.project.description),
    )
    .map_err(|err| format!("写入 README.md 失败：{err}"))?;
    Ok(state)
}

#[tauri::command]
pub fn open_project(project_root: String) -> Result<ProjectState, String> {
    let root = PathBuf::from(project_root);
    if !root.join(".skillflow/project.json").exists() {
        return Err("缺少 .skillflow/project.json，无法打开项目".to_string());
    }

    Ok(ProjectState {
        project_root: root.to_string_lossy().to_string(),
        project: read_json(&root.join(".skillflow/project.json"))?,
        workflow: read_json(&root.join(".skillflow/workflow.json"))?,
        rules: read_json(&root.join(".skillflow/rules.json"))?,
        settings: read_json(&root.join(".skillflow/settings.json"))?,
    })
}

#[tauri::command]
pub fn save_project(payload: ProjectState) -> Result<(), String> {
    let root = PathBuf::from(&payload.project_root);
    fs::create_dir_all(root.join(".skillflow")).map_err(|err| format!("创建目录失败：{err}"))?;

    for target in [
        root.join(".skillflow/project.json"),
        root.join(".skillflow/workflow.json"),
        root.join(".skillflow/nodes.json"),
        root.join(".skillflow/rules.json"),
        root.join(".skillflow/settings.json"),
    ] {
        ensure_inside_project(&root, &target)?;
    }

    write_json(&root.join(".skillflow/project.json"), &payload.project)?;
    write_json(&root.join(".skillflow/workflow.json"), &payload.workflow)?;
    write_json(&root.join(".skillflow/nodes.json"), &payload.workflow.nodes)?;
    write_json(&root.join(".skillflow/rules.json"), &payload.rules)?;
    write_json(&root.join(".skillflow/settings.json"), &payload.settings)?;
    Ok(())
}

#[tauri::command]
pub fn generate_skills(payload: ProjectState) -> Result<(), String> {
    let root = PathBuf::from(&payload.project_root);
    save_project(payload.clone())?;
    fs::create_dir_all(root.join("skills")).map_err(|err| format!("创建 skills 目录失败：{err}"))?;

    for node in &payload.workflow.nodes {
        let Some(data) = skill_data(node) else {
            continue;
        };
        let folder = string_field(data, "folder");
        let folder = if folder.is_empty() {
            slugify(&string_field(data, "name"))
        } else {
            slugify(&folder)
        };
        if folder.is_empty() {
            continue;
        }
        let skill_dir = root.join("skills").join(folder);
        let target = skill_dir.join("SKILL.md");
        fs::create_dir_all(&skill_dir).map_err(|err| format!("创建 Skill 目录失败：{err}"))?;
        ensure_inside_project(&root, &target)?;
        if let Some(markdown) =
            generate_skill_markdown(node, &payload.workflow.nodes, &payload.workflow.edges)
        {
            fs::write(&target, markdown)
                .map_err(|err| format!("写入 SKILL.md 失败 {}：{err}", target.display()))?;
        }
    }

    let workflow_path = root.join("workflow.md");
    ensure_inside_project(&root, &workflow_path)?;
    fs::write(
        workflow_path,
        generate_workflow_markdown(&payload.workflow.nodes, &payload.workflow.edges),
    )
    .map_err(|err| format!("写入 workflow.md 失败：{err}"))?;
    Ok(())
}

#[tauri::command]
pub fn lint_project(payload: ProjectState) -> Result<LintReport, String> {
    let root = PathBuf::from(&payload.project_root);
    let report = lint_state(&payload);
    let target = root.join(".skillflow/lint-report.json");
    ensure_inside_project(&root, &target)?;
    write_json(&target, &report)?;
    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn slugify_strips_unsafe_path_characters() {
        assert_eq!(slugify("../My Skill_01"), "my-skill-01");
    }

    #[test]
    fn cycle_detection_finds_dependency_loop() {
        let nodes = vec![json!({"id": "a"}), json!({"id": "b"})];
        let edges = vec![
            json!({"source": "a", "target": "b", "data": {"relation": "depends_on"}}),
            json!({"source": "b", "target": "a", "data": {"relation": "depends_on"}}),
        ];
        assert!(has_cycle(&nodes, &edges));
    }
}
