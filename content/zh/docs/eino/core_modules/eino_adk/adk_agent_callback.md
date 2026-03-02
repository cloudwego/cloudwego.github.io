---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Callback'
weight: 9
---

此功能为 ADK Agent 添加了回调（Callback）支持，类似于 compose 包中的回调机制。通过回调，用户可以观测 Agent 的执行生命周期，实现日志记录、追踪、监控等功能。

## 概述

ADK Agent Callback 机制与 Eino compose 中的回调系统共享相同的基础设施：

- 使用相同的 `callbacks.Handler` 接口
- 使用相同的 `callbacks.RunInfo` 结构
- 可以与其他组件回调（如 ChatModel、Tool 等）组合使用

> 💡
> 通过 Agent Callback，你可以在 Agent 执行的关键节点介入，实现 tracing、logging、metrics 等可观测性能力。本能力在 [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13) 版本引入。

## 核心类型

### ComponentOfAgent

组件类型标识符，用于在回调中识别 Agent 相关事件：

```go
const ComponentOfAgent components.Component = "Agent"
```

在 `callbacks.RunInfo.Component` 中使用，用于过滤仅与 Agent 相关的回调事件。

### AgentCallbackInput

Agent 回调的输入类型，在 `OnStart` 回调中传递：

```go
type AgentCallbackInput struct {
    // Input 包含新运行的 Agent 输入。恢复执行时为 nil。
    Input *AgentInput
    // ResumeInfo 包含从中断恢复时的信息。新运行时为 nil。
    ResumeInfo *ResumeInfo
}
```

<table>
<tr><td>调用方式</td><td>字段值</td></tr>
<tr><td><pre>Agent.Run()</pre></td><td><pre>Input</pre> 字段有值，<pre>ResumeInfo</pre> 为 nil</td></tr>
<tr><td><pre>Agent.Resume()</pre></td><td><pre>ResumeInfo</pre> 字段有值，<pre>Input</pre> 为 nil</td></tr>
</table>

### AgentCallbackOutput

Agent 回调的输出类型，在 `OnEnd` 回调中传递：

```go
type AgentCallbackOutput struct {
    // Events 提供 Agent 事件流。每个 handler 接收独立的副本。
    Events *AsyncIterator[*AgentEvent]
}
```

> 💡
> **重要**：`Events` 迭代器应**异步消费**，以避免阻塞 Agent 执行。每个回调 handler 接收独立的事件流副本，互不干扰。

## API 使用

### WithCallbacks

添加回调 handler 以接收 Agent 生命周期事件的运行选项：

```go
func WithCallbacks(handlers ...callbacks.Handler) AgentRunOption
```

### 类型转换函数

将通用回调类型转换为 Agent 专用类型：

```go
// 转换输入类型
func ConvAgentCallbackInput(input callbacks.CallbackInput) *AgentCallbackInput

// 转换输出类型
func ConvAgentCallbackOutput(output callbacks.CallbackOutput) *AgentCallbackOutput
```

如果类型不匹配，函数返回 nil。

## 使用示例

### 方式一：使用 HandlerBuilder

使用 `callbacks.NewHandlerBuilder()` 构建通用的 callback handler：

```go
import (
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/callbacks"
)

handler := callbacks.NewHandlerBuilder().
    OnStartFn(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
        if info.Component == adk.ComponentOfAgent {
            agentInput := adk.ConvAgentCallbackInput(input)
            if agentInput.Input != nil {
                fmt.Printf("Agent %s started with new run\n", info.Name)
            } else {
                fmt.Printf("Agent %s resumed from interrupt\n", info.Name)
            }
        }
        return ctx
    }).
    OnEndFn(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
        if info.Component == adk.ComponentOfAgent {
            agentOutput := adk.ConvAgentCallbackOutput(output)
            // 异步消费事件流
            go func() {
                for {
                    event, ok := agentOutput.Events.Next()
                    if !ok {
                        break
                    }
                    // 处理事件...
                    fmt.Printf("Event from %s: %+v\n", event.AgentName, event)
                }
            }()
        }
        return ctx
    }).
    Build()

iter := agent.Run(ctx, input, adk.WithCallbacks(handler))
```

### 方式二：使用 HandlerHelper（推荐）

使用 `template.HandlerHelper` 可以更方便地处理类型转换：

```go
import (
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/callbacks"
    template "github.com/cloudwego/eino/utils/callbacks"
)

helper := template.NewHandlerHelper().
    Agent(&template.AgentCallbackHandler{
        OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *adk.AgentCallbackInput) context.Context {
            if input.Input != nil {
                fmt.Printf("Agent %s started with input\n", info.Name)
            } else {
                fmt.Printf("Agent %s resumed\n", info.Name)
            }
            return ctx
        },
        OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
            // 异步消费事件
            go func() {
                for {
                    event, ok := output.Events.Next()
                    if !ok {
                        break
                    }
                    // 处理事件...
                }
            }()
            return ctx
        },
    }).
    Handler()

iter := agent.Run(ctx, input, adk.WithCallbacks(helper))
```

> 💡
> `HandlerHelper` 会自动进行类型转换，代码更简洁。同时支持组合多种组件的回调处理器。

## Tracing 场景应用

Agent Callback 最常见的应用场景是实现分布式追踪（Tracing）。以下是使用 OpenTelemetry 实现 tracing 的示例：

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

tracer := otel.Tracer("my-agent-tracer")

