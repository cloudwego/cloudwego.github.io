---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ChatModelAgentMiddleware
weight: 8
---

`ChatModelAgentMiddleware` 是自定义 `ChatModelAgent`（及基于它的 `DeepAgent`）行为的核心接口。自 v0.8.0 引入，在后续版本持续演进。

## 类型约定

本文使用默认 `M = *schema.Message` 的别名。泛型原始类型以 `Typed` 前缀命名：

```go
type ChatModelAgentMiddleware     = TypedChatModelAgentMiddleware[*schema.Message]
type BaseChatModelAgentMiddleware = TypedBaseChatModelAgentMiddleware[*schema.Message]
type ChatModelAgentState          = TypedChatModelAgentState[*schema.Message]
type ModelContext                  = TypedModelContext[*schema.Message]
```

当需使用 `*schema.AgenticMessage` 时，直接使用 `Typed` 泛型版本即可。

---

## 接口定义

```go
type ChatModelAgentMiddleware interface {
    // ── 生命周期 Hook ──

    // BeforeAgent：agent 运行前调用一次，可修改 instruction、tools 配置
    BeforeAgent(ctx context.Context, runCtx *ChatModelAgentContext) (context.Context, *ChatModelAgentContext, error)

    // AfterAgent：agent 成功终止后调用（最终回答或 return-directly 工具结果）
    // 错误终止（超迭代、context 取消、model 错误）时不调用
    AfterAgent(ctx context.Context, state *ChatModelAgentState) (context.Context, error)

    // BeforeModelRewriteState：每次模型调用前调用
    // 返回的 state 被持久化，可修改 Messages、ToolInfos、DeferredToolInfos
    BeforeModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)

    // AfterModelRewriteState：每次模型调用后调用
    // 输入 state 包含模型响应作为最后一条消息
    AfterModelRewriteState(ctx context.Context, state *ChatModelAgentState, mc *ModelContext) (context.Context, *ChatModelAgentState, error)

    // ── Wrapper ──

    WrapInvokableToolCall(ctx context.Context, endpoint InvokableToolCallEndpoint, tCtx *ToolContext) (InvokableToolCallEndpoint, error)
    WrapStreamableToolCall(ctx context.Context, endpoint StreamableToolCallEndpoint, tCtx *ToolContext) (StreamableToolCallEndpoint, error)
    WrapEnhancedInvokableToolCall(ctx context.Context, endpoint EnhancedInvokableToolCallEndpoint, tCtx *ToolContext) (EnhancedInvokableToolCallEndpoint, error)
    WrapEnhancedStreamableToolCall(ctx context.Context, endpoint EnhancedStreamableToolCallEndpoint, tCtx *ToolContext) (EnhancedStreamableToolCallEndpoint, error)

    // WrapModel：包装 ChatModel，参数类型为 model.BaseModel[M]（非 ToolCallingChatModel）
    // 框架单独处理 WithTools 绑定，不经过用户 wrapper
    WrapModel(ctx context.Context, m model.BaseModel[M], mc *ModelContext) (model.BaseModel[M], error)
}
```

> 💡
> 嵌入 `*BaseChatModelAgentMiddleware` 可获得所有方法的空操作默认实现，只需覆盖关心的方法。

### 为什么用接口而非 AgentMiddleware 结构体？

`AgentMiddleware` 是结构体，有固有局限——用户无法扩展方法，回调仅返回 error 无法传播 context。`ChatModelAgentMiddleware` 是接口：

- Hook 方法返回 `(context.Context, ..., error)`，支持 context 传播
- Wrapper 方法通过 endpoint 链传播修改后的 context
- 自定义 handler 可携带任意内部状态

**选择原则**：简单静态修改（追加 instruction/tools）用 `AgentMiddleware`；需动态行为、context 修改或调用包装时用 `ChatModelAgentMiddleware`。两者可同时使用。

---

## 上下文类型

### ChatModelAgentContext

`BeforeAgent` 的输入，每次 Run 前调用一次：

```go
type ChatModelAgentContext struct {
    // 当前 instruction（含 agent 配置 + 框架追加 + 前序 handler 修改）
    Instruction string

    // 原始工具列表（含框架隐式工具如 transfer/exit）
    Tools []tool.BaseTool

    // 配置为"直接返回"的工具名集合
    ReturnDirectly map[string]bool

    // 模型原生工具搜索能力的 ToolInfo
    // 由 handler 设置后，框架通过 model.WithToolSearchTool 传递给模型
    ToolSearchTool *schema.ToolInfo
}
```

