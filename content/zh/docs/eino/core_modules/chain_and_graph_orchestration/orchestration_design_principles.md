---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: 编排的设计理念'
weight: 2
---

大模型应用编排方案中，最火的就是 langchain 以及 langgraph，其官方提供了 python 和 ts 的 sdk，这两门语言以其灵活性著称，灵活性给 sdk 的开发带来了极大的便利，但同时，也给 sdk 的使用者带来了极大的困扰和心智负担。

golang 作为一门 极其简单 的编程语言，确定的 `静态类型` 是让其变得简单的重要原因之一，而 eino，则保持了这一重要特性: `确定的类型` + `Compile 时类型检查`。

## 以上下游 `类型对齐` 为基本准则

eino 的最基础编排方式为 graph，以及简化的封装 chain。不论是哪种编排方式，其本质都是 `逻辑节点` + `上下游关系` 。在编排的产物运行时，都是从一个逻辑节点运行，然后下一步运行和这个节点相连的下一个节点。

这之间蕴含了一个基本假设：**前一个运行节点的输出值，可以作为下一个节点的输入值。**

在 golang 中，要实现这个假设，有两个基本方案：

1. 把不同节点的输入输出都变成一种更泛化的类型，例如 `any` 、`map[string]any` 等。

   1. 老版本的 eino 就是采用泛化成 any 的方案，但对应的代价是: 开发者在写代码时，需要显式转换成具体类型才能使用。这会极大增加开发者的心智负担，因此最终放弃此方案。
   2. langchain 的方案可以看做是全程传递 `map[string]any`，各个逻辑节点根据自己的需要，用对应的 key 去取对应的 value。在 langchaingo 的实现中，即是按照这种方式实现，但同样，golang 中的 any 要被使用依然要使用 `类型断言` 才可使用。这种方案在开发者使用时依然有很大的心智负担。
2. 每一个节点的输入输出类型保持开发者的预期，在 Compile 阶段保证上下游的类型是一致的。

方案 2 即是 eino 最终选定的方案。这种方案是编排时最容易被理解的，整个过程就像是 `搭积木` 一样，每一个积木突出的部分和凹陷的部分有各自的规格，仅有规格匹配了才能成为上下游关系。

就如下图：

![](/img/eino/edge_type_validate.png)

对于一个编排而言，只有下游能识别和处理上游的输出，这个编排才能正常运行。 这个基本假设在 eino 中被清晰地表达了出来，让开发者在用 eino 做编排时，能够有十足的信心清楚编排的逻辑是如何运行和流转的，而不是从一系列的 any 中去猜测传过来的值是否正确。

### graph 中的类型对齐

#### edge

在 graph 中，一个节点的输出将顺着 `边(edge)` 流向下一节点，因此，用边连接的节点间必须要类型对齐。

如下图：

> 这是一个模拟 ① 直接和大模型对话 ② 使用 RAG 模式 的场景，最后结果可用于对比两种模式的效果

![](/img/eino/input_output_type_validate.png)

图中绿色的部分，就是普通的 Edge 连接，其要求上游的输出必须能 `assign` 给下游，可以接收的类型有：

① 上下游类型相同: 例如上游输出 *schema.Message 下游输入也是 *schema.Message

② 下游接收接口，上游实现了该接口: 例如上游结构体实现了 Format() 接口，下游接收的是一个 interface{ Format() }

③ 下游接受方为 any: 空接口，可以认为任何上游都可以转成一个 any 传给下游

④ 上游是 any，下游是具体类型:  当上游可被转换成下游类型时，详细描述可见: [Eino: 编排的设计理念](/zh/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles)

图中黄色的部分，则是 eino 提供的另一个类型转换的机制，即: 若下游接收的类型是 `map[string]any`，可以使用 `graph.AddXXXNode(node_key, xxx, compose.WithOutputKey("outkey")` 的方式指定给下游输入的一个 key。

同理，若上游是 `map[string]any` ，则可以使用 `graph.AddXXXNode(node_key, xxx, compose.WithInputKey("inkey")` 来获取上游输出的其中一个 key 的 value。

一般在多条边汇聚到某一个节点时，这种机制使用起来较为方便。

#### branch

如果一个节点后面连接了多个 edge，则每条 edge 的下游节点都会运行一次。branch 则是另一种机制： 一个 branch 后接了 n 个节点，但仅会运行 condition 返回的那个 node key 对应的节点。同一个 branch 后的节点，必须要类型对齐。

如下图:

> 这是一个模拟 react agent 的运行逻辑

可以看到，一个 branch 本身拥有一个 `condition`, 这个 function 的输入必须和上游类型对齐。同时，一个 branch 后所接的各个节点，也必须和 condition 一样，要能接收上游的输出。

