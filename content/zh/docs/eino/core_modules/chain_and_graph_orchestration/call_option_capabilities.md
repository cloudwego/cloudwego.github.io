---
Description: ""
date: "2025-01-15"
lastmod: ""
tags: []
title: 'Eino: CallOption 能力与规范'
weight: 0
---

**CallOption**: 对 Graph 编译产物进行调用时，直接传递数据给特定的一组节点(Component、Implementation、Node)的渠道
- 和 节点 Config 的区别： 节点 Config 是实例粒度的配置，也就是从实例创建到实例消除，Config 中的值一旦确定就不需要改变了
- CallOption：是请求粒度的配置，不同的请求，其中的值是不一样的。更像是节点入参，但是这个入参是直接由 Graph 的入口直接传入，而不是上游节点传入。
- 举例：LarkDocLoader 中，需要提供请求粒度的  RefreshToken，这个 RefreshToken 每个用户每次使用后，都需要更换

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
├── maas
│   ├── call_option.go
│   └── Implementation.go
├── openai
│   ├── call_option.go // Component 的一种实现的 CallOption 入参
│   ├── Implementation.go
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
type Options struct {
    Temperature float32
    MaxTokens   int
    Model       string
    TopP        float32   
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

func WithTemperature(temperature float32) Option {
    return Option{
       apply: func(opts *Options) {
          opts.Temperature = temperature
       },
    }
}

func WithMaxTokens(maxTokens int) Option {
    return Option{
       apply: func(opts *Options) {
          opts.MaxTokens = maxTokens
       },
    }
}

func WithModel(name string) Option {
    return Option{
       apply: func(opts *Options) {
          opts.Model = name
       },
    }
}

func WithTopP(topP float32) Option {
    return Option{
       apply: func(opts *Options) {
          opts.TopP = topP
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

### OpenAI 实现

> 组件的实现均类似 OpenAI 的实现
>
> 注：此处为样例，eino-ext/components/model 中暂时没有此场景

```go
package openai

import (
    "github.com/cloudwego/eino/components/model"
)

// openAIOptions 实现粒度的 CallOption 配置
type requestOptions struct {
    APIKey          string
    Stop            []string
    PresencePenalty float32
}

// openai 下的 WithXX() 方法，只能对 openai 这一种实现生效
func WithAPIKey(apiKey string) model.Option {
    return model.WrapImplSpecificOptFn[requestOptions](func(o *requestOptions) {
       o.APIKey = apiKey
    })
}

func WithStop(stop []string) model.Option {
    return model.WrapImplSpecificOptFn[requestOptions](func(o *requestOptions) {
       o.Stop = stop
    })
}

func WithPresencePenalty(presencePenalty float32) model.Option {
    return model.WrapImplSpecificOptFn[requestOptions](func(o *requestOptions) {
       o.PresencePenalty = presencePenalty
    })
}
```

model/openai/Implementation.go

```go
type ChatModel struct {}

func (cm *ChatModel) Generate(ctx context.Context, in []*schema.Message, opts ...model.Option) (
    
    cmOpts := model.GetCommonOptions(&model.Options{
        Model:       "gpt-3.5-turbo",
        MaxTokens:   1024,
        Temperature: 0.7,
    }, opts...)
    
    implOpts := model.GetImplSpecificOptions[requestOptions](&requestOptions{
        Stop:            nil,
        PresencePenalty: 1,
    }, opts...)
    
    // 在这里开发 OpenAI 的 Model 逻辑
    _ = cmOpts
    _ = implOpts
}

func (cm *ChatModel) Stream(ctx context.Context, in []*schema.Message,
    opts ...model.Option) (outStream *schema.StreamReader[*schema.Message], err error) {
    // 同 Generate 接口
}
```

### Graph 编译产物

> Graph 的编译产物是 Runnable[I, O]

option.go

```go
type Option struct {
    options     []any
    nodeHandler []callbacks.Handler
    keys        []string

    graphHandler []callbacks.Handler
    graphOption  []GraphRunOption
}

// 可指定 NodeKey 定点生效 CallOption
func (o Option) DesignateNode(key ...string) Option {
    o.keys = append(o.keys, key...)
    return o
}

func WithChatModelOption(opts ...model.Option) Option {
    o := make([]any, 0, len(opts))
    for i := range opts {
       o = append(o, opts[i])
    }
    return Option{
       options: o,
       keys:    make([]string, 0),
    }
}
```

runnable.go

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

Graph 调用

```go
g := NewGraph[map[string]any, *schema.Message]()

_nodeOfModel := &openai.ChatModel{}_

err = g.AddChatModelNode("openAIModel", _nodeOfModel_)

r, err := g.Compile()

// 默认情况下，WithXXX() 的 Option 方法是按照 Component 的类型进行分发的
// 同一个 WithXXX() 会对同一种 Component 的不同实例同时生效
// 必要情况下可通过指定 NodeKey，仅针对一个 Node 生效 WithXXX() 方法
out, err = r.Invoke(ctx, in, WithChatModelOption(
                openai.WithAKSK("ak", "sk"),
                openai.WithURL("url"),             
            ),
            // 这组 CallOption 仅针对 openAIModel 这个节点生效
            WithChatModelOption(
                model.WithModel("gpt-3.5-turto"), 
                openai.WithAPIKey("xxxx"),          
            ).DesignateNode("openAIModel"),
    )
```

## 编排中的 CallOption

CallOption 可以按需分配给 Graph 中不同的节点。

![](/img/eino/graph_runnable_after_compile.png)

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
