---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: PatchToolCalls'
weight: 7
---

adk/middlewares/patchtoolcalls

> 💡
> PatchToolCalls 中间件用于修复消息历史中「悬空的工具调用」（dangling tool calls）问题。本中间件在 [v0.8.0.Beta](https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1) 版本引入。

## 概述

在多轮对话场景中，可能会出现 Assistant 消息包含工具调用（ToolCalls），但对话历史中缺少对应的 Tool 消息响应的情况。这种「悬空的工具调用」会导致某些模型 API 报错或产生异常行为。

**常见场景：**

- 用户在工具执行完成前发送了新消息，导致工具调用被中断
- 会话恢复时，部分工具调用结果丢失
- Human-in-the-loop 场景下，用户取消了工具执行

PatchToolCalls 中间件会在每次模型调用前扫描消息历史，为缺少响应的工具调用自动插入占位符消息。

## 快速开始

```go
import (
    "context"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/middlewares/patchtoolcalls"
)

// 使用默认配置创建中间件
mw, err := patchtoolcalls.New(ctx, nil)
if err != nil {
    // 处理错误
}

// 与 ChatModelAgent 一起使用
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{mw},
})
```

## 配置项

```go
type Config struct {
    // PatchedContentGenerator 自定义生成占位符消息内容的函数
    // 可选，不设置时使用默认消息
    PatchedContentGenerator func(ctx context.Context, toolName, toolCallID string) (string, error)
}
```

<table>
<tr><td>字段</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td>PatchedContentGenerator</td><td><pre>func(ctx, toolName, toolCallID string) (string, error)</pre></td><td>否</td><td>自定义生成占位符消息内容的函数。参数包含工具名和调用 ID，返回要填充的内容</td></tr>
</table>

### 默认占位符消息

如果不设置 `PatchedContentGenerator`，中间件会使用默认的占位符消息：

**英文（默认）：**

```
Tool call {toolName} with id {toolCallID} was cancelled - another message came in before it could be completed.
```

**中文：**

```
工具调用 {toolName}（ID 为 {toolCallID}）已被取消——在其完成之前收到了另一条消息。
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

### 结合其他中间件使用

```go
// PatchToolCalls 通常应该放在中间件链的前面
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

<a href="/img/eino/N9ZzwvvuWhya0vbIzLEcMx6DnMP.png" target="_blank"><img src="/img/eino/N9ZzwvvuWhya0vbIzLEcMx6DnMP.png" width="100%" /></a>

**处理逻辑：**

1. 在 `BeforeModelRewriteState` 钩子中执行
2. 遍历所有消息，查找包含 `ToolCalls` 的 Assistant 消息
3. 对于每个 ToolCall，检查后续消息中是否存在对应的 Tool 消息（通过 `ToolCallID` 匹配）
4. 如果找不到对应的 Tool 消息，则插入一个占位符消息
5. 返回修复后的消息列表

## 示例场景

### 修复前的消息历史

```
[User]     "帮我查询天气"
[Assistant] ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]     "call_1: 晴天，25°C"
[User]     "不用查位置了，直接告诉我北京的天气"   <- 用户中断
```

### 修复后的消息历史

```
[User]     "帮我查询天气"
[Assistant] ToolCalls: [{id: "call_1", name: "get_weather"}, {id: "call_2", name: "get_location"}]
[Tool]     "call_1: 晴天，25°C"
[Tool]     "call_2: 工具调用 get_location（ID 为 call_2）已被取消..."  <- 自动插入
[User]     "不用查位置了，直接告诉我北京的天气"
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
> 此中间件仅在 `BeforeModelRewriteState` 钩子中修改本次运行的历史消息，不会影响实际存储的消息历史。修复只是临时的，仅用于本轮 agent 调用。

- 建议将此中间件放在中间件链的**前面**，确保其他中间件处理的是完整的消息历史
- 如果你的场景需要持久化修复后的消息，请在 `PatchedContentGenerator` 中实现相应逻辑