### chain 中的类型对齐

#### chain

从抽象角度看，chain 就是一个 `链条`，如下所示：

![](/img/eino/what_is_chain.png)

逻辑节点的类型可以分为 3 类：

- 可编排组件 (例如 chat model、 chat template、 retriever、 lambda、graph 等等)
- branch 节点
- parallel 节点

可以看到，在 chain 的视角下，不论是简单的节点(eg： chat model) 还是复杂的节点 (eg: graph、branch、parallel)，都是一样的，在运行过程中，一步的执行就是一个节点的运行。

也因此，chain 的上下游节点间，类型必须是对齐的，如下：

```go
func TestChain() {
    chain := compose.NewChain[map[string]interface,string]()
    
    nodeTemplate := &fakeChatTemplate{} // input: map[string]any, output: []*schema.Message
    
    nodeHistoryLambda := &fakeLambda{} // input: []*schema.Message, output: []*schema.Message
    
    nodeChatModel := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    
    nodeConvertResLambda := &fakeLambda{} // input: *schema.Message, output: string
    
    chain.
        AppendChatTemplate(nodeTemplate).
        AppendLambda(nodeHistoryLambda).
        AppendChatModel(nodeChatModel).
        AppendLambda(nodeConvertResLambda)
}
```

上面的逻辑用图来表示如下：

![](/img/eino/nodes_type_validate.png)

若上下游的类型没有对齐，chain 会在 chain.Compile() 时返回错误。而 graph 会在 graph.AddXXXNode() 时就报错。

#### parallel

parallel 在 chain 中是一类特殊的节点，从 chain 的角度看 parallel 和其他的节点没啥区别。在 parallel 内部，其基本拓扑结构如下：

![](/img/eino/same_type_of_parallel.png)

graph 中的多 edge 形成的结构其中一种就是这个，这里的基本假设是： 一个 parallel 的每一条边上有且仅有一个节点。当然，这一个节点也可以是 graph。但注意，目前框架没有直接提供在 parallel 中嵌套 branch 或 parallel 的能力。

在 parallel 中的每个节点，由于其上游节点是同一个，因此他们都要和上游节点的输出类型对齐，比如图中上游节点输出了 `*schema.Message` ，则每个节点都要能接收这个类型。接收的方式和 graph 中的一致，通常可以用 `相同类型` 、`接口定义` 、`any`、`input key option` 的方式。

parallel 节点的输出一定是一个 `map[string]any`，其中的 key 则是在 `parallel.AddXXX(output_key, xxx, opts...)` 时指定的 output_key。

一个 parallel 的构建例子如下：

```go
func TestParallel() {
    chain := compose.NewChain[map[string]any, map[string]*schema.Message]()
    templateNode := &fakeTemplateNode{} // input: map[string]any, output: []*schema.Message
    
    parallel := compose.NewParallel()
    model01 := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    model02 := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    model03 := &fakeChatModel{} // input: []*schema.Message, output: *schema.Message
    
    parallel.
        AddChatModel("outkey_01", model01).
        AddChatModel("outkey_02", model02).
        AddChatModel("outkey_03", model03)
    
    lambdaNode := &fakeLambdaNode{} // input: map[string]any, output: map[string]*schema.Message
    
    chain.
        AppendParallel(parallel).
        AppendLambda(lambdaNode)
}
```

一个 parallel 在 chain 中的视角如下：

> 图中是模拟同一个提问，由不同的大模型去回答，结果可用于对比效果

![](/img/eino/graph_as_chain_node.png)

> 需要注意的是，这个结构只是逻辑上的视角，由于 chain 本身也是用 graph 实现的，parallel 在底层 graph 中会平铺到图中。

#### branch

chain 的 branch 和 graph 中的 branch 类似，branch 中的所有节点都要和上游节点的类型对齐，此处不再赘述。

### invoke 和 stream 下的类型对齐方式

在 eino 中，编排的结果是 graph 或 chain，若要运行，则需要使用 `Compile()` 来生成一个 `Runnable` 接口。

Runnable 的一个重要作用就是提供了 `invoke`、`stream`、`collect`、`transform` 几种调用方式的降级兼容。

> 上述几种调用方式的介绍以及详细的 Runnable 介绍可以查看: [Eino: 基础概念介绍](/zh/docs/eino/overview)

以我们最常见的 invoke 和 stream 模式为例，其接口签名如下：

```go
type Runnable[I, O any] interface {
    Invoke(ctx context.Context, input I, opts ...Option) (output O, err error)
    Stream(ctx context.Context, input I, opts ...Option) (output *schema.StreamReader[O], err error)
}
```

