---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: 'Eino: Cookbook'
weight: 3
---

本文档为 eino-examples 项目的示例索引，帮助开发者快速找到所需的示例代码。

**GitHub 仓库**: [https://github.com/cloudwego/eino-examples](https://github.com/cloudwego/eino-examples)

---

## 📦 ADK (Agent Development Kit)

### Hello World

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/helloworld">adk/helloworld</a></td><td>Hello World Agent</td><td>最简单的 Agent 示例，展示如何创建一个基础的对话 Agent</td></tr>
</table>

### 入门示例 (Intro)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/chatmodel">adk/intro/chatmodel</a></td><td>ChatModel Agent</td><td>展示如何使用 ChatModelAgent 并配合 Interrupt 机制</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/custom">adk/intro/custom</a></td><td>自定义 Agent</td><td>展示如何实现符合 ADK 定义的自定义 Agent</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/loop">adk/intro/workflow/loop</a></td><td>Loop Agent</td><td>展示如何使用 LoopAgent 实现循环反思模式</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/parallel">adk/intro/workflow/parallel</a></td><td>Parallel Agent</td><td>展示如何使用 ParallelAgent 实现并行执行</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/sequential">adk/intro/workflow/sequential</a></td><td>Sequential Agent</td><td>展示如何使用 SequentialAgent 实现顺序执行</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/session">adk/intro/session</a></td><td>Session 管理</td><td>展示如何通过 Session 在多个 Agent 之间传递数据和状态</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/transfer">adk/intro/transfer</a></td><td>Agent 转移</td><td>展示 ChatModelAgent 的 Transfer 能力，实现 Agent 间的任务转移</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/agent_with_summarization">adk/intro/agent_with_summarization</a></td><td>带摘要的 Agent</td><td>展示如何为 Agent 添加对话摘要功能</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/http-sse-service">adk/intro/http-sse-service</a></td><td>HTTP SSE 服务</td><td>展示如何将 ADK Runner 暴露为支持 Server-Sent Events 的 HTTP 服务</td></tr>
</table>

### Human-in-the-Loop (人机协作)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/1_approval">adk/human-in-the-loop/1_approval</a></td><td>审批模式</td><td>展示敏感操作前的人工审批机制，Agent 执行前需用户确认</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/2_review-and-edit">adk/human-in-the-loop/2_review-and-edit</a></td><td>审核编辑模式</td><td>展示工具调用参数的人工审核和编辑，支持修改、批准或拒绝</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/3_feedback-loop">adk/human-in-the-loop/3_feedback-loop</a></td><td>反馈循环模式</td><td>多 Agent 协作，Writer 生成内容，Reviewer 收集人工反馈，支持迭代优化</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/4_follow-up">adk/human-in-the-loop/4_follow-up</a></td><td>追问模式</td><td>智能识别信息缺失，通过多轮追问收集用户需求，完成复杂任务规划</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/5_supervisor">adk/human-in-the-loop/5_supervisor</a></td><td>Supervisor + 审批</td><td>Supervisor 多 Agent 模式结合审批机制，敏感操作需人工确认</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/6_plan-execute-replan">adk/human-in-the-loop/6_plan-execute-replan</a></td><td>计划执行重规划 + 审核编辑</td><td>Plan-Execute-Replan 模式结合参数审核编辑，支持预订参数修改</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/7_deep-agents">adk/human-in-the-loop/7_deep-agents</a></td><td>Deep Agents + 追问</td><td>Deep Agents 模式结合追问机制，在分析前主动收集用户偏好</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/8_supervisor-plan-execute">adk/human-in-the-loop/8_supervisor-plan-execute</a></td><td>嵌套多 Agent + 审批</td><td>Supervisor 嵌套 Plan-Execute-Replan 子 Agent，支持深层嵌套中断</td></tr>
</table>

### Multi-Agent (多 Agent 协作)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/supervisor">adk/multiagent/supervisor</a></td><td>Supervisor Agent</td><td>基础的 Supervisor 多 Agent 模式，协调多个子 Agent 完成任务</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/layered-supervisor">adk/multiagent/layered-supervisor</a></td><td>分层 Supervisor</td><td>多层 Supervisor 嵌套，一个 Supervisor 作为另一个的子 Agent</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/plan-execute-replan">adk/multiagent/plan-execute-replan</a></td><td>Plan-Execute-Replan</td><td>计划-执行-重规划模式，支持动态调整执行计划</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-project-manager">adk/multiagent/integration-project-manager</a></td><td>项目管理器</td><td>使用 Supervisor 模式的项目管理示例，包含 Coder、Researcher、Reviewer</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep">adk/multiagent/deep</a></td><td>Deep Agents (Excel Agent)</td><td>智能 Excel 助手，分步骤理解和处理 Excel 文件，支持 Python 代码执行</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-excel-agent">adk/multiagent/integration-excel-agent</a></td><td>Excel Agent (ADK 集成版)</td><td>ADK 集成版 Excel Agent，包含 Planner、Executor、Replanner、Reporter</td></tr>
</table>

### GraphTool (图工具)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool">adk/common/tool/graphtool</a></td><td>GraphTool 包</td><td>将 Graph/Chain/Workflow 封装为 Agent 工具的工具包</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/1_chain_summarize">adk/common/tool/graphtool/examples/1_chain_summarize</a></td><td>Chain 文档摘要</td><td>使用 compose.Chain 实现文档摘要工具</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/2_graph_research">adk/common/tool/graphtool/examples/2_graph_research</a></td><td>Graph 多源研究</td><td>使用 compose.Graph 实现并行多源搜索和流式输出</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/3_workflow_order">adk/common/tool/graphtool/examples/3_workflow_order</a></td><td>Workflow 订单处理</td><td>使用 compose.Workflow 实现订单处理，结合审批机制</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/4_nested_interrupt">adk/common/tool/graphtool/examples/4_nested_interrupt</a></td><td>嵌套中断</td><td>展示外层审批和内层风控的双层中断机制</td></tr>
</table>

---

## 🔗 Compose (编排)

### Chain (链式编排)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/chain">compose/chain</a></td><td>Chain 基础示例</td><td>展示如何使用 compose.Chain 进行顺序编排，包含 Prompt + ChatModel</td></tr>
</table>

### Graph (图编排)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/simple">compose/graph/simple</a></td><td>简单 Graph</td><td>Graph 基础用法示例</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/state">compose/graph/state</a></td><td>State Graph</td><td>带状态的 Graph 示例</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/tool_call_agent">compose/graph/tool_call_agent</a></td><td>Tool Call Agent</td><td>使用 Graph 构建工具调用 Agent</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/tool_call_once">compose/graph/tool_call_once</a></td><td>单次工具调用</td><td>展示单次工具调用的 Graph 实现</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/two_model_chat">compose/graph/two_model_chat</a></td><td>双模型对话</td><td>两个模型相互对话的 Graph 示例</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/async_node">compose/graph/async_node</a></td><td>异步节点</td><td>展示异步 Lambda 节点，包含报告生成和实时转录场景</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt">compose/graph/react_with_interrupt</a></td><td>ReAct + 中断</td><td>票务预订场景，展示 Interrupt 和 Checkpoint 实践</td></tr>
</table>

### Workflow (工作流编排)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/1_simple">compose/workflow/1_simple</a></td><td>简单 Workflow</td><td>最简单的 Workflow 示例，等价于 Graph</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/2_field_mapping">compose/workflow/2_field_mapping</a></td><td>字段映射</td><td>展示 Workflow 的字段映射功能</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/3_data_only">compose/workflow/3_data_only</a></td><td>纯数据流</td><td>仅数据流的 Workflow 示例</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/4_control_only_branch">compose/workflow/4_control_only_branch</a></td><td>控制流分支</td><td>仅控制流的分支示例</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/5_static_values">compose/workflow/5_static_values</a></td><td>静态值</td><td>展示如何在 Workflow 中使用静态值</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/6_stream_field_map">compose/workflow/6_stream_field_map</a></td><td>流式字段映射</td><td>流式场景下的字段映射</td></tr>
</table>

### Batch (批处理)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/batch">compose/batch</a></td><td>BatchNode</td><td>批量处理组件，支持并发控制、中断恢复，适用于文档批量审核等场景</td></tr>
</table>

---

## 🌊 Flow (流程模块)

### ReAct Agent

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react">flow/agent/react</a></td><td>ReAct Agent</td><td>ReAct Agent 基础示例，餐厅推荐场景</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react/memory_example">flow/agent/react/memory_example</a></td><td>短期记忆</td><td>ReAct Agent 的短期记忆实现，支持内存和 Redis 存储</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react/dynamic_option_example">flow/agent/react/dynamic_option_example</a></td><td>动态选项</td><td>运行时动态修改 Model Option，控制思考模式和工具选择</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react/unknown_tool_handler_example">flow/agent/react/unknown_tool_handler_example</a></td><td>未知工具处理</td><td>处理模型幻觉产生的未知工具调用，提高 Agent 鲁棒性</td></tr>
</table>

### Multi-Agent

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/host/journal">flow/agent/multiagent/host/journal</a></td><td>日记助手</td><td>Host Multi-Agent 示例，支持写日记、读日记、根据日记回答问题</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/plan_execute">flow/agent/multiagent/plan_execute</a></td><td>Plan-Execute</td><td>计划执行模式的 Multi-Agent 示例</td></tr>
</table>

### 完整应用示例

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/manus">flow/agent/manus</a></td><td>Manus Agent</td><td>基于 Eino 实现的 Manus Agent，参考 OpenManus 项目</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/deer-go">flow/agent/deer-go</a></td><td>Deer-Go</td><td>参考 deer-flow 的 Go 语言实现，支持研究团队协作的状态图流转</td></tr>
</table>

---

## 🧩 Components (组件)

### Model (模型)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/model/abtest">components/model/abtest</a></td><td>A/B 测试路由</td><td>动态路由 ChatModel，支持 A/B 测试和模型切换</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport">components/model/httptransport</a></td><td>HTTP 传输日志</td><td>cURL 风格的 HTTP 请求日志记录，支持流式响应和敏感信息脱敏</td></tr>
</table>

### Retriever (检索器)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/retriever/multiquery">components/retriever/multiquery</a></td><td>多查询检索</td><td>使用 LLM 生成多个查询变体，提高检索召回率</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/retriever/router">components/retriever/router</a></td><td>路由检索</td><td>根据查询内容动态路由到不同的检索器</td></tr>
</table>

### Tool (工具)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/jsonschema">components/tool/jsonschema</a></td><td>JSON Schema 工具</td><td>展示如何使用 JSON Schema 定义工具参数</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/mcptool/callresulthandler">components/tool/mcptool/callresulthandler</a></td><td>MCP 工具结果处理</td><td>展示 MCP 工具调用结果的自定义处理</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/errorremover">components/tool/middlewares/errorremover</a></td><td>错误移除中间件</td><td>工具调用错误处理中间件，将错误转换为友好提示</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix">components/tool/middlewares/jsonfix</a></td><td>JSON 修复中间件</td><td>修复 LLM 生成的格式错误 JSON 参数</td></tr>
</table>

### Document (文档)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/document/parser/customparser">components/document/parser/customparser</a></td><td>自定义解析器</td><td>展示如何实现自定义文档解析器</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/document/parser/extparser">components/document/parser/extparser</a></td><td>扩展解析器</td><td>使用扩展解析器处理 HTML 等格式</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/document/parser/textparser">components/document/parser/textparser</a></td><td>文本解析器</td><td>基础文本文档解析器示例</td></tr>
</table>

### Prompt (提示词)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/prompt/chat_prompt">components/prompt/chat_prompt</a></td><td>Chat Prompt</td><td>展示如何使用 Chat Prompt 模板</td></tr>
</table>

### Lambda

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/lambda">components/lambda</a></td><td>Lambda 组件</td><td>Lambda 函数组件的使用示例</td></tr>
</table>

---

## 🚀 QuickStart (快速开始)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/chat">quickstart/chat</a></td><td>Chat 快速开始</td><td>最基础的 LLM 对话示例，包含模板、生成、流式输出</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant">quickstart/eino_assistant</a></td><td>Eino 助手</td><td>完整的 RAG 应用示例，包含知识索引、Agent 服务、Web 界面</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/todoagent">quickstart/todoagent</a></td><td>Todo Agent</td><td>简单的 Todo 管理 Agent 示例</td></tr>
</table>

---

## 🛠️ DevOps (开发运维)

<table>
<tr><td>目录</td><td>名称</td><td>说明</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/devops/debug">devops/debug</a></td><td>调试工具</td><td>展示如何使用 Eino 的调试功能，支持 Chain 和 Graph 调试</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/devops/visualize">devops/visualize</a></td><td>可视化工具</td><td>将 Graph/Chain/Workflow 渲染为 Mermaid 图表</td></tr>
</table>

---

## 📚 相关资源

- **Eino 框架**: [https://github.com/cloudwego/eino](https://github.com/cloudwego/eino)
- **Eino 扩展组件**: [https://github.com/cloudwego/eino-ext](https://github.com/cloudwego/eino-ext)
- **官方文档**: [https://www.cloudwego.io/zh/docs/eino/](https://www.cloudwego.io/zh/docs/eino/)
