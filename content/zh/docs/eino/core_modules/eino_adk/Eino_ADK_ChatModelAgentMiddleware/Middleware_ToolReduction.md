---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: ToolReduction'
weight: 6
---

# ToolReduction 中间件

adk/middlewares/reduction

> 💡
> 本中间件在 [v0.8.0.Beta](https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1) 版本引入。

## 概述

`reduction` 中间件用来控制工具结果占用的 token 数量，提供两种策略：

1. **截断 (Truncation)**：工具返回时立即截断过长的输出，将完整内容保存到 Backend
2. **清理 (Clear)**：总 token 超过阈值时，把旧的工具结果存到文件系统

---

## 架构

```
Tool 调用返回结果
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              WrapInvokableToolCall / WrapStreamableToolCall │
│                                                             │
│  Truncation 策略（可跳过）                                   │
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
│  Clear 策略（可跳过）                                        │
│    总 token > MaxTokensForClear?                            │
│      是 → 把旧的工具结果存到 Backend，替换成文件路径        │
│      否 → 不处理                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                     调用 Model
```

---

## 配置

### Config 主配置

```go
type Config struct {
    // Backend 存储后端，用于保存截断/清理的内容
    // 当 SkipTruncation 为 false 时必填
    Backend Backend

    // SkipTruncation 跳过截断阶段
    SkipTruncation bool

    // SkipClear 跳过清理阶段
    SkipClear bool

    // ReadFileToolName 读取文件的工具名
    // 内容卸载到文件后，agent 需要使用此工具读取
    // 默认 "read_file"
    ReadFileToolName string

    // RootDir 保存内容的根目录
    // 默认 "/tmp"
    // 截断内容保存到 {RootDir}/trunc/{tool_call_id}
    // 清理内容保存到 {RootDir}/clear/{tool_call_id}
    RootDir string

    // MaxLengthForTrunc 触发截断的最大长度
    // 默认 50000
    MaxLengthForTrunc int

    // TokenCounter token 计数器
    // 用于判断是否需要触发清理
    // 默认使用 字符数/4 估算
    TokenCounter func(ctx context.Context, msg []adk.Message, tools []*schema.ToolInfo) (int64, error)

    // MaxTokensForClear 触发清理的 token 阈值
    // 默认 30000
    MaxTokensForClear int64

    // ClearRetentionSuffixLimit 保留最近多少轮对话不清理
    // 默认 1
    ClearRetentionSuffixLimit int

    // ClearPostProcess 清理完成后的回调
    // 可用于保存或通知当前状态
    ClearPostProcess func(ctx context.Context, state *adk.ChatModelAgentState) context.Context

    // ToolConfig 针对特定工具的配置
    // 优先级高于全局配置
    ToolConfig map[string]*ToolReductionConfig
}
```

### ToolReductionConfig 工具级配置

```go
type ToolReductionConfig struct {
    // Backend 此工具使用的存储后端
    Backend Backend

    // SkipTruncation 跳过此工具的截断
    SkipTruncation bool

    // TruncHandler 自定义截断处理器
    // 不设置时使用默认处理器
    TruncHandler func(ctx context.Context, detail *ToolDetail) (*TruncResult, error)

    // SkipClear 跳过此工具的清理
    SkipClear bool

    // ClearHandler 自定义清理处理器
    // 不设置时使用默认处理器
    ClearHandler func(ctx context.Context, detail *ToolDetail) (*ClearResult, error)
}
```

### ToolDetail 工具详情

```go
type ToolDetail struct {
    // ToolContext 工具元信息（工具名、调用 ID）
    ToolContext *adk.ToolContext

    // ToolArgument 输入参数
    ToolArgument *schema.ToolArgument

    // ToolResult 输出结果
    ToolResult *schema.ToolResult
}
```

### TruncResult 截断结果

