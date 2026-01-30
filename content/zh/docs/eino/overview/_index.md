---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: 'Eino: 概述'
weight: 1
---

## 简介

**Eino['aino]** (近似音: i know，希望框架能达到 "i know" 的愿景) 旨在提供基于 Go 语言的终极大模型应用开发框架。 它从开源社区中的诸多优秀 LLM 应用开发框架，如 LangChain 和 LlamaIndex 等获取灵感，同时借鉴前沿研究成果与实际应用，提供了一个强调简洁性、可扩展性、可靠性与有效性，且更符合 Go 语言编程惯例的 LLM 应用开发框架。

Eino 提供的价值如下：

- 精心整理的一系列 **组件（component）** 抽象与实现，可轻松复用与组合，用于构建 LLM 应用。
- **智能体开发套件（ADK）**，提供构建 AI 智能体的高级抽象，支持多智能体编排、人机协作中断机制以及预置的智能体模式。
- 强大的 **编排（orchestration）** 框架，为用户承担繁重的类型检查、流式处理、并发管理、切面注入、选项赋值等工作。
- 一套精心设计、注重简洁明了的 **API**。
- 以集成 **流程（flow）** 和 **示例（example）** 形式不断扩充的最佳实践集合。
- 一套实用 **工具（DevOps tools）**，涵盖从可视化开发与调试到在线追踪与评估的整个开发生命周期。

借助上述能力和工具，Eino 能够在人工智能应用开发生命周期的不同阶段实现标准化、简化操作并提高效率：

<a href="/img/eino/eino_project_structure_and_modules.png" target="_blank"><img src="/img/eino/eino_project_structure_and_modules.png" width="100%" /></a>

[Eino Github 仓库链接](https://github.com/cloudwego/eino)

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
type Input1 struct {
    Input string
}

type Output1 struct {
    Output string
}

type Input2 struct {
    Role schema.RoleType
}

type Output2 struct {
    Output string
}

type Input3 struct {
    Query string
    MetaData string
}

var (
    ctx context.Context
    m model.BaseChatModel
    lambda1 func(context.Context, Input1) (Output1, error)
    lambda2 func(context.Context, Input2) (Output2, error)
    lambda3 func(context.Context, Input3) (*schema.Message, error)
)

wf := NewWorkflow[[]*schema.Message, *schema.Message]()
wf.AddChatModelNode("model", m).AddInput(START)
wf.AddLambdaNode("lambda1", InvokableLambda(lambda1)).
    AddInput("model", MapFields("Content", "Input"))
wf.AddLambdaNode("lambda2", InvokableLambda(lambda2)).
    AddInput("model", MapFields("Role", "Role"))
wf.AddLambdaNode("lambda3", InvokableLambda(lambda3)).
    AddInput("lambda1", MapFields("Output", "Query")).
    AddInput("lambda2", MapFields("Output", "MetaData"))
wf.End().AddInput("lambda3")
runnable, err := wf.Compile(ctx)
if err != nil {
    return err
}
our, err := runnable.Invoke(ctx, []*schema.Message{
    schema.UserMessage("kick start this workflow!"),
})
```

Eino 的**图编排**开箱即用地提供以下能力：

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

现在，咱们来创建一个 “ReAct” 智能体：一个 ChatModel 绑定了一些 Tool。它接收输入的消息，自主判断是调用 Tool 还是输出最终结果。Tool 的执行结果会再次成为聊天模型的输入消息，并作为下一轮自主判断的上下文。

<a href="/img/eino/eino_adk_react_illustration.png" target="_blank"><img src="/img/eino/eino_adk_react_illustration.png" width="100%" /></a>

Eino 的**智能体开发套件（ADK）**提供了开箱即用的 `ChatModelAgent` 来实现这一模式：

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "assistant",
    Description: "A helpful assistant that can use tools",
    Model:       chatModel,
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{weatherTool, calculatorTool},
        },
    },
})

runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent})
iter := runner.Query(ctx, "What's the weather in Beijing this weekend?")
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    // process agent events (model outputs, tool calls, etc.)
}
```

ADK 在内部处理 ReAct 循环，为智能体推理过程的每个步骤发出事件。

除了基本的 ReAct 模式，ADK 还提供了构建生产级智能体系统的强大能力：

**多智能体与上下文管理**：智能体可以将控制权转移给子智能体，或被封装为工具。框架会自动管理跨智能体边界的对话上下文：

```go
// 设置智能体层级 - mainAgent 现在可以转移到子智能体
mainAgentWithSubs, _ := adk.SetSubAgents(ctx, mainAgent, []adk.Agent{researchAgent, codeAgent})
```

当 `mainAgent` 转移到 `researchAgent` 时，对话历史会自动重写，为子智能体提供适当的上下文。

智能体也可以被封装为工具，允许一个智能体在其工具调用工作流中调用另一个智能体：

```go
// 将智能体封装为可被其他智能体调用的工具
researchTool := adk.NewAgentTool(ctx, researchAgent)
```

**随处中断，直接恢复**：任何智能体都可以暂停执行以等待人工审批或外部输入，并从中断处精确恢复：

```go
// 在工具或智能体内部，触发中断
return adk.Interrupt(ctx, "Please confirm this action")

// 稍后，从检查点恢复
iter, _ := runner.Resume(ctx, checkpointID)
```

**预置智能体模式**：为常见架构提供开箱即用的实现：

```go
// Deep Agent：经过实战检验的复杂任务编排模式，
// 内置任务管理、子智能体委派和进度跟踪
deepAgent, _ := deep.New(ctx, &deep.Config{
    Name:        "deep_agent",
    Description: "An agent that breaks down and executes complex tasks",
    ChatModel:   chatModel,
    SubAgents:   []adk.Agent{researchAgent, codeAgent},
    ToolsConfig: adk.ToolsConfig{...},
})

// Supervisor 模式：一个智能体协调多个专家
supervisorAgent, _ := supervisor.New(ctx, &supervisor.Config{
    Supervisor: coordinatorAgent,
    SubAgents:  []adk.Agent{writerAgent, reviewerAgent},
})

// 顺序执行：智能体依次运行
seqAgent, _ := adk.NewSequentialAgent(ctx, &adk.SequentialAgentConfig{
    SubAgents: []adk.Agent{plannerAgent, executorAgent, summarizerAgent},
})
```

**可扩展的中间件系统**：在不修改核心逻辑的情况下为智能体添加能力：

```go
fsMiddleware, _ := filesystem.NewMiddleware(ctx, &filesystem.Config{
    Backend: myFileSystem,
})

agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Middlewares: []adk.AgentMiddleware{fsMiddleware},
})
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

## **智能体开发套件（ADK）**

**ADK** 包提供了针对构建 AI 智能体优化的高级抽象：

- **ChatModelAgent**：ReAct 风格的智能体，自动处理工具调用、对话状态和推理循环。
- **多智能体与上下文工程**：构建层级化智能体系统，对话历史在智能体转移和智能体作为工具调用时自动管理，实现专业智能体间的无缝上下文共享。
- **工作流智能体**：使用 `SequentialAgent`、`ParallelAgent` 和 `LoopAgent` 组合智能体，实现复杂的执行流程。
- **人机协作**：`Interrupt` 和 `Resume` 机制，支持检查点持久化，适用于需要人工审批或输入的工作流。
- **预置模式**：开箱即用的实现，包括 Deep Agent（任务编排）、Supervisor（层级协调）和 Plan-Execute-Replan。
- **智能体中间件**：可扩展的中间件系统，用于添加工具（文件系统操作）和管理上下文（token 缩减）。

### 强大的编排 (Graph/Chain/Workflow)

如需细粒度控制，Eino 提供**图编排**能力，数据从 Retriever / Document Loader / ChatTemplate 流向 ChatModel，接着流向 Tool ，并被解析为最终答案。

- 组件实例是图的 **节点（Node）** ，而 **边（Edge）** 则是数据流通道。
- 图编排功能强大且足够灵活，能够实现复杂的业务逻辑：
  - **类型检查、流处理、并发管理、切面注入和选项分配**都由框架处理。
  - 在运行时进行**分支（Branch）执行、读写全局状态（State）**，或者使用工作流进行字段级别的数据映射。

## **切面（Callbacks）**

**切面**处理日志记录、追踪、指标统计等横切关注点。切面可以直接应用于组件、编排图或 ADK 智能体。

- 支持五种切面类型：OnStart、OnEnd、OnError、OnStartWithStreamInput、OnEndWithStreamOutput。
- 可通过 Option 在运行时添加自定义回调处理程序。

### 完善的流处理(Streaming)

- 流数据处理（Stream Processing）很重要，因为 ChatModel 在生成消息时会实时输出完整消息的各个分片。在编排场景下会尤为重要，因为更多的组件需要处理分片的消息数据。
- 对于只接受非流式输入的下游节点（如 ToolsNode），Eino 会自动将流 **拼接（Concatenate）** 起来。
- 在图的执行过程中，当需要流时，Eino 会自动将非流式**转换**为流式。
- 当多个流汇聚到一个下游节点时，Eino 会自动 **合并（Merge）** 这些流。
- 当一个流传入到多个不同的下游节点或传递给回调处理器时，Eino 会自动 **复制（Copy）** 这些流。
- 如 **分支（Branch）** 、或 **状态处理器（StateHandler）** 等编排元素，也能够感知和处理流。
- 借助上述流数据处理能力，组件本身的“是否能处理流、是否会输出流”变的对用户透明。
- 经过编译的 Graph 可以用 4 种不同的流输入输出范式来运行：

<table>
<tr><td>流处理范式</td><td>解释</td></tr>
<tr><td>Invoke</td><td>接收非流类型 I ，返回非流类型 O</td></tr>
<tr><td>Stream</td><td>接收非流类型 I ， 返回流类型 StreamReader[O]</td></tr>
<tr><td>Collect</td><td>接收流类型 StreamReader[I] ， 返回非流类型 O</td></tr>
<tr><td>Transform</td><td>接收流类型 StreamReader[I] ， 返回流类型 StreamReader[O]</td></tr>
</table>

## Eino 框架结构

<a href="/img/eino/eino_architecture_overview.png" target="_blank"><img src="/img/eino/eino_architecture_overview.png" width="100%" /></a>

Eino 框架由几个部分组成：

- [Eino](https://github.com/cloudwego/eino)：包含类型定义、流数据处理机制、组件抽象定义、编排功能、切面机制等。
- [EinoExt](https://github.com/cloudwego/eino-ext)：组件实现、回调处理程序实现、组件使用示例，以及各种工具，如评估器、提示优化器等。

> 💡
> 针对字节内部使用的组件，有对应的内部代码仓库：
>
> EinoBytedExt: [https://code.byted.org/search/flow/eino-byted-ext](https://code.byted.org/search/flow/eino-byted-ext)
>
> 包含当前定位为内部使用的组件实现，如 llmgateway, bytedgpt, fornax tracing, bytees 等。

- [Eino Devops](https://github.com/cloudwego/eino-ext/tree/main/devops)：可视化开发、可视化调试等。
- [EinoExamples](https://github.com/cloudwego/eino-examples)：是包含示例应用程序和最佳实践的代码仓库。

详见：[Eino 框架结构说明](/zh/docs/eino/overview/Eino 框架结构说明)

## 详细文档

针对 Eino 的学习和使用，我们提供了完善的 Eino 用户手册，帮助大家快速理解 Eino 中的概念，掌握基于 Eino 开发设计 AI 应用的技能，赶快通过 [Eino 用户手册](https://www.cloudwego.io/zh/docs/eino/)尝试使用吧~。

若想快速上手，了解 通过 Eino 构建 AI 应用的过程，推荐先阅读 [Eino: 快速开始](https://www.cloudwego.io/zh/docs/eino/quick_start/)

完整 API Reference：[https://pkg.go.dev/github.com/cloudwego/eino](https://pkg.go.dev/github.com/cloudwego/eino)

## 依赖说明

- Go 1.18 及以上版本

## **代码规范**

本仓库开启了 `golangci-lint` 检查以约束基础代码规范，可通过以下命令在本地检查：

```bash
golangci-lint run ./...
```

主要规则包括：

- 导出的函数、接口、package 等需要添加注释，且注释符合 GoDoc 规范。
- 代码格式需符合 `gofmt -s` 规范。
- import 顺序需符合 `goimports` 规范（std -> third party -> local）。

## 安全

如果你在该项目中发现潜在的安全问题，或你认为可能发现了安全问题，请通过我们的[安全中心](https://security.bytedance.com/src)或[漏洞报告邮箱](mailto:sec@bytedance.com)通知字节跳动安全团队。

请**不要**创建公开的 GitHub Issue。

## 联系我们

- 如何成为 member: [COMMUNITY MEMBERSHIP](https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md)
- Issues: [Issues](https://github.com/cloudwego/eino/issues)
- 飞书用户群（[注册飞书](https://www.feishu.cn/)后扫码进群）

<a href="/img/eino/eino_lark_qr_code.png" target="_blank"><img src="/img/eino/eino_lark_qr_code.png" width="100%" /></a>

- 字节内部 OnCall 群

## 开源许可证

本项目依据 [[Apache-2.0 许可证](https://www.apache.org/licenses/LICENSE-2.0.txt)]授权。