handler := callbacks.NewHandlerBuilder().
    OnStartFn(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
        // 创建 span
        ctx, span := tracer.Start(ctx, info.Name,
            trace.WithAttributes(
                attribute.String("component", string(info.Component)),
                attribute.String("type", info.Type),
            ))
        
        // Agent 特定的属性
        if info.Component == adk.ComponentOfAgent {
            agentInput := adk.ConvAgentCallbackInput(input)
            if agentInput != nil && agentInput.Input != nil {
                span.SetAttributes(attribute.Bool("is_new_run", true))
            } else {
                span.SetAttributes(attribute.Bool("is_resume", true))
            }
        }
        
        return ctx
    }).
    OnEndFn(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
        span := trace.SpanFromContext(ctx)
        span.End()
        return ctx
    }).
    OnErrorFn(func(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
        span := trace.SpanFromContext(ctx)
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        span.End()
        return ctx
    }).
    Build()
```

### 与 compose 回调组合

由于 ADK Agent 回调与 compose 回调共享相同的基础设施，你可以使用同一个 handler 同时处理 Agent 和其他组件（如 ChatModel、Tool）的回调：

```go
helper := template.NewHandlerHelper().
    // Agent 回调
    Agent(&template.AgentCallbackHandler{
        OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *adk.AgentCallbackInput) context.Context {
            ctx, _ = tracer.Start(ctx, "agent:"+info.Name)
            return ctx
        },
        OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
            trace.SpanFromContext(ctx).End()
            return ctx
        },
    }).
    // ChatModel 回调
    ChatModel(&template.ModelCallbackHandler{
        OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *model.CallbackInput) context.Context {
            ctx, _ = tracer.Start(ctx, "model:"+info.Name)
            return ctx
        },
        OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *model.CallbackOutput) context.Context {
            trace.SpanFromContext(ctx).End()
            return ctx
        },
    }).
    // Tool 回调
    Tool(&template.ToolCallbackHandler{
        OnStart: func(ctx context.Context, info *callbacks.RunInfo, input *tool.CallbackInput) context.Context {
            ctx, _ = tracer.Start(ctx, "tool:"+input.Name)
            return ctx
        },
        OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *tool.CallbackOutput) context.Context {
            trace.SpanFromContext(ctx).End()
            return ctx
        },
    }).
    Handler()

// 使用组合的 handler
iter := agent.Run(ctx, input, adk.WithCallbacks(helper))
```

> 💡
> **提示**：cozeloop 的 adk trace 版本见 [https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0-alpha.1](https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0-alpha.1)
>
> Fornax 的 adk trace 版本见 [https://code.byted.org/flow/eino-byted-ext/tags/callbacks/fornax/v0.2.0-alpha.1](https://code.byted.org/flow/eino-byted-ext/tags/callbacks/fornax/v0.2.0-alpha.1)

## Agent 类型标识

内置 Agent 实现了 `components.Typer` 接口，返回其类型标识，该信息会填充到 `callbacks.RunInfo.Type` 字段中：

<table>
<tr><td>Agent 类型</td><td>GetType() 返回值</td></tr>
<tr><td>ChatModelAgent</td><td><pre>"ChatModel"</pre></td></tr>
<tr><td>workflowAgent (Sequential)</td><td><pre>"Sequential"</pre></td></tr>
<tr><td>workflowAgent (Parallel)</td><td><pre>"Parallel"</pre></td></tr>
<tr><td>workflowAgent (Loop)</td><td><pre>"Loop"</pre></td></tr>
<tr><td>DeterministicTransfer Agent</td><td><pre>"DeterministicTransfer"</pre></td></tr>
</table>

## 回调行为说明

### 回调调用时机

<table><tbody><tr>
<td>
<strong>Run 方法</strong>1. 初始化回调上下文2. 处理输入3. 调用 <pre>OnStart</pre>4. 执行 Agent 逻辑5. 注册 <pre>OnEnd</pre>（在事件流创建时）</td><td>
<strong>Resume 方法</strong>1. 构建 ResumeInfo2. 初始化回调上下文3. 调用 <pre>OnStart</pre>4. 恢复 Agent 执行5. 注册 <pre>OnEnd</pre>（在事件流创建时）</td></tr></tbody></table>

### OnEnd 调用时机

`OnEnd` 回调在**迭代器创建时**注册，而非在生成器关闭时。这允许 handler 在事件流式传输时消费事件。

## 注意事项

### 1. 异步消费事件流

回调 handler 中的 `AgentCallbackOutput.Events` **必须**异步消费，否则会阻塞 Agent 执行：

```go
// ✅ 正确
OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
    go func() {
        for {
            event, ok := output.Events.Next()
            if !ok {
                break
            }
            // 处理事件
        }
    }()
    return ctx
}

// ❌ 错误 - 会导致死锁
OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
    for {
        event, ok := output.Events.Next()
        if !ok {
            break
        }
        // 处理事件
    }
    return ctx
}
```

### 2. 无 OnError 回调

由于 `Agent.Run()` 和 `Agent.Resume()` 方法签名不返回 error，Agent 回调**不支持** `OnError`。错误信息通过 `AgentEvent.Err` 字段在事件流中传递。

### 3. 事件流复制机制

当有多个回调 handler 时，每个 handler 接收独立的事件流副本，互不干扰。最后一个 handler 接收原始事件以减少内存分配。
