---
Description: ""
date: "2025-12-02"
lastmod: ""
tags: []
title: 'Build Your First AI Agent with Eino ADK: Excel Agent End-to-End'
weight: 4
---

## From Excel Agent to Eino ADK

This article shows how to build a robust multi-agent system using **Eino ADK**, via a practical Excel Agent. The Excel Agent “understands your instructions, reads your sheets, writes and runs code” — decomposing tasks, invoking tools, and validating outcomes to complete Excel data tasks reliably.

Earlier Eino ADK introduction: https://www.cloudwego.io/docs/eino/core_modules/eino_adk/

Full source: [eino-examples/adk/multiagent/integration-excel-agent](https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-excel-agent)

### What is the Excel Agent?

It’s an “Excel-native assistant” that decomposes problems into steps, executes, and verifies. It understands user prompts and uploaded files, proposes solutions, chooses tools (system commands, generated Python code, web search), and completes tasks.

Architecture:

<a href="/img/eino/eino_adk_excel_agent_architecture.png" target="_blank"><img src="/img/eino/eino_adk_excel_agent_architecture.png" width="100%" /></a>

Agents:

- Planner: analyze input, generate an executable plan
- Executor: execute the current plan step
- CodeAgent: read/write files, run Python
- WebSearchAgent: search the web
- Replanner: decide continue/adjust/finish
- ReportAgent: summarize outputs

Use cases:

- Data cleaning and formatting
- Analysis and report generation
- Budget automation
- Data matching and merging

End-to-end flow:

<a href="/img/eino/eino_adk_excel_agent_complete.png" target="_blank"><img src="/img/eino/eino_adk_excel_agent_complete.png" width="100%" /></a>

> 💡
> **Core Benefits**:
>
> - Less manual work — offload complex Excel processing to the Agent.
> - More stable output quality — plan–execute–reflect loop reduces misses and errors.
> - Greater extensibility — independent Agents with low coupling enable faster iteration.

Excel Agent can run standalone, or act as a sub-agent inside a composite multi-expert system; external routers can hand off Excel-domain tasks to this Agent.

### ChatModelAgent — ReAct at the Core

`ChatModelAgent` uses the [ReAct](https://react-lm.github.io/) pattern (think–act–observe):

<a href="/img/eino/eino_adk_react_pattern.png" target="_blank"><img src="/img/eino/eino_adk_react_pattern.png" width="100%" /></a>

- Call the ChatModel (Reason)
- The LLM returns a tool call request (Action)
- ChatModelAgent executes the tool (Act)
- Return tool results to the LLM (Observation) and continue until no tool is needed

In Excel Agent, each agent centers on a `ChatModelAgent`. Example: executor step “read header row from xlsx” via CodeAgent:

1) Executor routes step to CodeAgent
2) CodeAgent Think/Act cycle:
   - Think-1: list working directory
   - Act-1: bash `ls`
   - Think-2: write Python to read xlsx header
   - Act-2: run Python code
   - Think-3: task done
3) Return results to Executor

<a href="/img/eino/eino_adk_excel_chat_model_agent_view.png" target="_blank"><img src="/img/eino/eino_adk_excel_chat_model_agent_view.png" width="100%" /></a>

### Plan-Execute — Structured Collaboration

Planner creates plans; Executor executes steps via tools; Replanner evaluates progress and replans.

Plans are structured lists of steps. Eino ADK provides `Plan` interfaces and default JSON serializable plan structures.

```go
// Full code: https://github.com/cloudwego/eino/blob/main/adk/prebuilt/planexecute/plan_execute.go

// NewPlanner creates a new planner agent based on the provided configuration.
func NewPlanner(_ context.Context, cfg *PlannerConfig) (adk.Agent, error)

// NewExecutor creates a new executor agent.
func NewExecutor(ctx context.Context, cfg *ExecutorConfig) (adk.Agent, error)

// NewReplanner creates a new replanner agent.
func NewReplanner(_ context.Context, cfg *ReplannerConfig) (adk.Agent, error)

// New creates a new plan-execute-replan agent with the given configuration.
func New(ctx context.Context, cfg *Config) (adk.Agent, error)
```

<a href="/img/eino/eino_adk_why_excel_plan_executor.png" target="_blank"><img src="/img/eino/eino_adk_why_excel_plan_executor.png" width="100%" /></a>

For Excel Agent, the trio matches the goal of solving Excel-domain problems:

- Planner: clarify goals and generate executable steps
- Executor: call tools (Excel reading, system commands, Python) to perform steps
- Replanner: decide whether to continue, adjust, or finish based on progress