```go
type TruncResult struct {
    // NeedTrunc 是否需要截断
    NeedTrunc bool

    // ToolResult 截断后的工具结果
    // NeedTrunc 为 true 时必填
    ToolResult *schema.ToolResult

    // NeedOffload 是否需要卸载到存储
    NeedOffload bool

    // OffloadFilePath 卸载文件路径
    // NeedOffload 为 true 时必填
    OffloadFilePath string

    // OffloadContent 卸载内容
    // NeedOffload 为 true 时必填
    OffloadContent string
}
```

### ClearResult 清理结果

```go
type ClearResult struct {
    // NeedClear 是否需要清理
    NeedClear bool

    // ToolArgument 清理后的工具参数
    // NeedClear 为 true 时必填
    ToolArgument *schema.ToolArgument

    // ToolResult 清理后的工具结果
    // NeedClear 为 true 时必填
    ToolResult *schema.ToolResult

    // NeedOffload 是否需要卸载到存储
    NeedOffload bool

    // OffloadFilePath 卸载文件路径
    // NeedOffload 为 true 时必填
    OffloadFilePath string

    // OffloadContent 卸载内容
    // NeedOffload 为 true 时必填
    OffloadContent string
}
```

---

## 创建中间件

### 基本用法

```go
import (
    "context"
    "github.com/cloudwego/eino/adk/middlewares/reduction"
)

// 使用默认配置
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend: myBackend,  // 必填：存储后端
})

// 与 ChatModelAgent 一起使用
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

### 自定义配置

```go
config := &reduction.Config{
    Backend:           myBackend,
    RootDir:           "/data/agent",
    MaxLengthForTrunc: 30000,
    MaxTokensForClear: 100000,
    ClearRetentionSuffixLimit: 2,
    TokenCounter: myTokenCounter,
    ClearPostProcess: func(ctx context.Context, state *adk.ChatModelAgentState) context.Context {
        log.Printf("Clear completed, messages: %d", len(state.Messages))
        return ctx
    },
    ToolConfig: map[string]*reduction.ToolReductionConfig{
        "grep": {
            Backend:        grepBackend,
            SkipTruncation: false,
        },
        "read_file": {
            Backend:   readFileBackend,
            SkipClear: true,  // 读文件工具不需要清理
        },
    },
}

middleware, err := reduction.New(ctx, config)
```

### 仅使用截断策略

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:   myBackend,
    SkipClear: true,  // 跳过清理阶段
})
```

### 仅使用清理策略

```go
middleware, err := reduction.New(ctx, &reduction.Config{
    Backend:        myBackend,
    SkipTruncation: true,  // 跳过截断阶段
})
```

---

## 工作原理

### Truncation（截断）

在 `WrapInvokableToolCall` / `WrapStreamableToolCall` 中处理：

1. 工具返回结果
2. 调用 TruncHandler 判断是否需要截断
3. 如需截断，将完整内容存到 Backend
4. 返回截断后的内容，包含提示文字告知 agent 完整内容的位置

### Clear（清理）

在 `BeforeModelRewriteState` 中处理：

1. 用 TokenCounter 计算总 token
2. 超过 MaxTokensForClear 才处理
3. 从旧消息开始遍历，跳过已处理的和最近 ClearRetentionSuffixLimit 轮
4. 对范围内的每个工具调用，调用 ClearHandler
5. 需要清理的，写入 Backend，把消息里的结果替换成文件路径
6. 调用 ClearPostProcess 回调

---

## 多语言支持

截断和清理的提示文字支持中英文，通过 `adk.SetLanguage()` 切换：

```go
adk.SetLanguage(adk.LanguageChinese)  // 中文
adk.SetLanguage(adk.LanguageEnglish)  // 英文（默认）
```

---

## 注意事项

- 当 `SkipTruncation` 为 false 时，`Backend` 必须设置
- 默认 TokenCounter 用 `字符数 / 4` 估算，对于中文不精准，建议使用 `github.com/tiktoken-go/tokenizer` 替换
- 已处理过的消息会打标记，不会重复处理
- `ToolConfig` 中的配置优先级高于全局配置
