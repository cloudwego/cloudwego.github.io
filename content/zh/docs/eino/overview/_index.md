---
Description: ""
date: "2025-02-10"
lastmod: ""
tags: []
title: 'Eino: 概述'
weight: 1
---

## 简介

**Eino['aino]** (近似音: i know，希望应用程序达到 "i know" 的愿景) 旨在提供基于 Golang 语言的终极大模型应用开发框架。 它从开源社区中的诸多优秀 LLM 应用开发框架，如 LangChain 和 LlamaIndex 等获取灵感，同时借鉴前沿研究成果与实际应用，提供了一个强调简洁性、可扩展性、可靠性与有效性，且更符合 Go 语言编程惯例的 LLM 应用开发框架。

Eino 提供的价值如下：

- 精心整理的一系列 **组件（component）** 抽象与实现，可轻松复用与组合，用于构建 LLM 应用。
- 强大的 **编排（orchestration）** 框架，为用户承担繁重的类型检查、流式处理、并发管理、切面注入、选项赋值等工作。
- 一套精心设计、注重简洁明了的 **API**。
- 以集成 **流程（flow）** 和 **示例（example）** 形式不断扩充的最佳实践集合。
- 一套实用 **工具（DevOps tools）**，涵盖从可视化开发与调试到在线追踪与评估的整个开发生命周期。

Eino 可在 AI 应用开发周期中的不同阶段，规范、简化和提效：

- Development: 开箱即用的 AI 相关组件；常见的 Flow 范式；对并发、异步、流式友好的图编排；完善的流处理能力等。这些均可对 AI 应用的开发提供很大助力。
- Debugging: 可对图编排的应用，进行可视化的开发调试
- Deployment: 提供丰富的对 AI 应用的评测能力
- Maintenance: 提供丰富的切面对 AI 应用进行观测、监控

<a href="/img/eino/eino_project_structure_and_modules.png" target="_blank"><img src="/img/eino/eino_project_structure_and_modules.png" width="100%" /></a>

完整 API Reference：[https://pkg.go.dev/github.com/cloudwego/eino](https://pkg.go.dev/github.com/cloudwego/eino)

## 快速上手

直接使用组件：

```go
model, _ := openai.NewChatModel(ctx, config) // create an invokable LLM instance
message, _ := model.Generate(ctx, []*Message{
    SystemMessage("you are a helpful assistant."),
    UserMessage("what does the future AI App look like?")})
```

当然，你可以这样用，Eino 提供了许多开箱即用的有用组件。但通过使用编排功能，你能实现更多，原因有三：

- 编排封装了大语言模型（LLM）应用的常见模式。
- 编排解决了处理大语言模型流式响应这一难题。
- 编排为你处理类型安全、并发管理、切面注入以及选项赋值等问题。

Eino 提供了三组用于编排的 API：

<table>
<tr><td>API</td><td>特性和使用场景</td></tr>
<tr><td>Chain</td><td>简单的链式有向图，只能向前推进。</td></tr>
<tr><td>Graph</td><td>有向有环或无环图。功能强大且灵活。</td></tr>
<tr><td>Workflow</td><td>有向无环图，支持在结构体字段级别进行数据映射。</td></tr>
</table>

我们来创建一个简单的 chain: 一个模版（ChatTemplate）接一个大模型（ChatModel）。

<a href="/img/eino/chain_simple_llm.png" target="_blank"><img src="/img/eino/chain_simple_llm.png" width="100%" /></a>

```go
chain, _ := NewChain[map[string]any, *Message]().
           AppendChatTemplate(prompt).
           AppendChatModel(model).
           Compile(ctx)
chain.Invoke(ctx, map[string]any{"query": "what's your name?"})
```

现在，我们来创建一个 Graph，一个 ChatModel，要么直接输出结果，要么最多调一次 Tool。

<a href="/img/eino/eino_take_first_toolcall_output.png" target="_blank"><img src="/img/eino/eino_take_first_toolcall_output.png" width="100%" /></a>

```go
graph := NewGraph[map[string]any, *schema.Message]()

_ = graph.AddChatTemplateNode("node_template", chatTpl)
_ = graph.AddChatModelNode("node_model", chatModel)
_ = graph.AddToolsNode("node_tools", toolsNode)
_ = graph.AddLambdaNode("node_converter", takeOne)

_ = graph.AddEdge(START, "node_template")
_ = graph.AddEdge("node_template", "node_model")
_ = graph.AddBranch("node_model", branch)
_ = graph.AddEdge("node_tools", "node_converter")
_ = graph.AddEdge("node_converter", END)

compiledGraph, err := graph.Compile(ctx)
if err != nil {
    return err
}
out, err := compiledGraph.Invoke(ctx, map[string]any{"query":"Beijing's weather this weekend"})
```

现在，我们来创建一个 Workflow，它能在字段级别灵活映射输入与输出：

<a href="/img/eino/graph_node_type1.png" target="_blank"><img src="/img/eino/graph_node_type1.png" width="100%" /></a>

```go
wf := NewWorkflow[[]*Message, *Message]()
wf.AddChatModelNode("model", model).AddInput(NewMapping(START))
wf.AddLambdaNode("l1", lambda1).AddInput("model", MapFields("Content", "Input"))
wf.AddLambdaNode("l2", lambda2).AddInput("model", MapFields("Role", "Role"))
wf.AddLambdaNode("l3", lambda3).AddInput("l1", MapFields("Output", "Query")).
    AddInput("l2", MapFields("Output", "MetaData"))
wf.AddEnd("node_l3")
runnable, _ := wf.Compile(ctx)
runnable.Invoke(ctx, []*Message{UserMessage("kick start this workflow!")})
```

现在，咱们来创建一个 “ReAct” 智能体：一个 ChatModel 绑定了一些 Tool。它接收输入的消息，自主判断是调用 Tool 还是输出最终结果。Tool 的执行结果会再次成为聊天模型的输入消息，并作为下一轮自主判断的上下文。

我们用几十行代码就能实现这个：

```go
// build a ReAct agent that accepts []*Message as input and outputs *Message as output
func (r *Agent) build(ctx context.Context, config *AgentConfig) (
    _ Runnable[[]*Message, *Message], err error) {
    var (
       // the LLM responsible for reasoning and generating output within the ReAct Agent
       chatModel = config.Model
       // the actual executor of tools
       toolsNode *ToolsNode
       // the meta info of tools
       toolInfos []*schema.ToolInfo
       // the graph consist of the ChatModel and ToolsNode
       graph *Graph[[]*Message, *Message]
       // read and write contextual messages before ChatModel execution
       modelPreHandle StatePreHandler[[]*Message, *state]
       // after ChatModel execution, routes to END if output does not contain tool call info, otherwise routes to ToolsNode
       modelPostBranch *GraphBranch
    )

    if toolInfos, err = genToolInfos(ctx, config); err != nil {
       return nil, err
    }

    if err = chatModel.BindTools(toolInfos); err != nil {
       return nil, err
    }

    if toolsNode, err = NewToolNode(ctx, &config.ToolsConfig); err != nil {
       return nil, err
    }

    // creates a graph with state that stores messages across multiple rounds of ReAct loop
    graph = NewGraph[[]*Message, *Message](
       WithGenLocalState(func(ctx context.Context) *state {
          return &state{Messages: make([]*Message, 0, config.MaxStep+1)}
       }))

    modelPreHandle = func(ctx context.Context, input []*Message, state *state) (
       []*Message, error) {
       state.Messages = append(state.Messages, input...)

       modifiedInput := make([]*Message, 0, len(state.Messages))
       copy(modifiedInput, state.Messages)
       return config.MessageModifier(ctx, modifiedInput), nil // add system prompt
    }

    err = graph.AddChatModelNode(nodeKeyModel, chatModel, WithStatePreHandler(modelPreHandle))
    if err != nil {
       return nil, err
    }

    if err = graph.AddEdge(START, nodeKeyModel); err != nil { // chatModel connects to START because it accepts initial input
       return nil, err
    }

    if err = graph.AddToolsNode(nodeKeyTools, toolsNode); err != nil {
       return nil, err
    }

    // chatModel's output can be a stream with multiple chunks of messages
    // we use StreamGraphBranch here to make the routing decision based only on the first chunk 
    modelPostBranch = NewStreamGraphBranch(
       func(_ context.Context, sr *schema.StreamReader[*Message]) (endNode string, err error) {
          defer sr.Close()

          if msg, err := sr.Recv(); err != nil {
             return "", err
          } else if len(msg.ToolCalls) == 0 {
             return END, nil
          }

          return nodeKeyTools, nil
       }, map[string]bool{nodeKeyTools: true, END: true})
    if err = graph.AddBranch(nodeKeyModel, modelPostBranch); err != nil {
       return nil, err
    }

    if err = graph.AddEdge(nodeKeyTools, nodeKeyModel); err != nil { // toolsNode's output are fed back to chatModel
       return nil, err
    }

    // compile Graph to Runnable：do type check、inject callback aspects、automatic stream boxing and unboxing、generate graph runner, etc.
    return graph.Compile(ctx, WithMaxRunSteps(config.MaxStep))
}
```

Eino 会在上述代码背后自动完成一些重要工作：

- **类型检查**：在编译时确保两个节点的输入和输出类型匹配。
- **流处理**：如有需要，在将消息流传递给 ChatModel 和 ToolsNode 节点之前进行拼接，以及将该流复制到 callback handler 中。
- **并发管理**：由于 StatePreHandler 是线程安全的，共享的 state 可以被安全地读写。
- **切面注入**：如果指定的 ChatModel 实现未自行注入，会在 ChatModel 执行之前和之后注入回调切面。
- **选项赋值**：调用 Option 可以全局设置，也可以针对特定组件类型或特定节点进行设置。

例如，你可以轻松地通过回调扩展已编译的图：

```go
handler := NewHandlerBuilder().
  OnStartFn(
    func(ctx context.Context, info *RunInfo, input CallbackInput) context.Context) {
        log.Infof("onStart, runInfo: %v, input: %v", info, input)
    }).
  OnEndFn(
    func(ctx context.Context, info *RunInfo, output CallbackOutput) context.Context) {
        log.Infof("onEnd, runInfo: %v, out: %v", info, output)
    }).
  Build()
  
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))
```

或者你可以轻松地为不同节点分配选项：

```go
// assign to All nodes
compiledGraph.Invoke(ctx, input, WithCallbacks(handler))

// assign only to ChatModel nodes
compiledGraph.Invoke(ctx, input, WithChatModelOption(WithTemperature(0.5))

// assign only to node_1
compiledGraph.Invoke(ctx, input, WithCallbacks(handler).DesignateNode("node_1"))
```

## 关键特性

### 丰富的组件(Component)

- 将常见的构建模块抽象为**组件**，每个组件抽象都有多个可开箱即用的**组件实现**。
  - 诸如聊天模型（ChatModel）、工具（Tool）、提示模板（PromptTemplate）、检索器（Retriever）、文档加载器（Document Loader）、Lambda 等组件抽象。
  - 每种组件类型都有其自身的接口：定义了输入和输出类型、定义了选项类型，以及合理的流处理范式。
  - 实现细节是透明的。在编排组件时，你只需关注抽象层面。
- 实现可以嵌套，并包含复杂的业务逻辑。
  - ReAct 智能体（React Agent）、多查询检索器（MultiQueryRetriever）、主机多智能体（Host MultiAgent）等。它们由多个组件和复杂的业务逻辑构成。
  - 从外部看，它们的实现细节依然透明。例如在任何接受 Retriever 的地方，都可以使用 MultiQueryRetriever。

### 强大的编排 (Graph/Chain/Workflow)

- 数据从 Retriever / Document Loader / ChatTemplate 流向 ChatModel，接着流向 Tool ，并被解析为最终答案。这种通过多个组件的有向、可控的数据流，可以通过**图编排**来实现。
- 组件实例是图的**节点（Node）**，而**边（Edge）**则是数据流通道。
- 图编排功能强大且足够灵活，能够实现复杂的业务逻辑：
  - **类型检查、流处理、并发管理、切面注入和选项分配**都由框架处理。
  - 在运行时进行**分支（Branch）**执行、读写全局**状态（State）**，或者使用工作流进行字段级别的数据映射。

### 完善的流处理(Streaming)

- 流式处理（Stream Processing）很重要，因为 ChatModel 在生成消息时会实时输出消息块。
- 对于只接受非流式输入的下游节点（如 ToolsNode），Eino 会自动将流 **拼接（Concatenate）** 起来。
- 在 Graph 执行过程中，当需要流时，Eino 会自动将非流式**转换**为流式。
- 当多个流汇聚到一个下游节点时，Eino 会自动 **合并（Merge）** 这些流。
- 当流分散到不同的下游节点或传递给回调处理器时，Eino 会自动 **复制（Copy）** 这些流。
- 最重要的是，当将一个组件添加到图中时，Eino 会自动补充缺失的流处理能力：你可以提供一个仅可 Invoke 的函数，Eino 会创建其他三种范式。

<table>
<tr><td>函数名</td><td>模式说明</td><td>交互模式名称</td><td>Lambda 构造方法</td><td>说明</td></tr>
<tr><td>Invoke</td><td>输入非流式、输出非流式</td><td>Ping-Pong 模式</td><td>compose.InvokableLambda()</td><td></td></tr>
<tr><td>Stream</td><td>输入非流式、输出流式</td><td>Server-Streaming 模式</td><td>compose.StreamableLambda()</td><td></td></tr>
<tr><td>Collect</td><td>输入流式、输出非流式</td><td>Client-Streaming</td><td>compose.CollectableLambda()</td><td></td></tr>
<tr><td>Transform</td><td>输入流式、输出流式</td><td>Bidirectional-Streaming</td><td>compose.TransformableLambda()</td><td></td></tr>
</table>

### 高扩展性的切面(Callbacks)

- 切面用于处理诸如日志记录、追踪、指标统计等横切面关注点，同时也用于暴露组件实现的内部细节。
- 支持五种切面：**OnStart、OnEnd、OnError、OnStartWithStreamInput、OnEndWithStreamOutput**。
- 开发者可以轻松创建自定义回调处理程序，在图运行期间通过 Option 添加它们，这些处理程序会在图运行时被调用。
- 图还能将切面注入到那些自身不支持回调的组件实现中。

## Eino 框架结构

<a href="/img/eino/eino_structure.png" target="_blank"><img src="/img/eino/eino_structure.png" width="100%" /></a>

Eino 框架整体由两部分构成：

- Eino：存放 Eino 的组件抽象，Graph、Chain 等编排能力，切面机制等
- EinoExt：Eino 的组件实现、通用切面实现、组件使用示例等，以及 Eino 相关的开发、调试、评测等可视化、管理能力。可放置各种各样的 Eino 扩展能力

Eino Core 中的六大概念：

- Components 抽象
  - 每一种 Component 均有对应的接口抽象及其对应的多种实现。可直接使用、也可被编排
    - 编排时，对应节点的输入输出与接口抽象保持一致
  - 类似于 ChatModel、PromptTemplate、Retriever、Indexer 等开箱即用的原子组件
  - Eino 中 Component 概念较为宽松，任意满足如下职责中的一个，即可被称为 Component
    - 可加入 Graph Node，作为编排对象被编排
    - 作为其他编排对象的依赖注入组件
- Flow 集成组件
  - 基于框架中的 Component、Graph ，针对常见的应用场景，提供开箱即用的预先编排好的集成组件能力。
  - 可能提供再次被编排的能力
  - 例如：Agent、MapReduce 长文本总结、MultiAgent 等
- Runnable -- 用户弱感知
  - 编排框架中的编排对象和编排产物。
  - 所有的 Component 在被编排时，均需转换成 Runnable 对象，一般用户不可见此过程。
  - 一张图编译成可执行对象时，本质是一个 Runnable 对象
- Compose 编排
  - 将各种 Component 实例，作为 Node 节点，以图的点线关系连接起来，数据流按照有向边的方向进行传输，并在不同节点中执行。
  - 支持 Graph、Chain、Workflow 等多种编排形式，本质均是通过有向图表达数据流的传递和节点的执行顺序
- 切面能力
  - Graph 中每个节点执行前后提供的切面能力。
  - 例如：Trace、埋点、日志等
- Stream
  - 添加到 Node 中的组件实例，其输入、输出既有可能是 流、也有可能是 非流。 Compose 编排可以将这些不同形式的输入输出进行衔接，传递数据流并执行节点。 这个能力可称为流式编排能力
  - 例如，ChatModel 的输出、ASR 的输入输出 都是流式的

### Component

具体每种 Component 的职责，可具体看对应的接口定义

> 下文是示例性说明，不完整，以[代码仓库](https://github.com/cloudwego/eino-ext/tree/main/components)为准

```
eino/components // 组件根目录
├── document
│   ├── interface.go 
│   └── option.go
├── embedding
│   ├── callback_extra.go
│   ├── interface.go // 一个组件的抽象
│   ├── ark          // 与抽象同级的一个文件夹代表一种具体实现
│   ├── openai
│   └── option.go
├── indexer
│   ├── callback_extra.go
│   ├── interface.go
│   ├── option.go
│   └── volc_vikingdb
├── model
│   ├── callback_extra.go
│   ├── interface.go
│   ├── ark
│   ├── openai
│   └── option.go
├── prompt
│   ├── callback_extra.go
│   ├── chat_template.go
│   ├── chat_template_test.go
│   └── interface.go
├── retriever
│   ├── callback_extra.go
│   ├── interface.go
│   ├── option.go
│   └── volc_vikingdb
├── tool
│   ├── duckduckgo
│   ├── interface.go
│   └── option.go
├── types.go
```

### Runnable

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
    Collect(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output O, err error)
    Transform(ctx context.Context, input *schema.StreamReader[I], opts ...Option) (output *schema.StreamReader[O], err error)
}
```

- Runnable 抽象根据输入、输出是否为流式，划分成 4 个 Lamba 算子
- Compose 编排中，添加到 Node 中的组件实例，会被统一转换成上述的 Runnable 抽象
- 当一个 Component 转换为 Runnable 时，根据其提供的任意 Lambda 算子，结合着 流化(Streaming)、合并(Concat) 能力，补全剩余的未提供的 Lambda 算子
  - 流与非流间的转换： (用 StreamReader[T] 和 T 分别指代 流 和 非流)
    - 合并(Concat)
      - 将 StreamReader[T] 中的 T-Frame 接收完整，并合并成一个完整的 T
    - 流化(Streaming)
      - 将 T 转换成仅有一个 T-Frame 的 StreamReader[T]，进行流式传输
- 基于上述两种转换关系，Eino 便可根据用户提供的具有任意 N(N<=4) 种交互模式的接口，封装转换成一个完整的 Runnable[I, O]

<table>
<tr><td>源\目标</td><td>Invoke[I, O any]()</td><td>Stream[I, O any]()</td><td>Collect[I, O any]()</td><td>Transform[I, O any]()</td></tr>
<tr><td>Invoke[I, O any]()</td><td>-</td><td><li>Invoke输入直接透传</li><li>Invoke响应转成单帧流</li></td><td><li>Invoke输入转成单帧流</li><li>Invoke响应直接透传</li></td><td><li>Invoke输入转成单帧流</li><li>Invoke响应转成单帧流</li></td></tr>
<tr><td>Stream[I, O any]()</td><td><li>Stream输入直接透传</li><li>Stream输出Concat后透传</li></td><td>-</td><td><li>Stream输入转成单帧流</li><li>Stream输出Concat后透传</li></td><td><li>Stream输入转成单帧流</li><li>Stream输出直接透传</li></td></tr>
<tr><td>Collect[I, O any]()</td><td><li>Collect输入Concat后透传</li><li>Collect输出直接透传</li></td><td><li>Collect输入Concat后透传</li><li>Collect输出转成单帧流</li></td><td>-</td><td><li>Collect输入直接透传</li><li>Collect输出转成单帧流</li></td></tr>
<tr><td>Transform[I, O any]()</td><td><li>Transform输入Concat后透传</li><li>Transform输出Concat后透传</li></td><td><li>Transform输入Concat后透传</li><li>Transform输出直接透传</li></td><td><li>Transform输入直接透传</li><li>Transform输出Concat后透传</li></td><td>-</td></tr>
</table>

- 编程产物中具有的真正的流式能力是什么，取决于如下的编排范式

<a href="/img/eino/invoke_stream_transform_collect.png" target="_blank"><img src="/img/eino/invoke_stream_transform_collect.png" width="100%" /></a>

### Stream 流

Notice：Stream 流在 **生产**、**消费**、**复制**、**合并**、**转换**等场景下，处理逻辑均较为复杂。 实现时稍有考虑不周的地方，便可能导致 生产/消费者互相等待而夯死、Goroutine 泄露或溢出、内存泄露或溢出、CPU 负载高 等问题。 为了减少稳定性问题的产生，Eino 强要求使用 Eino 提供的 Stream 流，因此将 Stream 实现成了 Struct、而非定义成接口。

复杂的流操作的场景：

- 流式接口和非流式接口直接的转换
  - 流转成非流时，需要将流中的所有数据帧，Concat 成一个完整的数据结构
  - 非流转成流时，需要将一个数据结构转换成仅有一个数据帧的流
- 同一个数据流可能需要被多次读取和消费，比如多个切面。 因一个流仅能被完成读取一次，所以需要根据消费次数，将流进行 Copy
  - 流 Copy 时，需要考虑多个流的 消费协同、Close 协同。 任意一个流没有正常 Close，均可能导致资源无法正常释放
- 多个流合并成一个流

为了 Stream 的 API 接口更加清晰和易用，遂与 Golang 内置的 io.Pipe() 方法的定义对齐。

- API 接口定义为：`schema.Pipe[T any](cap int) (*StreamReader[T], *StreamWriter[T])`
  - 其中 cap 表示 Stream 的缓存有多大，即在无任何消费的情况下，Sender 可以无阻塞地发送 Chunk 的数量
  - `StreamWriter` 类似于 io.Pipe 中的 PipeWriter
  - `StreamReader` 类似于 io.Pipe 中的 PipeReader，只是多了一个 `Copy(n int) []*StreamReader[T]` 方法
- **WARN**：在任何地方见到 `*StreamReader[T]` 或 `*StreamWriter[T]` 都不要忘记 Close()，否则可能导致流无法正常释放。一般流的生产和消费都是单独 Goroutine，从而导致 Goroutine 的泄露。

Stream 流 的 API 设计，源码链接：[eino/schema/stream.go](https://github.com/cloudwego/eino/blob/main/schema/stream.go)

```go
// Pipe creates a new stream with the given capacity that represented with StreamWriter and StreamReader.
// The capacity is the maximum number of items that can be buffered in the stream.
// e.g.
//
//  sr, sw := schema.Pipe[string](3)
//  go func() { // send data
//     defer sw.Close()
//     for i := 0; i < 10; i++ {
//        sw.send(i, nil)
//     }
//  }
//
//  defer sr.Close()
//  for chunk, err := sr.Recv() {
//     if errors.Is(err, io.EOF) {
//        break
//     }
//     fmt.Println(chunk)
//  }
func Pipe[T any](cap int) (*StreamReader[T], *StreamWriter[T]) {
    stm := newStream[T](cap)
    return stm.asReader(), &StreamWriter[T]{stm: stm}
}

// StreamWriter the sender of a stream.
type StreamWriter[T any] struct {
    stm *stream[T]
}

func (sw *StreamWriter[T]) Send(chunk T, err error) (closed bool) {
    return sw.stm.send(chunk, err)
}

// Close notify the receiver that the stream sender has finished.
// The stream receiver will get an error of io.EOF from StreamReader.Recv().
func (sw *StreamWriter[T]) Close() {
    sw.stm.closeSend()
}

// StreamReader the receiver of a stream.
type StreamReader[T any] struct {}

func (sr *StreamReader[T]) Recv() (T, error) {}

// Close notify the sender that the stream receiver has finished.
// AKA: CloseRecv.
func (sr *StreamReader[T]) Close() {}

// Copy creates a slice of new StreamReader.
// The number of copies, indicated by the parameter n, should be a non-zero positive integer.
// The original StreamReader will become unusable after Copy.
func (sr *StreamReader[T]) Copy(n int) []*StreamReader[T] {}
```

### Compose 编排

#### Graph

##### 点(Node)

- 把一个 Component 实例加入到 Graph 中，便形成一个 Node 节点
- Component 即可被独立使用，又可被 Graph 编排
- Add{Component}Node() 接口列举。  此处仅列举几个接口，更详细接口列表可查看最新的 Eino SDK
  - 对于通用的组件类型，均会抽象出一个标准行为语义，并给出不同的实现
  - 业务可通过使用 AddLambdaNode，添加任意定制函数作为节点

```go
// AddChatModelNode add node that implements model.ChatModel.
func (g *graph) AddChatModelNode(key string, node model.ChatModel, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toChatModelNode(key, node, opts...))
}

// AddChatTemplateNode add node that implements prompt.ChatTemplate.
func (g *graph) AddChatTemplateNode(key string, node prompt.ChatTemplate, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toChatTemplateNode(key, node, opts...))
}

