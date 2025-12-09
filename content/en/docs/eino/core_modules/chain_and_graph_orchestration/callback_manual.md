---
Description: ""
date: "2025-12-03"
lastmod: ""
tags: []
title: 'Eino: Callback Manual'
weight: 5
---

## Problem Statement

Components (including Lambdas) and Graph orchestration define business logic. Cross-cutting concerns like logging, tracing, metrics, and UI surfacing need an injection mechanism into Components (including Lambdas) and Graphs. Users may also need internal state exposure (e.g., DB name in `VikingDBRetriever`, temperature in `ArkChatModel`).

Callbacks enable both cross-cutting injection and mid-execution state exposure. Users provide and register callback handlers; Components/Graphs call them at defined timings with relevant information.

## Core Concepts

Entities in Eino (Components, Graph Nodes/Chain Nodes, Graph/Chain itself) trigger callbacks at defined timings (Callback Timing) by invoking user-provided handlers (Callback Handlers). They pass who is running (RunInfo) and what is happening (Callback Input/Output or streams).

### Triggering Entities

- Components (official types and user Lambdas)
- Graph Nodes (and Chain Nodes)
- Graph itself (and Chain)

All can inject cross-cutting concerns and expose intermediate state.

### Timings

```go
type CallbackTiming = callbacks.CallbackTiming

const (
    TimingOnStart
    TimingOnEnd
    TimingOnError
    TimingOnStartWithStreamInput
    TimingOnEndWithStreamOutput
)
```

Entity type and execution mode determine whether OnStart vs OnStartWithStreamInput (and similarly for end). See triggering rules below.

### Handler Interface

```go
type Handler interface {
    OnStart(ctx context.Context, info *RunInfo, input CallbackInput) context.Context
    OnEnd(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context
    OnError(ctx context.Context, info *RunInfo, err error) context.Context
    OnStartWithStreamInput(ctx context.Context, info *RunInfo, input *schema.StreamReader[CallbackInput]) context.Context
    OnEndWithStreamOutput(ctx context.Context, info *RunInfo, output *schema.StreamReader[CallbackOutput]) context.Context
}
```

Each method receives:

- `context.Context`: carries data across timings within the same handler
- `RunInfo`: metadata of the running entity
- `Input/Output` or `InputStream/OutputStream`: business information at the timing

All return a context for passing info across timings for the same handler.

Use builders/helpers to focus on subsets:

- `NewHandlerBuilder().OnStartFn(...).Build()` to handle selected timings only
- `NewHandlerHelper().ChatModel(...).Handler()` to target specific component types and get typed inputs/outputs

Handlers have no guaranteed ordering.

### RunInfo

```go
type RunInfo struct {
    Name      string               // user-specified name with business meaning
    Type      string               // specific implementation type (e.g., OpenAI)
    Component components.Component // abstract component type (e.g., ChatModel)
}
```

- Name: user-specified
  - Component: Node Name in Graph; manual when used standalone
  - Graph Node: Node Name (set via `WithNodeName(n string)`)
  - Graph: Graph Name for top-level (set via `WithGraphName(name string)`); node name when nested
- Type: provider decides
  - Interface components: `GetType()` if `Typer` implemented; fallback to reflection
  - Lambda: `WithLambdaType` or empty
  - Graph Node: type of internal component/lambda/graph
  - Graph itself: empty
- Component: abstract type (ChatModel/Lambda/Graph; Graph/Chain/Workflow for graph itself)

### Callback Input & Output

Types vary per component.

```go
type CallbackInput any
type CallbackOutput any
```

Example for ChatModel:

```go
type CallbackInput struct {
    Messages []*schema.Message
    Tools    []*schema.ToolInfo
    Config   *Config
    Extra    map[string]any
}

type CallbackOutput struct {
    Message    *schema.Message
    Config     *Config
    TokenUsage *TokenUsage
    Extra      map[string]any
}
```

Providers should pass typed inputs/outputs to expose richer state. Graph Nodes only have component interface-level inputs/outputs; they cannot access internal provider state.

Graph itself uses graph-level input/output.

## Injecting Handlers

### Global Handlers

Use `callbacks.AppendGlobalHandlers` to register. Suitable for universal concerns (tracing, logging). Not concurrency-safe; register at service init.

### Handlers in Graph Execution

- `compose.WithCallbacks` injects handlers for the current graph run (includes nested graphs and nodes)
- `compose.WithCallbacks(...).DesignateNode(...)` targets a specific top-level node (injects into a nested graph and its nodes when the node is a graph)
- `compose.WithCallbacks(...).DesignateNodeForPath(...)` targets a nested node by path

