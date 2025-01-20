---
Description: ""
date: "2025-01-15"
lastmod: ""
tags: []
title: 'Eino: 公共切面 - Callbacks'
weight: 0
---

## 切面

Eino 切面(Eino Callback)是 Eino 框架对开发提供的扩展 Eino 框架，丰富横向治理的能力

可以从以下几个方面，认识 Eino 切面：

- 切面位置：即能在哪些点位添加切面逻辑
- 切面注入：可通过哪些方式，注入对应的切面逻辑
- 切面角色
  - 切面机制：由 Eino 框架提供了，扩展 Eino 自身功能的机制
  - 切面扩展者：基于 Eino 的扩展能力，设计和提供各种各样的独立于 Graph 执行的扩展能力
    - 例如：Fornax Trace、Fornax 指标 等
  - 切面使用者：真正使用切面扩展能力的终端业务
    - 例如：针对业务编排的 Graph 图，添加 Fornax Trace、Fornax 指标 两种切面能力。方便对编排产物的执行进行观测

### 切面位置

![](/img/eino/callback_in_graph.png)

- 组件切面(Component Callback)：组件自带的切面
  - 实现在组件内部的切面执行点位，而不是在加入到 Node 时，由 Node 在组件之外添加的切面点位
  - 组件切面既可应用于 **Graph 编排场景**，也可应用于**组件的独立使用**场景
  - 组件切面、节点切面一般二选一。
    - 当组件声明自己提供组件切面时，节点切面会被自动关闭。
- 节点切面(Node Callback)：组件加入到节点时，由 Node 在组件之外添加的切面点位
  - 由于是在组件之外，只能见到组件的 input/output，无法感知组件运行时的内部状态
  - 仅可应用于 **Graph 编排场景**，在组件独立使用时，无法生效
- 图切面(Graph Callback)：把整张图视为一个整体，在图的前后添加的切面点位

切面生效位置有三种：

- **所有图**的 Graph Callback 和 Node Callback 生效
- **指定图及其嵌套子图**的 Graph Callback 和 Node Callback 生效
- **指定图的指定节点**的 Node Callback 生效

### 切面注入

切面的注入方式，有以下三种：

- 全局注入：对所有图的所有节点生效
- 请求粒度注入：在请求时注入，仅对本次请求所经过的节点均生效
- 组件实例注入：针对实现了 Component Callback 的组件，可针对该组件实例，单独注入切面

> 注意：不同的注入时机，其对应的 Callback 的生效位置有所不同

#### 全局注入(进程粒度)

- 生效位置： **所有图**的所有节点或组件的 Callback 均生效 + 所有图的 Graph Callback 生效
  - 针对节点、组件哪一个生效的问题，取决于组件是否声明自己实现了 Component Callback。若声明，则仅 Component Callback 生效；若未声明，则 Node Callback 生效
- 生效时机： Graph 编译产物的**任意一次执行**
- 注入方式：
  - 通过 callbacks.InitCallbackHandlers() 注入。一个进程中，仅最后一次调用生效。建议放在 main 入口函数中进行初始化

```go
import "github.com/cloudwego/eino/callbacks"

func main() {
    // 设置全局生效的 Callback Handlers。
    // 一个进程内仅最后一次调用的 callbacks.InitCallbackHandlers() 会生效
    callbacks.InitCallbackHandlers([]callbacks.Handler{&loggerCallbacks{}})
}

type loggerCallbacks struct{
    *callbacks.HandlerBuilder
}

func (l *loggerCallbacks) OnStart(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
    logs.Infof("name: %v, type: %v, component: %v, input: %v", info.Name, info.Type, info.Component, input)
    return ctx
}

func (l *loggerCallbacks) OnEnd(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
    logs.Infof("name: %v, type: %v, component: %v, output: %v", info.Name, info.Type, info.Component, output)
    return ctx
}
```

#### 请求粒度注入

- 生效的切面位置： **本地调用涉及图及其嵌套子图**的 Graph Callback 和 Node Callback
- 生效时机： Graph 编译产物的本次调用
- 注入时机：
  - 调用 Graph 编译产物 Runnable 方法时，例如调用 Invoke()、Stream()方法，通过 Graph Call Option 传入。
  - GraphCallOption：compose.WithCallbacks(handler)

**Graph 示例：**