func (g *graph) AddToolsNode(key string, node *ToolsNode, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toToolsNode(key, node, opts...))
}

// AddLambdaNode add node that implements at least one of Invoke[I, O], Stream[I, O], Collect[I, O], Transform[I, O].
// due to the lack of supporting method generics, we need to use function generics to generate Lambda run as Runnable[I, O].
// for Invoke[I, O], use compose.InvokableLambda()
// for Stream[I, O], use compose.StreamableLambda()
// for Collect[I, O], use compose.CollectableLambda()
// for Transform[I, O], use compose.TransformableLambda()
// for arbitrary combinations of 4 kinds of lambda, use compose.AnyLambda()
func (g *graph) AddLambdaNode(key string, node *Lambda, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toLambdaNode(key, node, opts...))
}

// AddGraphNode add one kind of Graph[I, O]、Chain[I, O] as a node.
// for Graph[I, O], comes from NewGraph[I, O]()
// for Chain[I, O], comes from NewChain[I, O]()
func (g *graph) AddGraphNode(key string, node AnyGraph, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toAnyGraphNode(key, node, opts...))
}

func (g *graph) AddRetrieverNode(key string, node retriever.Retriever, opts ...GraphAddNodeOpt) error {
    return g.addNode(key, toRetrieverNode(key, node, opts...))
}
```

##### 线(Edge)

Eino 提供了多种添加线的方式

###### Add**Edge**

```go
// AddEdge adds an edge to the graph, edge means a data flow from startNode to endNode.
// the previous node's output type must be set to the next node's input type.
// NOTE: startNode and endNode must have been added to the graph before adding edge.
// e.g.
//
//  graph.AddNode("start_node_key", compose.NewPassthroughNode())
//  graph.AddNode("end_node_key", compose.NewPassthroughNode())
//
//  err := graph.AddEdge("start_node_key", "end_node_key")
func (g *graph) AddEdge(startNode, endNode string) (err error) {}
```

- 在两个节点间添加一条有向的数据传输链路，以控制数据的流动方向和节点的执行顺序

<a href="/img/eino/edge_of_parallel.png" target="_blank"><img src="/img/eino/edge_of_parallel.png" width="100%" /></a>

###### **AddBranch**

```go
// AddBranch adds a branch to the graph.
// e.g.
//
//  condition := func(ctx context.Context, in string) (string, error) {
//     return "next_node_key", nil
//  }
//  endNodes := map[string]bool{"path01": true, "path02": true}
//  branch := compose.NewGraphBranch(condition, endNodes)
//
//  graph.AddBranch("start_node_key", branch)
func (g *graph) AddBranch(startNode string, branch *GraphBranch) (err error) {}
```

- 根据传入的自定义选择函数，运行时根据经运算条件从多个 Node 中选出命中 Node 执行

<a href="/img/eino/run_way_branch_in_graph.png" target="_blank"><img src="/img/eino/run_way_branch_in_graph.png" width="100%" /></a>

###### **Parallel**

- 将多个 Node 平行并联， 形成多个节点并发执行的节点
- 无 AddParallel 方法，通过 AddEdge 构建并联的多条拓扑路径，以此形成 **Parallel **

<a href="/img/eino/input_keys_output_keys_in_parallel.png" target="_blank"><img src="/img/eino/input_keys_output_keys_in_parallel.png" width="100%" /></a>

##### 面(Graph)

- 通过 NewGraph 创建 graph 实例，并通过 graph.AddXXXNode、graph.AddEdge、graph.AddBranch 绘制点和线，最终形成一张可编译执行的图

```go
// 无状态的 Graph 编排
g := NewGraph[map[string]any, *schema.Message]()

