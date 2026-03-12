---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 6: Callback and Trace (Observability)"
weight: 6
---

Goal of this chapter: understand the Callback mechanism and integrate CozeLoop for tracing and observability.

## Code Location

- Entry code: [cmd/ch06/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch06/main.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark). Also set `PROJECT_ROOT` as in Chapter 4:

```bash
export PROJECT_ROOT=/path/to/eino  # Eino core repo root (defaults to current directory if unset)
```

Optional: configure CozeLoop for tracing:

```bash
export COZELOOP_WORKSPACE_ID=your_workspace_id
export COZELOOP_API_TOKEN=your_token
```

## Run

From `examples/quickstart/chatwitheino`:

```bash
# set project root
export PROJECT_ROOT=/path/to/your/project

# optional: configure CozeLoop
export COZELOOP_WORKSPACE_ID=your_workspace_id
export COZELOOP_API_TOKEN=your_token

go run ./cmd/ch06
```

Example output:

```
[trace] starting session: 083d16da-6b13-4fe6-afb0-c45d8f490ce1
you> hi
[trace] chat_model_generate: model=gpt-4.1-mini tokens=150
[trace] tool_call: name=list_files duration=23ms
[assistant] Hi! How can I help you today?
```

## From Black Box to White Box: Why Callbacks

In the previous chapters, our Agent behaved like a “black box”: we provide a question and get an answer, but we don’t know what happened inside.

**Problems with a black box:**

- how many times the model was called
- how long Tools took to run
- how many tokens were consumed
- hard to locate root causes when something goes wrong

**What Callbacks are for:**

- **Callbacks are Eino’s side-channel mechanism**: consistent across component → compose → adk
- **Callbacks fire at fixed points**: five key lifecycle moments
- **Callbacks can extract runtime information**: input, output, errors, streaming data, etc.
- **Callbacks are broadly useful**: observability, logging, metrics, tracing, debugging, auditing, etc.

**Analogy:**

- **Agent** = “main path / business logic”
- **Callback** = “side-channel hooks” (extract information at fixed points)

## Key Concepts

### Handler Interface

`Handler` is the core callback-handler interface in Eino:

```go
type Handler interface {
    // Non-streaming input (before component starts processing).
    OnStart(ctx context.Context, info *RunInfo, input CallbackInput) context.Context
    
    // Non-streaming output (after component successfully returns).
    OnEnd(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context
    
    // Error (when component returns an error).
    OnError(ctx context.Context, info *RunInfo, err error) context.Context
    
    // Streaming input (when component receives streaming input).
    OnStartWithStreamInput(ctx context.Context, info *RunInfo, 
        input *schema.StreamReader[CallbackInput]) context.Context
    
    // Streaming output (when component returns streaming output).
    OnEndWithStreamOutput(ctx context.Context, info *RunInfo, 
        output *schema.StreamReader[CallbackOutput]) context.Context
}
```

**Design ideas:**

- **Side-channel**: does not interfere with the main flow; extracts information at fixed points
- **End-to-end coverage**: supported across component → compose → adk
- **State passing**: a Handler can pass state from OnStart → OnEnd via context
- **Performance optimization**: implement `TimingChecker` to skip timings you don’t need

**RunInfo:**

```go
type RunInfo struct {
    Name      string        // business name (node name or user-provided)
    Type      string        // implementation type (e.g. "OpenAI")
    Component string        // component type (e.g. "ChatModel")
}
```

**Important notes:**

- streaming callbacks must close StreamReaders, otherwise goroutines may leak
- do not mutate Input/Output: they may be shared by downstream consumers
- RunInfo may be nil; check before use

### CozeLoop

CozeLoop is an open-source AI observability platform that provides:

- **Tracing**: visualize the full call chain
- **Metrics**: latency, token consumption, error rates, etc.
- **Log aggregation**: centralized log management
- **Debugging**: online inspection and debugging

**Integration:**

```go
import (
    clc "github.com/cloudwego/eino-ext/callbacks/cozeloop"
    "github.com/cloudwego/eino/callbacks"
    "github.com/coze-dev/cozeloop-go"
)

// Create a CozeLoop client.
client, err := cozeloop.NewClient(
    cozeloop.WithAPIToken(apiToken),
    cozeloop.WithWorkspaceID(workspaceID),
)

// Register as a global callback.
callbacks.AppendGlobalHandlers(clc.NewLoopHandler(client))
```

### Callback Timings

Callbacks fire at five key lifecycle moments. `Timing*` are Eino internal constant names (used by `TimingChecker`). The corresponding Handler methods are shown on the right:

