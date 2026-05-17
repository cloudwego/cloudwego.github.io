---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Reduction
weight: 5
---

`adk/middlewares/reduction`

> 💡
> 本中间件在 v0.8.0 版本引入。

## 概述

`reduction` 中间件管理 Agent 对话中工具输出占用的 token 数量，分为两个阶段：

1. **截断（Truncation）**：工具调用返回时立即触发。单次输出超过 `MaxLengthForTrunc` 时，完整内容存入 Backend，消息替换为截断摘要。
2. **清理（Clear）**：模型调用前触发（`BeforeModelRewriteState`）。总 token 超过 `MaxTokensForClear` 时，遍历历史消息，将旧的工具参数和结果卸载到 Backend。

---

## 架构

```
Tool 调用返回结果
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│     WrapInvokableToolCall / WrapStreamableToolCall          │
│     WrapEnhancedInvokableToolCall / WrapEnhancedStreamable  │
│                                                             │
│  Truncation（可通过 SkipTruncation 跳过）                    │
│    结果长度 > MaxLengthForTrunc?                            │
│      是 → 截断内容，完整内容存到 Backend                    │
│      否 → 原样返回                                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    结果加入 Messages
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BeforeModelRewriteState                    │
│                                                             │
│  Clear（可通过 SkipClear 跳过）                              │
│    总 token > MaxTokensForClear?                            │
│      是 → ClearMessageRewriter 预处理                       │
│         → 旧工具结果存到 Backend，替换为文件路径             │
│         → ClearAtLeastTokens 最小释放量检查                  │
│         → ClearPostProcess 回调                             │
│      否 → 不处理                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                     调用 Model
```

---

## 泛型体系

本中间件采用 ADK 标准泛型模式，同时支持 `*schema.Message` 和 `*schema.AgenticMessage`：

```go
// 泛型配置，M 约束为 adk.MessageType
type TypedConfig[M adk.MessageType] struct { ... }

// 向后兼容别名
type Config = TypedConfig[*schema.Message]
```

构造函数同样提供泛型和非泛型两种：

