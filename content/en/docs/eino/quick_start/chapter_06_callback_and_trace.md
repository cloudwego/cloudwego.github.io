---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 6: Callback and Trace (Observability)"
weight: 6
---

Goal of this chapter: understand the Callback mechanism and integrate CozeLoop to achieve trace tracking and observability.

## Code Location

- Entry code: [cmd/ch06/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch06/main.go)

## Prerequisites

Same as Chapter 1: you need a configured ChatModel (OpenAI or Ark). Also, like Chapter 4, you need to set `PROJECT_ROOT`:

```bash
export PROJECT_ROOT=/path/to/eino  # Eino core library root directory (defaults to current directory if not set)
```

Optional: configure CozeLoop for trace tracking:

```bash
export COZELOOP_WORKSPACE_ID=your_workspace_id
export COZELOOP_API_TOKEN=your_token
```

## Running

In the `examples/quickstart/chatwitheino` directory, run:

```bash
# Set project root directory
export PROJECT_ROOT=/path/to/your/project

# Optional: configure CozeLoop
export COZELOOP_WORKSPACE_ID=your_workspace_id
export COZELOOP_API_TOKEN=your_token

go run ./cmd/ch06
```

Output example:

```
[trace] starting session: 083d16da-6b13-4fe6-afb0-c45d8f490ce1
you> Hello
[trace] chat_model_generate: model=gpt-4.1-mini tokens=150
[trace] tool_call: name=list_files duration=23ms
[assistant] Hello! How can I help you?
```

## From Black Box to White Box: Why Callbacks Are Needed

The Agent we implemented in previous chapters is a "black box": you provide a question, get an answer, but have no visibility into what happened in between.

**Problems with the black box:**

- No insight into how many times the model was called
- No insight into how long Tool executions took
- No insight into token consumption
- Difficult to pinpoint issues when something goes wrong

**The role of Callbacks:**

- **Callbacks are Eino's sidecar mechanism**: consistent from component to compose (more below) to ADK
- **Callbacks fire at fixed hook points**: 5 key moments in the component lifecycle
- **Callbacks extract real-time information**: input, output, errors, streaming data, etc.
- **Callbacks have broad use cases**: observation, logging, metrics, tracing, debugging, auditing, etc.

**Simple analogy:**

- **Agent** = "business logic" (main path)
- **Callback** = "sidecar hook" (extracts information at fixed hook points)

## Key Concepts

### Handler Interface

`Handler` is the core interface for defining callback handlers in Eino:

```go
type Handler interface {
    // Non-streaming input (before component starts processing)
    OnStart(ctx context.Context, info *RunInfo, input CallbackInput) context.Context
    
    // Non-streaming output (after component returns successfully)
    OnEnd(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context
    
    // Error (when component returns an error)
    OnError(ctx context.Context, info *RunInfo, err error) context.Context
    
    // Streaming input (when component receives streaming input)
    OnStartWithStreamInput(ctx context.Context, info *RunInfo, 
        input *schema.StreamReader[CallbackInput]) context.Context
    
    // Streaming output (when component returns streaming output)
    OnEndWithStreamOutput(ctx context.Context, info *RunInfo, 
        output *schema.StreamReader[CallbackOutput]) context.Context
}
```

**Design Philosophy:**

- **Sidecar mechanism**: does not interfere with the main flow, extracts information at fixed hook points
- **Full coverage**: all components from component to compose to ADK support callbacks
- **State passing**: OnStart→OnEnd of the same Handler can pass state via context
- **Performance optimization**: implementing the `TimingChecker` interface allows skipping unneeded timings

**RunInfo structure:**

```go
type RunInfo struct {
    Name      string        // Business name (node name or user-specified)
    Type      string        // Implementation type (e.g., "OpenAI")
    Component string        // Component type (e.g., "ChatModel")
}
```

**Important notes:**

- Streaming callbacks must close the StreamReader, otherwise goroutine leaks will occur
- Do not modify Input/Output — they are shared by all downstream consumers
- RunInfo may be nil; check before use

### CozeLoop

CozeLoop is an open-source AI application observability platform from ByteDance, providing:

- **Trace tracking**: complete call chain visualization
- **Metrics monitoring**: latency, token consumption, error rates, etc.
- **Log aggregation**: centralized log management
- **Debugging support**: online viewing and debugging

**Integration:**

```go
import (
    clc "github.com/cloudwego/eino-ext/callbacks/cozeloop"
    "github.com/cloudwego/eino/callbacks"
    "github.com/coze-dev/cozeloop-go"
)

// Create CozeLoop client
client, err := cozeloop.NewClient(
    cozeloop.WithAPIToken(apiToken),
    cozeloop.WithWorkspaceID(workspaceID),
)

// Register as global Callback
callbacks.AppendGlobalHandlers(clc.NewLoopHandler(client))
```

### Callback Trigger Timings

Callbacks fire at 5 key moments in the component lifecycle. The `Timing*` values in the table below are Eino internal constant names (used with the `TimingChecker` interface), and the corresponding Handler interface methods are shown on the right:

<table>
<tr><td>Timing Constant</td><td>Handler Method</td><td>Trigger Point</td><td>Input/Output</td></tr>
<tr><td><pre>TimingOnStart</pre></td><td><pre>OnStart</pre></td><td>Before component starts processing</td><td>CallbackInput</td></tr>
<tr><td><pre>TimingOnEnd</pre></td><td><pre>OnEnd</pre></td><td>After component returns successfully</td><td>CallbackOutput</td></tr>
<tr><td><pre>TimingOnError</pre></td><td><pre>OnError</pre></td><td>When component returns an error</td><td>error</td></tr>
<tr><td><pre>TimingOnStartWithStreamInput</pre></td><td><pre>OnStartWithStreamInput</pre></td><td>When component receives streaming input</td><td>StreamReader[CallbackInput]</td></tr>
<tr><td><pre>TimingOnEndWithStreamOutput</pre></td><td><pre>OnEndWithStreamOutput</pre></td><td>When component returns streaming output</td><td>StreamReader[CallbackOutput]</td></tr>
</table>

