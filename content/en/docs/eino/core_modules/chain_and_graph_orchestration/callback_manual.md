---
Description: ""
date: "2025-12-11"
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

See [Streaming Essentials](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

### Graph-level Callbacks

Graph triggers callbacks at its own start/end/error timings. If Graph is called via `Invoke`, it triggers `OnStart/OnEnd/OnError`. If called via `Stream/Collect/Transform`, it triggers `OnStartWithStreamInput/OnEndWithStreamOutput/OnError` because Graph internally always executes as `Invoke` or `Transform`. See [Streaming Essentials](/docs/eino/core_modules/chain_and_graph_orchestration/stream_programming_essentials).

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

#### In Graph

- Actively use Global Handlers for always-on concerns.

```go
package main

import (
        "context"
        "log"

        "github.com/cloudwego/eino/callbacks"
        "github.com/cloudwego/eino/compose"
)

func main() {
        // Build a simple global handler
        handler := callbacks.NewHandlerBuilder().
                OnStartFn(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
                        log.Printf("[Global Start] component=%s name=%s input=%T", info.Component, info.Name, input)
                        return ctx
                }).
                OnEndFn(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
                        log.Printf("[Global End] component=%s name=%s output=%T", info.Component, info.Name, output)
                        return ctx
                }).
                OnErrorFn(func(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
                        log.Printf("[Global Error] component=%s name=%s err=%v", info.Component, info.Name, err)
                        return ctx
                }).
                Build()

        // Register as global callbacks (applies to all subsequent runs)
        callbacks.AppendGlobalHandlers(handler)

        // Example graph usage; the global handler will be invoked automatically
        g := compose.NewGraph[string, string]()
        // ... add nodes/edges ...
        r, _ := g.Compile(context.Background())
        _, _ = r.Invoke(context.Background(), "hello") // triggers global callbacks
}
```

- Inject per-run handlers with `WithCallbacks` and target nodes via `DesignateNode` or by path.

```go
package main

import (
        "context"

        "github.com/cloudwego/eino/callbacks"
        "github.com/cloudwego/eino/compose"
        "github.com/cloudwego/eino/components/prompt"
        "github.com/cloudwego/eino/schema"
)

func main() {
        ctx := context.Background()

        top := compose.NewGraph[map[string]any, []*schema.Message]()
        sub := compose.NewGraph[map[string]any, []*schema.Message]()
        _ = sub.AddChatTemplateNode("tmpl_nested", prompt.FromMessages(schema.FString, schema.UserMessage("Hello, {name}!")))
        _ = sub.AddEdge(compose.START, "tmpl_nested")
        _ = sub.AddEdge("tmpl_nested", compose.END)
        _ = top.AddGraphNode("sub_graph", sub)
        _ = top.AddEdge(compose.START, "sub_graph")
        _ = top.AddEdge("sub_graph", compose.END)
        r, _ := top.Compile(ctx)

        optGlobal := compose.WithCallbacks(
                callbacks.NewHandlerBuilder().OnEndFn(func(ctx context.Context, _ *callbacks.RunInfo, _ callbacks.CallbackOutput) context.Context { return ctx }).Build(),
        )
        optNode := compose.WithCallbacks(
                callbacks.NewHandlerBuilder().OnStartFn(func(ctx context.Context, _ *callbacks.RunInfo, _ callbacks.CallbackInput) context.Context { return ctx }).Build(),
        ).DesignateNode("sub_graph")
        optNested := compose.WithChatTemplateOption(
                prompt.WrapImplSpecificOptFn(func(_ *struct{}) {}),
        ).DesignateNodeWithPath(
                compose.NewNodePath("sub_graph", "tmpl_nested"),
        )

        _, _ = r.Invoke(ctx, map[string]any{"name": "Alice"}, optGlobal, optNode, optNested)
}
```

<a href="/img/eino/graph_node_callback_run_place.png" target="_blank"><img src="/img/eino/graph_node_callback_run_place.png" width="100%" /></a>

#### Outside Graph

This scenario: you do not use Graph/Chain/Workflow orchestration, but you directly call components like ChatModel/Tool/Lambda and still want callbacks to trigger.

You must manually set correct `RunInfo` and Handlers because there is no Graph to do it for you.

```go
package main

import (
        "context"

        "github.com/cloudwego/eino/callbacks"
        "github.com/cloudwego/eino/compose"
)

func innerLambda(ctx context.Context, input string) (string, error) {
        // As provider of ComponentB: ensure default RunInfo when entering the component (Name cannot default)
        ctx = callbacks.EnsureRunInfo(ctx, "Lambda", compose.ComponentOfLambda)
        ctx = callbacks.OnStart(ctx, input)
        out := "inner:" + input
        ctx = callbacks.OnEnd(ctx, out)
        return out, nil
}

func outerLambda(ctx context.Context, input string) (string, error) {
        // As provider of ComponentA: ensure default RunInfo when entering
        ctx = callbacks.EnsureRunInfo(ctx, "Lambda", compose.ComponentOfLambda)
        ctx = callbacks.OnStart(ctx, input)

        // Recommended: replace RunInfo before calling inner component, ensuring correct name/type/component
        ctxInner := callbacks.ReuseHandlers(ctx,
                &callbacks.RunInfo{Name: "ComponentB", Type: "Lambda", Component: compose.ComponentOfLambda},
        )
        out1, _ := innerLambda(ctxInner, input) // inner RunInfo.Name = "ComponentB"

        // Without replacement: framework clears RunInfo after a complete callback cycle; EnsureRunInfo adds defaults (Name empty)
        out2, _ := innerLambda(ctx, input) // inner RunInfo.Name == ""

        final := out1 + "|" + out2
        ctx = callbacks.OnEnd(ctx, final)
        return final, nil
}

func main() {
        // Standalone components outside graph: initialize RunInfo and Handlers
        h := callbacks.NewHandlerBuilder().Build()
        ctx := callbacks.InitCallbacks(context.Background(),
                &callbacks.RunInfo{Name: "ComponentA", Type: "Lambda", Component: compose.ComponentOfLambda},
                h,
        )

        _, _ = outerLambda(ctx, "ping")
}
```

Notes:

- Initialization: use `InitCallbacks` to set the first `RunInfo` and Handlers when using components outside graph/chain so subsequent components receive the full callback context.
- Internal calls: before Component A calls Component B, use `ReuseHandlers` to replace `RunInfo` (keeping existing handlers) so B receives correct `Type/Component/Name`.
- Without replacement: after a complete set of callbacks, Eino clears `RunInfo` from the current context; providers can call `EnsureRunInfo` to supply default `Type/Component` to keep callbacks working, but `Name` cannot be inferred and will be empty.

#### Component Nesting

Scenario: inside a component (e.g., a Lambda), manually call another component (e.g., ChatModel).

If the outer component’s context has handlers, the inner component receives the same handlers. To control whether the inner component triggers callbacks:

1) Want callbacks triggered: set `RunInfo` for the inner component using `ReuseHandlers`.