```go
package main

import (
    "context"

    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

func main() {

    ctx := context.Background()

    // create an instance of your implementation of callbacks.Handler
    handler := &callbacks.HandlerBuilder{}

    // create an instance of Graph
    // input type is 1st Graph Node's input type, that is ChatTemplate's input type: map[string]any
    // output type is last Graph Node's output type, that is ToolsNode's output type: []*schema.Message
    g := compose.NewGraph[[]*schema.Message, *schema.Message]()

    // add node and edge here
    // err = g.AddChatModelNode("chat_model", chatTpl)
    // if err != nil {
    //     logs.Errorf("AddChatTemplateNode failed, err=%v", err)
    //     return
    // }

    // compile Graph[I, O] to Runnable[I, O]
    r, err := g.Compile()
    if err != nil {
       logs.Errorf("Compile failed, err=%v", err)
       return
    }

    _, err = r.Invoke(ctx,
       []*schema.Message{
          schema.SystemMessage("you are a helpful assistant"),
          schema.UserMessage("我叫 zhangsan, 邮箱是 zhangsan@bytedance.com, 帮我推荐一处房产"),
       },
       compose.WithCallbacks(handler),
    )

    _, err = r.Stream(ctx, []*schema.Message{
       schema.SystemMessage("you are a helpful assistant"),
       schema.UserMessage("我叫 zhangsan, 邮箱是 zhangsan@bytedance.com, 帮我推荐一处房产"),
    },
       compose.WithCallbacks(handler),
    )
}
```

**Chain 示例：**

> 使用方式和 Graph 是一模一样的

```go
package main

import (
    "context"

    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/schema"
)

func main() {

    ctx := context.Background()

    // create an instance of your implementation of callbacks.Handler
    handler := &callbacks.HandlerBuilder{}

    // create an instance of Graph
    // input type is 1st Graph Node's input type, that is ChatTemplate's input type: map[string]any
    // output type is last Graph Node's output type, that is ToolsNode's output type: []*schema.Message
    ch := compose.NewChain[[]*schema.Message, *schema.Message]()

    // append node here
    // err = ch.AppendChatModel(chatTpl)
    // if err != nil {
    //     logs.Errorf("AddChatTemplateNode failed, err=%v", err)
    //     return
    // }

    // compile Graph[I, O] to Runnable[I, O]
    r, err := ch.Compile()
    if err != nil {
       logs.Errorf("Compile failed, err=%v", err)
       return
    }

    _, err = r.Invoke(ctx,
       []*schema.Message{
          schema.SystemMessage("you are a helpful assistant"),
          schema.UserMessage("我叫 zhangsan, 邮箱是 zhangsan@bytedance.com, 帮我推荐一处房产"),
       },
       compose.WithCallbacks(handler),
    )

    _, err = r.Stream(ctx, []*schema.Message{
       schema.SystemMessage("you are a helpful assistant"),
       schema.UserMessage("我叫 zhangsan, 邮箱是 zhangsan@bytedance.com, 帮我推荐一处房产"),
    },
       compose.WithCallbacks(handler),
    )

}
```

## 定制切面

从定制切面的场景出发，会有两种定制需求：

- **切面数据消费**：消费各切面点位上报的切面信息，实现业务定制化的横向治理能力
- **组件切面上报**：实现一个组件时，定制切面上报的点位，定制上报的切面数据内容

### 切面数据消费

1. 切面数据的消费接口定义
   - CallbackInput 在接口定义中是一个 any， 推荐采用组件抽象定义的结构体进行上报。以 model 组件为例，推荐使用 model.CallbackInput{}
   - CallbackOutput 同 CallbackInput，推荐采用组件抽象定义的结构体上报。
   - 采用推荐的预定义的结构体，有利于切面消费数据时，解析和理解数据内容

```go
// RunInfo is the info of run node.
type RunInfo struct {
    Name      string
    Type      string
    Component components.Component
}

// CallbackInput is the input of the callback.
// the type of input is defined by the component.
// using type Assert or convert func to convert the input to the right type you want.
// e.g.
//
//     CallbackInput in components/model/interface.go is:
//     type CallbackInput struct {
//        Messages []*schema.Message
//        Config   *Config
//        Extra map[string]any
//     }
//
//   and provide a func of model.ConvCallbackInput() to convert CallbackInput to *model.CallbackInput
//   in callback handler, you can use the following code to get the input:
//
//     modelCallbackInput := model.ConvCallbackInput(in)
//     if modelCallbackInput == nil {
//        // is not a model callback input, just ignore it
//        return
//     }
type CallbackInput any

type CallbackOutput any

type Handler interface {
    OnStart(ctx context.Context, info *RunInfo, input CallbackInput) context.Context
    OnEnd(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context

    OnError(ctx context.Context, info *RunInfo, err error) context.Context

    OnStartWithStreamInput(ctx context.Context, info *RunInfo,
       input *schema.StreamReader[CallbackInput]) context.Context
    OnEndWithStreamOutput(ctx context.Context, info *RunInfo,
       output *schema.StreamReader[CallbackOutput]) context.Context
}
```

