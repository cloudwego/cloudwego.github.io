---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: Agent Callback
weight: 9
---

This feature adds Callback support to ADK agents, similar to the callback mechanism in the compose package. With callbacks, users can observe the agent execution lifecycle and implement logging, tracing, monitoring, and more.

> 💡
> **Tip**: The cozeloop ADK trace version is available at [https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0](https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0)
>
> Make sure to use a trace callback handler implementation that supports v0.8, otherwise agent tracing won’t work properly.

## Overview

The ADK Agent Callback mechanism shares the same infrastructure as the callback system in Eino compose:

- Uses the same `callbacks.Handler` interface
- Uses the same `callbacks.RunInfo` structure
- Can be combined with callbacks of other components (e.g. ChatModel, Tool)

> 💡
> With Agent Callback, you can hook into key points of agent execution to implement observability such as tracing, logging, and metrics. This capability was introduced in v0.8.0.

## Core Types

### ComponentOfAgent

Component type identifier used to recognize agent-related events in callbacks:

```go
const ComponentOfAgent components.Component = "Agent"
```

Used in `callbacks.RunInfo.Component` to filter callback events related to agents only.

### AgentCallbackInput

Input type for agent callbacks, passed to `OnStart`:

```go
type AgentCallbackInput struct {
    // Input contains the agent input for a new run. It is nil when resuming.
    Input *AgentInput
    // ResumeInfo contains information for resuming from an interrupt. It is nil for a new run.
    ResumeInfo *ResumeInfo
}
```

<table>
<tr><td>Call</td><td>Field values</td></tr>
<tr><td><pre>Agent.Run()</pre></td><td><pre>Input</pre> is set, <pre>ResumeInfo</pre> is nil</td></tr>
<tr><td><pre>Agent.Resume()</pre></td><td><pre>ResumeInfo</pre> is set, <pre>Input</pre> is nil</td></tr>
</table>

### AgentCallbackOutput

Output type for agent callbacks, passed to `OnEnd`:

```go
type AgentCallbackOutput struct {
    // Events provides the agent event stream. Each handler receives its own copy.
    Events *AsyncIterator[*AgentEvent]
}
```

> 💡
> **Important**: consume `Events` **asynchronously** to avoid blocking agent execution. Each callback handler gets an independent copy of the event stream, so they do not interfere with each other.

## API Usage

### WithCallbacks

Run option that adds callback handlers to receive agent lifecycle events:

```go
func WithCallbacks(handlers ...callbacks.Handler) AgentRunOption
```

### Type Conversion Helpers

Convert generic callback types to agent-specific types:

```go
// Convert input type
func ConvAgentCallbackInput(input callbacks.CallbackInput) *AgentCallbackInput

// Convert output type
func ConvAgentCallbackOutput(output callbacks.CallbackOutput) *AgentCallbackOutput
```

If the type does not match, these functions return nil.

## Examples

### Option 1: Use HandlerBuilder

Build a generic callback handler via `callbacks.NewHandlerBuilder()`:

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
            // Consume events asynchronously
            go func() {
                for {
                    event, ok := agentOutput.Events.Next()
                    if !ok {
                        break
                    }
                    // Handle event...
                    fmt.Printf("Event from %s: %+v\n", event.AgentName, event)
                }
            }()
        }
        return ctx
    }).
    Build()

// Create Runner - callbacks only work when running the agent via Runner
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: input.EnableStreaming,
})

iter := runner.Run(ctx, input.Messages, adk.WithCallbacks(handler))
```

> 💡
> **Important**: this is the correct usage. Callbacks only work when running the agent through Runner. If you call `agent.Run()` directly, callbacks will not be triggered.

### Option 2: Use HandlerHelper (Recommended)

`template.HandlerHelper` makes type conversion easier:

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
                    // Handle event...
                }
            }()
            return ctx
        },
    }).
    Handler()

// Create Runner - callbacks only work when running the agent via Runner
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: input.EnableStreaming,
})

iter := runner.Run(ctx, input.Messages, adk.WithCallbacks(helper))
```

