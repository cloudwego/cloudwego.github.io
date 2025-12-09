---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino: CallOption Capabilities and Conventions'
weight: 6
---

**CallOption**: a request-scoped way to pass configuration directly to specific nodes (Component, Implementation, Node) when invoking a compiled Graph.

- Difference from node Config: node Config is instance-scoped (set at construction and stable across the instance’s lifetime).
- CallOption is request-scoped; values differ per request. Think of it as per-invocation arguments injected from the Graph entry rather than passed from an upstream node.
  - Example: set `Temperature` for a `ChatModel` node; pass custom options to a `Lambda` node.

## Component CallOption Shapes

Two granularities:

- Component-level common options defined by the abstract interface [Component-abstract CallOptions]
- Implementation-specific options defined by a concrete implementation [Component-impl CallOptions]

Using `ChatModel` to illustrate.

### Directory Layout

```
// Abstract
eino/components/model
├── interface.go
├── option.go // Component-abstract CallOptions

// Implementations
eino-ext/components/model
├── claude
│   ├── option.go // impl-specific CallOptions
│   └── chatmodel.go
├── ollama
│   ├── call_option.go // impl-specific CallOptions
│   ├── chatmodel.go
```

### Model Abstraction

When designing CallOptions, distinguish abstract vs implementation-specific options. The abstract component decides whether to expose impl-specific CallOptions.

```go
type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.StreamReader[*schema.Message], error)
    BindTools(tools []*schema.ToolInfo) error
}

// Abstract/common options
type Options struct {
    Temperature *float32
    MaxTokens *int
    Model *string
    TopP *float32
    Stop []string
}

type Option struct {
    apply func(opts *Options)          // for abstract/common options
    implSpecificOptFn any              // for impl-specific options (func(*T))
}

func WithTemperature(temperature float32) Option { return Option{ apply: func(o *Options){ o.Temperature = &temperature } } }
func WithMaxTokens(maxTokens int) Option         { return Option{ apply: func(o *Options){ o.MaxTokens   = &maxTokens } } }
func WithModel(name string) Option               { return Option{ apply: func(o *Options){ o.Model       = &name } } }
func WithTopP(topP float32) Option               { return Option{ apply: func(o *Options){ o.TopP        = &topP } } }
func WithStop(stop []string) Option              { return Option{ apply: func(o *Options){ o.Stop        = stop } } }

func GetCommonOptions(base *Options, opts ...Option) *Options {
    if base == nil { base = &Options{} }
    for i := range opts { if f := opts[i].apply; f != nil { f(base) } }
    return base
}

func WrapImplSpecificOptFn[T any](optFn func(*T)) Option { return Option{ implSpecificOptFn: optFn } }

func GetImplSpecificOptions[T any](base *T, opts ...Option) *T {
    if base == nil { base = new(T) }
    for i := range opts {
        if optFn, ok := opts[i].implSpecificOptFn.(func(*T)); ok { optFn(base) }
    }
    return base
}
```

### Example: Claude Implementation

```go
type options struct { TopK *int32 }
func WithTopK(k int32) model.Option { return model.WrapImplSpecificOptFn(func(o *options){ o.TopK = &k }) }
```

Usage inside the provider:

```go
common := model.GetCommonOptions(&model.Options{ Model:&c.model, Temperature:c.temperature, MaxTokens:&c.maxTokens, TopP:c.topP, Stop:c.stopSequences }, opts...)
claude := model.GetImplSpecificOptions(&options{ TopK:c.topK }, opts...)
```

## CallOptions in Orchestration

Compiled graphs implement `Runnable`:

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (O, error)
    Stream(ctx context.Context, input I, opts ...Option) (*schema.StreamReader[O], error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (O, error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (*schema.StreamReader[O], error)
}
```

Each method accepts `compose.Option`, which can include:

- Graph-run global options (e.g., callbacks)
- Component-specific options (abstract or impl-specific)
- Node-targeted options

These options are propagated to matching nodes during execution — globally, by component type, or by designated node — giving fine-grained per-request control without mutating instance configs.

```go
// Option is a functional option type for calling a graph.
type Option struct {
    options []any
    handler []callbacks.Handler
    paths   []*NodePath
    maxRunSteps int
}

// DesignateNode sets the key of the node(s) to which the option will be applied.
// Only effective at the top graph.
// e.g.
//  embeddingOption := compose.WithEmbeddingOption(embedding.WithModel("text-embedding-3-small"))
//  runnable.Invoke(ctx, "input", embeddingOption.DesignateNode("my_embedding_node"))
func (o Option) DesignateNode(key ...string) Option {
    nKeys := make([]*NodePath, len(key))
    for i, k := range key { nKeys[i] = NewNodePath(k) }
    return o.DesignateNodeWithPath(nKeys...)
}

// DesignateNodeWithPath sets the path of the node(s) to which the option will be applied.
// You can make the option take effect in a subgraph by specifying the key of the subgraph.
// e.g. DesignateNodeWithPath({"sub graph node key", "node key within sub graph"})
func (o Option) DesignateNodeWithPath(path ...*NodePath) Option {
    o.paths = append(o.paths, path...)
    return o
}

// WithEmbeddingOption is a functional option for embedding component.
// e.g.
//  embeddingOption := compose.WithEmbeddingOption(embedding.WithModel("text-embedding-3-small"))
//  runnable.Invoke(ctx, "input", embeddingOption)
func WithEmbeddingOption(opts ...embedding.Option) Option { return withComponentOption(opts...) }
```

compose.Option can be targeted to different nodes in the Graph as needed:

```go
// call option effective for all nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// call option effective for specific component types
compiledGraph.Invoke(ctx, input, WithChatModelOption(WithTemperature(0.5)))
compiledGraph.Invoke(ctx, input, WithToolOption(WithXXX("xxx")))

// call option effective for a specific node
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))

// call option effective for specific nested subgraph or its node(s)
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNodeWithPath(NewNodePath("1", "2")))
```

<a href="/img/eino/graph_runnable_after_compile.png" target="_blank"><img src="/img/eino/graph_runnable_after_compile.png" width="100%" /></a>
