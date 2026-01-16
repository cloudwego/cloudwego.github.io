---
Description: ""
date: "2025-12-09"
lastmod: ""
tags: []
title: Eino ADK：一文搞定 AI Agent 核心设计模式，从 0 到 1 搭建智能体系统
weight: 3
---

# 前言

当大语言模型突破了 “理解与生成” 的瓶颈，Agent 迅速成为 AI 落地的主流形态。从智能客服到自动化办公，几乎所有场景都需要 Agent 来承接 LLM 能力、执行具体任务。

但技术演进中痛点也随之凸显，有的团队因不懂如何衔接 LLM 与业务系统，导致 Agent 只能 “空谈”；有的因状态管理缺失，让 Agent 执行任务时频频 “失忆”，复杂的交互流程也进一步增加了开发难度。

为此，**Eino ADK（Agent Development Kit）应运而生，为 Go 开发者提供了一套完整、灵活且强大的智能体开发框架**，直接解决传统开发中的核心难题。

## 🙋 什么是 Agent？

Agent 代表一个独立的、可执行的智能任务单元，能够自主学习，适应与作出决策，主要功能包含：

- **推理**：Agent 可以分析数据、识别模式、使用逻辑和可用信息来得出结论、进行推断及解决问题。
- **行动**：Agent 根据决策、计划或外部输入采取行动或执行任务来实现目标。
- **观察**：Agent 自主收集相关的信息（例如计算机视觉、自然语言处理或传感器数据分析）来了解上下文，为做出明智的决策打下基础。
- **规划**：Agent 可以确定必要的步骤、评估潜在行动，并根据可用信息和预期结果选择最佳行动方案。
- **协作**：Agent 能够在复杂且动态的环境中，与他人（无论是人类还是其他 AI 智能体）进行有效协作。

你可以把它想象成一个能够理解指令、执行任务并给出回应的“智能体”。任何需要与大语言模型（LLM）交互的场景都可以抽象为一个 Agent。例如：

- 一个用于查询天气信息的 Agent。
- 一个用于预定会议的 Agent。
- 一个能够回答特定领域知识的 Agent。

## 🙋‍♂️ 什么是 Eino ADK？

