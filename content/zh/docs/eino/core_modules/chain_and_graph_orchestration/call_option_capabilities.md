---
Description: ""
date: "2025-01-22"
lastmod: ""
tags: []
title: 'Eino: CallOption 能力与规范'
weight: 0
---

**CallOption**: 对 Graph 编译产物进行调用时，直接传递数据给特定的一组节点(Component、Implementation、Node)的渠道

- 和 节点 Config 的区别： 节点 Config 是实例粒度的配置，也就是从实例创建到实例消除，Config 中的值一旦确定就不需要改变了
- CallOption：是请求粒度的配置，不同的请求，其中的值是不一样的。更像是节点入参，但是这个入参是直接由 Graph 的入口直接传入，而不是上游节点传入。
  - 举例：给一个 ChatModel 节点传入 Temperature 配置；给一个 Lambda 节点传入自定义 option。

## 组件 CallOption 形态

组件 CallOption 配置，有两个粒度：

- 组件的抽象(Abstract/Interface)统一定义的 CallOption 配置【组件抽象 CallOption】
- 组件的实现(Type/Implementation)定义的该类型组件专用的 CallOption 配置【组件实现 CallOption】

以 ChatModel 这个 Component 为例，介绍 CallOption 的形态

### Model 抽象与实现的目录

```
// 抽象所在代码位置
eino/components/model
├── interface.go
├── option.go // Component 抽象粒度的 CallOption 入参

// 抽象实现所在代码位置
eino-ext/components/model
├── claude
│   ├── option.go // Component 的一种实现的 CallOption 入参
│   └── chatmodel.go
├── ollama
│   ├── call_option.go // Component 的一种实现的 CallOption 入参
│   ├── chatmodel.go
```

### Model 抽象

如上所述，在定义组件的 CallOption 时，需要区分【组件抽象 CallOption】、【组件实现 CallOption】两种场景。 而是否要提供 【组件实现 CallOption】，则是由 组件抽象 来决定的。

组件抽象提供的 CallOption 扩展能力如下（以 Model 为例，其他组件类似）：

```go
package model

type ChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
       *schema.StreamReader[*schema.Message], error)

    // BindTools bind tools to the model.
    // BindTools before requesting ChatModel generally.
    // notice the non-atomic problem of BindTools and Generate.
    BindTools(tools []*schema.ToolInfo) error
}

// 此结构体是【组件抽象CallOption】的统一定义。 组件的实现可根据自己的需要取用【组件抽象CallOption】的信息
// Options is the common options for the model.
type Options struct {
    // Temperature is the temperature for the model, which controls the randomness of the model.
    Temperature *float32
    // MaxTokens is the max number of tokens, if reached the max tokens, the model will stop generating, and mostly return an finish reason of "length".
    MaxTokens *int
    // Model is the model name.
    Model *string
    // TopP is the top p for the model, which controls the diversity of the model.
    TopP *float32
    // Stop is the stop words for the model, which controls the stopping condition of the model.
    Stop []string
}

// Option is the call option for ChatModel component.
type Option struct {
    // 此字段是为【组件抽象CallOption】服务的 apply 方法，例如 WithTemperature
    // 如果组件抽象不想提供【组件抽象CallOption】，可不提供此字段，同时不提供 GetCommonOptions() 方法
    apply func(opts *Options)
    
    // 此字段是为【组件实现CallOption】服务的 apply 方法。并假设 apply 方法为：func(*T)
    // 如果组件抽象不想提供【组件实现CallOption】，可不提供此字段，同时不提供 GetImplSpecificOptions() 方法
    implSpecificOptFn any
}

// WithTemperature is the option to set the temperature for the model.
func WithTemperature(temperature float32) Option {
    return Option{
       apply: func(opts *Options) {
          opts.Temperature = &temperature
       },
    }
}

// WithMaxTokens is the option to set the max tokens for the model.
func WithMaxTokens(maxTokens int) Option {
    return Option{
       apply: func(opts *Options) {
          opts.MaxTokens = &maxTokens
       },
    }
}

// WithModel is the option to set the model name.
func WithModel(name string) Option {
    return Option{
       apply: func(opts *Options) {
          opts.Model = &name
       },
    }
}

// WithTopP is the option to set the top p for the model.
func WithTopP(topP float32) Option {
    return Option{
       apply: func(opts *Options) {
          opts.TopP = &topP
       },
    }
}

// WithStop is the option to set the stop words for the model.
func WithStop(stop []string) Option {
    return Option{
       apply: func(opts *Options) {
          opts.Stop = stop
       },
    }
}

// GetCommonOptions extract model Options from Option list, optionally providing a base Options with default values.
func GetCommonOptions(base *Options, opts ...Option) *Options {
    if base == nil {
       base = &Options{}
    }

    for i := range opts {
       opt := opts[i]
       if opt.apply != nil {
          opt.apply(base)
       }
    }

    return base
}

// 组件实现方基于此方法，封装自己的Option函数：func WithXXX(xxx string) Option{}
func WrapImplSpecificOptFn[T any](optFn func(*T)) Option {
    return Option{
       implSpecificOptFn: optFn,
    }
}

// GetImplSpecificOptions provides tool author the ability to extract their own custom options from the unified Option type.
// T: the type of the impl specific options struct.
// This function should be used within the tool implementation's InvokableRun or StreamableRun functions.
// It is recommended to provide a base T as the first argument, within which the tool author can provide default values for the impl specific options.
func GetImplSpecificOptions[T any](base *T, opts ...Option) *T {
    if base == nil {
       base = new(T)
    }

    for i := range opts {
       opt := opts[i]
       if opt.implSpecificOptFn != nil {
          optFn, ok := opt.implSpecificOptFn.(func(*T))
          if ok {
             optFn(base)
          }
       }
    }

    return base
}
```