`Planner` and `Replanner` turn fuzzy instructions into structured step lists (a `Plan`). Eino ADK defines a flexible `Plan` interface and you can customize the structure:

```go
type Plan interface {
    // FirstStep returns the first step to be executed in the plan.
    FirstStep() string
    // Marshaler serializes the Plan into JSON.
    // The resulting JSON can be used in prompt templates.
    json.Marshaler
    // Unmarshaler deserializes JSON content into the Plan.
    // This processes output from structured chat models or tool calls into the Plan structure.
    json.Unmarshaler
}
```

By default, the framework provides a builtin plan structure. Example plan produced by Excel Agent:

```sql
### Task Plan
- [x] 1. Read the contents of '模拟出题.csv' from the working directory into a pandas DataFrame.
- [x] 2. Identify the question type (e.g., multiple-choice, short-answer) for each row in the DataFrame.
- [x] 3. For non-short-answer questions, restructure the data to place question, answer, explanation, and options in the same row.
- [x] 4. For short-answer questions, merge the answer content into the explanation column and ensure question and merged explanation are in the same row.
- [x] 5. Verify that all processed rows have question, answer (where applicable), explanation, and options (where applicable) in a single row with consistent formatting.
- [x] 6. Generate a cleaned report presenting the formatted questions with all relevant components (question, answer, explanation, options) in unified rows.
```

### Workflow Agents — Controlled Pipelines

Excel Agent needs:

1) Sequential: Planner → Executor/Replanner (Planner runs once)
2) Loop: Executor + Replanner repeated
3) Sequential: ReportAgent at the end

Use Eino ADK’s `SequentialAgent`, `LoopAgent`, and `ParallelAgent` to build controlled pipelines.

 

```go
import github.com/cloudwego/eino/adk

// Execute plan → search → write once
sequential := adk.NewSequentialAgent(ctx, &adk.SequentialAgentConfig{
    Name: "research_pipeline",
    SubAgents: []adk.Agent{
        planAgent,    // plan research
        searchAgent,  // search materials
        writeAgent,   // write report
    },
})
```

<a href="/img/eino/eino_adk_excel_agent_sequential.png" target="_blank"><img src="/img/eino/eino_adk_excel_agent_sequential.png" width="100%" /></a>

```go
import github.com/cloudwego/eino/adk

// Loop 5 times: analyze → improve → validate
loop := adk.NewLoopAgent(ctx, &adk.LoopAgentConfig{
    Name: "iterative_optimization",
    SubAgents: []adk.Agent{
        analyzeAgent,  // analyze current status
        improveAgent,  // propose improvements
        validateAgent, // validate improvements
    },
    MaxIterations: 5,
})
```

<a href="/img/eino/eino_adk_loop_agent_max_iterations_example.png" target="_blank"><img src="/img/eino/eino_adk_loop_agent_max_iterations_example.png" width="100%" /></a>

```go
import github.com/cloudwego/eino/adk

// Concurrent: sentiment + keywords + summary
parallel := adk.NewParallelAgent(ctx, &adk.ParallelAgentConfig{
    Name: "multi_analysis",
    SubAgents: []adk.Agent{
        sentimentAgent,  // sentiment analysis
        keywordAgent,    // keyword extraction
        summaryAgent,    // content summarization
    },
})
```

<a href="/img/eino/eino_adk_yet_another_parallel.png" target="_blank"><img src="/img/eino/eino_adk_yet_another_parallel.png" width="100%" /></a>

### Agent Abstraction — Unified and Extensible

All agents implement a minimal interface with standardized inputs and event-driven outputs. Prebuilt agents follow this contract; you can create custom ones easily.

- Unified Agent abstraction — prebuilt agents (ChatModelAgent, Plan-Execute, Workflow Agents) follow this interface; you can implement custom agents too:

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

- Standardized input — aligned with LLM I/O:

```go
type AgentInput struct {
    Messages        []Message
    EnableStreaming bool
}

type Message = *schema.Message
```

- Asynchronous event-driven output — an iterator of `AgentEvent` containing metadata, outputs, actions, and errors:

