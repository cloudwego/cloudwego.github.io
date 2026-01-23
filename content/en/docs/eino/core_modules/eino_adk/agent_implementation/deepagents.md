---
Description: ""
date: "2026-01-20"
lastmod: ""
tags: []
title: 'Eino ADK MultiAgent: DeepAgents'
weight: 5
---

## DeepAgents Overview

Eino ADK DeepAgents is a high-level multi-agent coordinator whose design aligns closely with LangChain’s Deep Agents concept. Think of it as Eino ADK’s practical engineering implementation of that idea: a "commander" main agent plans, decomposes, delegates, and supervises complex tasks that are executed by specialized subagents or tools.

DeepAgents’ core value is automating complex, multi-step, multi-role workflows. It is not just an executor; it is a “project manager” with deep reasoning, planning, and dynamic adjustment abilities.

### ImportPath

Eino version must be >= v0.5.14

```go
import github.com/cloudwego/eino/adk/prebuilt/deep

agent, err := deep.New(ctx, &deep.Config{})
```

### DeepAgents Structure

DeepAgents uses a main agent to coordinate, plan, and delegate tasks. The main agent does not execute everything itself; it leverages a chat model and a set of tools to interact with the world or break down work to specialized subagents.

<a href="/img/eino/eino_adk_deep_agent_definition.png" target="_blank"><img src="/img/eino/eino_adk_deep_agent_definition.png" width="100%" /></a>

Core components and relationships:

- MainAgent: entry point and commander; receives the initial task, uses ReAct to call tools, and presents final results
- ChatModel (ToolCallingChatModel): a model that supports tool calling to understand, reason, select, and call tools
- Tools: capabilities available to MainAgent, including:
  - WriteTodos: built-in planning tool that decomposes tasks into a structured todo list
  - TaskTool: a special tool acting as a unified entry to call subagents
  - CustomTools: user-defined tools for business needs
- SubAgents: execute specific, independent subtasks with isolated context
  - GeneralPurpose: a default subagent with the same tools as MainAgent (except TaskTool) for clean-context execution
  - CustomSubAgents: user-defined subagents for business needs

### Task Decomposition and Planning

WriteTodos’ Description encodes planning principles. The main agent calls WriteTodos to add a list of subtasks into the context to guide subsequent reasoning and execution:

<a href="/img/eino/eino_adk_write_todos.png" target="_blank"><img src="/img/eino/eino_adk_write_todos.png" width="100%" /></a>

1. Model receives user input
2. Model calls WriteTodos with a todo list based on its Description; this call is added to context as reference
3. Model follows the todos and calls TaskTool to complete the first todo
4. Model calls WriteTodos again to update progress

> 💡
> For simple tasks, calling WriteTodos every time may be counterproductive. The default Description includes general positive/negative examples to avoid skipping or overusing WriteTodos. You can add prompts tailored to your scenario so WriteTodos is called at the right moments.

> 💡
> WriteTodos is enabled by default; set `WithoutWriteTodos=true` to disable it.

### Delegation and SubAgents

**TaskTool**

All subagents bind to TaskTool. When the main agent delegates a subtask, it calls TaskTool specifying the subagent and the task. TaskTool routes the task to the chosen subagent and returns its result to the main agent. The default TaskTool Description explains general rules and appends each subagent’s Description; you can customize it via `TaskToolDescriptionGenerator`.

**Context isolation**

- Information transfer: MainAgent and subagents do not share context. Subagents receive only the delegated goal, not the entire task history; MainAgent receives only results, not the subagent’s internal process.
- Avoid pollution: isolation ensures heavy tool calls and intermediate steps inside subagents do not pollute MainAgent context; the main agent only gets concise final answers.

**general-purpose**

DeepAgents adds a default subagent: general-purpose. It shares the same system prompt and tools as MainAgent (except TaskTool). When no specialized subagent fits, the main agent can use general-purpose to keep a clean context. Configure `WithoutGeneralSubAgent=true` to remove it.

### Comparison with Other MultiAgent Patterns

