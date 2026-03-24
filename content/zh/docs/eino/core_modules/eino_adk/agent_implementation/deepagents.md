---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: DeepAgents
weight: 5
---

## DeepAgents 概述

DeepAgents 是在 ChatModelAgent (详见：[Eino ADK: ChatModelAgent](/zh/docs/eino/core_modules/eino_adk/agent_implementation/chat_model))的基础上实现的一种开箱即用的 agent 方案。你无需自己去拼装提示词、工具或上下文管理，就可以立即获得一个可运行的 agent，并仍可使用 ChatModelAgent 的扩展能力来为 agent 增加业务功能，如添加自定义 tools 和 middleware 等。

**包含内容：**

- **规划能力** —— 通过 `write_todos` 进行任务拆解与进度跟踪
- **文件系统** —— 提供 `read_file`、`write_file`、`edit_file`、`ls`、`glob`、`grep`，用于读取和写入上下文
- **Shell 访问** —— 使用 `execute` 运行命令
- **子 Agent** —— 通过 `task` 将工作委派给拥有独立上下文窗口的子智能体
- **智能默认配置** —— 内置 Prompt，教模型如何高效使用这些工具
- **上下文管理** —— 长对话历史自动摘要，大体量输出自动保存到文件
  - SummarizationMiddleware、ReductionMiddleware 正在建设中

### ImportPath

Eino 版本需大于等于 v0.5.14

```go
import github.com/cloudwego/eino/adk/prebuilt/deep

agent, err := deep.New(ctx, &deep.Config{})
```

### DeepAgents 结构

DeepAgents 核心思想在于通过一个主 agent（MainAgent）来协调、规划、委派或自主执行任务。主 agent 利用其内置的 ChatModel 和一系列工具来与外部世界交互或将复杂任务分解给专门的子 agents（SubAgents）。

<a href="/img/eino/A737bctqLoOzNrxbK8Hc5ccmnEb.png" target="_blank"><img src="/img/eino/A737bctqLoOzNrxbK8Hc5ccmnEb.png" width="100%" /></a>

上图展示了 DeepAgents 的核心组件与它们之间的调用关系：

- 主 Agent: 系统的入口和总指挥，接收初始任务，以 ReAct 方式调用工具完成任务并负责最终结果的呈现。
- ChatModel (ToolCallingChatModel): 通常是一个具备工具调用能力的大语言模型，负责理解任务、推理、选择并调用工具。
- Tools: MainAgent 可用的一系列能力的集合，包括：
  - WriteTodos: 内置的规划工具，用于将复杂任务拆解为结构化的待办事项列表。
  - TaskTool: 一个特殊的工具，作为调用子 Agent 的统一入口。
  - BuiltinTools、CustomTools: DeepAgents 内置的通用工具以及用户根据业务需求自定义的各类工具。
- SubAgents: 负责执行具体、独立的子任务，与 MainAgent 上下文独立。
  - GeneralPurpose: 通用子 Agent，具有与 MainAgent 相同的 Tools（除了 TaskTool），用于在“干净”的上下文中执行子任务。
  - CustomSubAgents: 用户根据业务需求自定义的各种子 Agent。

### 内置能力

#### Filesystem

> 💡
> 目前处于 alpha 状态

创建 DeepAgents 时配置相关 Backend，DeepAgents 会自动加载相应工具：

```
type Config struct {
    // ...
    Backend filesystem.Backend
    Shell filesystem.Shell
    StreamingShell filesystem.StreamingShell
    // ...
}
```

<table>
<tr><td>配置</td><td>功能</td><td>添加工具</td></tr>
<tr><td>Backend</td><td>提供文件系统访问能力，可选</td><td>read_file, write_file, edit_file, glob, grep</td></tr>
<tr><td>Shell</td><td>提供 Shell 能力，可选，与 StreamShell 互斥</td><td> execute</td></tr>
<tr><td>StreamingShell</td><td>提供可以流式返回结果的 Shell 能力，可选，与 Shell 互斥</td><td>execute(streaming)</td></tr>
</table>