type testState struct {
    ms []string
}

genFn := func(ctx context.Context) *testState {
    return &testState{}
}

// 有状态的 Graph 编排
sg := NewGraph[string, string](WithGenLocalState(genFn))

// 基于 Graph 编排简化 的 Chain
chain := NewChain[map[string]any, string]()
```

#### Chain

> Chain - 简化的 Graph，将不同类型的 Node 按照先后顺序，进行连接，形成从头到尾的数据流传递和顺序执行。

##### **AppendXXX**

> XXX 可是 ChatMode、Prompt、Indexer、Retriever、Graph 等多种组件类型
>
> Chain 是简化的 Graph，因此可通过 AppendGraph 实现 Chain 和 Graph 的相互嵌套

- 将多个 Node 按照传入顺序首尾串联，串联的 Node 依次进行数据传递和执行

<a href="/img/eino/graph_nodes.png" target="_blank"><img src="/img/eino/graph_nodes.png" width="100%" /></a>

##### **AppendParallel**

> 添加一个节点，这个节点具有多个并发执行的多个子节点

```go
// Parallel run multiple nodes in parallel
//
// use `NewParallel()` to create a new parallel type
// Example:

parallel := NewParallel()
parallel.AddChatModel("output_key01", chat01)
parallel.AddChatModel("output_key01", chat02)