### ChatModelAgentState

每次模型调用前后传递的**持久化状态**（跨 iteration 保持）：

```go
type ChatModelAgentState struct {
    // 当前会话的所有消息
    Messages []*schema.Message

    // 传递给模型的工具定义（via model.WithTools），可在 BeforeModelRewriteState 中修改
    ToolInfos []*schema.ToolInfo

    // 延迟检索工具定义（via model.WithDeferredTools），用于模型原生搜索能力
    // 未使用时为 nil
    DeferredToolInfos []*schema.ToolInfo
}
```

> 💡
> 修改 `ToolInfos` / `DeferredToolInfos` 的推荐位置是 `BeforeModelRewriteState`——这是工具配置的 source of truth。不要在 `WrapModel` 中修改工具列表。

### ModelContext

`WrapModel` 和 `Before/AfterModelRewriteState` 的上下文：

```go
type ModelContext struct {
    // Deprecated: 使用 ChatModelAgentState.ToolInfos 替代
    Tools []*schema.ToolInfo

    // 模型重试配置
    ModelRetryConfig *ModelRetryConfig

    // 模型容灾切换配置
    ModelFailoverConfig *ModelFailoverConfig[*schema.Message]
}
```

### ToolContext

工具包装的元数据：

```go
type ToolContext struct {
    Name   string // 工具名称
    CallID string // 本次调用唯一标识
}
```

---

## 工具调用端点类型

工具包装使用函数类型而非接口。根据工具实现的接口，框架调用对应的 Wrap 方法：

```go
// 标准工具
type InvokableToolCallEndpoint  func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error)
type StreamableToolCallEndpoint func(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (*schema.StreamReader[string], error)

// 增强型工具（使用 ToolArgument/ToolResult）
type EnhancedInvokableToolCallEndpoint  func(ctx context.Context, toolArgument *schema.ToolArgument, opts ...tool.Option) (*schema.ToolResult, error)
type EnhancedStreamableToolCallEndpoint func(ctx context.Context, toolArgument *schema.ToolArgument, opts ...tool.Option) (*schema.StreamReader[*schema.ToolResult], error)
```

> 💡
> 每个 Wrap 方法**仅在工具实现了对应接口时才被调用**。例如，工具只实现了 `InvokableTool`，则只会调用 `WrapInvokableToolCall`，不会调用 `WrapStreamableToolCall`。

---

## 执行顺序

### Model 调用生命周期（由外到内）

1. `AgentMiddleware.BeforeChatModel`
2. **ChatModelAgentMiddleware.BeforeModelRewriteState**
3. `retryModelWrapper`（内部 — 失败重试）
4. `eventSenderModelWrapper` 预处理（内部 — 准备事件发送）
5. **ChatModelAgentMiddleware.WrapModel** 预处理（先注册 → 先执行）
6. `callbackInjectionModelWrapper`（内部）
7. **Model.Generate / Stream**
8. `callbackInjectionModelWrapper` 后处理
9. **ChatModelAgentMiddleware.WrapModel** 后处理（先注册 → 后执行）
10. `eventSenderModelWrapper` 后处理
11. `retryModelWrapper` 后处理
12. **ChatModelAgentMiddleware.AfterModelRewriteState**
13. `AgentMiddleware.AfterChatModel`

### Tool 调用生命周期（由外到内）

1. `eventSenderToolHandler`（内部 — 发送工具结果事件）
2. `ToolsConfig.ToolCallMiddlewares`
3. `AgentMiddleware.WrapToolCall`
4. **ChatModelAgentMiddleware.WrapXxxToolCall**（先注册 → 最外层）
5. **Tool.InvokableRun / StreamableRun**

### WrapModel 使用建议

<table>
<tr><td>✅ 推荐用途</td><td>❌ 不推荐用途</td></tr>
<tr><td>模型调用重试逻辑</td><td>修改输入消息（不持久化，破坏 prompt cache）</td></tr>
<tr><td>模型容灾切换（备用模型）</td><td>修改工具列表（应在 <pre>BeforeModelRewriteState</pre> 中修改 <pre>state.ToolInfos</pre>）</td></tr>
<tr><td>发送自定义事件（如流式进度）</td><td></td></tr>
<tr><td>处理/变换响应流、修改调用参数</td><td></td></tr>
</table>

---

