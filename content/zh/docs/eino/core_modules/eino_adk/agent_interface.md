---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent 抽象
weight: 3
---

# Agent 接口

ADK 的所有功能围绕 `Agent` 接口展开：

```go
// github.com/cloudwego/eino/adk

type TypedAgent[M MessageType] interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *TypedAgentInput[M], options ...AgentRunOption) *AsyncIterator[*TypedAgentEvent[M]]
}

// 默认类型别名（使用 *schema.Message）
type Agent = TypedAgent[*schema.Message]
```

<table>
<tr><td>方法</td><td>说明</td></tr>
<tr><td><pre>Name</pre></td><td>Agent 名称标识</td></tr>
<tr><td><pre>Description</pre></td><td>职能描述，供其他 Agent 或框架了解能力</td></tr>
<tr><td><pre>Run</pre></td><td>核心执行方法，异步返回事件流（Future 模式）</td></tr>
</table>

## MessageType 约束

```go
type MessageType interface {
    *schema.Message | *schema.AgenticMessage
}
```

所有 ADK 泛型类型使用 `[M MessageType]` 参数化。`*schema.Message` 支持完整 ADK 特性；`*schema.AgenticMessage` 用于 v0.9 新增的结构化内容块模式。

## 类型别名速查

<table>
<tr><td>泛型类型</td><td>默认别名</td></tr>
<tr><td><pre>TypedAgent[*schema.Message]</pre></td><td><pre>Agent</pre></td></tr>
<tr><td><pre>TypedAgentInput[*schema.Message]</pre></td><td><pre>AgentInput</pre></td></tr>
<tr><td><pre>TypedAgentEvent[*schema.Message]</pre></td><td><pre>AgentEvent</pre></td></tr>
<tr><td><pre>TypedAgentOutput[*schema.Message]</pre></td><td><pre>AgentOutput</pre></td></tr>
<tr><td><pre>TypedMessageVariant[*schema.Message]</pre></td><td><pre>MessageVariant</pre></td></tr>
</table>

# AgentInput

```go
type TypedAgentInput[M MessageType] struct {
    Messages       []M
    EnableStreaming bool
}
```

- **Messages**：用户指令、对话历史、背景知识等，与 ChatModel 输入格式一致
- **EnableStreaming**：建议 Agent 使用流式输出。支持流式的组件（如 ChatModel）会逐步返回；不支持的组件不受影响

# AgentEvent

Agent 运行过程中产出的事件：

```go
type TypedAgentEvent[M MessageType] struct {
    AgentName string
    RunPath   []RunStep
    Output    *TypedAgentOutput[M]
    Action    *AgentAction
    Err       error
}
```

## AgentOutput

```go
type TypedAgentOutput[M MessageType] struct {
    MessageOutput    *TypedMessageVariant[M]
    CustomizedOutput any
}
```

`MessageVariant` 统一处理流式与非流式消息：

```go
type TypedMessageVariant[M MessageType] struct {
    IsStreaming   bool
    Message       M
    MessageStream *schema.StreamReader[M]
    Role          schema.RoleType       // *schema.Message 路径
    AgenticRole   schema.AgenticRoleType // *schema.AgenticMessage 路径
    ToolName      string
}
```

- `IsStreaming=true` → 从 `MessageStream` 逐帧读取
- `IsStreaming=false` → 从 `Message` 一次性获取
- `Role`/`ToolName`：仅 `*schema.Message` 路径有效（Assistant 或 Tool）
- `AgenticRole`：仅 `*schema.AgenticMessage` 路径有效

## AgentAction

控制多 Agent 协作的行为信号：

```go
type AgentAction struct {
    Exit            bool
    Interrupted     *InterruptInfo
    TransferToAgent *TransferToAgentAction  // NOT RECOMMENDED
    BreakLoop       *BreakLoopAction
    CustomizedAction any
}
```

- **Interrupted**：中断 Runner 运行，携带自定义数据，支持后续 Resume
- **BreakLoop**：中止 LoopAgent 的循环
- **Exit**：立即退出多 Agent 系统
- **TransferToAgent**：（不推荐）任务转让，建议使用 AgentAsTool 替代

# AgentRunOption

请求维度的 Agent 配置。ADK 内置：

- `WithSessionValues(map[string]any)`：注入跨 Agent 共享的 KV 数据
- `WithCallbacks(...callbacks.Handler)`：添加回调处理器
- `WithCancel()`：启用 Agent Cancel 能力（详见 [Cancel 与 TurnLoop](/zh/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门)）

自定义 Option：

```go
type myOptions struct {
    modelName string
}

func WithModelName(name string) adk.AgentRunOption {
    return adk.WrapImplSpecificOptFn(func(t *myOptions) {
        t.modelName = name
    })
}

// 在 Run 中读取
func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    o := adk.GetImplSpecificOptions(&myOptions{}, opts...)
    // 使用 o.modelName ...
}
```

`DesignateAgent` 可将 Option 限定到指定 Agent：

```go
opt := adk.WithSessionValues(map[string]any{"key": "val"}).DesignateAgent("agent_1")
```

# AsyncIterator

`Run` 返回的异步事件迭代器：

```go
iter := agent.Run(ctx, input)
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    // 处理 event
}
```

`Next()` 阻塞直到有新事件或迭代结束。Agent 实现通常在 goroutine 中写入 Generator，立即返回 Iterator：

```go
func (m *MyAgent) Run(ctx context.Context, input *adk.AgentInput, opts ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    iter, gen := adk.NewAsyncIteratorPair[*adk.AgentEvent]()
    go func() {
        defer gen.Close()
        // 执行逻辑，通过 gen.Send(event) 产出事件
    }()
    return iter
}
```

# 语言设置

```go
adk.SetLanguage(adk.LanguageChinese) // 或 adk.LanguageEnglish（默认）
```

影响 ADK 内置提示词（FileSystem、Reduction、Skill、ChatModelAgent 等组件）。建议在程序初始化时设置。

> 💡
> 语言设置仅影响 ADK 内置提示词。自定义 Instruction 需自行处理国际化。
