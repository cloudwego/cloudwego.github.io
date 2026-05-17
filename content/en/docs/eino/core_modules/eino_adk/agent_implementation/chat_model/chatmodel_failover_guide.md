---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ChatModel Failover Guide
weight: 1
---

> 💡
> This feature is currently in alpha/09 gradual rollout

## Overview

`ChatModelAgent` has built-in model failover capability: when the primary model call fails, it automatically switches to a backup model, supporting both Generate (synchronous) and Stream (streaming). Configured via `ModelFailoverConfig[M]`, it works orthogonally with `TypedModelRetryConfig[M]` (same-model retry).

> This document uses the default `*schema.Message` type as an example. For generic usage, replace APIs with their `Typed` prefix versions and parameterize the message type as `M MessageType`.

## Core Data Structures

### ModelFailoverConfig[M]

```go
type ModelFailoverConfig[M MessageType] struct {
    // Maximum number of failover attempts. 0 means no failover;
    // 1 means GetFailoverModel is called at most once.
    // When lastSuccessModel is present, it is tried first before calling GetFailoverModel.
    MaxRetries uint

    // Determines whether to trigger failover. Stops regardless of return value when ctx.Err() != nil.
    // When combined with ModelRetryConfig, outputErr is *RetryExhaustedError;
    // the original error is available via RetryExhaustedError.LastErr.
    // In streaming scenarios, outputMessage may carry partially received messages.
    // Required when ModelFailoverConfig is configured.
    ShouldFailover func(ctx context.Context, outputMessage M, outputErr error) bool

    // Selects the next model and optionally transforms input messages.
    // failoverCtx.FailoverAttempt starts from 1.
    // Returning nil failoverModelInputMessages means using the original input.
    // Returning non-nil failoverErr immediately terminates failover.
    // Required when ModelFailoverConfig is configured.
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
    FailoverAttempt   uint   // Current attempt number, starting from 1
    InputMessages     []M    // Original input before transformation
    LastOutputMessage M      // Output from the last failure (partial message in streaming)
    // When combined with ModelRetryConfig, this is *RetryExhaustedError
    LastErr           error  // Error from the last failure
}
```

## Quick Start

### Basic Usage: Dual-Model Failover

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "my-agent",
    Instruction: "You are a helpful assistant.",
    Model:       primaryModel, // model.BaseModel[*schema.Message], required

    ModelFailoverConfig: &adk.ModelFailoverConfig{
        MaxRetries: 1, // At most 1 failover (2 total calls)

        ShouldFailover: func(ctx context.Context, msg *schema.Message, err error) bool {
            return !errors.Is(err, context.Canceled) &&
                !errors.Is(err, context.DeadlineExceeded)
        },

        GetFailoverModel: func(ctx context.Context, fc *adk.FailoverContext) (
            model.BaseChatModel, []*schema.Message, error,
        ) {
            return fallbackModel, nil, nil // nil messages → use original input
        },
    },
})
```

> 💡
> `model.BaseChatModel` is a type alias for `model.BaseModel[*schema.Message]`; the two can be used interchangeably.

### Transforming Input During Failover

When the backup model doesn't support certain features (e.g., image input):

```go
ModelFailoverConfig: &adk.ModelFailoverConfig{
    MaxRetries: 1,
    ShouldFailover: func(_ context.Context, _ *schema.Message, _ error) bool {
        return true
    },
    GetFailoverModel: func(_ context.Context, fc *adk.FailoverContext) (
        model.BaseChatModel, []*schema.Message, error,
    ) {
        // Filter out image content, degrade to text-only model
        return textModel, filterTextOnly(fc.InputMessages), nil
    },
},
```

### Combining with Retry

Failover and Retry work orthogonally. The semantics: **each model first retries according to the Retry strategy; after retries are exhausted, Failover switches to a different model**.

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
            // err is *RetryExhaustedError at this point
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

## Streaming Failover Behavior

<table>
<tr><td>Scenario</td><td>Behavior</td></tr>
<tr><td><pre>Stream()</pre> initialization failure</td><td>Same as Generate, directly triggers failover evaluation</td></tr>
<tr><td>Error mid-stream</td><td>Received chunks are concatenated into <pre>LastOutputMessage</pre> and passed to <pre>ShouldFailover</pre>; after deciding to failover, the current stream is closed and a new model restarts</td></tr>
<tr><td>Client impact</td><td>Events already sent during the failed attempt are not retracted. Clients should reset partial results or deduplicate by metadata when receiving a new stream round</td></tr>
</table>

> 💡
> `ErrStreamCanceled` (caller actively abandons the stream) does not trigger failover and returns directly.

## Model Call Chain Execution Order

Position of Failover in the wrapper chain (outer to inner):

```
1. AgentMiddleware.BeforeChatModel
 2. ChatModelAgentMiddleware.BeforeModelRewriteState
 3. failoverModelWrapper          ← failover is at this layer
 4. retryModelWrapper             ← internal retry within each failover model
 5. eventSenderModelWrapper
 6. ChatModelAgentMiddleware.WrapModel (first registered = outermost)
 7. callbackInjectionModelWrapper (handled internally by failoverProxyModel when failover is enabled)
 8. failoverProxyModel / Model.Generate|Stream
 9. ChatModelAgentMiddleware.AfterModelRewriteState
10. AgentMiddleware.AfterChatModel
```

## Notes

- **Required field validation**: Both `ShouldFailover` and `GetFailoverModel` are required when configuring `ModelFailoverConfig`; missing either will cause `NewChatModelAgent` to return an error. The `Model` field is always required.
- **Attempt numbering**: `FailoverAttempt` starts from 1. A single Model call executes at most `1 + MaxRetries` times (1 initial call + at most MaxRetries failover attempts).
- **Input messages**: When `GetFailoverModel` returns `nil` messages, the original input is used; when returning non-`nil`, it replaces the original input.
- **Error type when combined with Retry**: `ShouldFailover` and `FailoverContext.LastErr` receive `*RetryExhaustedError`; the original error is available via `RetryExhaustedError.LastErr`.