```go
type AgentEvent struct {
    AgentName string          // Agent name (auto-filled by framework)
    RunPath   []RunStep       // Full run path to reach current Agent (auto-filled)
    Output    *AgentOutput    // Agent output message content
    Action    *AgentAction    // Agent action event content
    Err       error           // Agent error
}

type AgentOutput struct {
    MessageOutput  *MessageVariant // Model message output
    CustomizedOutput any           // Customized output content
}

type MessageVariant struct {
    IsStreaming bool            // Whether streaming output
    Message       Message       // Non-streaming message output
    MessageStream MessageStream // Streaming message output
    Role schema.RoleType        // Message role
    ToolName string             // Tool name
}

type AgentAction struct {
    Exit bool                               // Agent exit
    Interrupted *InterruptInfo              // Agent interrupted
    TransferToAgent *TransferToAgentAction  // Agent transfer
    CustomizedAction any                    // Customized Agent action
}
```

Consume the iterator in a simple loop:

```go
iter := myAgent.Run(ctx, "hello")
for {
    event, ok := iter.Next()
    if !ok { break }
    // handle event
}
```

### Agent Collaboration — Data Passing Under the Hood

Nodes are agents; edges represent data flow and task handoff. ADK provides robust data sharing mechanisms:

- History: each agent’s `AgentEvent` is recorded and converted into the next agent’s input. By default, assistant/tool messages from other agents become user messages for the current agent, supplying factual context without confusing roles.

<a href="/img/eino/eino_adk_history.png" target="_blank"><img src="/img/eino/eino_adk_history.png" width="100%" /></a>

- Shared Session: a KV store alive during the run; agents can read/write `SessionValues` anytime. Typical Plan-Execute flow: planner writes the initial plan; executor reads and runs; replanner updates the plan back into session.

```go
func GetSessionValues(ctx context.Context) map[string]any
func GetSessionValue(ctx context.Context, key string) (any, bool)
func AddSessionValue(ctx context.Context, key string, value any)
func AddSessionValues(ctx context.Context, kvs map[string]any)
func WithSessionValues(v map[string]any) AgentRunOption
```

<a href="/img/eino/eino_adk_plan_execute_replan_session.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_replan_session.png" width="100%" /></a>

Collaboration modes:

- Preset workflow order (Workflow) — deterministic execution order via `Sequential`/`Loop`/`Parallel`.
- Transfer — hand off tasks to sub-agents with context; often combined with ChatModelAgent and dynamic routing.

<a href="/img/eino/eino_adk_excel_transfer.png" target="_blank"><img src="/img/eino/eino_adk_excel_transfer.png" width="100%" /></a>

```go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)
func NewTransferToAgentAction(destAgentName string) *AgentAction
```

- ToolCall — call an agent as a tool when only parameters are needed; return results to the chat model. Also supports non-agent tools.

<a href="/img/eino/eino_adk_agent_as_tool_case.png" target="_blank"><img src="/img/eino/eino_adk_agent_as_tool_case.png" width="100%" /></a>

```go
func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

## Excel Agent — How to Run

### Environment and Paths

- Environment variables — see the project README for the full list.
- Inputs — a user request plus a set of files:
  - In `main.go`, the first lines define the user query (modify as needed):

    ```go
    func main() {
        // query := schema.UserMessage("统计附件文件中推荐的小说名称及推荐次数，并将结果写到文件中。凡是带有《》内容都是小说名称，形成表格，表头为小说名称和推荐次数，同名小说只列一行，推荐次数相加")
        // query := schema.UserMessage("读取模拟出题.csv 中的内容，规范格式将题目、答案、解析、选项放在同一行，简答题只把答案写入解析即可")
        query := schema.UserMessage("请帮我将 question.csv 表格中的第一列提取到一个新的 csv 中")
    }
    ```

  - Default attachment input path: `adk/multiagent/integration-excel-agent/playground/input` (configurable; see README)
  - Sample files are under `adk/multiagent/integration-excel-agent/playground/test_data`:

    ```
    % tree adk/multiagent/integration-excel-agent/playground/test_data
    adk/multiagent/integration-excel-agent/playground/test_data
    ├── questions.csv
    ├── 推荐小说.txt
    └── 模拟出题.csv
    
    1 directory, 3 files
    ```

- Outputs — attachments, intermediate artifacts, and final results live under `adk/multiagent/integration-excel-agent/playground/${uuid}` (configurable).

### Inspecting Results

A run creates a new working directory under the output path and writes all intermediate and final artifacts into it.

Example task: “extract the first column from `question.csv` into a new CSV” — artifacts include:

<a href="/img/eino/eino_adk_excel_directory.png" target="_blank"><img src="/img/eino/eino_adk_excel_directory.png" width="100%" /></a>

1) Raw input: `question.csv`
2) Planner/Replanner plan: `plan.md`

```
### Task Plan
- [x] 1. {"desc":"Read the 'questions.csv' file into a pandas DataFrame."}
- [x] 2. Save the extracted first column to a new CSV file.
```

3) CodeAgent script: `$uuid.py`

```python
import pandas as pd

