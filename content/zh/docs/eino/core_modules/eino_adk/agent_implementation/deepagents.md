---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: DeepAgents
weight: 3
---

> 💡
> 本功能要求 eino >= v0.5.14。

## 概述

DeepAgents 是基于 ChatModelAgent 的开箱即用方案。无需手动拼装提示词、工具或上下文管理，即可获得具备规划、文件系统、Shell 执行和子 Agent 委派能力的 Agent，同时保留 ChatModelAgent 的全部扩展能力（自定义 tools、middleware、handlers）。

**内置能力**：

- **规划** — `write_todos` 工具进行任务拆解与进度跟踪
- **文件系统** — `ls`、`read_file`、`write_file`、`edit_file`、`glob`、`grep`
- **Shell** — `execute`（支持流式）
- **子 Agent** — `task` 工具将任务委派到上下文隔离的子智能体
- **智能默认** — 内置 Prompt 教模型高效使用工具
- **上下文管理** — 大体量输出自动保存到文件

### Import

```go
import "github.com/cloudwego/eino/adk/prebuilt/deep"

agent, err := deep.New(ctx, &deep.Config{
    ChatModel: myModel,
})
```

---

## Config 完整定义

```go
type Config = TypedConfig[*schema.Message]

type TypedConfig[M adk.MessageType] struct {
    Name        string              // Agent 标识名
    Description string              // 用途描述
    ChatModel   model.BaseModel[M]  // 必填；需支持 model.WithTools
    Instruction string              // 系统提示词；为空时使用内置默认 Prompt

    // 子 Agent（绑定到 TaskTool）
    SubAgents []adk.TypedAgent[M]

    // 自定义工具
    ToolsConfig  adk.ToolsConfig
    MaxIteration int // 最大推理迭代次数

    // 文件系统（三选一或组合）
    Backend        filesystem.Backend        // 注册 ls/read_file/write_file/edit_file/glob/grep
    Shell          filesystem.Shell          // 注册 execute（与 StreamingShell 互斥）
    StreamingShell filesystem.StreamingShell  // 注册 execute（流式，与 Shell 互斥）

    // 内置功能开关
    WithoutWriteTodos      bool // true 时关闭 write_todos 工具
    WithoutGeneralSubAgent bool // true 时关闭默认 general-purpose 子 Agent

    // TaskTool 描述生成器（自定义 task 工具的 description）
    TaskToolDescriptionGenerator func(ctx context.Context, agents []adk.TypedAgent[M]) (string, error)

    // 扩展
    Middlewares []adk.AgentMiddleware                   // struct-based 中间件
    Handlers    []adk.TypedChatModelAgentMiddleware[M]  // interface-based handlers

    // 模型容错
    ModelRetryConfig    *adk.TypedModelRetryConfig[M]
    ModelFailoverConfig *adk.ModelFailoverConfig[M]

    // 输出存储（通过 AddSessionValue 写入会话）
    OutputKey string
}
```

### 构造函数

```go
// 标准版（M = *schema.Message）
func New(ctx context.Context, cfg *Config) (adk.ResumableAgent, error)

// 泛型版（支持 *schema.AgenticMessage）
func NewTyped[M adk.MessageType](ctx context.Context, cfg *TypedConfig[M]) (adk.TypedResumableAgent[M], error)
```

> 💡
> 返回 ResumableAgent（包含 Resume 方法），可与 Runner 的 checkpoint/resume 机制配合使用。

---

## 架构

<a href="/img/eino/Ifu5bvB6conps5xBH5fcFdiCnCW.png" target="_blank"><img src="/img/eino/Ifu5bvB6conps5xBH5fcFdiCnCW.png" width="100%" /></a>

- **主 Agent**：系统入口，以 ReAct 方式调用工具完成任务
- **ChatModel**（`model.BaseModel[M]`）：负责推理与工具选择
- **Tools**：
  - `write_todos`：内置规划工具，将任务拆解为结构化 TODO 列表
  - `task`：子 Agent 调用入口（路由参数：`subagent_type`、`description`）
  - 内置工具（文件系统/Shell）+ 用户自定义工具（`ToolsConfig`）
