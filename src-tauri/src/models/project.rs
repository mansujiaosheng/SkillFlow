use serde::{Deserialize, Serialize};

/// 项目元数据结构体
/// 对应 .skillflow/project.json 的序列化格式
/// 所有字段使用 camelCase 命名以匹配前端 JSON 约定
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    /// SkillFlow 数据格式版本号，当前固定为 "1.0"
    #[serde(rename = "schemaVersion")]
    pub schema_version: String,

    /// 项目唯一标识符，由项目名称 slug 化生成
    #[serde(rename = "projectId")]
    pub project_id: String,

    /// 项目名称
    pub name: String,

    /// 项目描述
    pub description: String,

    /// 目标平台列表，例如 ["cursor", "codebuddy", "cline"]
    #[serde(rename = "targetPlatforms")]
    pub target_platforms: Vec<String>,

    /// 项目创建时间，ISO 8601 格式字符串
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// 项目最后更新时间，ISO 8601 格式字符串
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// 项目在磁盘上的保存根路径
    #[serde(rename = "savePath")]
    pub save_path: String,
}