```go
func NewTyped[M adk.MessageType](ctx context.Context, config *TypedConfig[M]) (adk.TypedChatModelAgentMiddleware[M], error)
func New(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

---

## 配置

### TypedConfig[M] 主配置

<table>
<tr><td>字段</td><td>类型</td><td>说明</td></tr>
<tr><td>Backend</td><td><pre>Backend</pre></td><td>存储后端。<pre>SkipTruncation</pre> 为 false 时<strong>必填</strong>；仅做 Clear 且不需要 offload 时可为 nil。</td></tr>
<tr><td>SkipTruncation</td><td><pre>bool</pre></td><td>跳过截断阶段。</td></tr>
<tr><td>SkipClear</td><td><pre>bool</pre></td><td>跳过清理阶段。</td></tr>
<tr><td>ReadFileToolName</td><td><pre>string</pre></td><td>用于读取卸载内容的工具名。默认 <pre>"read_file"</pre>。</td></tr>
<tr><td>RootDir</td><td><pre>string</pre></td><td>保存内容的根目录。默认 <pre>"/tmp"</pre>。截断内容存到 <pre>{RootDir}/trunc/{tool_call_id}</pre>，清理内容存到 <pre>{RootDir}/clear/{tool_call_id}</pre>。</td></tr>
<tr><td>GenTruncOffloadFilePath</td><td><pre>func(ctx, *ToolDetail) (string, error)</pre></td><td>自定义截断文件路径生成。设置后 RootDir 对截断不生效。适用于 tool_call_id 不唯一的场景。</td></tr>
<tr><td>GenClearOffloadFilePath</td><td><pre>func(ctx, *ToolDetail) (string, error)</pre></td><td>自定义清理文件路径生成。设置后 RootDir 对清理不生效。</td></tr>
<tr><td>MaxLengthForTrunc</td><td><pre>int</pre></td><td>触发截断的最大字符长度。默认 <pre>50000</pre>。</td></tr>
<tr><td>TruncExcludeTools</td><td><pre>[]string</pre></td><td>不截断的工具名列表。</td></tr>
<tr><td>TokenCounter</td><td><pre>func(ctx, []M, []*schema.ToolInfo) (int64, error)</pre></td><td>token 计数函数。默认使用字符数/4 估算。<strong>建议用 tiktoken-go/tokenizer 替换</strong>。</td></tr>
<tr><td>MaxTokensForClear</td><td><pre>int64</pre></td><td>触发清理的 token 阈值。默认 <pre>160000</pre>。</td></tr>
<tr><td>ClearRetentionSuffixLimit</td><td><pre>int</pre></td><td>保留最近 N 轮 assistant 消息不清理。默认 <pre>1</pre>。</td></tr>
<tr><td>ClearAtLeastTokens</td><td><pre>int64</pre></td><td>清理至少释放的 token 量。未达标则不执行清理（避免无谓破坏 prompt cache）。默认 <pre>0</pre>。</td></tr>
<tr><td>ClearExcludeTools</td><td><pre>[]string</pre></td><td>不清理的工具名列表。</td></tr>
<tr><td>ClearMessageRewriter</td><td><pre>func(ctx, M, []M) ([]M, error)</pre></td><td>清理前的消息重写回调。参数为 toolCallMsg 和对应的 toolResponseMsgs。可用于将 write_file/edit_file 调用重写为 system-reminder。返回 nil 表示移除该组消息。</td></tr>
<tr><td>ClearPostProcess</td><td><pre>func(ctx, *adk.TypedChatModelAgentState[M]) context.Context</pre></td><td>清理完成后的回调，可保存状态或发送通知。返回可能更新后的 context。</td></tr>
<tr><td>ToolConfig</td><td><pre>map[string]*ToolReductionConfig</pre></td><td>按工具名配置，优先级高于全局。</td></tr>
</table>

### ToolReductionConfig 工具级配置

```go
type ToolReductionConfig struct {
    Backend        Backend
    SkipTruncation bool
    TruncHandler   func(ctx context.Context, detail *ToolDetail) (*TruncResult, error)
    SkipClear      bool
    ClearHandler   func(ctx context.Context, detail *ToolDetail) (*ClearResult, error)
}
```

- `TruncHandler` / `ClearHandler` 为 nil 且未跳过时，使用全局默认 handler。
- `Backend` 为该工具独立的存储后端，可覆盖全局 Backend。

### ToolDetail 工具详情

```go
type ToolDetail struct {
    ToolContext       *adk.ToolContext
    ToolArgument      *schema.ToolArgument
    ToolResult        *schema.ToolResult                    // 非流式
    StreamToolResult  *schema.StreamReader[*schema.ToolResult] // 流式
}
```

### TruncResult 截断结果

```go
type TruncResult struct {
    NeedTrunc        bool
    ToolResult       *schema.ToolResult                    // NeedTrunc && 非流式时必填
    StreamToolResult *schema.StreamReader[*schema.ToolResult] // NeedTrunc && 流式时必填
    NeedOffload      bool
    OffloadFilePath  string  // NeedOffload 时必填
    OffloadContent   string  // NeedOffload 时必填
}
```

### ClearResult 清理结果

```go
type ClearResult struct {
    NeedClear       bool
    ToolArgument    *schema.ToolArgument  // NeedClear 时必填
    ToolResult      *schema.ToolResult    // NeedClear 时必填
    NeedOffload     bool
    OffloadFilePath string  // NeedOffload 时必填
    OffloadContent  string  // NeedOffload 时必填
}
```

### Backend 接口

```go
// 定义于 reduction/internal，通过类型别名导出
type Backend interface {
    Write(context.Context, *filesystem.WriteRequest) error
}
```

`filesystem.WriteRequest` 包含 `FilePath string` 和 `Content string` 两个字段。

---

## 创建中间件

### 基本用法

```go
import "github.com/cloudwego/eino/adk/middlewares/reduction"

middleware, err := reduction.New(ctx, &reduction.Config{
    Backend: myBackend,
})

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       chatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

### 泛型用法（AgenticMessage）

```go
middleware, err := reduction.NewTyped[*schema.AgenticMessage](ctx, &reduction.TypedConfig[*schema.AgenticMessage]{
    Backend: myBackend,
    TokenCounter: myAgenticTokenCounter,
})

agent, err := adk.NewTypedChatModelAgent(ctx, &adk.TypedChatModelAgentConfig[*schema.AgenticMessage]{
    Model:       chatModel,
    Middlewares: []adk.TypedChatModelAgentMiddleware[*schema.AgenticMessage]{middleware},
})
```