[Eino ADK](https://github.com/cloudwego/eino) 是一个专为 Go 语言设计的 Agent 和 Multi-Agent 开发框架，设计上参考了 [Google-ADK](https://google.github.io/adk-docs/agents/) 中对 Agent 与协作机制的定义。

它不仅是一个工具库，更是一套完整的智能体开发体系：通过统一的抽象接口、灵活的组合模式和强大的协作机制，将复杂的 AI 应用拆解为独立、可组合的智能体单元，让开发者能够像搭建乐高积木一样构建复杂的智能体系统：

- **少写胶水**：统一接口与事件流，复杂任务拆解更自然。
- **快速编排**：预设范式 + 工作流，分分钟搭好管线。
- **更可控**：可中断、可恢复、可审计，Agent 协作过程“看得见”。

无论你是 AI 应用的新手，还是经验丰富的开发者，ADK 都能为你提供合适的工具和模式。它的设计哲学是"简单的事情简单做，复杂的事情也能做"——让开发者能够专注于业务逻辑的实现，而不必担心底层的技术复杂性。

# 核心构建

## 🧠 ChatModelAgent：智能决策的大脑

`ChatModelAgent` 是 ADK 中最重要的预构建组件，它封装了与大语言模型的交互逻辑，实现了经典的 [ReAct](https://react-lm.github.io/)（Reason-Act-Observe）模式，运行过程为:

1. 调用 LLM（Reason）
2. LLM 返回工具调用请求（Action）
3. ChatModelAgent 执行工具（Act）
4. 将工具结果返回给 LLM（Observation），结合之前的上下文继续生成，直到模型判断不需要调用 Tool 后结束。

<a href="/img/eino/eino_adk_chatmodel_agent.png" target="_blank"><img src="/img/eino/eino_adk_chatmodel_agent.png" width="100%" /></a>

ReAct 模式的核心是“**思考 → 行动 → 观察 → 再思考**”的闭环，解决传统 Agent “盲目行动”或“推理与行动脱节”的痛点，以下是几种可能的实践场景：

- **行业赛道分析**：使用 ReAct 模式避免了一次性搜集全部信息导致的信息过载，通过逐步推理聚焦核心问题；同时使用数据验证思考，而非凭空靠直觉决策，过程可解释，提升了生成报告的准确性。
  - **Think-1**：判断赛道潜力，需要 “政策支持力度、行业增速、龙头公司盈利能力、产业链瓶颈”4 类信息。
  - **Act-1**：调用 API 获取行业财报整体数据
  - **Think-2**：分析数据，判断行业高增长 + 政策背书，但上游价格上涨可能挤压中下游利润，需要进一步验证是否有影响
  - **Act-2**: 调用 API 获取供需、行业研报等详细数据
  - **Think-3**: 整合结论生成分析报告，附关键数据来源
- **IT 故障运维**：使用 ReAct 模式逐步缩小问题范围，避免盲目操作；每一步操作有理有据，方便运维工程师实施解决方案前的二次验证，为后续复盘与制定预防措施提供基础。
  - **Think-1**：理清故障的常见原因，例如宕机的常见原因是 “CPU 过载、内存不足、磁盘满、服务崩溃”，需要先查基础监控数据
  - **Act-1**：调用「监控系统 API」查询服务器打点数据
  - **Think-2**：判断主因，例如 CPU 利用率异常则进一步排查哪些进程 CPU 占用高
  - **Act-2**：用「进程管理工具」查 TOP 进程，看是否有异常服务
  - **Think-3**：发现日志服务异常，可能是 “日志文件过大” 或 “配置错误”，需要进一步查看日志服务的配置和日志文件大小
  - **Act-3**：bash 执行命令，发现日志文件过大，同时配置未开启滚动，也未设置最大日志大小
  - **Think-4**：向运维工程师提供可行的解决方案：清理日志，修改配置并开启滚动，重启日志服务与应用

`ChatModelAgent` 利用 LLM 强大的功能进行推理、理解自然语言、作出决策、生成响应、进行工具交互，**充当智能体应用程序 "思考" 的部分**。您可以使用 ADK 快速构建具有 `ReAct` 能力的 `ChatModelAgent`：

```go
import github.com/cloudwego/eino/adk

// 创建一个包含多个工具的 ReAct ChatModelAgent
chatAgent := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "intelligent_assistant",
    Description: "An intelligent assistant capable of using multiple tools to solve complex problems",
    Instruction: "You are a professional assistant who can use the provided tools to help users solve problems",
    Model:       openaiModel,
    ToolsConfig: adk.ToolsConfig{
        Tools: []tool.BaseTool{
            searchTool,
            calculatorTool,
            weatherTool,
        },
    }
})
```

## 🎭 WorkflowAgents：精密的流水线

Eino ADK 提供了专用于协调子 Agent 执行流程的 WorkflowAgents 模式，用于通过预定义逻辑管理 Agent 的运行方式，产生确定的执行过程，协助实现**可预测可控制的多 Agent 协作方式**。您可以按需对下列模式进行排列组合，结合 `ChatModelAgent` 构造出符合自身需求的完整工作流水线：

- **Sequential Agent**: 将配置中注册的 Agents 按顺序依次执行一次后结束，运行遵循以下原则：
  - **线性执行**：严格按照 SubAgents 数组的顺序执行。
  - **运行结果传递**：配置中的每个 Agent 都能够获取 Sequential Agent 的完整输入以及前序 Agent 的输出。
  - **支持提前退出**：如果任何一个子 Agent 产生退出 / 中断动作，整个 Sequential 流程会立即终止。
- 可能的实践场景有：
  - **数据 ETL**：`ExtractAgent`（从 MySQL 抽取订单数据）→ `TransformAgent`（清洗空值、格式化日期）→ `LoadAgent`（加载到数据仓库）
  - **CI / CD 流水线**：`CodeCloneAgent`（从代码仓库拉取代码）→`UnitTestAgent`（运行单元测试，用例失败时返回错误与分析报告）→`CompileAgent`（编译代码）→`DeployAgent`（部署到目标环境）

```go
import github.com/cloudwego/eino/adk

// 依次执行 制定研究计划 -> 搜索资料 -> 撰写报告
sequential := adk.NewSequentialAgent(ctx, &adk.SequentialAgentConfig{
    Name: "research_pipeline",
    SubAgents: []adk.Agent{
        planAgent,    // 制定研究计划
        searchAgent,  // 搜索资料
        writeAgent,   // 撰写报告
    },
})
```

<a href="/img/eino/eino_adk_sequential.png" target="_blank"><img src="/img/eino/eino_adk_sequential.png" width="100%" /></a>

- **Parallel Agent**: 将配置中注册的 Agents 并发执行，所有 Agent 执行完毕后结束，运行遵循以下原则：
  - **并发执行**：所有子 Agent 同时启动，在独立的 goroutine 中并行执行。
  - **共享输入**：所有子 Agent 接收调用 Pararllel Agent 时相同的初始输入。
  - **等待与结果聚合**：内部使用 sync.WaitGroup 等待所有子 Agent 执行完成，收集所有子 Agent 的执行结果并按接收顺序输出到 `AsyncIterator` 中。
- 可能的实践场景有：
  - **多源数据采集**：`MySQLCollector`（采集用户表）+ `PostgreSQLCollector`（采集订单表）+ `MongoDBCollector`（采集商品评论）
  - **多渠道推送**：`WeChatPushAgent`（推送到微信公众号）+ `SMSPushAgent`（发送短信）+ `AppPushAgent`（推送到 APP）

```go
import github.com/cloudwego/eino/adk

// 并发执行 情感分析 + 关键词提取 + 内容摘要
parallel := adk.NewParallelAgent(ctx, &adk.ParallelAgentConfig{
    Name: "multi_analysis",
    SubAgents: []adk.Agent{
        sentimentAgent,  // 情感分析
        keywordAgent,    // 关键词提取
        summaryAgent,    // 内容摘要
    },
})
```

<a href="/img/eino/eino_adk_parallel.png" target="_blank"><img src="/img/eino/eino_adk_parallel.png" width="100%" /></a>

- **Loop Agent**：将配置中注册的 Agents 按顺序依次执行并循环多次，运行遵循以下原则：
  - **循环执行**：重复执行 SubAgents 序列，每次循环都是一个完整的 Sequential 执行过程。
  - **运行结果累积**：每次迭代的结果都会累积，后续迭代的输入可以访问所有历史信息。
  - **条件退出**：支持通过输出包含 `ExitAction` 的事件或达到最大迭代次数来终止循环，配置 `MaxIterations=0` 时表示无限循环。
- 可能的实践场景有：
  - **数据同步**：`CheckUpdateAgent`（检查源库增量）→ `IncrementalSyncAgent`（同步增量数据）→ `VerifySyncAgent`（验证一致性）
  - **压力测试**：`StartClientAgent`（启动测试客户端）→ `SendRequestsAgent`（发送请求）→ `CollectMetricsAgent`（收集性能指标）

```go
import github.com/cloudwego/eino/adk

// 循环执行 5 次，每次顺序为：分析当前状态 -> 提出改进方案 -> 验证改进效果
loop := adk.NewLoopAgent(ctx, &adk.LoopAgentConfig{
    Name: "iterative_optimization",
    SubAgents: []adk.Agent{
        analyzeAgent,  // 分析当前状态
        improveAgent,  // 提出改进方案
        validateAgent, // 验证改进效果
    },
    MaxIterations: 5,
})
```

<a href="/img/eino/eino_adk_loop_controller.png" target="_blank"><img src="/img/eino/eino_adk_loop_controller.png" width="100%" /></a>

## 🛠️ 预构建的 Multi-Agent 范式

Eino ADK 基于日常 Multi-Agent 协作实践中沉淀的最佳工程经验，为用户提供**两种预构建的 Multi-Agent 范式**，无需从头设计协作逻辑即可开箱即用，覆盖「集中式协调」与「结构化问题解决」两大核心场景，高效支撑复杂任务的智能协作。

#### 🎯 Supervisor 模式：集中式协调

Supervisor Agent 是 ADK 提供的一种中心化 Multi-Agent 协作模式，旨在为集中决策与分发执行的通用场景提供解决方案，由一个 Supervisor Agent（监督者） 和多个 SubAgent （子 Agent）组成，其中：

- Supervisor Agent 负责任务的分配、子 Agent 完成后的结果汇总与下一步决策。
- 子 Agents 专注于执行具体任务，并在完成后自动将任务控制权交回 Supervisor。

<a href="/img/eino/eino_adk_supervisor_flow.png" target="_blank"><img src="/img/eino/eino_adk_supervisor_flow.png" width="100%" /></a>

Supervisor 模式有如下特点：

- **中心化控制**：Supervisor 统一管理子 Agent，可根据输入与子 Agent 执行结果动态调整任务分配。
- **确定性回调**：子 Agent 执行完毕后会将运行结果返回到 Supervisor Agent，避免协作流程中断。
- **松耦合扩展**：子 Agent 可独立开发、测试和替换，方便拓展与维护。

Supervisor 模式的这种层级化的结构非常适合于**动态协调多个专业 Agent 完成复杂任务**的场景，例如：

- **科研项目管理**：Supervisor 分配调研、实验、报告撰写任务给不同子 Agent。
- **客户服务流程**：Supervisor 根据用户问题类型，分配给技术支持、售后、销售等子 Agent。

```go
import github.com/cloudwego/eino/adk/prebuilt/supervisor

// 科研项目管理：创建一个监督者模式的 multi-agent
// 包含 research（调研），experimentation（实验），report（报告）三个子 Agent
supervisor, err := supervisor.New(ctx, &supervisor.Config{
    SupervisorAgent: supervisorAgent,
    SubAgents: []adk.Agent{
        researchAgent,
        experimentationAgent,
        reportAgent,
    },
})
```

#### 🎯 Plan-Execute 模式：结构化问题解决

Plan-Execute Agent 是 ADK 提供的基于「规划-执行-反思」范式的 Multi-Agent 协作模式（参考论文 **Plan-and-Solve Prompting**），旨在解决复杂任务的分步拆解、执行与动态调整问题，通过 Planner（规划器）、Executor（执行器）和 Replanner（重规划器） 三个核心智能体的协同工作，实现任务的结构化规划、工具调用执行、进度评估与动态重规划，最终达成用户目标，其中：

- **Planner**：根据用户目标，生成一个包含详细步骤且结构化的初始任务计划
- **Executor**：执行当前计划中的首个步骤
- **Replanner**：评估执行进度，决定是修正计划继续交由 Executor 运行，或是结束任务

<a href="/img/eino/eino_adk_plan_execute_replan_detail.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_replan_detail.png" width="100%" /></a>

Plan-Execute 模式有如下特点：

- **明确的分层架构**：通过将任务拆解为规划、执行和反思重规划三个阶段，形成层次分明的认知流程，体现了 “先思考再行动，再根据反馈调整” 的闭环认知策略，在各类场景中都能达到较好的效果。
- **动态迭代优化**：Replanner 根据执行结果和当前进度，实时判断任务是否完成或需调整计划，支持动态重规划。该机制有效解决了传统单次规划难以应对环境变化和任务不确定性的瓶颈，提升了系统的鲁棒性和灵活性。
- **职责分明且松耦合**：Plan-Execute 模式由多个智能体协同工作，支持独立开发、测试和替换。模块化设计方便扩展和维护，符合工程最佳实践。
- **具备良好扩展性**：不依赖特定的语言模型、工具或 Agent，方便集成多样化外部资源，满足不同应用场景需求。

Plan-Execute 模式的「规划 → 执行 → 重规划」闭环结构非常适合**需要多步骤推理、动态调整和工具集成的复杂任务场景**，例如：

- **复杂研究分析**：通过规划分解研究问题，执行多轮数据检索与计算，动态调整研究方向和假设，提升分析深度和准确性。
- **自动化工作流管理**：将复杂业务流程拆解为结构化步骤，结合多种工具（如数据库查询、API 调用、计算引擎）逐步执行，并根据执行结果动态优化流程。
- **多步骤问题解决**：适用于需要分步推理和多工具协作的场景，如法律咨询、技术诊断、策略制定等，确保每一步执行都有反馈和调整。
- **智能助理任务执行**：支持智能助理根据用户目标规划任务步骤，调用外部工具完成具体操作，并根据重规划思考结合用户反馈调整后续计划，提升任务完成的完整性和准确性。

```go
import github.com/cloudwego/eino/adk/prebuilt/planexecute

// Plan-Execute 模式的科研助手
researchAssistant := planexecute.New(ctx, &planexecute.Config{
    Planner: adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        Name: "research_planner",
        Instruction: "制定详细的研究计划，包括文献调研、数据收集、分析方法等",
        Model: gpt4Model,
    }),
    Executor: adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        Name: "research_executor",
        ToolsConfig: adk.ToolsConfig{
            Tools: []tool.BaseTool{
                scholarSearchTool,
                dataAnalysisTool,
                citationTool,
            },
        },
    }),
    Replanner: replannerAgent,
})
```

#### 🎯 DeepAgents 模式：规划驱动的集中式协作

DeepAgents 是一种在 Main Agent 统一协调下的 Multi-Agent 模式。Main Agent 借助具备工具调用能力的 ChatModel 以 ReAct 流程运行：

- 通过 WriteTodos 将用户目标拆解为结构化待办并记录进度
- 通过统一入口 TaskTool 选择并调用对应的 SubAgent 执行子任务；主/子代理上下文隔离，避免中间步骤污染主流程。
- 汇总各子代理返回的结果；必要时再次调用 WriteTodos 更新进度或进行重规划，直至完成。

<a href="/img/eino/eino_adk_deep_agents_overview.png" target="_blank"><img src="/img/eino/eino_adk_deep_agents_overview.png" width="100%" /></a>

DeepAgents 模式的特点为：

- **强化任务拆解与进度管理**：通过 WriteTodos 形成明确的子任务与里程碑，使复杂目标可分解、可跟踪。
- **上下文隔离更稳健**：子代理在“干净”上下文中执行，主代理仅汇总结果，减少冗余思维链和工具调用痕迹对主流程的干扰。
- **统一委派入口、易扩展**：TaskTool 将所有子代理与工具能力抽象为统一调用面，便于新增或替换专业子代理。
- **计划与执行的灵活闭环**：规划作为工具可按需调用；对简单任务可跳过不必要规划，从而降低 LLM 调用成本与耗时。
- **边界与权衡**：过度拆解会增加调用次数与成本；对子任务划分与提示词调优提出更高要求，模型需具备稳定的工具调用与规划能力。

DeepAgent 的核心价值在于自动化处理需要多步骤、多角色协作的复杂工作流。它不仅仅是单一功能的执行者，更是一个具备深度思考、规划和动态调整能力的“项目经理”，适配场景有：

- **多角色协作的复杂业务流程**：围绕研发、测试、发布、法务、运营多角色协作，集中委派子任务并统一汇总；每个阶段设定关口与回退策略，进度可视且可重试。
- **长流程的阶段性管理**：规划拆解清洗、校验、血缘分析、质检等步骤，子代理在隔离上下文中运行；出现异常时仅重跑相关阶段，产物统一对账与汇总。
- **需要严格上下文隔离的执行环境**：统一入口收集材料与请求，TaskTool 将法务、风控、财务等子任务分别路由；子任务之间边界清晰互不可见，进度与留痕可审计，失败可重试而不影响其他环节。

```go
import github.com/cloudwego/eino/adk/prebuilt/deep

agent, err := deep.New(ctx, &deep.Config{
    Name:      "deep-agent",
    ChatModel: gpt4Model,
    SubAgents: []adk.Agent{
       LegalAgent,
       RiskControlAgent,
       FinanceAgent,
    },
    MaxIteration: 100,
})
```

# 基础设计

## 🎯 统一的 Agent 抽象

ADK 的核心是一个简洁而强大的 `Agent` 接口：

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

每个 Agent 都有明确的身份（Name）、清晰的职责（Description）和标准化的执行方式（Run），为 Agent 之间的发现与调用提供了基础。无论是简单的问答机器人，还是复杂的多步骤任务处理系统，都可以通过这个统一的接口加以实现。

## ⚡ 异步事件驱动架构

ADK 采用了异步事件流设计，通过 `AsyncIterator[*AgentEvent]` 实现非阻塞的事件处理，并通过 `Runner` 框架运行 Agent：

- **实时响应**：`AgentEvent` 包含 Agent 执行过程中特定节点输出（Agent 回复、工具处理结果等等），用户可以立即看到 Agent 的思考过程和中间结果。
- **追踪执行过程**：`AgentEvent` 额外携带状态修改动作与运行轨迹，便于开发调试和理解 Agent 行为。
- **自动流程控制**：框架通过 `Runner` 自动处理中断、跳转、退出行为，无需用户额外干预。

## 🤝 灵活的协作机制

Eino ADK 支持处于同一个系统内的 Agent 之间以多种方式进行协作（交换数据或触发运行）：

- **共享 Session**：单次运行过程中持续存在的 KV 存储，用于支持跨 Agent 的状态管理和数据共享。

```go
// 获取全部 SessionValues
func GetSessionValues(ctx context.Context) map[string]any

// 指定 key 获取 SessionValues 中的一个值，key 不存在时第二个返回值为 false，否则为 true
func GetSessionValue(ctx context.Context, key string) (any, bool)

// 添加 SessionValues
func AddSessionValue(ctx context.Context, key string, value any)

// 批量添加 SessionValues
func AddSessionValues(ctx context.Context, kvs map[string]any)
```

- **移交运行（Transfer）**：携带本 Agent 输出结果上下文，将任务移交至子 Agent 继续处理。适用于智能体功能可以清晰的划分边界与层级的场景，常结合 ChatModelAgent 使用，通过 LLM 的生成结果进行动态路由。结构上，以此方式进行协作的两个 Agent 称为父子 Agent：

<a href="/img/eino/eino_adk_transfer.png" target="_blank"><img src="/img/eino/eino_adk_transfer.png" width="100%" /></a>

```go
// 设置父子 Agent 关系
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)

// 指定目标 Agent 名称，构造 Transfer Event
func NewTransferToAgentAction(destAgentName string) *AgentAction
```

- **显式调用（ToolCall）**：将 Agent 视为工具进行调用。适用于 Agent 运行仅需要明确清晰的参数而非完整运行上下文的场景，常结合 ChatModelAgent，作为工具运行后将结果返回给 ChatModel 继续处理。除此之外，ToolCall 同样支持调用符合工具接口构造的、不含 Agent 的普通工具。

<a href="/img/eino/eino_adk_agent_as_tool.png" target="_blank"><img src="/img/eino/eino_adk_agent_as_tool.png" width="100%" /></a>

```go
// 将 Agent 转换为 Tool
func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

## 🔄 **中断与恢复机制**

Eino ADK 提供运行时中断与恢复的功能，允许正在运行中的 Agent 主动中断并保存其当前状态，并在未来从中断点恢复执行。该功能为长时间等待、可暂停或需要外部输入（Human in the loop）等场景下的开发提供协助。

- Agent 内部运行过程中，通过抛出含 `Interrupt Action` 的 `Event` 主动通知 `Runner` 中断运行，并允许携带额外信息供调用方阅读与使用。
- `Runner` 通过初始化时注册的 `CheckPointStore` 记录当前运行状态
- 重新准备好运行后，通过 `Resume` 方法携带恢复运行所需要的新信息，从断点处重新启动该 Agent 运行

```go
// 1. 创建支持断点恢复的 Runner
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           complexAgent,
    CheckPointStore: memoryStore, // 内存状态存储
})