```go
package main

import (
        "context"

        "github.com/cloudwego/eino/callbacks"
        "github.com/cloudwego/eino/components"
        "github.com/cloudwego/eino/components/model"
        "github.com/cloudwego/eino/compose"
        "github.com/cloudwego/eino/schema"
)

// Outer lambda calls ChatModel inside
func OuterLambdaCallsChatModel(cm model.BaseChatModel) *compose.Lambda {
        return compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
                // 1) Reuse outer handlers and set RunInfo explicitly for the inner component
                innerCtx := callbacks.ReuseHandlers(ctx, &callbacks.RunInfo{
                        Type:      "InnerCM",
                        Component: components.ComponentOfChatModel,
                        Name:      "inner-chat-model",
                })

                // 2) Build input messages
                msgs := []*schema.Message{{Role: schema.User, Content: input}}

                // 3) Call ChatModel (inner implementation triggers its callbacks)
                out, err := cm.Generate(innerCtx, msgs)
                if err != nil {
                        return "", err
                }
                return out.Content, nil
        })
}
```

If the inner ChatModel’s `Generate` does not trigger callbacks, the outer component should trigger them around the inner call:

```go
func OuterLambdaCallsChatModel(cm model.BaseChatModel) *compose.Lambda {
        return compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
                // Reuse outer handlers and set RunInfo explicitly for inner component
                ctx = callbacks.ReuseHandlers(ctx, &callbacks.RunInfo{
                        Type:      "InnerCM",
                        Component: components.ComponentOfChatModel,
                        Name:      "inner-chat-model",
                })

                // Build input messages
                msgs := []*schema.Message{{Role: schema.User, Content: input}}

                // Explicitly trigger OnStart
                ctx = callbacks.OnStart(ctx, msgs)

                // Call ChatModel
                resp, err := cm.Generate(ctx, msgs)
                if err != nil {
                        // Explicitly trigger OnError
                        ctx = callbacks.OnError(ctx, err)
                        return "", err
                }

                // Explicitly trigger OnEnd
                ctx = callbacks.OnEnd(ctx, resp)

                return resp.Content, nil
        })
}
```