### Outside Graph

Use `InitCallbacks(ctx, info, handlers...)` to obtain a new context with handlers and RunInfo.

### Handler Inheritance

Child contexts inherit parent handlers. A graph run inherits handlers present in the incoming context.

## Injecting RunInfo

### Graph-Managed RunInfo

Graph injects RunInfo for all internal nodes automatically using child contexts.

### Outside Graph

Use `InitCallbacks(ctx, info, handlers...)` or `ReuseHandlers(ctx, info)` to set RunInfo with existing handlers.

## Triggering

### Component-level Callbacks

Providers should trigger `callbacks.OnStart/OnEnd/OnError/OnStartWithStreamInput/OnEndWithStreamOutput` inside component implementations. Example (Ark ChatModel):

```go
func (cm *ChatModel) Generate(ctx context.Context, in []*schema.Message, opts ...fmodel.Option) (outMsg *schema.Message, err error) {
    defer func() { if err != nil { _ = callbacks.OnError(ctx, err) } }()

    // assemble request config
    ctx = callbacks.OnStart(ctx, &fmodel.CallbackInput{ Messages: in, Tools: append(cm.rawTools), ToolChoice: nil, Config: reqConf })

    // invoke provider API and read response

    _ = callbacks.OnEnd(ctx, &fmodel.CallbackOutput{ Message: outMsg, Config: reqConf, TokenUsage: toModelCallbackUsage(outMsg.ResponseMeta) })
    return outMsg, nil
}

func (cm *ChatModel) Stream(ctx context.Context, in []*schema.Message, opts ...fmodel.Option) (outStream *schema.StreamReader[*schema.Message], err error) {
    defer func() { if err != nil { _ = callbacks.OnError(ctx, err) } }()

    // assemble request config
    ctx = callbacks.OnStart(ctx, &fmodel.CallbackInput{ Messages: in, Tools: append(cm.rawTools), ToolChoice: nil, Config: reqConf })

    // invoke provider API and convert response to StreamReader[model.CallbackOutput]
    _, sr = callbacks.OnEndWithStreamOutput(ctx, sr)

    return schema.StreamReaderWithConvert(sr, func(src *fmodel.CallbackOutput) (*schema.Message, error) {
        if src.Message == nil { return nil, schema.ErrNoValue }
        return src.Message, nil
    }), nil
}
```

### Graph/Node-level Callbacks

When a Component is orchestrated into a Graph Node, and the Component does not implement callbacks, the Node injects callback trigger points matching the Component’s streaming paradigm. For example, a ChatModelNode triggers OnStart/OnEnd around `Generate`, and OnStart/OnEndWithStreamOutput around `Stream`. Which timing is triggered depends on both Graph’s execution mode (Invoke/Stream/Collect/Transform) and the Component’s streaming support.