<table>
<tr><td>Timing constant</td><td>Handler method</td><td>Trigger point</td><td>Input/Output</td></tr>
<tr><td><pre>TimingOnStart</pre></td><td><pre>OnStart</pre></td><td>before component processing</td><td>CallbackInput</td></tr>
<tr><td><pre>TimingOnEnd</pre></td><td><pre>OnEnd</pre></td><td>after successful return</td><td>CallbackOutput</td></tr>
<tr><td><pre>TimingOnError</pre></td><td><pre>OnError</pre></td><td>on error return</td><td>error</td></tr>
<tr><td><pre>TimingOnStartWithStreamInput</pre></td><td><pre>OnStartWithStreamInput</pre></td><td>on streaming input</td><td>StreamReader[CallbackInput]</td></tr>
<tr><td><pre>TimingOnEndWithStreamOutput</pre></td><td><pre>OnEndWithStreamOutput</pre></td><td>on streaming output</td><td>StreamReader[CallbackOutput]</td></tr>
</table>

**Example: ChatModel.Generate**

```
┌─────────────────────────────────────────┐
│  ChatModel.Generate(ctx, messages)      │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnStart             │  ← input: CallbackInput (messages)
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  model processing     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnEnd               │  ← output: CallbackOutput (response)
        └──────────────────────┘
```

**Example: streaming output**

```
┌─────────────────────────────────────────┐
│  ChatModel.Stream(ctx, messages)        │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  OnStart             │  ← input: CallbackInput (messages)
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  model processing     │  (streaming)
        └──────────────────────┘
                   ↓
        ┌────────────────────────┐
        │  OnEndWithStreamOutput  │  ← output: StreamReader[CallbackOutput]
        └────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  chunks returned      │
        └──────────────────────┘
```

Notes:

- streaming errors (mid-stream) do not trigger OnError; they are returned through StreamReader
- a Handler can pass state from OnStart → OnEnd via context
- there is no guaranteed execution order among different handlers

## Implementing Callbacks

### 1. Implement a Custom Callback Handler

Fully implementing `Handler` requires all five methods. Eino provides `callbacks.HandlerHelper` to simplify:

```go
import "github.com/cloudwego/eino/callbacks"

// Register the timings you care about via NewHandlerHelper.
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

// Register as a global callback.
callbacks.AppendGlobalHandlers(handler)
```

Note: `RunInfo` may be nil (e.g., top-level calls). Check before use.

### 2. Integrate CozeLoop

```go
func setupCozeLoop(ctx context.Context) (*cozeloop.Client, error) {
    apiToken := os.Getenv("COZELOOP_API_TOKEN")
    workspaceID := os.Getenv("COZELOOP_WORKSPACE_ID")
    
    if apiToken == "" || workspaceID == "" {
        return nil, nil  // skip if not configured
    }
    
    client, err := cozeloop.NewClient(
        cozeloop.WithAPIToken(apiToken),
        cozeloop.WithWorkspaceID(workspaceID),
    )
    if err != nil {
        return nil, err
    }
    
    // Register as a global callback.
    callbacks.AppendGlobalHandlers(clc.NewLoopHandler(client))
    
    return client, nil
}
```

### 3. Use in main

```go
func main() {
    ctx := context.Background()
    
    // Setup CozeLoop (optional).
    client, err := setupCozeLoop(ctx)
    if err != nil {
        log.Printf("cozeloop setup failed: %v", err)
    }
    if client != nil {
        defer func() {
            time.Sleep(5 * time.Second)  // wait for reporting
            client.Close(ctx)
        }()
    }
    
    // Create agent and run...
}
```

Key snippet (note: this is a simplified excerpt and not directly runnable; see [cmd/ch06/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch06/main.go)):

```go
// Setup CozeLoop tracing.
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

## Value of Observability

### 1. Performance Analysis

With data collected via callbacks, you can analyze:

- distribution of model call latency
- top tool execution times
- token consumption trends

### 2. Error Tracing

When something goes wrong:

- inspect the full call chain
- locate where the failure occurred
- analyze root causes

### 3. Cost Optimization

With token consumption data, you can:

- identify high-cost conversations
- optimize prompts to reduce tokens
- choose more cost-effective models

## Summary

- **Callback**: Eino’s observability hooks triggered at key points
- **CozeLoop**: an AI observability platform
- **Global registration**: register global callbacks via `callbacks.AppendGlobalHandlers`
- **Non-invasive**: business code doesn’t need to change; callbacks fire automatically
- **Observability value**: performance, error tracing, and cost optimization

## Further Thoughts

**Other callback implementations:**

- OpenTelemetry callback: integrate with a standard observability protocol
- custom logging callback: write logs to local files
- metrics callback: integrate with Prometheus and other monitoring systems

**Advanced usage:**

- sampling (record only a subset of requests)
- rate limiting based on token consumption
- alerting when error rates are high
