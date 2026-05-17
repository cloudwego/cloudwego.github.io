---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: PatchToolCalls
weight: 8
---

adk/middlewares/patchtoolcalls

> 💡
> PatchToolCalls 中间件用于修复消息历史中「悬空的工具调用」（dangling tool calls）问题。在 v0.8.0 版本引入。同时支持 `*schema.Message` 和 `*schema.AgenticMessage` 两种消息类型。

## 概述

在多轮对话场景中，可能出现 Assistant 消息包含工具调用（ToolCalls），但对话历史中缺少对应 Tool 响应的情况。这种「悬空的工具调用」会导致某些模型 API 报错或产生异常行为。**常见场景：**

- 用户在工具执行完成前发送了新消息，导致工具调用被中断
- 会话恢复时，部分工具调用结果丢失
- Human-in-the-loop 场景下，用户取消了工具执行 PatchToolCalls 中间件会在每次模型调用前（`BeforeModelRewriteState` 钩子）扫描消息历史，为缺少响应的工具调用自动插入占位符消息。

## 快速开始

```go
import (
    "context"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/middlewares/patchtoolcalls"
)

// 使用默认配置（cfg 可传 nil）
mw, err := patchtoolcalls.New(ctx, nil)
if err != nil {
    // 处理错误
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{mw},
})
```

## API 参考

### Config

```go
type Config struct {
    PatchedContentGenerator func(ctx context.Context, toolName, toolCallID string) (string, error)
}
```

<table>
<tr><td>字段</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td>PatchedContentGenerator</td><td><pre>func(ctx context.Context, toolName, toolCallID string) (string, error)</pre></td><td>否</td><td>自定义生成占位符消息内容的函数。未设置时使用内置默认消息模板</td></tr>
</table>

### New

```go
func New(ctx context.Context, cfg *Config) (adk.ChatModelAgentMiddleware, error)
```

创建 PatchToolCalls 中间件。`cfg` 可为 `nil`，此时使用默认配置。内部调用 `NewTyped[*schema.Message]`。

### NewTyped

```go
func NewTyped[M adk.MessageType](_ context.Context, cfg *Config) (adk.TypedChatModelAgentMiddleware[M], error)
```

泛型版本构造函数，支持 `*schema.Message` 和 `*schema.AgenticMessage`。`cfg` 可为 `nil`。

- 当 `M = *schema.Message` 时，通过 `ToolCallID` 字段匹配 Tool 消息
- 当 `M = *schema.AgenticMessage` 时，通过 `ContentBlock.FunctionToolResult.CallID` 匹配

### 默认占位符消息

如果不设置 `PatchedContentGenerator`，中间件使用内置模板（通过 `fmt.Sprintf` 格式化，`%s` 依次对应 toolName 和 toolCallID）：**英文（默认）：**

```
Tool call %s with id %s was canceled - another message came in before it could be completed.
```

**中文：**

```
工具调用 %s（ID 为 %s）已被取消——在其完成之前收到了另一条消息。
```

可通过 `adk.SetLanguage()` 切换语言。

## 使用示例

### 自定义占位符消息

```go
mw, err := patchtoolcalls.New(ctx, &patchtoolcalls.Config{
    PatchedContentGenerator: func(ctx context.Context, toolName, toolCallID string) (string, error) {
        return fmt.Sprintf("[系统提示] 工具 %s 的执行被跳过（调用ID: %s）", toolName, toolCallID), nil
    },
})
```

### 泛型用法（AgenticMessage）

```go
mw, err := patchtoolcalls.NewTyped[*schema.AgenticMessage](ctx, nil)
if err != nil {
    // 处理错误
}

agent, err := adk.NewTypedChatModelAgent[*schema.AgenticMessage](ctx, &adk.TypedChatModelAgentConfig[*schema.AgenticMessage]{
    Model:       yourChatModel,
    Middlewares: []adk.TypedChatModelAgentMiddleware[*schema.AgenticMessage]{mw},
})
```

### 结合其他中间件

```go
// PatchToolCalls 通常放在中间件链的前面
// 确保在其他中间件处理消息之前修复悬空的工具调用
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model: yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{
        patchToolCallsMiddleware,  // 先修复消息
        summarizationMiddleware,   // 再进行摘要
        reductionMiddleware,       // 最后进行裁剪
    },
})
```

## 工作原理

> 💡
> 对于 `*schema.Message`，通过 `msg.Role == schema.Tool && msg.ToolCallID` 匹配；对于 `*schema.AgenticMessage`，通过 `ContentBlock.FunctionToolResult.CallID` 匹配。

### 示例场景

**修复前：**

```
[User]      "帮我查询天气"
[Assistant]  ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]      "call_1: 晴天，25°C"
[User]      "不用查位置了，直接告诉我北京的天气"   <- 用户中断
```

**修复后：**

```
[User]      "帮我查询天气"
[Assistant]  ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]      "call_1: 晴天，25°C"
[Tool]      "call_2: 工具调用 get_location（ID 为 call_2）已被取消..."  <- 自动插入
[User]      "不用查位置了，直接告诉我北京的天气"
```

## 多语言支持

占位符消息支持中英文，通过 `adk.SetLanguage()` 切换：

```go
import "github.com/cloudwego/eino/adk"

adk.SetLanguage(adk.LanguageChinese)  // 中文
adk.SetLanguage(adk.LanguageEnglish)  // 英文（默认）
```

## 注意事项

> 💡
> `BeforeModelRewriteState` 返回的 state 会被框架持久化到 agent 内部状态（参见 `wrappers.go` 中的 `ProcessState` 调用）。因此 PatchToolCalls 插入的占位符消息**会保留在后续迭代中**，不需要每轮重复修补。

- 建议将此中间件放在中间件链的**前面**，确保其他中间件处理的是完整的消息历史
- `cfg` 参数可传 `nil`，等价于 `&Config{}`
- 如果消息列表为空（`len(state.Messages) == 0`），中间件直接返回，不做任何处理