**Example: ChatModel call flow**

```
┌─────────────────────────────────────────┐
│  ChatModel.Generate(ctx, messages)      │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnStart             │  ← Input: CallbackInput (messages)
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Model processing    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnEnd               │  ← Output: CallbackOutput (response)
        └──────────────────────┘
```

**Example: Streaming output flow**

```
┌─────────────────────────────────────────┐
│  ChatModel.Stream(ctx, messages)        │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnStart             │  ← Input: CallbackInput (messages)
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Model processing    │
        │  (streaming)         │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnEndWithStreamOutput │  ← Output: StreamReader[CallbackOutput]
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Chunks returned     │
        │  one by one          │
        └──────────────────────┘
```

**Notes:**

- Streaming errors (errors mid-stream) do not trigger OnError; they are returned within the StreamReader
- OnStart→OnEnd of the same Handler can pass state via context
- There is no guaranteed execution order between different Handlers

## Callback Implementation

### 1. Implementing a Custom Callback Handler

Fully implementing the `Handler` interface requires implementing all 5 methods, which can be tedious. Eino provides the `callbacks.HandlerHelper` utility class to simplify this:

```go
import "github.com/cloudwego/eino/callbacks"

// Use NewHandlerHelper to register callbacks you're interested in
handler := callbacks.NewHandlerHelper().
    OnStart(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
        log.Printf("[trace] %s/%s start", info.Component, info.Name)
        return ctx
    }).
    OnEnd(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
        log.Printf("[trace] %s/%s end", info.Component, info.Name)
        return ctx
    }).
    OnError(func(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
        log.Printf("[trace] %s/%s error: %v", info.Component, info.Name, err)
        return ctx
    }).
    Handler()

// Register as global Callback
callbacks.AppendGlobalHandlers(handler)
```

**Note**: `RunInfo` may be `nil` (e.g., top-level calls without RunInfo); check before use.

### 2. Integrating CozeLoop

```go
// Setup CozeLoop tracing (optional)
// Set COZELOOP_API_TOKEN and COZELOOP_WORKSPACE_ID to enable
cozeloopApiToken := os.Getenv("COZELOOP_API_TOKEN")
cozeloopWorkspaceID := os.Getenv("COZELOOP_WORKSPACE_ID")
if cozeloopApiToken != "" && cozeloopWorkspaceID != "" {
    client, err := cozeloop.NewClient(
        cozeloop.WithAPIToken(cozeloopApiToken),
        cozeloop.WithWorkspaceID(cozeloopWorkspaceID),
    )
    if err != nil {
        log.Fatalf("cozeloop.NewClient failed: %v", err)
    }
    defer func() {
        time.Sleep(5 * time.Second)
        client.Close(ctx)
    }()
    callbacks.AppendGlobalHandlers(clc.NewLoopHandler(client))
    log.Println("CozeLoop tracing enabled")
} else {
    log.Println("CozeLoop tracing disabled (set COZELOOP_API_TOKEN and COZELOOP_WORKSPACE_ID to enable)")
}
```

**Key code snippet (**Note: this is a simplified snippet that cannot run directly. See** [cmd/ch06/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch06/main.go) for the complete code):

```go
// Setup CozeLoop tracing
cozeloopApiToken := os.Getenv("COZELOOP_API_TOKEN")
cozeloopWorkspaceID := os.Getenv("COZELOOP_WORKSPACE_ID")
if cozeloopApiToken != "" && cozeloopWorkspaceID != "" {
    client, err := cozeloop.NewClient(
        cozeloop.WithAPIToken(cozeloopApiToken),
        cozeloop.WithWorkspaceID(cozeloopWorkspaceID),
    )
    if err != nil {
        log.Fatalf("cozeloop.NewClient failed: %v", err)
    }
    defer func() {
        time.Sleep(5 * time.Second)
        client.Close(ctx)
    }()
    callbacks.AppendGlobalHandlers(clc.NewLoopHandler(client))
}
```

## The Value of Observability

### 1. Performance Analysis

Data collected through Callbacks enables analysis of:

- Model call latency distribution
- Tool execution time rankings
- Token consumption trends

### 2. Error Tracking

When the Agent encounters issues:

- View the complete call chain
- Identify which step failed
- Analyze the root cause

### 3. Cost Optimization

Through token consumption data:

- Identify high-consumption conversations
- Optimize prompts to reduce tokens
- Select more cost-effective models

## Chapter Summary

- **Callback**: Eino's observation hook, triggering callbacks at key points
- **CozeLoop**: ByteDance's AI application observability platform
- **Global registration**: register global Callbacks via `callbacks.AppendGlobalHandlers`
- **Non-intrusive**: business code requires no modifications; Callbacks fire automatically
- **Observability value**: performance analysis, error tracking, cost optimization

## Further Reading

**Other Callback implementations:**

- OpenTelemetry Callback: integrate with standard observability protocols
- Custom logging Callback: write to local files
- Metrics Callback: integrate with monitoring systems like Prometheus

**Advanced usage:**

- Implement sampling in Callbacks (only record a portion of requests)
- Implement rate limiting in Callbacks (based on token consumption)
- Implement alerting in Callbacks (notify when error rates are too high)
