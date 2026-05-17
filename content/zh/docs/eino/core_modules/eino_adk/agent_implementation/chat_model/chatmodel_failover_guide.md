---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ChatModel Failover 功能文档
weight: 1
---

> 💡
> 本功能目前在 alpha/09 灰度中

## 概述

`ChatModelAgent` 内置模型故障转移（Failover）能力：主模型调用失败时自动切换备用模型，支持 Generate（同步）和 Stream（流式）。通过 `ModelFailoverConfig[M]` 配置，与 `TypedModelRetryConfig[M]`（同模型重试）正交组合。

> 本文以默认 `*schema.Message` 类型为例。泛型用法请将 API 替换为对应的 `Typed` 前缀版本，消息类型参数化为 `M MessageType`。

## 核心数据结构

### ModelFailoverConfig[M]

```go
type ModelFailoverConfig[M MessageType] struct {
    // 最大故障转移次数。0 表示不 failover；
    // 1 表示 GetFailoverModel 最多被调用 1 次。
    // 含 lastSuccessModel 时先尝试它，再调用 GetFailoverModel。
    MaxRetries uint

    // 判断是否触发 failover。ctx.Err() != nil 时不论返回值均停止。
    // 与 ModelRetryConfig 组合时，outputErr 为 *RetryExhaustedError；
    // 原始错误通过 RetryExhaustedError.LastErr 获取。
    // 流式场景下 outputMessage 可能携带已接收的部分消息。
    // 配置 ModelFailoverConfig 时此字段必填。
    ShouldFailover func(ctx context.Context, outputMessage M, outputErr error) bool

    // 选择下一个模型并可选地转换输入消息。
    // failoverCtx.FailoverAttempt 从 1 开始。
    // 返回 nil failoverModelInputMessages 表示沿用原始输入。
    // 返回非 nil failoverErr 立即终止 failover。
    // 配置 ModelFailoverConfig 时此字段必填。
    GetFailoverModel func(ctx context.Context, failoverCtx *FailoverContext[M]) (
        failoverModel model.BaseModel[M],
        failoverModelInputMessages []M,
        failoverErr error,
    )
}
```

### FailoverContext[M]

```go
type FailoverContext[M MessageType] struct {
    FailoverAttempt   uint   // 当前尝试编号，从 1 开始
    InputMessages     []M    // 转换前的原始输入
    LastOutputMessage M      // 上次失败的输出（流式下为部分消息）
    // 与 ModelRetryConfig 组合时为 *RetryExhaustedError
    LastErr           error  // 上次失败的错误
}
```

## 快速接入

### 基础用法：双模型故障转移

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "my-agent",
    Instruction: "You are a helpful assistant.",
    Model:       primaryModel, // model.BaseModel[*schema.Message]，必填

    ModelFailoverConfig: &adk.ModelFailoverConfig{
        MaxRetries: 1, // 最多 1 次 failover（共 2 次调用）

        ShouldFailover: func(ctx context.Context, msg *schema.Message, err error) bool {
            return !errors.Is(err, context.Canceled) &&
                !errors.Is(err, context.DeadlineExceeded)
        },

        GetFailoverModel: func(ctx context.Context, fc *adk.FailoverContext) (
            model.BaseChatModel, []*schema.Message, error,
        ) {
            return fallbackModel, nil, nil // nil 消息 → 沿用原始输入
        },
    },
})
```

> 💡
> `model.BaseChatModel` 是 `model.BaseModel[*schema.Message]` 的类型别名，两者可互换使用。

### 故障转移时转换输入

当备用模型不支持某些功能（如图片输入）时：

```go
ModelFailoverConfig: &adk.ModelFailoverConfig{
    MaxRetries: 1,
    ShouldFailover: func(_ context.Context, _ *schema.Message, _ error) bool {
        return true
    },
    GetFailoverModel: func(_ context.Context, fc *adk.FailoverContext) (
        model.BaseChatModel, []*schema.Message, error,
    ) {
        // 过滤掉图片内容，降级到纯文本模型
        return textModel, filterTextOnly(fc.InputMessages), nil
    },
},
```

### 结合 Retry

Failover 与 Retry 正交组合。语义：**每个模型先按 Retry 策略重试，重试耗尽后触发 Failover 切换**。

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model: primaryModel,
    // ...

    ModelRetryConfig: &adk.ModelRetryConfig{
        MaxRetries: 2,
        IsRetryAble: func(_ context.Context, err error) bool {
            return isTransientError(err)
        },
    },

    ModelFailoverConfig: &adk.ModelFailoverConfig{
        MaxRetries: 1,
        ShouldFailover: func(_ context.Context, _ *schema.Message, err error) bool {
            // err 此时为 *RetryExhaustedError
            return true
        },
        GetFailoverModel: func(_ context.Context, _ *adk.FailoverContext) (
            model.BaseChatModel, []*schema.Message, error,
        ) {
            return fallbackModel, nil, nil
        },
    },
})
```

## 流式 Failover 行为

<table>
<tr><td>场景</td><td>行为</td></tr>
<tr><td><pre>Stream()</pre> 初始化失败</td><td>与 Generate 一致，直接触发 failover 判定</td></tr>
<tr><td>流中途出错</td><td>已接收 chunk 拼接为 <pre>LastOutputMessage</pre> 传入 <pre>ShouldFailover</pre>；决定 failover 后关闭当前流，用新模型重启</td></tr>
<tr><td>客户端影响</td><td>失败尝试中已发送的事件不会被撤回。客户端应在收到新一轮流时重置部分结果或按元数据去重</td></tr>
</table>

> 💡
> `ErrStreamCanceled`（调用方主动放弃流）不触发 failover，直接返回。

## Model 调用链执行顺序

Failover 在包装链中的位置（从外到内）：

```
1. AgentMiddleware.BeforeChatModel
 2. ChatModelAgentMiddleware.BeforeModelRewriteState
 3. failoverModelWrapper          ← failover 在此层
 4. retryModelWrapper             ← 每个 failover 模型内部重试
 5. eventSenderModelWrapper
 6. ChatModelAgentMiddleware.WrapModel（先注册的在最外层）
 7. callbackInjectionModelWrapper（failover 启用时由 failoverProxyModel 内部处理）
 8. failoverProxyModel / Model.Generate|Stream
 9. ChatModelAgentMiddleware.AfterModelRewriteState
10. AgentMiddleware.AfterChatModel
```

## 注意事项

- **必填校验**：`ShouldFailover` 和 `GetFailoverModel` 在配置 `ModelFailoverConfig` 时均为必填，缺少任一在 `NewChatModelAgent` 时返回错误。`Model` 字段始终必填。
- **Attempt 编号**：`FailoverAttempt` 从 1 开始。单次 Model 调用最多执行 `1 + MaxRetries` 次（初始 1 次 + failover 最多 MaxRetries 次）。
- **输入消息**：`GetFailoverModel` 返回 `nil` 消息时沿用原始输入；返回非 `nil` 时替代原始输入。
- **与 Retry 组合时的错误类型**：`ShouldFailover` 和 `FailoverContext.LastErr` 收到的是 `*RetryExhaustedError`，原始错误通过 `RetryExhaustedError.LastErr` 获取。