DeepAgents 内引用 filesystem middleware 来实现内置 filesystem，此 middleware 更详细的能力说明见：[Middleware: FileSystem](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_filesystem)

### 任务拆解与规划

WriteTodos 的 Description 描述了任务拆解、规划的原则，主 Agent 通过调用 WriteTodos 工具，在上下文中添加子任务列表来启发后续推理、执行过程：

<a href="/img/eino/eino_adk_write_todos.png" target="_blank"><img src="/img/eino/eino_adk_write_todos.png" width="100%" /></a>

1. 模型接收用户输入。
2. 模型调用 WriteTodos 工具，参数为依照 WriteTodos Description 产生的任务列表。这次工具调用被添加到上下文中，供后续参考。
3. 模型依照上下文中的 todos，调用 TaskTool 完成第一个 todo。
4. 再次调用 WriteTodos ，更新 Todos 执行进度。

> 💡
> 对简单任务来说，每次都调用 WriteTodos 可能会起到反效果。WriteTodos Description 中添加了一些比较通用的正反例子来避免不调用或过度调用 WriteTodos。使用 DeepAgents 时，可以根据实际业务场景添加更多 prompt 来让 WriteTodos 在合适的时候被调用。

> 💡
> WriteTodos 会被默认添加到 Agent 中，配置 `WithoutWriteTodos=true` 可以关闭 WriteTodos。

### 任务委派与 SubAgents 调用

**TaskTool**

所有子 Agent 会被绑定到 TaskTool 上，当主 Agent 分配子任务给子 Agent 处理时，它会调用 TaskTool，并指明需要哪个子代理及执行的任务。TaskTool 随后将任务路由到指定的子代理，并在其执行完毕后，将结果返回给主 Agent。TaskTool 的默认 Description 会说明调用子 Agent 的通用规则并拼接每个子 Agent 的 Description，开发者可以通过配置 `TaskToolDescriptionGenerator` 来自定义 TaskTool 的 Description。

> 当用户配置了 Config.SubAgents 时，这些 Agent 会基于 ChatModelAgent AgentAsTool 的能力绑定到 TaskTool 上

**上下文隔离**

Agent 之间的上下文隔离：

- 信息传递: 主 Agent 与子 Agent 之间不共享上下文。子 Agent 仅接收主 Agent 分配的子任务目标，不会接收整个任务的处理过程；主 Agent 仅接收子 Agent 的处理结果，不会接受子 Agent 的处理过程。
- 避免污染: 这种隔离确保了子 Agent 的执行过程（如大量的工具调用和中间步骤）不会“污染”主代理的上下文，主代理只接收简洁、明确的最终答案。

**general-purpose**

DeepAgents 会默认增加一个子 Agent：general-purpose。general-purpose 具有和主 Agent 相同的 system prompt 和工具（除了 TaskTool），当任务没有专门的子 Agent 来解决时，主 Agent 可以调用 general-purpose 来隔离上下文。开发者可以通过配置 `WithoutGeneralSubAgent=true` 去掉此 Agent。

### 与其他 Agent 对比

- 对比 ReAct Agent

  - 优势：DeepAgents 通过内置 WriteTodos 强化任务拆解与规划；同时隔离多 Agents 上下文，在大规模、多步骤任务中通常效果更优。
  - 劣势：制定计划与调用子 Agent 会带来额外的模型请求，增加耗时与 token 成本；若任务拆分不合理，可能对效果产生反作用。
- 对比 Plan-and-Execute

  - 优势：DeepAgents 将 Plan/RePlan 作为工具供主 Agent 自由调用，可以在任务中跳过不必要的规划，整体上减少模型调用次数、降低耗时与成本。
  - 劣势：任务规划与委派由一次模型调用完成，对模型能力要求更高，提示词调优也相对更困难。

## DeepAgents 使用示例

### 场景说明

Excel Agent 是一个“看得懂 Excel 的智能助手”，它先把问题拆解成步骤，再一步步执行并校验结果。它能理解用户问题与上传的文件内容，提出可行的解决方案，并选择合适的工具（系统命令、生成并运行 Python 代码、网络查询等等）完成任务。

