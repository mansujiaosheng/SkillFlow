use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub schema_version: String,
    pub project_id: String,
    pub name: String,
    pub description: String,
    pub target_platforms: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSettings {
    pub theme: String,
    pub auto_lint: bool,
    pub auto_generate_on_save: bool,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RuleBlock {
    pub id: String,
    #[serde(rename = "type")]
    pub rule_type: String,
    pub content: String,
    pub severity: String,
    pub required: bool,
    pub note: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowData {
    pub nodes: Vec<Value>,
    pub edges: Vec<Value>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectState {
    pub project_root: String,
    pub project: ProjectMeta,
    pub workflow: WorkflowData,
    pub rules: Vec<RuleBlock>,
    pub settings: ProjectSettings,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectPayload {
    pub name: String,
    pub description: String,
    pub parent_dir: String,
    pub target_platforms: Vec<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LintIssue {
    pub id: String,
    pub level: String,
    pub message: String,
    pub node_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LintReport {
    pub score: u16,
    pub critical: Vec<LintIssue>,
    pub warnings: Vec<LintIssue>,
    pub suggestions: Vec<LintIssue>,
    pub generated_at: String,
}
