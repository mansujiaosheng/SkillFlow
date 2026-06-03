// 数据模型模块
// 声明子模块供 crate 内部使用

pub mod project;
pub mod workflow;

// 重新导出常用类型，方便外部使用
pub use project::Project;
pub use workflow::Workflow;

/// open_project 命令的返回类型
/// 包含从磁盘读取的项目元数据和工作流数据
#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct OpenProjectResult {
    pub project: Project,
    pub workflow: Workflow,
}