### 自定义配置

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:           myBackend,
    RootDir:           "/data/agent",
    MaxLengthForTrunc: 30000,
    MaxTokensForClear: 100000,
    ClearRetentionSuffixLimit: 2,
    ClearAtLeastTokens: 10000,
    TruncExcludeTools: []string{"search_tool"},
    ClearExcludeTools: []string{"read_file"},
    ClearMessageRewriter: func(ctx context.Context, toolCallMsg *schema.Message, toolResponseMsgs []*schema.Message) ([]*schema.Message, error) {
        // 将 write_file 调用重写为 system-reminder
        return []*schema.Message{schema.UserMessage("<system-reminder>file written</system-reminder>")}, nil
    },
    ClearPostProcess: func(ctx context.Context, state *adk.ChatModelAgentState) context.Context {
        log.Printf("Clear completed, messages: %d", len(state.Messages))
        return ctx
    },
    ToolConfig: map[string]*reduction.ToolReductionConfig{
        "grep": {Backend: grepBackend},
        "read_file": {SkipClear: true},
    },
})
```

### 仅截断

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:   myBackend,
    SkipClear: true,
})
```

### 仅清理

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    SkipTruncation: true,
    MaxTokensForClear: 100000,
    // Backend 为 nil 时，清理仍会替换内容为占位符，但不执行 offload
})
```

---

## 工作原理

### Truncation（截断）

在 `WrapInvokableToolCall` / `WrapStreamableToolCall` / `WrapEnhancedInvokableToolCall` / `WrapEnhancedStreamableToolCall` 中处理：

1. 工具返回结果
2. 检查 `TruncExcludeTools`，命中则跳过
3. 查找 ToolConfig → 全局 defaultConfig，获取 TruncHandler
4. TruncHandler 判定：读取完整输出，检查所有 text 部分总长度是否超过 `MaxLengthForTrunc`
5. 超过则：保留首尾各 `MaxLengthForTrunc/(textParts*2)` 字符作为预览，完整内容存到 Backend
6. 返回截断通知，告知 agent 完整内容的文件路径

> 💡
> 对于流式工具，默认 TruncHandler 会等待完整流读取完毕后再决定是否截断。若需严格增量流式行为，请为该工具提供自定义 TruncHandler。

### Clear（清理）

在 `BeforeModelRewriteState` 中处理：

1. 用 `TokenCounter` 计算总 token
2. 未超过 `MaxTokensForClear` 则跳过
3. 确定清理范围：从第一条未处理的 assistant 消息开始，到 `len(messages) - ClearRetentionSuffixLimit` 轮结束
4. 若配置了 `ClearMessageRewriter`，先对范围内消息执行重写预处理
5. 遍历范围内的 tool call 消息，跳过 `ClearExcludeTools`
6. 对每个 tool call 调用 ClearHandler，替换参数和结果
7. 如设置了 `ClearAtLeastTokens`：先在副本上操作，对比清理前后 token 差值，不达标则放弃本次清理
8. 达标后执行实际 offload 写入，更新 state.Messages
9. 调用 `ClearPostProcess`

---

## 多语言支持

截断和清理的提示文字支持中英文自动切换：

```go
adk.SetLanguage(adk.LanguageChinese)  // 中文
adk.SetLanguage(adk.LanguageEnglish)  // 英文（默认）
```

---

## 注意事项

- `SkipTruncation` 为 false 时，`Backend` **必须**设置
- 默认 TokenCounter 用字符数/4 估算，建议使用 `github.com/tiktoken-go/tokenizer` 替换
- 已处理过的消息通过 Extra 字段打标记 `_reduction_mw_processed`，不会重复处理
- `ToolConfig` 中配置优先级高于全局；若 ToolConfig 中仅设置了 `SkipTruncation: false` 但未提供 `TruncHandler`，则回退到默认 handler
- `GenTruncOffloadFilePath` / `GenClearOffloadFilePath` 适用于 tool_call_id 不唯一的场景（如 retry），防止文件覆盖
- `ClearMessageRewriter` 在清理范围确定后、逐工具清理前执行，适合将 write/edit 类调用压缩为简短提示
- `ClearAtLeastTokens` 设为 0 表示只要超阈值就执行清理；大于 0 时可避免微量清理破坏 prompt cache
- Legacy API（`NewClearToolResult`、`NewToolResultMiddleware`）已废弃，建议迁移到 `New` / `NewTyped`
