---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ChatModelAgent
weight: 1
---

# ChatModelAgent 概述

`import "github.com/cloudwego/eino/adk"`

## 什么是 ChatModelAgent

`ChatModelAgent` 是 Eino ADK 的核心 Agent 实现——以 ChatModel 为决策器、以 Tools 为行动空间、通过 ReAct Loop 自主推进问题求解。

关于 ChatModelAgent 的概念、ReAct Loop、Middleware 体系的完整介绍，见：[ChatModelAgent 介绍](/zh/docs/eino/overview/五分钟上手_eino_adk_deep_agents)

## ReAct Loop

当配置了 Tools 时，ChatModelAgent 按 ReAct 模式循环执行：

1. **Reason**：调用 ChatModel，模型决定下一步行动
2. **Action**：模型返回 ToolCall 请求
3. **Act**：执行对应 Tool
4. **Observation**：将 Tool 结果注入上下文，开始新一轮循环

循环持续直到模型判断无需再调用 Tool。未配置 Tools 时退化为单次 ChatModel 调用。

# 配置

## TypedChatModelAgentConfig

```go
type TypedChatModelAgentConfig[M MessageType] struct {
    Name        string
    Description string
    Instruction string

    Model       model.BaseModel[M]    // 必填。使用 Tools 时须支持 model.WithTools

    ToolsConfig ToolsConfig
    GenModelInput TypedGenModelInput[M]

    Exit          tool.BaseTool         // NOT RECOMMENDED
    OutputKey     string                // NOT RECOMMENDED
    MaxIterations int                   // 默认 20

    Handlers          []TypedChatModelAgentMiddleware[M]
    Middlewares        []AgentMiddleware  // 旧版兼容

    ModelRetryConfig    *TypedModelRetryConfig[M]
    ModelFailoverConfig *ModelFailoverConfig[M]
}

// 默认别名
type ChatModelAgentConfig = TypedChatModelAgentConfig[*schema.Message]
```

### 字段说明

<table>
<tr><td>字段</td><td>说明</td></tr>
<tr><td><pre>Name</pre></td><td>Agent 名称。用作 AgentTool 时必填</td></tr>
<tr><td><pre>Description</pre></td><td>Agent 能力描述。用作 AgentTool 时必填</td></tr>
<tr><td><pre>Instruction</pre></td><td>System Prompt。支持 <pre>{Key}</pre> 占位符，默认 <pre>GenModelInput</pre> 会用 SessionValues 渲染</td></tr>
<tr><td><pre>Model</pre></td><td><strong>必填</strong>。<pre>model.BaseModel[M]</pre> 类型，使用 Tools 时须支持 <pre>model.WithTools</pre></td></tr>
<tr><td><pre>ToolsConfig</pre></td><td>工具配置，详见下文</td></tr>
<tr><td><pre>GenModelInput</pre></td><td>自定义输入转换。默认将 Instruction 作为 System Message + f-string 渲染</td></tr>
<tr><td><pre>MaxIterations</pre></td><td>ReAct 最大循环次数，超过报错退出。默认 20</td></tr>
<tr><td><pre>Handlers</pre></td><td>接口式 Middleware（<pre>TypedChatModelAgentMiddleware[M]</pre>），推荐使用</td></tr>
<tr><td><pre>Middlewares</pre></td><td>结构体式 Middleware（<pre>AgentMiddleware</pre>），旧版兼容</td></tr>
<tr><td><pre>ModelRetryConfig</pre></td><td>模型调用失败时的重试策略</td></tr>
<tr><td><pre>ModelFailoverConfig</pre></td><td>模型调用失败时切换备用模型。需配置 <pre>GetFailoverModel</pre> 和 <pre>ShouldFailover</pre></td></tr>
</table>

> 💡
> 默认 GenModelInput 使用 pyfmt 渲染，Messages 中的 `{` 和 `}` 会被视为占位符。如需直接输出这两个字符，用 `{{` 和 `}}` 转义。

### ToolsConfig

```go
type ToolsConfig struct {
    compose.ToolsNodeConfig

    ReturnDirectly     map[string]bool  // 调用后直接返回的 Tool 名称
    EmitInternalEvents bool             // 透传 AgentTool 内部事件
}
```