// 2. 开始执行
iter := runner.Query(ctx, "recommend a book to me", adk.WithCheckPointID("1"))
for {
    event, ok := iter.Next()
    if !ok {
       break
    }
    if event.Err != nil {
       log.Fatal(event.Err)
    }
    if event.Action != nil {
        // 3. 由 Agent 内部抛出 Interrupt 事件
        if event.Action.Interrupted != nil {
           ii, _ := json.MarshalIndent(event.Action.Interrupted.Data, "", "\t")
           fmt.Printf("action: interrupted\n")
           fmt.Printf("interrupt snapshot: %v", string(ii))
        }
    }
}

// 4. 从 stdin 接收用户输入
scanner := bufio.NewScanner(os.Stdin)
fmt.Print("\nyour input here: ")
scanner.Scan()
fmt.Println()
nInput := scanner.Text()

// 5. 携带用户输入信息，从断点恢复执行
iter, err := runner.Resume(ctx, "1", adk.WithToolOptions([]tool.Option{subagents.WithNewInput(nInput)}))
```

# 快速开始

## 安装

```go
go get github.com/cloudwego/eino@latest
```

## 项目开发经理智能体

下面的示例使用 Eino ADK 构建了一个项目开发经理智能体，面向多方面管理协同的场景：

- Project Manager Agent：项目经理智能体，整体使用 Supervisor 模式，各 Agent 的功能如下：
  - `ResearchAgent`：调研 Agent，负责调研并生成可行方案，支持中断后从用户处接收额外的上下文信息来提高调研方案生成的准确性。
  - `CodeAgent`：编码 Agent，使用知识库工具，召回相关知识作为参考，生成高质量的代码。
  - `ReviewAgent`：评论 Agent，使用顺序工作流编排问题分析、评价生成、评价验证三个步骤，对调研结果 / 编码结果进行评审，给出合理的评价，供项目经理进行决策。
  - `ProjectManagerAgent`：项目经理 Agent，根据动态的用户输入，路由并协调多个负责不同维度工作的子智能体开展工作。
- 该 Agent 可能的工作场景为：
  - **从零开始实现项目**：项目经理从需求入手，经由调研、编码、评论三个 Agent 工作，最终完成项目交付。
  - **对已有项目的完善**：项目经理从评论 Agent 获得项目仍旧需要完善的功能点，交由编码 Agent 进行实现，再交由评论 Agent 对修改后的代码进行评审。
  - **开展技术调研**：项目经理要求调研 Agent 生成技术调研报告，然后由评论 Agent 给出评审意见。调用方结合返回的技术调研报告和评审意见，决定后续动作。

<a href="/img/eino/eino_adk_project_manager.png" target="_blank"><img src="/img/eino/eino_adk_project_manager.png" width="100%" /></a>

该示例的设计涵盖了文中介绍的大部分概念，您可以基于示例回顾之前的提到的种种设计理念。另外，请试想普通开发模式下如何完成该示例的编写，ADK 的优势便立刻凸显了出来：

<table>
<tr><td>设计点</td><td>传统开发模式</td><td>基于 Eino ADK 开发</td></tr>
<tr><td>Agent 抽象</td><td>没有统一定义，团队协作开发效率差，后期维护成本高</td><td>统一定义，职责独立，代码整洁，便于各 Agent 分头开发</td></tr>
<tr><td>输入输出</td><td>没有统一定义，输入输出混乱运行过程只能手动加日志，不利于调试</td><td>有统一定义，全部基于事件驱动运行过程通过 iterator 透出，所见即所得</td></tr>
<tr><td>Agent 协作</td><td>通过代码手动传递上下文</td><td>框架自动传递上下文</td></tr>
<tr><td>中断恢复能力</td><td>需要从零开始实现，解决序列化与反序列化、状态存储与恢复等问题</td><td>仅需在 Runner 中注册 CheckPointStore 提供断点数据存储介质</td></tr>
<tr><td>Agent 模式</td><td>需要从零开始实现</td><td>多种成熟模式开箱即用</td></tr>
</table>

核心代码如下，完整代码详见 Eino-Examples 项目中提供的[源码](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-project-manager)：

```go
func main() {
    ctx := context.Background()

    // Init chat model for agents
    tcm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
       APIKey:  os.Getenv("OPENAI_API_KEY"),
       Model:   os.Getenv("OPENAI_MODEL"),
       BaseURL: os.Getenv("OPENAI_BASE_URL"),
       ByAzure: func() bool {
          return os.Getenv("OPENAI_BY_AZURE") == "true"
       }(),
    })
    if err != nil {
       log.Fatal(err)
    }

    // Init research agent
    researchAgent, err := agents.NewResearchAgent(ctx, tcm)
    if err != nil {
       log.Fatal(err)
    }

    // Init code agent
    codeAgent, err := agents.NewCodeAgent(ctx, tcm)
    if err != nil {
       log.Fatal(err)
    }

    // Init technical agent
    reviewAgent, err := agents.NewReviewAgent(ctx, tcm)
    if err != nil {
       log.Fatal(err)
    }

    // Init project manager agent
    s, err := agents.NewProjectManagerAgent(ctx, tcm)
    if err != nil {
       log.Fatal(err)
    }

    // Combine agents into ADK supervisor pattern
    // Supervisor: project manager
    // Sub-agents: researcher / coder / reviewer
    supervisorAgent, err := supervisor.New(ctx, &supervisor.Config{
       Supervisor: s,
       SubAgents:  []adk.Agent{researchAgent, codeAgent, reviewAgent},
    })
    if err != nil {
       log.Fatal(err)
    }

    // Init Agent runner
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent:           supervisorAgent,
       EnableStreaming: true,                // enable stream output
       CheckPointStore: newInMemoryStore(),  // enable checkpoint for interrupt & resume
    })

    // Replace it with your own query
    query := "please generate a simple ai chat project with python."
    checkpointID := "1"

    // Start runner with a new checkpoint id
    iter := runner.Query(ctx, query, adk.WithCheckPointID(checkpointID))
    interrupted := false
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       if event.Action != nil && event.Action.Interrupted != nil {
          interrupted = true
       }
       prints.Event(event)
    }

    if !interrupted {
       return
    }
    
    // interrupt and ask for additional user context
    scanner := bufio.NewScanner(os.Stdin)
    fmt.Print("\ninput additional context for web search: ")
    scanner.Scan()
    fmt.Println()
    nInput := scanner.Text()

    // Resume by checkpoint id, with additional user context injection
    iter, err = runner.Resume(ctx, checkpointID, adk.WithToolOptions([]tool.Option{agents.WithNewInput(nInput)}))
    if err != nil {
       log.Fatal(err)
    }
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       prints.Event(event)
    }
}
```

# 结尾

Eino ADK 不仅仅是一个开发框架，更是一个完整的智能体开发生态。它通过统一的抽象、灵活的组合和强大的协作机制，让 Go 开发者能够轻松构建从简单对话机器人到复杂多智能体系统的各种 AI 应用。

> 💡
> **立即开始你的智能体开发之旅**
>
> - 📚 查看更多文档：[Eino ADK 文档](https://www.cloudwego.io/zh/docs/eino/core_modules/eino_adk/)
> - 🛠️ 浏览 ADK 源码：[Eino ADK 源码](https://github.com/cloudwego/eino/tree/main/adk)
> - 💡 探索全部示例：[Eino ADK Examples](https://github.com/cloudwego/eino-examples/tree/main/adk)
> - 🤝 加入开发者社区：与其他开发者交流经验和最佳实践
>
> Eino ADK，让智能体开发变得简单而强大！

<a href="/img/eino/eino_adk_user_group.png" target="_blank"><img src="/img/eino/eino_adk_user_group.png" width="100%" /></a>