在真实业务里，你可以把 Excel Agent 当成一位“Excel 专家 + 自动化工程师”。当你交付一个原始表格和目标描述，它会给出方案并完成执行：

- **数据清理与格式化**：从一个包含大量数据的 Excel 文件中完成去重、空值处理、日期格式标准化操作。
- **数据分析与报告生成**：从销售数据中提取每月的销售总额，聚合统计、透视，最终生成并导出图表报告。
- **自动化预算计算**：根据不同部门的预算申请，自动计算总预算并生成部门预算分配表。
- **数据匹配与合并**：将多个不同来源的客户信息表进行匹配合并，生成完整的客户信息数据库。

用 DeepAgents 搭建的 Excel Agent 结构如下：

<a href="/img/eino/eino_adk_excel_using_deep.png" target="_blank"><img src="/img/eino/eino_adk_excel_using_deep.png" width="100%" /></a>

1. 在主 Agent 添加 ReadFile 工具，允许主 Agent 查看文件内容，辅助子任务制定
2. 添加 Code 和 WebSearch 两个子 Agent：Code 可以编写 python 代码来操作 excel 表格；WebSearch 可以搜索信息并总结。

### 代码实现

[https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep)

### 运行结果

```yaml
name: ExcelAgent
path: [{ExcelAgent}]
tool name: task
arguments: {"subagent_type":"CodeAgent","description":"请帮我处理一个CSV文件操作任务。具体要求如下：1. 读取当前目录下的questions.csv文件；2. 提取该CSV文件中的第一列数据；3. 将提取出的第一列数据保存到一个新的CSV文件中，新文件命名为first_column.csv。请使用pandas库来完成这些操作，确保代码能够正确执行并处理可能出现的文件路径问题。"}

name: ExcelAgent
path: [{ExcelAgent}]
tool name: python_runner
arguments: {"code":"```python\nimport pandas as pd\nimport os\n\n# 获取当前工作目录并构建文件路径\nbase_dir = os.getcwd()\ninput_path = os.path.join(base_dir, 'questions.csv')\noutput_path = os.path.join(base_dir, 'first_column.csv')\n\ntry:\n    # 读取CSV文件\n    df = pd.read_csv(input_path)\n    # 提取第一列数据\n    first_column = df.iloc[:, 0]\n    # 保存为新CSV文件（不包含索引）\n    first_column.to_csv(output_path, index=False)\n    print(f\"成功将第一列数据保存至: {output_path}\")\nexcept FileNotFoundError:\n    print(f\"错误: 未找到文件 {input_path}\")\nexcept Exception as e:\n    print(f\"处理过程中发生错误: {str(e)}\")\n```"}

name: ExcelAgent
path: [{ExcelAgent}]
tool response: 成功将第一列数据保存至: /Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv


name: ExcelAgent
path: [{ExcelAgent}]
answer: 任务已完成。已成功读取当前目录下的 `questions.csv` 文件，提取第一列数据，并将结果保存至 `first_column.csv`。具体输出路径如下：

`/Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv`

代码已处理路径拼接和异常捕获（如文件不存在或格式错误），确保执行稳定性。

name: ExcelAgent
path: [{ExcelAgent}]
tool response: 任务已完成。已成功读取当前目录下的 `questions.csv` 文件，提取第一列数据，并将结果保存至 `first_column.csv`。具体输出路径如下：

`/Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv`

代码已处理路径拼接和异常捕获（如文件不存在或格式错误），确保执行稳定性。

name: ExcelAgent
path: [{ExcelAgent}]
answer: 已成功将 `questions.csv` 表格中的第一列数据提取至新文件 `first_column.csv`，文件保存路径为
：

`/Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c4
4b131973/first_column.csv`

操作过程中已处理路径拼接和异常捕获（如文件不存在、格式错误等问题），确保数据
提取完整性和文件生成稳定性。若需要调整文件路径或对数据格式有进一步要求，请随时告知
。
```