- **ReturnDirectly**：命中的 Tool 执行后 Agent 立即退出，不再回调模型。多个命中时取首个
- **EmitInternalEvents**：当子 Agent 通过 AgentTool 调用时，将子 Agent 事件实时透传到父 Agent 事件流

### 构造函数

```go
func NewChatModelAgent(ctx context.Context, config *ChatModelAgentConfig) (*ChatModelAgent, error)
func NewTypedChatModelAgent[M MessageType](ctx context.Context, config *TypedChatModelAgentConfig[M]) (*TypedChatModelAgent[M], error)
```

# Middleware（ChatModelAgentMiddleware）

## 接口定义

```go
type TypedChatModelAgentMiddleware[M MessageType] interface {
    BeforeAgent(ctx context.Context, runCtx *ChatModelAgentContext) (context.Context, *ChatModelAgentContext, error)
    AfterAgent(ctx context.Context, state *TypedChatModelAgentState[M]) (context.Context, error)

    BeforeModelRewriteState(ctx context.Context, state *TypedChatModelAgentState[M], mc *TypedModelContext[M]) (context.Context, *TypedChatModelAgentState[M], error)
    AfterModelRewriteState(ctx context.Context, state *TypedChatModelAgentState[M], mc *TypedModelContext[M]) (context.Context, *TypedChatModelAgentState[M], error)

    WrapModel(ctx context.Context, m model.BaseModel[M], mc *TypedModelContext[M]) (model.BaseModel[M], error)

    WrapInvokableToolCall(ctx context.Context, endpoint InvokableToolCallEndpoint, tCtx *ToolContext) (InvokableToolCallEndpoint, error)
    WrapStreamableToolCall(ctx context.Context, endpoint StreamableToolCallEndpoint, tCtx *ToolContext) (StreamableToolCallEndpoint, error)
    WrapEnhancedInvokableToolCall(ctx context.Context, endpoint EnhancedInvokableToolCallEndpoint, tCtx *ToolContext) (EnhancedInvokableToolCallEndpoint, error)
    WrapEnhancedStreamableToolCall(ctx context.Context, endpoint EnhancedStreamableToolCallEndpoint, tCtx *ToolContext) (EnhancedStreamableToolCallEndpoint, error)
}

type ChatModelAgentMiddleware = TypedChatModelAgentMiddleware[*schema.Message]
```

使用 `*BaseChatModelAgentMiddleware` 嵌入可只覆盖需要的方法：

```go
type MyMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *MyMiddleware) BeforeModelRewriteState(
    ctx context.Context,
    state *adk.ChatModelAgentState,
    mc *adk.ModelContext,
) (context.Context, *adk.ChatModelAgentState, error) {
    // 自定义逻辑
    return ctx, state, nil
}
```

## 钩子点位

<table>
<tr><td>钩子</td><td>时机</td><td>可修改内容</td></tr>
<tr><td><pre>BeforeAgent</pre></td><td>Agent 运行前（仅一次）</td><td>Instruction、Tools、ReturnDirectly、ToolSearchTool</td></tr>
<tr><td><pre>AfterAgent</pre></td><td>Agent 成功结束后</td><td>读取最终 state（不修改）</td></tr>
<tr><td><pre>BeforeModelRewriteState</pre></td><td>每次模型调用前</td><td>Messages、ToolInfos、DeferredToolInfos（<strong>持久化到 state</strong>）</td></tr>
<tr><td><pre>AfterModelRewriteState</pre></td><td>每次模型调用后</td><td>Messages（含模型响应）、ToolInfos（<strong>持久化到 state</strong>）</td></tr>
<tr><td><pre>WrapModel</pre></td><td>包装模型调用</td><td>重试、failover、事件发送（<strong>不要修改 Messages</strong>）</td></tr>
<tr><td><pre>WrapToolCall</pre></td><td>包装工具调用</td><td>权限检查、日志、输出改写</td></tr>
</table>

> 💡
> `BeforeModelRewriteState` 返回的 state 会被框架持久化到 agent 内部状态。因此该钩子中的修改（如压缩 Messages、过滤 ToolInfos）会影响后续所有迭代。