2) Do not want inner callbacks: assume the inner component implements `IsCallbacksEnabled()` returning true and calls `EnsureRunInfo`. By default, inner callbacks will trigger. To disable, pass a new context without handlers to the inner component:

```go
package main

import (
        "context"

        "github.com/cloudwego/eino/components/model"
        "github.com/cloudwego/eino/compose"
        "github.com/cloudwego/eino/schema"
)

func OuterLambdaNoCallbacks(cm model.BaseChatModel) *compose.Lambda {
        return compose.InvokableLambda(func(ctx context.Context, input string) (string, error) {
                // Use a brand-new context; do not reuse outer handlers
                innerCtx := context.Background()

                msgs := []*schema.Message{{Role: schema.User, Content: input}}
                out, err := cm.Generate(innerCtx, msgs)
                if err != nil {
                        return "", err
                }
                return out.Content, nil
        })
}
```

Sometimes you may want to disable a specific handler for inner components but keep others. Implement filtering by `RunInfo` inside that handler:

```go
package main

import (
        "context"
        "log"

        "github.com/cloudwego/eino/callbacks"
        "github.com/cloudwego/eino/components"
        "github.com/cloudwego/eino/compose"
)

// A selective handler: no-ops for the inner ChatModel (Type=InnerCM, Name=inner-chat-model)
func newSelectiveHandler() callbacks.Handler {
        return callbacks.
                NewHandlerBuilder().
                OnStartFn(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
                        if info != nil && info.Component == components.ComponentOfChatModel &&
                                info.Type == "InnerCM" && info.Name == "inner-chat-model" {
                                return ctx
                        }
                        log.Printf("[OnStart] %s/%s (%s)", info.Type, info.Name, info.Component)
                        return ctx
                }).
                OnEndFn(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
                        if info != nil && info.Component == components.ComponentOfChatModel &&
                                info.Type == "InnerCM" && info.Name == "inner-chat-model" {
                                return ctx
                        }
                        log.Printf("[OnEnd] %s/%s (%s)", info.Type, info.Name, info.Component)
                        return ctx
                }).
                Build()
}

// Composition example: outer call triggers; selective handler filters out inner ChatModel
func Example(cm model.BaseChatModel) (compose.Runnable[string, string], error) {
        handler := newSelectiveHandler()

        chain := compose.NewChain[string, string]().
                AppendLambda(OuterLambdaCallsChatModel(cm))

        return chain.Compile(
                context.Background(),
                compose.WithCallbacks(handler),
        )
}
```

### Read/Write Input & Output Carefully

Inputs/outputs flow by direct assignment; pointers/maps refer to the same data across nodes and handlers. Avoid mutations inside nodes and handlers to prevent race conditions.

<a href="/img/eino/eino_callback_start_end_place.png" target="_blank"><img src="/img/eino/eino_callback_start_end_place.png" width="60%" /></a>

### Stream Closing

With true streaming components (e.g., ChatModel streams), callback consumers and downstream nodes both consume the stream. Streams are copied per consumer; ensure callback readers close their streams to avoid blocking resource release.

<a href="/img/eino/graph_stream_chunk_copy.png" target="_blank"><img src="/img/eino/graph_stream_chunk_copy.png" width="100%" /></a>

### Passing Information Between Handlers

Use the returned `context.Context` to pass information across timings within the same handler (e.g., set with `context.WithValue` in `OnStart`, read in `OnEnd`). Do not rely on ordering between different handlers; if sharing data is required, store request-scoped shared state on the outermost context and ensure concurrency safety.