- **SubAgents**：上下文隔离，独立执行子任务
  - `general-purpose`：默认子 Agent，拥有与主 Agent 相同的工具（除 task）和配置
  - 自定义子 Agent（`Config.SubAgents`）

---

## 内置文件系统

<table>
<tr><td>配置字段</td><td>注册工具</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td>ls, read_file, write_file, edit_file, glob, grep</td><td>文件系统操作</td></tr>
<tr><td><pre>Shell</pre></td><td>execute</td><td>非流式命令执行，与 StreamingShell 互斥</td></tr>
<tr><td><pre>StreamingShell</pre></td><td>execute (streaming)</td><td>流式命令执行，与 Shell 互斥</td></tr>
</table>

内部使用 FileSystem Middleware 实现。

---

## 任务规划：write_todos

<a href="/img/eino/HOJtbxNKWoibi2xzXrAcx0BUndb.png" target="_blank"><img src="/img/eino/HOJtbxNKWoibi2xzXrAcx0BUndb.png" width="100%" /></a>

`write_todos` 工具将结构化 TODO 列表写入会话（key: `deep_agent_session_key_todos`），供后续推理参考。

**TODO 结构**：

```go
type TODO struct {
    Content    string `json:"content"`
    ActiveForm string `json:"activeForm"`
    Status     string `json:"status"` // "pending" | "in_progress" | "completed"
}
```

**工作流程**：

1. 模型接收用户输入
2. 调用 `write_todos` 拆解任务，写入上下文
3. 按 TODO 逐项执行（调用 task 或直接工具）
4. 再次调用 `write_todos` 更新进度

> 💡
> 对简单任务，每次都调用 write_todos 可能适得其反。内置 Prompt 已包含正反例指导何时使用。可通过自定义 Instruction 进一步调优。配置 WithoutWriteTodos=true 可完全关闭。

---

## 子 Agent 委派：task 工具

**TaskTool** 是所有子 Agent 的统一调用入口：

- 参数：`subagent_type`（目标子 Agent 名称）、`description`（任务描述）
- 内部通过 `adk.NewTypedAgentTool` 将每个子 Agent 包装为工具
- 默认 Description 包含所有可用子 Agent 的名称与说明；可通过 `TaskToolDescriptionGenerator` 自定义

**上下文隔离**：

- 子 Agent 仅接收主 Agent 分配的任务描述，不共享对话历史
- 主 Agent 仅接收子 Agent 的最终结果，中间步骤不回传
- 避免大量工具调用和中间推理"污染"主 Agent 上下文

**general-purpose 子 Agent**：

- 默认创建，拥有与主 Agent 相同的工具（除 task）、Instruction 和 ModelFailoverConfig
- 用于在隔离上下文中执行无专门子 Agent 的通用任务
- 配置 `WithoutGeneralSubAgent=true` 可关闭

---

## 与其他方案对比

<table>
<tr><td>维度</td><td>DeepAgents vs ReAct</td><td>DeepAgents vs Plan-and-Execute</td></tr>
<tr><td>优势</td><td>内置规划 + 子 Agent 上下文隔离，多步任务效果更优</td><td>Plan/RePlan 作为工具按需调用，减少不必要的规划开销</td></tr>
<tr><td>劣势</td><td>规划 + 子 Agent 调用增加模型请求、耗时与 token 成本</td><td>规划与委派在单次调用中完成，对模型能力要求更高</td></tr>
</table>

---

## 使用示例

### Excel Agent 场景

<a href="/img/eino/PhKjbQyKZoqaM9xyxptcceM9nsg.png" target="_blank"><img src="/img/eino/PhKjbQyKZoqaM9xyxptcceM9nsg.png" width="100%" /></a>

- 主 Agent 配置 ReadFile 工具辅助任务制定
- 添加 Code（Python 操作 Excel）和 WebSearch 两个子 Agent

### 代码

完整示例：[https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep)

```go
agent, err := deep.New(ctx, &deep.Config{
    Name:      "ExcelAgent",
    ChatModel: myModel,
    Backend:   localBackend,
    SubAgents: []adk.Agent{codeAgent, webSearchAgent},
    ToolsConfig: adk.ToolsConfig{
        InvokableTools: []tool.InvokableTool{readFileTool},
    },
})
```