df = pd.read_csv('questions.csv')
first_column = df.iloc[:, _0_]
first_column.to_csv('extracted_first_column.csv', index=_False_)
```

4) Intermediate outputs: `extracted_first_column.csv` and `first_column.csv`

```
type
multiple-choice
...
short-answer
```

5) Final report: `final_report.json`

```json
{
  "is_success": true,
  "result": "Successfully extracted the first column from questions.csv and saved it to first_column.csv.",
  "files": [
    {
      "path": "/User/user/go/src/github.com/cloudwego/eino-examples/adk/multiagent/integration-excel-agent/playground/00f118af-4bd8-42f7-8d11-71f2801218bd/first_column.csv",
      "desc": "A CSV file containing only the first column data from the original questions.csv."
    }
  ]
}
```

### Runtime Logs

Key steps for the same task:

- Planner emits structured JSON plan

```yaml
name: Planner
answer: {
    "steps": [
        { "index": 1, "desc": "Read the 'questions.csv' file into a pandas DataFrame." },
        { "index": 2, "desc": "Extract the first column from the DataFrame." },
        { "index": 3, "desc": "Save the extracted first column to a new CSV file." }
    ]
}
```

- Executor tool-calls CodeAgent to run the first step

```yaml
name: Executor
tool name: CodeAgent
arguments: {"request":"Read the 'questions.csv' file into a pandas DataFrame using pandas. Use the pandas.read_csv function and store the result in a variable named df."}
```

- CodeAgent uses PythonRunner and auto-corrects via ReAct

```yaml
name: Executor
tool name: PythonRunner
arguments: {"code":"```python\nfirst_column = df.iloc[:, 0]\n```"}

name: Executor
tool response: Traceback (most recent call last):
  File "/User/user/go/src/github.com/cloudwego/eino-examples/adk/multiagent/integration-excel-agent/playground/00f118af-4bd8-42f7-8d11-71f2801218bd/00f118af-4bd8-42f7-8d11-71f2801218bd.py", line 1, in <module>
    first_column = df.iloc[:, 0]
                   ^^
NameError: name 'df' is not defined

  name: Executor
  answer: The error occurs because the DataFrame `df` is not defined. We need to first load the data from the existing CSV file `questions.csv` into `df`. Here's the corrected code:
  tool name: PythonRunner
  arguments: {"code":"```python\nimport pandas as pd\ndf = pd.read_csv('questions.csv')\nfirst_column = df.iloc[:, 0]\nprint(first_column.head())  # Verify the result\n```"}
```

- Replanner marks completion and submits to ReportAgent

```yaml
name: Replanner
answer: { "is_success": true, "result": "Successfully extracted the first column from 'questions.csv' into the new CSV file 'extracted_first_column.csv'.", "files": [ { "desc": "A new CSV file containing the first column from the original table", "path": "extracted_first_column.csv" } ] }
```

- ReportAgent finalizes

```yaml
name: Report
tool name: SubmitResult
arguments: { "is_success": true, "result": "Successfully extracted the first column from questions.csv and saved it to first_column.csv.", "files": [ { "path": "/User/user/go/src/github.com/cloudwego/eino-examples/adk/multiagent/integration-excel-agent/playground/00f118af-4bd8-42f7-8d11-71f2801218bd/first_column.csv", "desc": "A CSV file containing only the first column data from the original questions.csv." } ] }
```

## Summary

Excel Agent demonstrates a Multi-Agent engineering methodology on Eino ADK:

- ChatModelAgent with ReAct — the thinking and tool-using core
- WorkflowAgents — controlled orchestration in expected order
- Planner–Executor–Replanner — decomposition and self-correction
- History/Session — collaboration and replayability

> 💡
> **Start your agent development journey**
>
> - ⌨️ View Excel Agent source: https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-excel-agent
> - 📚 Read more docs: https://www.cloudwego.io/docs/eino/core_modules/eino_adk/
> - 🛠️ Browse ADK source: https://github.com/cloudwego/eino/tree/main/adk
> - 💡 Explore all ADK examples: https://github.com/cloudwego/eino-examples/tree/main/adk
> - 🤝 Join the developer community: share experiences and best practices

<a href="/img/eino/eino_adk_excel_agent_user_group.png" target="_blank"><img src="/img/eino/eino_adk_excel_agent_user_group.png" width="100%" /></a>