## 核心类型

### ChatModelAgentContext（BeforeAgent 参数）

```go
type ChatModelAgentContext struct {
    Instruction    string
    Tools          []tool.BaseTool
    ReturnDirectly map[string]bool
    ToolSearchTool *schema.ToolInfo  // 模型原生 ToolSearch 能力
}
```

### ChatModelAgentState（BeforeModel/AfterModel 参数）

```go
type TypedChatModelAgentState[M MessageType] struct {
    Messages          []M
    ToolInfos         []*schema.ToolInfo         // 传给模型的工具列表
    DeferredToolInfos []*schema.ToolInfo         // 服务端延迟检索的工具列表
}

type ChatModelAgentState = TypedChatModelAgentState[*schema.Message]
```

### ModelContext（WrapModel 参数）

```go
type TypedModelContext[M MessageType] struct {
    Tools               []*schema.ToolInfo          // Deprecated: 用 state.ToolInfos
    ModelRetryConfig    *TypedModelRetryConfig[M]
    ModelFailoverConfig *ModelFailoverConfig[M]
}

type ModelContext = TypedModelContext[*schema.Message]
```

## 执行顺序

**模型调用链**（外到内）：

1. `AgentMiddleware.BeforeChatModel`
2. **BeforeModelRewriteState**
3. failover wrapper（内置）
4. retry wrapper（内置）
5. event sender wrapper（内置）
6. **WrapModel**（先注册 = 最外层）
7. callback injection（内置）
8. 实际模型调用
9. **AfterModelRewriteState**
10. `AgentMiddleware.AfterChatModel`

**工具调用链**（外到内）：

1. event sender（内置）
2. `ToolsConfig.ToolCallMiddlewares`
3. `AgentMiddleware.WrapToolCall`
4. **WrapToolCall**（先注册 = 最外层）
5. callback injection（内置）
6. 实际工具调用

# AgentAsTool

将子 Agent 包装为 Tool，父 Agent 通过 ToolCall 自主调用：

```go
subAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "researcher",
    Description: "搜索并总结信息",
    Model:       chatModel,
    // ...
})

agentTool := adk.NewAgentTool(ctx, subAgent)

parentAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{agentTool},
        },
    },
})
```

泛型版本：`adk.NewTypedAgentTool[M](ctx, agent, options...)`

选项：`WithFullChatHistoryAsInput()`（传递完整对话历史）、`WithAgentInputSchema(schema)`（自定义输入 schema）

# ModelRetry

配置后，ChatModel 调用失败时自动重试。流式响应中发生错误时，当前流仍会通过 AgentEvent 返回，消费 MessageStream 得到 `WillRetryError`：

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    ModelRetryConfig: &adk.ModelRetryConfig{
        // 重试策略配置
    },
})

// 消费事件流时处理 WillRetryError
stream := event.Output.MessageOutput.MessageStream
for {
    msg, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        var willRetry *adk.WillRetryError
        if errors.As(err, &willRetry) {
            log.Printf("Attempt %d failed, retrying...", willRetry.RetryAttempt)
            break // 等待下一个事件
        }
        break
    }
    displayChunk(msg)
}
```

# ModelFailover

配置后，模型调用失败时切换备用模型：

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model: primaryModel,
    ModelFailoverConfig: &adk.ModelFailoverConfig{
        GetFailoverModel: func(ctx context.Context, err error) (model.BaseModel[*schema.Message], error) {
            return backupModel, nil
        },
        ShouldFailover: func(err error) bool {
            return true // 根据错误类型决定是否 failover
        },
    },
})
```

# Cancel

v0.9 新增的运行时取消能力。详见 [Agent Cancel 与 TurnLoop](/zh/docs/eino/core_modules/eino_adk/eino_adk_agent_cancel_与_turnloop_快速入门)。

```go
cancelOpt, cancelFn := adk.WithCancel()
iter := runner.Run(ctx, messages, cancelOpt)

// 稍后取消（CancelMode 支持位掩码组合）
handle := cancelFn(adk.CancelAfterChatModel | adk.CancelAfterToolCalls)
handle.Wait() // 等待取消完成
```