- Versus Supervisor (ReAct)
  - Pros: WriteTodos improves task decomposition and planning; context isolation across agents performs better on large, multi-step tasks
  - Cons: Planning and subagent calls add extra model requests, increasing time and tokens; poor task splitting can hurt results
- Versus Plan‑and‑Execute
  - Pros: Plan/RePlan are tools that the main agent can call freely, skipping unnecessary planning and often reducing calls, latency, and cost
  - Cons: Planning and delegation happen within a single model call, demanding more model capability and more difficult prompt tuning

## DeepAgents Usage Example

### Scenario

Excel Agent is an “Excel‑savvy assistant”. It decomposes the problem into steps, executes step by step, and validates results. It understands both the user’s question and the uploaded file, proposes a feasible plan, and chooses proper tools (system commands, generate‑and‑run Python code, web search) to accomplish the task.

In real use, treat Excel Agent as an “Excel expert + automation engineer”. Given a raw spreadsheet and a target description, it proposes a plan and completes execution:

- Data cleaning and formatting: deduplicate, handle nulls, normalize dates on large files
- Analysis and report: aggregate monthly sales, pivot, and export chart report
- Automated budgeting: compute total budget and generate department allocation
- Data matching and merge: match and merge client tables from multiple sources into a complete database

Excel Agent structure with DeepAgents:

<a href="/img/eino/eino_adk_excel_using_deep.png" target="_blank"><img src="/img/eino/eino_adk_excel_using_deep.png" width="100%" /></a>

1. Add ReadFile tool to MainAgent to inspect files and aid subtask planning
2. Add Code and WebSearch subagents: Code writes Python to operate Excel; WebSearch searches and summarizes

### Code Implementation

[https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep)

### Run Result

```yaml
name: ExcelAgent
path: [{ExcelAgent}]
tool name: task
arguments: {"subagent_type":"CodeAgent","description":"Please help with a CSV file task: 1) Read questions.csv in the current directory; 2) Extract the first column; 3) Save the extracted first column to a new CSV named first_column.csv. Use pandas and ensure the code runs correctly and handles potential path issues."}

name: ExcelAgent
path: [{ExcelAgent}]
tool name: python_runner
arguments: {"code":"```python\nimport pandas as pd\nimport os\n\n# Get current working directory and build paths\nbase_dir = os.getcwd()\ninput_path = os.path.join(base_dir, 'questions.csv')\noutput_path = os.path.join(base_dir, 'first_column.csv')\n\ntry:\n    # Read CSV file\n    df = pd.read_csv(input_path)\n    # Extract the first column\n    first_column = df.iloc[:, 0]\n    # Save to new CSV (without index)\n    first_column.to_csv(output_path, index=False)\n    print(f\"Successfully saved first column to: {output_path}\")\nexcept FileNotFoundError:\n    print(f\"Error: file not found {input_path}\")\nexcept Exception as e:\n    print(f\"Error occurred during processing: {str(e)}\")\n```"}

name: ExcelAgent
path: [{ExcelAgent}]
tool response: Successfully saved first column to: /Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv


name: ExcelAgent
path: [{ExcelAgent}]
answer: Task completed. Read `questions.csv` in the current directory, extracted the first column, and saved it to `first_column.csv`. Output path:

`/Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv`

The code handled path composition and exceptions (e.g., file missing or format errors) to ensure stability.

name: ExcelAgent
path: [{ExcelAgent}]
tool response: Task completed. Read `questions.csv`, extracted the first column, and saved to `first_column.csv`. Output path:

`/Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv`

Handled path composition and exception capture to ensure stable execution.

name: ExcelAgent
path: [{ExcelAgent}]
answer: Successfully extracted the first column from `questions.csv` into `first_column.csv`. Saved at:

`/Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/multiagent/deep/playground/262be931-532c-4d83-8cff-96c44b131973/first_column.csv`

Path handling and exception capture (e.g., missing files or format issues) ensured completeness and stability. If you need path adjustments or different formats, let me know.
```