chain := NewChain[[]*schema.Message,*schema.Message]()
chain.AppendParallel(parallel)
```

- 创建一个 Parallel，容纳并发执行的多个子节点

<a href="/img/eino/chain_append_parallel.png" target="_blank"><img src="/img/eino/chain_append_parallel.png" width="100%" /></a>

##### **AppendBranch**

> 添加一个节点，这个节点通过 condition 计算方法，从多个子节点中，选择一个执行

```go
// NewChainBranch creates a new ChainBranch instance based on a given condition.
// It takes a generic type T and a GraphBranchCondition function for that type.
// The returned ChainBranch will have an empty key2BranchNode map and a condition function
// that wraps the provided cond to handle type assertions and error checking.
// eg.

condition := func(ctx context.Context, in string) (endNode string, err error) {
    // logic to determine the next node
    if len(in) == 0 {
        return "node_1", nil
    }
    return "node_2", nil 
}

cb := NewChainBranch[string](condition)
cb.AddLambda("node_1", lambda1) // node in branch, represent one path of branch
cb.AddLambda("node_2", lambda2) // node in branch

chain := NewChain[string, string]()
chain.AppendBranch(cb)
```

<a href="/img/eino/chain_append_branch.png" target="_blank"><img src="/img/eino/chain_append_branch.png" width="100%" /></a>

#### Workflow

允许字段级别做上下游数据映射的有向无环图。

### 切面(Callbacks)

Component（包括 Lambda）、Graph 编排共同解决“把业务逻辑定义出来”的问题。而 logging, tracing, metrics, 上屏展示等横切面性质的功能，需要有机制把功能注入到 Component（包括 Lambda）、Graph 中。

另一方面，用户可能想拿到某个具体 Component 实现的执行过程中的中间信息，比如 VikingDBRetriever 额外给出查询的 DB Name，ArkChatModel 额外给出请求的 temperature 等参数。需要有机制把中间状态透出。

Callbacks 支持“**横切面功能注入**”和“**中间状态透出**”，具体是：用户提供、注册“function”（Callback Handler），Component 和 Graph 在固定的“时机”（或者说切面、位点）回调这些 function，给出对应的信息。

Eino 中的 Component 和 Graph 等**实体**，在固定的**时机** (Callback Timing)，回调用户提供的 **function** (Callback Handler)，并把**自己是谁** (RunInfo)，以及**当时发生了什么** (Callback Input & Output) 传出去。

详见：[Eino: Callback 用户手册](/zh/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual)
