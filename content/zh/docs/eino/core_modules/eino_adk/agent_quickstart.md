---
Description: ""
date: "2025-09-30"
lastmod: ""
tags: []
title: 'Eino ADK: Quickstart'
weight: 1
---

## Installation

Eino 自 0.5.0 版本正式提供 ADK 功能供用户使用，您可以在项目中输入下面命令来升级 Eino：

```go
// stable >= eino@v0.5.0
go get github.com/cloudwego/eino@latest
```

## Agent

### 什么是 Eino ADK

Eino ADK 参考 [Google-ADK](https://google.github.io/adk-docs/agents/) 的设计，提供了 Go 语言 的 Agents 开发的灵活组合框架，即 Agent、Multi-Agent 开发框架，并为多 Agent 交互场景沉淀了通用的上下文传递、事件流分发和转换、任务控制权转让、中断与恢复、通用切面等能力。

### 什么是 Agent

Agent 是 Eino ADK 的核心，它代表一个独立的、可执行的智能任务单元。你可以把它想象成一个能够理解指令、执行任务并给出回应的“智能体”。每个 Agent 都有明确的名称和描述，使其可以被其他 Agent 发现和调用。

任何需要与大语言模型（LLM）交互的场景都可以抽象为一个 Agent。例如：

- 一个用于查询天气信息的 Agent。
- 一个用于预定会议的 Agent。
- 一个能够回答特定领域知识的 Agent。

### Eino ADK 中的 Agent

Eino ADK 中的所有功能设计均围绕 Agent 抽象设计展开：

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput) *AsyncIterator[*AgentEvent]
}
```

基于 Agent 抽象，ADK 提供了三大类基础拓展：

- `ChatModel Agent`: 应用程序的“思考”部分，利用 LLM 作为核心，理解自然语言，进行推理、规划、生成响应，并动态决定如何执行或使用哪些工具。
- `Workflow Agents`：应用程序的协调管理部分，基于预定义的逻辑，按照自身类型（顺序 / 并发 / 循环）控制子 Agent 执行流程。Workflow Agents 产生确定性的，可预测的执行模式，不同于 ChatModel Agent 生成的动态随机的决策。
  - 顺序 (Sequential Agent)：按顺序依次执行子 Agents
  - 循环 (Loop Agent)：重复执行子 Agents，直至满足特定的终止条件
  - 并行 (Parallel Agent)：并行执行多个子 Agents
- `Custom Agent`：通过接口实现自己的 Agent，允许定义高度定制的复杂 Agent

基于基础扩展，您可以针对自己的需求排列组合这些基础 Agents，构建所需要的 Multi-Agent 系统。另外，Eino 从日常实践经验出发，内置提供了几种开箱即用的 Multi-Agent 最佳范式：

- Supervisor: 监督者模式，监督者 Agent 控制所有通信流程和任务委托，并根据当前上下文和任务需求决定调用哪个 Agent。
- Plan-Execute：计划-执行模式，Plan Agent 生成含多个步骤的计划，Execute Agent 根据用户 query 和计划来完成任务。Execute 后会再次调用 Plan，决定完成任务 / 重新进行规划。

下方表格和图提供了这些基础拓展与封装的特点，区别，与关系。后续章节中将展开介绍每种类型的原理与细节：

<table class="bd-browser-bugs table table-bordered table-hover">
<tr><td>类别</td><td>ChatModel Agent</td><td>Workflow Agents</td><td>Custom Logic</td><td>EinoBuiltInAgent(supervisor, plan-execute)</td></tr>
<tr><td>功能</td><td>思考，生成，工具调用</td><td>控制 Agent 之间的执行流程</td><td>运行自定义逻辑</td><td>开箱即用的 Multi-agent 模式封装</td></tr>
<tr><td>核心</td><td>LLM</td><td>预确定的执行流程（顺序，并发，循环）</td><td>自定义代码</td><td>基于 Eino 实践积累的经验，对前三者的高度封装</td></tr>
<tr><td>用途</td><td>生成，动态决策</td><td>结构化处理，编排</td><td>定制需求</td><td>特定场景内的开箱即用</td></tr>
</table>

<a href="/img/eino/KWOJwXt40hnDvEbjGFzcgA8BnIe.png" target="_blank"><img src="/img/eino/KWOJwXt40hnDvEbjGFzcgA8BnIe.png" width="80%" /></a>

## ADK Examples

[Eino-examples](https://github.com/cloudwego/eino-examples/tree/main/adk) 项目中提供了多种 ADK 的实施样例，您可以参考样例代码与简介，对 adk 能力构建初步的认知：

<table class="bd-browser-bugs table table-bordered table-hover">
<tr><td>项目路径</td><td>简介</td><td>结构图</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/sequential">顺序工作流案例</a></td><td>该示例代码展示了基于 eino adk 的 Workflow 模式构建的一个顺序执行的多智能体工作流。<li>顺序工作流构建：通过 adk.NewSequentialAgent 创建一个名为 ResearchAgent 的顺序执行智能体，内部包含两个子智能体（SubAgents）PlanAgent 和 WriterAgent，分别负责研究计划制定和报告撰写。</li><li>子智能体职责明确：PlanAgent 接收研究主题，生成详细且逻辑清晰的研究计划；WriterAgent 根据该研究计划撰写结构完整的学术报告。</li><li>输入输出串联：PlanAgent 输出的研究计划作为 WriterAgent 的输入，形成清晰的上下游数据流，体现业务步骤的顺序依赖。</li></td><td><a href="/img/eino/H0hbwjsHmhkQKobDBwLck70Gnte.png" target="_blank"><img src="/img/eino/H0hbwjsHmhkQKobDBwLck70Gnte.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/loop">循环工作流案例</a></td><td>该示例代码基于 eino adk 的 Workflow 模式中的 LoopAgent，构建了一个反思迭代型智能体框架。<li>迭代反思框架：通过 adk.NewLoopAgent 创建 ReflectionAgent，包含两个子智能体 MainAgent 和 CritiqueAgent，支持最多 5 次迭代，形成主任务解决与批判反馈的闭环。</li><li>主智能体（MainAgent）：负责根据用户任务生成初步解决方案，追求准确完整的答案输出。</li><li>批判智能体（CritiqueAgent）：对主智能体输出进行质量审查，反馈改进意见，若结果满意则终止循环，提供最终总结。</li><li>循环机制：利用 LoopAgent 的迭代能力，实现在多轮反思中不断优化解决方案，提高输出质量和准确性。</li></td><td><a href="/img/eino/BeADw7qRvhynofbHnBvcJJwWnrc.png" target="_blank"><img src="/img/eino/BeADw7qRvhynofbHnBvcJJwWnrc.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/parallel">并行工作流案例</a></td><td>该示例代码基于 eino adk 的 Workflow 模式中的 ParallelAgent，构建了一个并发信息搜集框架：<li>并发运行框架：通过 adk.NewParallelAgent 创建 DataCollectionAgent，包含多个信息采集子智能体。</li><li>子智能体职责分配：每个子智能体负责一个渠道的信息采集与分析，彼此之间无需交互，功能边界清晰。</li><li>并发运行：Parallel Agent 能够同时从多个数据源启动信息收集任务，处理效率相较于串行方式显著提升。</li></td><td><a href="/img/eino/O6ezw1UfVh4jUFbTAPTcvaCzn0g.png" target="_blank"><img src="/img/eino/O6ezw1UfVh4jUFbTAPTcvaCzn0g.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/supervisor">supervisor</a></td><td>该用例采用单层 Supervisor 管理两个功能较为综合的子 Agent：Research Agent 负责检索任务，Math Agent 负责多种数学运算（加、乘、除），但所有数学运算均由同一个 Math Agent 内部统一处理，而非拆分为多个子 Agent。此设计简化了代理层级，适合任务较为集中且不需要过度拆解的场景，便于快速部署和维护。</td><td><a href="/img/eino/AgV7wB9hohnlNwbRTMMcSSxsnnf.png" target="_blank"><img src="/img/eino/AgV7wB9hohnlNwbRTMMcSSxsnnf.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/layered-supervisor">layered-supervisor</a></td><td>该用例实现了多层级智能体监督体系，顶层 Supervisor 管理 Research Agent 和 Math Agent，Math Agent 又进一步细分为 Subtract、Multiply、Divide 三个子 Agent。顶层 Supervisor 负责将研究任务和数学任务分配给下级 Agent，Math Agent 作为中层监督者再将具体数学运算任务分派给其子 Agent。<li>多层级智能体结构：实现了一个顶层 Supervisor Agent，管理两个子智能体 ——Research Agent（负责信息检索）和 Math Agent（负责数学运算）。</li><li>Math Agent 内部再细分三个子智能体：Subtract Agent、Multiply Agent 和 Divide Agent，分别处理减法、乘法和除法运算，体现多级监督和任务委派。</li>这种分层管理结构体现了复杂任务的细粒度拆解和多级任务委派，适合任务分类清晰且计算复杂的场景。</td><td><a href="/img/eino/CwpiwGzBSh7HV1bQtJBcQ8brnHf.png" target="_blank"><img src="/img/eino/CwpiwGzBSh7HV1bQtJBcQ8brnHf.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/plan-execute-replan">plan-execute 案例</a></td><td>本示例基于 eino adk 实现 plan-execute-replan 模式的多 Agent 旅行规划系统，核心功能是处理用户复杂旅行请求（如 “3 天北京游，需从纽约出发的航班、酒店推荐、必去景点”），通过 “计划 - 执行 - 重新计划” 循环完成任务：<li>1. 计划（Plan）：Planner Agent 基于大模型生成分步执行计划（如 “第一步查北京天气，第二步搜纽约到北京航班”）；</li><li>2. 执行（Execute）：Executor Agent 调用天气（get_weather）、航班（search_flights）、酒店（search_hotels）、景点（search_attractions）等 Mock 工具执行每一步，若用户输入信息缺失（如未说明预算），则调用 ask_for_clarification 工具追问；</li><li>3. 重新计划（Replan）：Replanner Agent 根据工具执行结果评估是否需要调整计划（如航班无票则重新选日期）。Execute 和 Replan 不断循环运行，直至完成计划中的所有步骤；</li><li>4. 支持会话轨迹跟踪（CozeLoop 回调）和状态管理，最终输出完整旅行方案。</li><br></br>从结构上看，plan-execute-replan 分为两层：<li>第二层是由 execute + replan agent 构成的 loop agent，即 replan 后可能需要重新 execute（重新规划后需要查询旅行信息 / 请求用户继续澄清问题）</li><li>第一层是由 plan agent + 第二层构造的 loop agent 构成的 sequential agent，即 plan 仅执行一次，然后交由 loop agent 执行</li></td><td><a href="/img/eino/Bd5xwDLkrhR7vRbwVgpctWnHnkJ.png" target="_blank"><img src="/img/eino/Bd5xwDLkrhR7vRbwVgpctWnHnkJ.png" width="100%" /></a></td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/chatmodel">书籍推荐 agent</a>（运行中断与恢复）</td><td>该代码展示了基于 eino adk 框架构建的一个书籍推荐聊天智能体实现，体现了 Agent 运行中断与恢复功能。<li>Agent 构建：通过 adk.NewChatModelAgent 创建一个名为 BookRecommender 的聊天智能体，用于根据用户请求推荐书籍。</li><li>工具集成：集成了两个工具 —— 搜索书籍的 BookSearch 工具 和 询问澄清信息的 AskForClarification 工具，支持多轮交互和信息补充。</li><li>状态管理：实现了简单的内存 CheckPoint 存储，支持会话的断点续接，保证上下文连续性。</li><li>事件驱动：通过迭代 runner.Query 和 runner.Resume 获取事件流，处理执行过程中的各种事件及错误。</li><li>自定义输入：支持动态接收用户输入，利用工具选项传入新的查询请求，灵活驱动任务流程。</li></td><td><a href="/img/eino/PprGwUBK7hoPR4bZIDDcF8vwnQg.png" target="_blank"><img src="/img/eino/PprGwUBK7hoPR4bZIDDcF8vwnQg.png" width="100%" /></a></td></tr>
</table>

## What's Next

经过 Quickstart 概览，您应该对 Eino ADK 与 Agent 有了基础的认知。

接下来的文章将深入介绍 ADK 的核心概念，助您理解 Eino ADK 的工作原理并更好的使用它：

<a href="/img/eino/DIJjweyWRh25ynbJWE3crGJdnne.png" target="_blank"><img src="/img/eino/DIJjweyWRh25ynbJWE3crGJdnne.png" width="80%" /></a>