以 chat model 的场景为例，Runnable 加上 I,O 类型后签名如下：

```go
type Runnable interface {
    Invoke(ctx context.Context, input []*schema.Message, opts ...Option) (output *schema.Message, err error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (output *schema.StreamReader[*schema.Message], err error)
}
```

在 Invoke 模式下，返回的 output 的类型为 `*schema.Message`； 在 Stream 模式下，其返回的 output 类型必须为 `*schema.StreamReader[*schema.Message]`。也就是 stream 的每一帧的类型和 invoke 的结果类型是相同的。

一般来说，Stream 得到的每一帧合并起来应当和 invoke 的结果相同，在上面这个场景中，也即要求：

```go
func TestInvokeAndStream() {
    var r Runnable[[]*schema.Message, *schema.Message]
    
    reader, err := r.Stream(...)
    allFrames := make([]*schema.Message, 0)
    for {
        frame, err := reader.Recev()
        ...
        allFrames = append(allFrames, frame)
        ...
    }
    
    invokeRes, err := r.Invoke(...)
    
    // allFrames 合并后需要和 invokeRes 相同
}
```

在 stream 模式下，`合并帧` 是一个非常常见的操作，例如在和大模型的交互中，可以把已经接收到的所有帧合并，得到一个完整的输出。

另外，在框架中，当一个仅提供了 Stream 接口的节点，被编排后使用 Invoke 调用，框架则会把 Stream 降级为 Invoke，此时的操作是 底层调用开发者提供的 Stream 接口，获取完整的帧后，把所有帧合并，得到的结果再流转到下一节点。 这个过程中，也是使用的 `合并帧` 。

框架内已经内置支持了如下类型的合并:

- `*schema.Message`:  详情见 `schema.ConcatMessages()`
- `string`: 实现逻辑等同于 `+=`
- `[]*schema.Message`: 详情见 `compose.concatMessageArray()`
- `Map`: 把相同 key 的 val 进行合并，合并逻辑同上，若存在无法合并的类型，则失败 (ps: 不是覆盖)

对于自定义类型，则需要开发者自行实现 concat 方法，并使用 `compose.RegisterStreamChunkConcatFunc()` 注册到全局的合并函数中。

示例如下：

```go
// 假设我们自己的结构体如下
type tStreamConcatItemForTest struct {
    s string
}

// 实现一个合并的方法
func concatTStreamForTest(items []*tStreamConcatItemForTest) (*tStreamConcatItemForTest, error) {
    var s string
    for _, item := range items {
        s += item.s
    }

    return &tStreamConcatItemForTest{s: s}, nil
}

func init() {
    // 注册到全局的合并方法中
    compose.RegisterStreamChunkConcatFunc(concatTStreamForTest)
}
```

### 类型对齐在运行时检查的场景

eino 的 Graph 类型对齐检查，会在 `err = graph.AddEdge("node1", "node2")` 时检查两个节点类型是否匹配，也就能在 `构建 graph 的过程`，或 `Compile 的过程` 发现类型不匹配的错误，这适用于 [Eino: 编排的设计理念](/zh/docs/eino/core_modules/chain_and_graph_orchestration/orchestration_design_principles) 中所列举的 ① ② ③ 条规则。

当上游节点的输出为 `any` 时，若下游节点为确定的类型 (结构体、接口等等)，则上游有可能可以转成下游类型 (类型断言)，但只能在 `运行过程` 才能清楚能否转换成功，该场景的类型检查移到了运行过程中。

其结构可见下图：

![](/img/eino/input_type_output_type_in_edge.png)

这种场景适用于开发者能自行处理好上下游类型对齐的情况，可根据不同类型选择下游执行节点。

## 大模型场景的编排

eino 在编排中的是以大模型应用为核心场景的编排系统，因此在 eino 的编排设计中，是直接把 `component` 作为了编排的直接主体，封装了在大模型应用中最常用的组件，详细的 API 查看： [Eino: 基础概念介绍](/zh/docs/eino/overview)

大多数情况下，业务的实现应当把自己的组件实现为上述组件中的一种，或者直接使用 eino-ext 中已经封装好的组件。

当然，除了上述标准的组件外，还有很多场景我们需要实现一些自定义的代码逻辑，在 eino 中，这就是 `Lambda` 组件。这是一个很泛化的组件，可以基于这个基础组件实现几乎所有的需求，实际上，在 eino 内部，上述的组件也都是使用 lambda 来实现的。

> 更多信息可以参考： [Eino: Components 抽象&实现](/zh/docs/eino/core_modules/components)