See [Streaming Essentials](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### Graph-level Callbacks

Graph triggers callbacks at its own start/end/error timings. If Graph is called via `Invoke`, it triggers `OnStart/OnEnd/OnError`. If called via `Stream/Collect/Transform`, it triggers `OnStartWithStreamInput/OnEndWithStreamOutput/OnError` because Graph internally always executes as `Invoke` or `Transform`. See [Streaming Essentials](/en/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

Note: Graph is also a component. Therefore, a graph callback is a special form of component callback. Per Node Callback semantics, when a node’s internal component (including a nested graph added via `AddGraphNode`) implements callback timings itself, the node reuses the component’s behavior and does not add duplicate node-level callbacks.

## Parsing Callback Input & Output

Underlying types are `any`, while specific components may pass their own typed inputs/outputs. Handler method parameters are `any` as well, so convert as needed.

```go
// ConvCallbackInput converts the callback input to the model callback input.
func ConvCallbackInput(src callbacks.CallbackInput) *CallbackInput {
    switch t := src.(type) {
    case *CallbackInput: // component implementation already passed typed *model.CallbackInput
       return t
    case []*schema.Message: // graph node injected callback passes ChatModel interface input: []*schema.Message
       return &CallbackInput{ Messages: t }
    default:
       return nil
    }
}

// ConvCallbackOutput converts the callback output to the model callback output.
func ConvCallbackOutput(src callbacks.CallbackOutput) *CallbackOutput {
    switch t := src.(type) {
    case *CallbackOutput: // component implementation already passed typed *model.CallbackOutput
       return t
    case *schema.Message: // graph node injected callback passes ChatModel interface output: *schema.Message
       return &CallbackOutput{ Message: t }
    default:
       return nil
    }
}
```

To reduce boilerplate, prefer helpers/builders when focusing on specific components or timings.

## Handler Implementation

### HandlerHelper

When a handler only targets specific component types (e.g., in ReAct scenarios focusing on ChatModel and Tool), use `HandlerHelper` to quickly create typed handlers:

```go
handler := NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
```

The `modelHandler` can use a typed helper for ChatModel callbacks:

```go
// ModelCallbackHandler is the handler for the model callback.
type ModelCallbackHandler struct {
    OnStart               func(ctx context.Context, runInfo *callbacks.RunInfo, input *model.CallbackInput) context.Context
    OnEnd                 func(ctx context.Context, runInfo *callbacks.RunInfo, output *model.CallbackOutput) context.Context
    OnEndWithStreamOutput func(ctx context.Context, runInfo *callbacks.RunInfo, output *schema.StreamReader[*model.CallbackOutput]) context.Context
    OnError               func(ctx context.Context, runInfo *callbacks.RunInfo, err error) context.Context
}
```

This encapsulation provides:

- Automatic filtering by component type (no need to switch on `RunInfo.Component`)
- Only the timings supported by ChatModel (drops `OnStartWithStreamInput`); implement any subset
- Typed `Input/Output` (`model.CallbackInput`, `model.CallbackOutput`) instead of `any`

`HandlerHelper` supports official components: ChatModel, ChatTemplate, Retriever, Indexer, Embedding, Document.Loader, Document.Transformer, Tool, ToolsNode. For Lambda/Graph/Chain, it filters by type but you still implement generic `callbacks.Handler` for timings and conversions:

```go
handler := NewHandlerHelper().Lambda(callbacks.Handler).Graph(callbacks.Handler).Handler()
```

### HandlerBuilder

If a handler needs to target multiple component types but only a subset of timings, use `HandlerBuilder`:

```go
handler := NewHandlerBuilder().OnStartFn(fn).Build()
```

## Usage Notes

- Prefer typed inputs/outputs for provider-specific handlers
- Use global handlers for common concerns; node-specific handlers for fine-grained control
- Remember handler order is unspecified; design idempotent handlers

### Best Practices

- In Graph: use Global Handlers; inject per-run handlers via `WithCallbacks`; target nodes via `DesignateNode` or `DesignateNodeForPath`.
- Outside Graph: use `InitCallbacks(ctx, runInfo, handlers...)` to inject RunInfo and Handlers; global handlers apply automatically.

```go
ctx = callbacks.InitCallbacks(ctx, runInfo, handlers...)
componentA.Invoke(ctx, input)
```

If `componentA` calls another `componentB` internally (e.g., ToolsNode calls Tool), switch `RunInfo` before invoking `componentB`:

```go
func ComponentARun(ctx, inputA) {
    // Reuse handlers (including global) and replace RunInfo
    ctx = callbacks.ReuseHandlers(ctx, newRunInfo)
    componentB.Invoke(ctx, inputB)
    
    // Replace both RunInfo and Handlers
    ctx = callbacks.InitCallbacks(ctx, newRunInfo, newHandlers...)
    componentB.Invoke(ctx, inputB)
}
```

<a href="/img/eino/graph_node_callback_run_place.png" target="_blank"><img src="/img/eino/graph_node_callback_run_place.png" width="100%" /></a>

### Read/Write Input & Output Carefully

Inputs/outputs flow by direct assignment; pointers/maps refer to the same data across nodes and handlers. Avoid mutations inside nodes and handlers to prevent race conditions.

<a href="/img/eino/eino_callback_start_end_place.png" target="_blank"><img src="/img/eino/eino_callback_start_end_place.png" width="60%" /></a>

### Stream Closing

With true streaming components (e.g., ChatModel streams), callback consumers and downstream nodes both consume the stream. Streams are copied per consumer; ensure callback readers close their streams to avoid blocking resource release.

<a href="/img/eino/graph_stream_chunk_copy.png" target="_blank"><img src="/img/eino/graph_stream_chunk_copy.png" width="100%" /></a>

### Passing Information Between Handlers

Use the returned `context.Context` to pass information across timings within the same handler (e.g., set with `context.WithValue` in `OnStart`, read in `OnEnd`). Do not rely on ordering between different handlers; if sharing data is required, store request-scoped shared state on the outermost context and ensure concurrency safety.