> 💡
> **Important**: callbacks only work when running the agent through Runner. If you call `agent.Run()` directly, callbacks will not be triggered.
>
> 💡
> `HandlerHelper` performs type conversion automatically and keeps the code concise. It also supports composing callbacks for multiple components.

## Tracing Use Case

> 💡
> **Important**: AgentCallback only works when executed via Runner. If you call Agent.Run() directly, callbacks will not be triggered because the callback mechanism is implemented at the flowAgent layer. Create a Runner via `adk.NewRunner()` and execute the agent via `Runner.Run()` or `Runner.Query()`.

The most common use case is distributed tracing. Below is an example using OpenTelemetry:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
    
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/callbacks"
)

// Create an Agent (ChatModelAgent as example)
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "my_agent",
    Description: "A helpful assistant",
    Model:       chatModel,
})

// Create Runner - callbacks only work when running the agent via Runner
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
})

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

// Execute via Runner and pass the callback handler
iter := runner.Query(ctx, "Hello, agent!", adk.WithCallbacks(handler))

// Consume event stream
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    if event.Err != nil {
        log.Error(event.Err)
        break
    }
    // Handle event...
}
```

> 💡
> **Reminder**: callbacks only work when running the agent via Runner. If you call `agent.Run()` directly, even if you pass `adk.WithCallbacks(handler)`, agent-level callbacks will not be triggered.
>
> 💡
> **Tip**: The cozeloop ADK trace version is available at [https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0](https://github.com/cloudwego/eino-ext/releases/tag/callbacks%2Fcozeloop%2Fv0.2.0)

## Agent Type Identifiers

Built-in agents implement `components.Typer` and return their type identifier, which is filled into `callbacks.RunInfo.Type`:

<table>
<tr><td>Agent type</td><td>GetType() return value</td></tr>
<tr><td>ChatModelAgent</td><td><pre>"ChatModel"</pre></td></tr>
<tr><td>workflowAgent (Sequential)</td><td><pre>"Sequential"</pre></td></tr>
<tr><td>workflowAgent (Parallel)</td><td><pre>"Parallel"</pre></td></tr>
<tr><td>workflowAgent (Loop)</td><td><pre>"Loop"</pre></td></tr>
<tr><td>DeterministicTransfer Agent</td><td><pre>"DeterministicTransfer"</pre></td></tr>
</table>

## Callback Semantics

### Callback Timing

<table><tbody><tr>
<td>
<strong>Run</strong>1. Initialize callback context2. Handle input3. Call <pre>OnStart</pre>4. Execute agent logic5. Register <pre>OnEnd</pre> (when iterator is created)</td><td>
<strong>Resume</strong>1. Build ResumeInfo2. Initialize callback context3. Call <pre>OnStart</pre>4. Resume agent execution5. Register <pre>OnEnd</pre> (when iterator is created)</td></tr></tbody></table>

### OnEnd Timing

`OnEnd` is registered **when the iterator is created**, not when the generator is closed. This enables handlers to consume events while the stream is being produced.

## Notes

### 1. Consume Events Asynchronously

In callback handlers, `AgentCallbackOutput.Events` **must** be consumed asynchronously, otherwise it will block agent execution:

```go
// ✅ Correct
OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
    go func() {
        for {
            event, ok := output.Events.Next()
            if !ok {
                break
            }
            // Handle event
        }
    }()
    return ctx
}

// ❌ Wrong - will deadlock
OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *adk.AgentCallbackOutput) context.Context {
    for {
        event, ok := output.Events.Next()
        if !ok {
            break
        }
        // Handle event
    }
    return ctx
}
```

### 2. No OnError Callback

Because `Agent.Run()` and `Agent.Resume()` do not return error, agent callbacks **do not support** `OnError`. Errors are carried via `AgentEvent.Err` in the event stream.

### 3. Event Stream Copying

When multiple callback handlers are registered, each handler receives an independent copy of the event stream. The last handler receives the original stream to reduce allocations.
