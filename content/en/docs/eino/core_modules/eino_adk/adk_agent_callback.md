---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Callback'
weight: 9
---

This feature adds Callback support to ADK Agents, similar to the callback mechanism in the compose package. Through callbacks, users can observe the Agent's execution lifecycle for logging, tracing, monitoring, and other purposes.

## Overview

The ADK Agent Callback mechanism shares the same infrastructure as the callback system in Eino compose:

- Uses the same `callbacks.Handler` interface
- Uses the same `callbacks.RunInfo` structure
- Can be combined with other component callbacks (such as ChatModel, Tool, etc.)

> 💡
> Through Agent Callback, you can hook into key points of Agent execution to implement observability capabilities like tracing, logging, and metrics. This feature was introduced in [v0.8.0.Beta](https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1).

## Core Types

### ComponentOfAgent

Component type identifier used to identify Agent-related events in callbacks:

```go
const ComponentOfAgent components.Component = "Agent"
```

Used in `callbacks.RunInfo.Component` to filter callback events related only to Agents.

### AgentCallbackInput

Input type for Agent callbacks, passed in the `OnStart` callback:

```go
type AgentCallbackInput struct {
    // Input contains the Agent input for new runs. Nil when resuming execution.
    Input *AgentInput
    // ResumeInfo contains information when resuming from an interrupt. Nil for new runs.
    ResumeInfo *ResumeInfo
}
```

<table>
<tr><td>Call Method</td><td>Field Values</td></tr>
<tr><td><pre>Agent.Run()</pre></td><td><pre>Input</pre> field has value, <pre>ResumeInfo</pre> is nil</td></tr>
<tr><td><pre>Agent.Resume()</pre></td><td><pre>ResumeInfo</pre> field has value, <pre>Input</pre> is nil</td></tr>
</table>

### AgentCallbackOutput

Output type for Agent callbacks, passed in the `OnEnd` callback:

```go
type AgentCallbackOutput struct {
    // Events provides the Agent event stream. Each handler receives an independent copy.
    Events *AsyncIterator[*AgentEvent]
}
```

> 💡
> **Important**: The `Events` iterator should be consumed **asynchronously** to avoid blocking Agent execution. Each callback handler receives an independent copy of the event stream without interfering with each other.

## API Usage

### WithCallbacks

Run option to add callback handlers to receive Agent lifecycle events:

```go
func WithCallbacks(handlers ...callbacks.Handler) AgentRunOption
```

### Type Conversion Functions

Convert generic callback types to Agent-specific types:

```go
// Convert input type
func ConvAgentCallbackInput(input callbacks.CallbackInput) *AgentCallbackInput

// Convert output type
func ConvAgentCallbackOutput(output callbacks.CallbackOutput) *AgentCallbackOutput
```

Functions return nil if the type doesn't match.

## Usage Examples

### Method 1: Using HandlerBuilder

Use `callbacks.NewHandlerBuilder()` to build a generic callback handler:

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
            // Consume event stream asynchronously
            go func() {
                for {
                    event, ok := agentOutput.Events.Next()
                    if !ok {
                        break
                    }
                    // Process event...
                    fmt.Printf("Event from %s: %+v\n", event.AgentName, event)
                }
            }()
        }
        return ctx
    }).
    Build()

iter := agent.Run(ctx, input, adk.WithCallbacks(handler))
```

### Method 2: Using HandlerHelper (Recommended)

Using `template.HandlerHelper` makes type conversion more convenient:

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
            // Consume events asynchronously
            go func() {
                for {
                    event, ok := output.Events.Next()
                    if !ok {
                        break
                    }
                    // Process event...
                }
            }()
            return ctx
        },
    }).
    Handler()

iter := agent.Run(ctx, input, adk.WithCallbacks(helper))
```

> 💡
> `HandlerHelper` automatically performs type conversion, making the code more concise. It also supports combining callback handlers for multiple components.

## Tracing Application

The most common use case for Agent Callback is implementing distributed tracing. Here's an example using OpenTelemetry for tracing:

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
        // Create span
        ctx, span := tracer.Start(ctx, info.Name,
            trace.WithAttributes(
                attribute.String("component", string(info.Component)),
                attribute.String("type", info.Type),
            ))
        
        // Agent-specific attributes
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

### Combining with compose Callbacks

Since ADK Agent callbacks share the same infrastructure as compose callbacks, you can use the same handler to process callbacks from both Agents and other components (like ChatModel, Tool):

```go
helper := template.NewHandlerHelper().
    // Agent callback
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
    // ChatModel callback
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
    // Tool callback
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

// Use combined handler
iter := agent.Run(ctx, input, adk.WithCallbacks(helper))
```

> 💡
> **Tip**: For the cozeloop ADK trace version, see [https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0-alpha.1](https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0-alpha.1)

## Agent Type Identifiers

Built-in Agents implement the `components.Typer` interface, returning their type identifier, which populates the `callbacks.RunInfo.Type` field:

<table>
<tr><td>Agent Type</td><td>GetType() Return Value</td></tr>
<tr><td>ChatModelAgent</td><td><pre>"ChatModel"</pre></td></tr>
<tr><td>workflowAgent (Sequential)</td><td><pre>"Sequential"</pre></td></tr>
<tr><td>workflowAgent (Parallel)</td><td><pre>"Parallel"</pre></td></tr>
<tr><td>workflowAgent (Loop)</td><td><pre>"Loop"</pre></td></tr>
<tr><td>DeterministicTransfer Agent</td><td><pre>"DeterministicTransfer"</pre></td></tr>
</table>

## Callback Behavior

### Callback Invocation Timing

<table><tbody><tr>
<td>
<strong>Run Method</strong>1. Initialize callback context2. Process input3. Call <pre>OnStart</pre>4. Execute Agent logic5. Register <pre>OnEnd</pre> (when event stream is created)</td><td>
<strong>Resume Method</strong>1. Build ResumeInfo2. Initialize callback context3. Call <pre>OnStart</pre>4. Resume Agent execution5. Register <pre>OnEnd</pre> (when event stream is created)</td></tr></tbody></table>

### OnEnd Invocation Timing

The `OnEnd` callback is registered **when the iterator is created**, not when the generator closes. This allows handlers to consume events while the stream is being transmitted.

## Notes

### 1. Consume Event Stream Asynchronously

The `AgentCallbackOutput.Events` in callback handlers **must** be consumed asynchronously, otherwise it will block Agent execution:

```go
// ✅ Correct
OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
    go func() {
        for {
            event, ok := output.Events.Next()
            if !ok {
                break
            }
            // Process event
        }
    }()
    return ctx
}

// ❌ Wrong - will cause deadlock
OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
    for {
        event, ok := output.Events.Next()
        if !ok {
            break
        }
        // Process event
    }
    return ctx
}
```

### 2. No OnError Callback

Since `Agent.Run()` and `Agent.Resume()` method signatures don't return errors, Agent callbacks **do not support** `OnError`. Error information is passed through the `AgentEvent.Err` field in the event stream.

### 3. Event Stream Copying Mechanism

When there are multiple callback handlers, each handler receives an independent copy of the event stream without interfering with each other. The last handler receives the original events to reduce memory allocation.