### Claude 实现

[https://github.com/cloudwego/eino-ext/blob/main/components/model/claude/option.go](https://github.com/cloudwego/eino-ext/blob/main/components/model/claude/option.go)

```go
package claude

import (
    "github.com/cloudwego/eino/components/model"
)

type options struct {
    TopK *int32
}

func WithTopK(k int32) model.Option {
    return model.WrapImplSpecificOptFn(func(o *options) {
       o.TopK = &k
    })
}
```

[https://github.com/cloudwego/eino-ext/blob/main/components/model/claude/claude.go](https://github.com/cloudwego/eino-ext/blob/main/components/model/claude/claude.go)

```go
func (c *claude) genMessageNewParams(input []*schema.Message, opts ...model.Option) (anthropic.MessageNewParams, error) {
    if len(input) == 0 {
       return anthropic.MessageNewParams{}, fmt.Errorf("input is empty")
    }

    commonOptions := model.GetCommonOptions(&model.Options{
       Model:       &c.model,
       Temperature: c.temperature,
       MaxTokens:   &c.maxTokens,
       TopP:        c.topP,
       Stop:        c.stopSequences,
    }, opts...)
    claudeOptions := model.GetImplSpecificOptions(&options{TopK: c.topK}, opts...)
    
    // omit mulple lines...
    return nil, nil 
}
```

## 编排中的 CallOption

[https://github.com/cloudwego/eino/blob/main/compose/runnable.go](https://github.com/cloudwego/eino/blob/main/compose/runnable.go)

Graph 编译产物是 Runnable

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

Runnable 各方法均接收 compose.Option 列表。

[https://github.com/cloudwego/eino/blob/main/compose/graph_call_options.go](https://github.com/cloudwego/eino/blob/main/compose/graph_call_options.go)

包括 graph run 整体的配置，各类组件的配置，特定 Lambda 的配置等。

```go
// Option is a functional option type for calling a graph.
type Option struct {
    options []any
    handler []callbacks.Handler

    paths []*NodePath

    maxRunSteps int
}

// DesignateNode set the key of the node which will the option be applied to.
// notice: only effective at the top graph.
// e.g.
//
//  embeddingOption := compose.WithEmbeddingOption(embedding.WithModel("text-embedding-3-small"))
//  runnable.Invoke(ctx, "input", embeddingOption.DesignateNode("my_embedding_node"))
func (o Option) DesignateNode(key ...string) Option {
    nKeys := make([]*NodePath, len(key))
    for i, k := range key {
       nKeys[i] = NewNodePath(k)
    }
    return o.DesignateNodeWithPath(nKeys...)
}

// DesignateNodeWithPath sets the path of the node(s) to which the option will be applied to.
// You can make the option take effect in the subgraph by specifying the key of the subgraph.
// e.g.
// DesignateNodeWithPath({"sub graph node key", "node key within sub graph"})
func (o Option) DesignateNodeWithPath(path ...*NodePath) Option {
    o.paths = append(o.paths, path...)
    return o
}

// WithEmbeddingOption is a functional option type for embedding component.
// e.g.
//
//  embeddingOption := compose.WithEmbeddingOption(embedding.WithModel("text-embedding-3-small"))
//  runnable.Invoke(ctx, "input", embeddingOption)
func WithEmbeddingOption(opts ...embedding.Option) Option {
    return withComponentOption(opts...)
}
```

compose.Option 可以按需分配给 Graph 中不同的节点。

<a href="/img/eino/graph_runnable_after_compile.png" target="_blank"><img src="/img/eino/graph_runnable_after_compile.png" width="100%" /></a>

```go
// 所有节点都生效的 call option
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// 只对特定类型节点生效的 call option
compiledGraph.Invoke(ctx, input, WithChatModelOption(WithTemperature(0.5))

// 只对特定节点生效的 call option
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))

// 只对特定内部嵌套图或其中节点生效的 Call option
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNodeWithPath(NewNodePath("1", "2"))
```
