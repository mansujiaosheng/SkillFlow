use serde::{Deserialize, Serialize};

/// 节点在画布上的坐标位置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

/// 规则块，用于结构化编辑模式，表示一条规则
/// type: "always" | "manual" | "requested" | "blocking" | "forbidden" 等
/// content: 规则的具体文本内容
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RuleBlock {
    #[serde(rename = "type")]
    pub rule_type: String,
    pub content: String,
}

/// Skill 节点的数据载荷
/// 包含该 Skill 的所有元信息和编辑内容
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillNodeData {
    /// Skill 名称
    pub name: String,

    /// Skill 所属目录/分类
    pub folder: String,

    /// Skill 功能描述
    pub description: String,

    /// 适用场景列表
    #[serde(rename = "whenToUse", default)]
    pub when_to_use: Vec<String>,

    /// 不适用场景列表
    #[serde(rename = "whenNotToUse", default)]
    pub when_not_to_use: Vec<String>,

    /// 输入参数列表
    #[serde(default)]
    pub inputs: Vec<String>,

    /// 输出结果列表
    #[serde(default)]
    pub outputs: Vec<String>,

    /// 依赖的工具列表
    #[serde(default)]
    pub tools: Vec<String>,

    /// 执行步骤列表
    #[serde(default)]
    pub steps: Vec<String>,

    /// 检查项列表
    #[serde(default)]
    pub checks: Vec<String>,

    /// 回退策略列表
    #[serde(default)]
    pub fallbacks: Vec<String>,

    /// 参考资料列表
    #[serde(default)]
    pub references: Vec<String>,

    /// 结构化规则列表
    #[serde(default)]
    pub rules: Vec<RuleBlock>,

    /// 编辑模式: "structured" | "manual" | "hybrid"
    #[serde(rename = "editMode", default)]
    pub edit_mode: String,

    /// 手动编辑的 Markdown 内容
    #[serde(rename = "manualMarkdown", default)]
    pub manual_markdown: String,

    /// AI 生成的 Markdown 内容
    #[serde(rename = "aiGeneratedMarkdown", default)]
    pub ai_generated_markdown: String,
}

/// 工作流节点
/// id 由前端生成（如 react-flow 节点 ID）
/// node_type 固定为 "skillNode"
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowNode {
    /// 节点唯一标识符
    pub id: String,

    /// 节点类型，固定为 "skillNode"
    #[serde(rename = "type")]
    pub node_type: String,

    /// 节点在画布上的坐标
    pub position: Position,

    /// 节点携带的 Skill 数据
    pub data: SkillNodeData,
}

/// 工作流边（节点之间的连接关系）
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkflowEdge {
    /// 边唯一标识符
    pub id: String,

    /// 源节点 ID
    pub source: String,

    /// 目标节点 ID
    pub target: String,

    /// 关系类型: before, depends_on, handoff, review_by, fallback_to, parallel_with
    #[serde(default)]
    pub relation: String,

    /// 交接数据列表（当 relation 为 handoff 时使用）
    #[serde(rename = "handoffData", default)]
    pub handoff_data: Vec<String>,

    /// 边的描述信息
    #[serde(default)]
    pub description: String,

    /// 是否为必需连接
    #[serde(rename = "required", default)]
    pub required: bool,
}

/// 完整的工作流数据
/// 对应 .skillflow/workflow.json 的序列化格式
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workflow {
    /// 节点列表
    pub nodes: Vec<WorkflowNode>,

    /// 边列表
    pub edges: Vec<WorkflowEdge>,
}