1. 定义一个结构体，实现上面的 Handler 接口
   - **WARN****：OnStartWithStreamInput、OnEndWithStreamOutput 中的两个 input/output 流****必须要要关闭****，否则会导致流无法关闭回收，从而导致 Goroutine 或内存缓****慢泄露****。 **
     - 即在这两个函数中一定要调用：input.Close()、output.Close()
   - 考虑到用户可能仅消费部分接口，并且对应的两个流式接口又必须要求 Close()，推荐采用实例化 callbacks.HandlerBuilder{} 的方式，可选实现其中的某几个 OnXXXFn 字段

```go
import (
    "context"

    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/model"
)

var callbackHandler1 = &callbacks.HandlerBuilder{
    
    OnErrorFn: func(ctx context.Context, info *callbacks.RunInfo, err error) context.Context {
        return ctx
    },

    OnStartFn: func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
       // 以 ChatModel 为例，将 input 转换为 model.CallbackInput{}
       in := model.ConvCallbackInput(info)
       _ = in
       return ctx
    },

    OnStartWithStreamInputFn: func(ctx context.Context, info *callbacks.RunInfo, input *schema.StreamReader[callbacks.CallbackInput]) context.Context {
       // 必须要关闭这个流，否则会导致 Goroutine 溢出
       defer input.Close()
       // implement
       return ctx
    },

    OnEndWithStreamOutputFn: func(ctx context.Context, info *callbacks.RunInfo, output *schema.StreamReader[callbacks.CallbackOutput]) context.Context {
       // 必须要关闭这个流，否则会导致 Goroutine 溢出
       defer output.Close()
       // implement
       return ctx
    },
}
```

1. 按照 [切面注入](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callbacks_common_aspects)切面注入 章节，选择合适的方式，将定制的消费切面注入到 Graph/Chain 即可

#### WARN:Callback 流切记要 Close

以存在 ChatModel 这种具有真流输出的节点为例，当存在 Callback 切面时，ChatModel 的输出流：
- 既要被下游节点作为输入来消费，又要被 Callback 切面来消费
- 一个流中的一个帧(Chunk)，只能被一个消费方消费到，即流不是广播模型

所以此时需要将流进行复制，其复制关系如下：

![](/img/eino/stream_copy_in_callback.png)

- 如果其中一个 Callback n 没有 Close 对应的流，因此 Stream Coper 可能一直阻塞生产，无法退出，从而导致 Stream Coper 的资源无法及时释放。

### 组件切面上报

当用户定制实现一个组件时，可能因为需要 定制切面上报点位、定制切面上报内容等原因，导致不使用 Node Callback，而是选择定制实现 Component Callback。
- Node Callback 仅能上报组件抽象的输入输出信息，无法获取更多的组件内部信息。

组件切面定制上报逻辑的示例，以 ChatModel 为例:

```go
import (
    "context"
    "errors"
    "fmt"
    "io"
    "net/http"
    "runtime/debug"
    "time"


    "github.com/cloudwego/eino/callbacks"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)


type ChatModel struct {}

func (cm *ChatModel) Generate(ctx context.Context, in []*schema.Message, opts ...model.Option) (
    outMsg *schema.Message, err error) {

    var (
       // 从 ctx 中获取 Node 执行时，由 Eino 框架注入的 CallbackManager(cbm)
       cbm, cbmOK = callbacks.ManagerFromCtx(ctx)
    )

    defer func() {
       // 如果 cbm 存在，并且产生错误，则在此处上报错误信息
       if err != nil && cbmOK {
          _ = cbm.OnError(ctx, err)
       }
    }()

    // TODO: 在这里处理用户请求参数

    // 如果 cbm 存在，则在组件逻辑真正执行前，上报请求信息
    if cbmOK {
       ctx = cbm.OnStart(ctx, &model.CallbackInput{
          Messages: in,
          Config:   reqConf,
       })
    }

    resp, err := cm.cli.CreateChatCompletion(ctx, *req)
    if err != nil {
       return nil, err
    }

    // TODO: 在这里处理响应信息，并实现转换  

    // 在组件逻辑执行结束后，上报组件的处理结果
    if cbmOK {
       _ = cbm.OnEnd(ctx, &model.CallbackOutput{
          Message:    outMsg,
          Config:     reqConf,
          TokenUsage: usage,
       })
    }

    return outMsg, nil
}
```

注：当涉及到流式数据的切面上报时，需要将原来的流，Copy 出两份，一份作为输出，一份留作为 Callback 消费（CallbackManager 会根据 Callback Handler 的数量再次进行 Copy）。 针对流的相关操作，可参考 [Stream 流](/zh/docs/eino/overview) Stream 流 章节

## 常见问题

- 调试环境问题
- 采样率问题
- 为什么出现了 goroutine 泄露？
