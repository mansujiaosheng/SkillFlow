use crate::models::project::{
    CreateProjectPayload, GeneratedFile, LintReport, NodeResource, ProjectMeta, ProjectSettings,
    ProjectState, RecentProject, WorkflowData, WriteGeneratedFilesPayload,
};
use chrono::{SecondsFormat, Utc};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn iso_now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
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
    let content = fs::read_to_string(path)
        .map_err(|err| format!("读取文件失败 {}：{err}", path.display()))?;
    serde_json::from_str(&content)
        .map_err(|err| format!("解析 JSON 失败 {}：{err}", path.display()))
}

fn read_optional_json<T: serde::de::DeserializeOwned + Default>(path: &Path) -> Result<T, String> {
    if path.exists() {
        read_json(path)
    } else {
        Ok(T::default())
    }
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
        resources: Vec::new(),
        templates: Vec::new(),
        settings: ProjectSettings {
            theme: "system".to_string(),
            auto_lint: true,
            auto_generate_on_save: false,
        },
    }
}

fn default_resources_path(root: &Path) -> PathBuf {
    root.join(".skillflow/resources.json")
}

fn default_templates_path(root: &Path) -> PathBuf {
    root.join(".skillflow/templates.json")
}

fn resource_dir(kind: &str) -> &'static str {
    match kind {
        "script" => "scripts",
        "reference" => "references",
        "asset" => "assets",
        "attachment" => "attachments",
        _ => "attachments",
    }
}

fn relative_path(root: &Path, path: &Path) -> Option<String> {
    path.strip_prefix(root)
        .ok()
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
}

fn write_generated_file(root: &Path, file: &GeneratedFile) -> Result<(), String> {
    let relative = Path::new(&file.path);
    if relative.is_absolute()
        || relative
            .components()
            .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err(format!("生成路径非法：{}", file.path));
    }

    let target = root.join(relative);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|err| format!("创建生成目录失败：{err}"))?;
    }
    ensure_inside_project(root, &target)?;
    fs::write(&target, &file.content)
        .map_err(|err| format!("写入生成文件失败 {}：{err}", target.display()))
}

fn recent_projects_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("获取应用数据目录失败：{err}"))?;
    fs::create_dir_all(&dir).map_err(|err| format!("创建应用数据目录失败：{err}"))?;
    Ok(dir.join("recent-projects.json"))
}

#[tauri::command]
pub fn create_project(payload: CreateProjectPayload) -> Result<ProjectState, String> {
    let root = project_dir(&payload.parent_dir, &payload.name);
    fs::create_dir_all(root.join(".skillflow")).map_err(|err| format!("创建目录失败：{err}"))?;
    for dir in [
        "skills",
        "scripts",
        "references",
        "assets",
        "attachments",
        "exports",
    ] {
        fs::create_dir_all(root.join(dir)).map_err(|err| format!("创建目录失败：{err}"))?;
    }

    let state = initial_state(payload, &root);
    save_project(state.clone())?;
    fs::write(
        root.join("README.md"),
        format!(
            "# {}\n\n{}\n",
            state.project.name, state.project.description
        ),
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
        resources: read_optional_json(&default_resources_path(&root))?,
        templates: read_optional_json(&default_templates_path(&root))?,
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
        root.join(".skillflow/resources.json"),
        root.join(".skillflow/templates.json"),
        root.join(".skillflow/settings.json"),
    ] {
        ensure_inside_project(&root, &target)?;
    }

    write_json(&root.join(".skillflow/project.json"), &payload.project)?;
    write_json(&root.join(".skillflow/workflow.json"), &payload.workflow)?;
    write_json(&root.join(".skillflow/nodes.json"), &payload.workflow.nodes)?;
    write_json(&root.join(".skillflow/rules.json"), &payload.rules)?;
    write_json(&default_resources_path(&root), &payload.resources)?;
    write_json(&default_templates_path(&root), &payload.templates)?;
    write_json(&root.join(".skillflow/settings.json"), &payload.settings)?;
    Ok(())
}

#[tauri::command]
pub fn import_resource(
    project_root: String,
    mut resource: NodeResource,
) -> Result<NodeResource, String> {
    let root = PathBuf::from(&project_root);
    fs::create_dir_all(root.join(resource_dir(&resource.kind)))
        .map_err(|err| format!("创建资源目录失败：{err}"))?;

    if resource.path.trim().is_empty()
        || resource.path.starts_with("http://")
        || resource.path.starts_with("https://")
    {
        return Ok(resource);
    }

    let source = PathBuf::from(&resource.path);
    if !source.exists() {
        return Ok(resource);
    }

    if let Some(relative) = relative_path(&root, &source) {
        resource.path = relative;
        return Ok(resource);
    }

    let file_name = source
        .file_name()
        .ok_or_else(|| "资源路径缺少文件名".to_string())?;
    let target = root.join(resource_dir(&resource.kind)).join(file_name);
    ensure_inside_project(&root, &target)?;
    fs::copy(&source, &target)
        .map_err(|err| format!("复制资源失败 {}：{err}", source.display()))?;
    resource.path =
        relative_path(&root, &target).unwrap_or_else(|| target.to_string_lossy().to_string());
    Ok(resource)
}

#[tauri::command]
pub fn write_generated_files(payload: WriteGeneratedFilesPayload) -> Result<(), String> {
    let root = PathBuf::from(&payload.project_root);
    save_project(payload.project_state)?;
    for file in &payload.files {
        write_generated_file(&root, file)?;
    }
    Ok(())
}

#[tauri::command]
pub fn write_lint_report(project_root: String, report: LintReport) -> Result<(), String> {
    let root = PathBuf::from(project_root);
    let target = root.join(".skillflow/lint-report.json");
    ensure_inside_project(&root, &target)?;
    write_json(&target, &report)
}

#[tauri::command]
pub fn load_recent_projects(app: AppHandle) -> Result<Vec<RecentProject>, String> {
    read_optional_json(&recent_projects_path(&app)?)
}

#[tauri::command]
pub fn save_recent_projects(
    app: AppHandle,
    recent_projects: Vec<RecentProject>,
) -> Result<(), String> {
    write_json(&recent_projects_path(&app)?, &recent_projects)
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
    fn generated_file_rejects_parent_paths() {
        let file = GeneratedFile {
            path: "../outside.md".to_string(),
            content: String::new(),
        };
        let root = std::env::current_dir().unwrap();
        assert!(write_generated_file(&root, &file).is_err());
    }

    #[test]
    fn missing_resources_file_defaults_to_empty_list() {
        let dir = std::env::temp_dir().join(format!("skillflow-test-{}", unix_timestamp()));
        fs::create_dir_all(&dir).unwrap();
        let loaded: Vec<NodeResource> = read_optional_json(&dir.join("resources.json")).unwrap();
        assert!(loaded.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn lint_report_serializes_action_field() {
        let report = LintReport {
            score: 100,
            critical: vec![],
            warnings: vec![crate::models::project::LintIssue {
                id: "w".to_string(),
                level: "warning".to_string(),
                message: "message".to_string(),
                node_id: Some("node".to_string()),
                action: Some("fix".to_string()),
            }],
            suggestions: vec![],
            generated_at: iso_now(),
        };

        let value = serde_json::to_value(report).unwrap();
        assert_eq!(value["warnings"][0]["action"], json!("fix"));
    }
}