## 运行时本地存储 API

在当前 agent `Run()` 期间存取键值对。值与中断/恢复兼容——序列化后随 checkpoint 持久化。

```go
func SetRunLocalValue(ctx context.Context, key string, value any) error
func GetRunLocalValue(ctx context.Context, key string) (any, bool, error)
func DeleteRunLocalValue(ctx context.Context, key string) error
```

> 💡
> 自定义类型必须在 `init()` 中通过 `schema.RegisterName[T]()` 注册，以确保 gob 序列化正确。这些函数只能在 `ChatModelAgentMiddleware` 回调内调用。

### 示例：跨回调共享状态

```go
func init() {
    schema.RegisterName[*ToolStats]("mypackage.ToolStats")
}

type ToolStats struct {
    Count int
    Name  string
}

type MyMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

// 在工具调用后记录统计
func (m *MyMiddleware) WrapInvokableToolCall(ctx context.Context, endpoint adk.InvokableToolCallEndpoint, tCtx *adk.ToolContext) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
        result, err := endpoint(ctx, args, opts...)

        _ = adk.SetRunLocalValue(ctx, "last_tool", &ToolStats{Count: 1, Name: tCtx.Name})
        return result, err
    }, nil
}

// 在模型调用后读取统计
func (m *MyMiddleware) AfterModelRewriteState(ctx context.Context, state *adk.ChatModelAgentState, mc *adk.ModelContext) (context.Context, *adk.ChatModelAgentState, error) {
    if val, found, _ := adk.GetRunLocalValue(ctx, "last_tool"); found {
        if stats, ok := val.(*ToolStats); ok {
            log.Printf("上一次工具: %s (count=%d)", stats.Name, stats.Count)
        }
    }
    return ctx, state, nil
}
```

---

## SendEvent API

在 agent 执行期间向事件流发送自定义 `AgentEvent`，调用方遍历事件流时可收到：

```go
func SendEvent(ctx context.Context, event *AgentEvent) error
```

仅能在 `ChatModelAgentMiddleware` 回调内调用。

---

## State 类型

> 💡
> `State` 仅为 checkpoint 向后兼容而保持导出。**不要直接使用**——请在 `ChatModelAgentMiddleware` 回调中使用 `ChatModelAgentState`，用 `SetRunLocalValue/GetRunLocalValue` 替代原 `State.Extra`。`compose.ProcessState[*State]` 用法将在 v1.0.0 中停止工作。

---

## 迁移指南

### 从 compose.ProcessState[*State] 迁移

**之前：**

```go
compose.ProcessState(ctx, func(_ context.Context, st *adk.State) error {
    st.Extra["myKey"] = myValue
    return nil
})
```

**之后：**

```go
// 写入
if err := adk.SetRunLocalValue(ctx, "myKey", myValue); err != nil {
    return ctx, state, err
}

// 读取
if val, found, err := adk.GetRunLocalValue(ctx, "myKey"); err == nil && found {
    // use val
}
```

### 适配 AfterAgent（v0.9 新增）

`AfterAgent` 在 agent **成功终止**后调用（最终回答或 return-directly 工具结果），可用于后处理：

```go
func (m *MyMiddleware) AfterAgent(ctx context.Context, state *adk.ChatModelAgentState) (context.Context, error) {
    log.Printf("Agent 完成，共 %d 条消息", len(state.Messages))
    // 可在此做审计、统计、清理等
    return ctx, nil
}
```

> 💡
> `AfterAgent` 按注册顺序调用（与 `BeforeAgent` 一致）。任一 handler 返回 error 后，后续 handler 不再调用（fail-fast），错误发送到事件流。

### 适配 ToolInfos / DeferredToolInfos（v0.9 新增）

`ChatModelAgentState` 新增了 `ToolInfos` 和 `DeferredToolInfos` 字段，取代 `ModelContext.Tools` 成为工具配置的 source of truth：

```go
func (m *MyMiddleware) BeforeModelRewriteState(ctx context.Context, state *adk.ChatModelAgentState, mc *adk.ModelContext) (context.Context, *adk.ChatModelAgentState, error) {
    // 动态过滤工具
    filtered := make([]*schema.ToolInfo, 0, len(state.ToolInfos))
    for _, t := range state.ToolInfos {
        if shouldInclude(t.Name) {
            filtered = append(filtered, t)
        }
    }
    state.ToolInfos = filtered
    return ctx, state, nil
}
```
