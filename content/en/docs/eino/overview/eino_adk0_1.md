---
Description: ""
date: "2025-12-02"
lastmod: ""
tags: []
title: 'Eino ADK: Master Core Agent Patterns and Build a Production-Grade Agent System'
weight: 3
---

# Introduction

As LLMs break the barrier of “understanding and generation”, agents rapidly become the mainstream form of AI applications. From smart customer service to automated office flows, agents bridge LLM capabilities with concrete actions.

But pain points emerge: many teams struggle to connect LLMs with systems; agents lack state management and “forget”, while complex flows raise development complexity.

**Eino ADK (Agent Development Kit)** provides Go developers with a complete, flexible, and powerful framework for agent development — addressing core challenges head-on.

## What is an Agent?

Agents are autonomous, executable intelligent units that can learn, adapt, and make decisions. Core capabilities include:

- Reasoning: analyze data, identify patterns, use logic and available information to conclude, infer, and solve problems
- Action: take actions or execute tasks based on decisions, plans, or external inputs to achieve goals
- Observation: autonomously collect relevant information (e.g., computer vision, NLP, sensor data) to understand context for informed decisions
- Planning: determine necessary steps, evaluate potential actions, and choose the best plan based on information and expected outcomes
- Collaboration: collaborate effectively with humans or other AI agents in complex, dynamic environments

Any LLM-interaction scenario can be abstracted as an agent, for example:

- A weather query agent
- A meeting scheduler agent
- A domain-specific QA agent

## What is Eino ADK?

[Eino ADK](https://github.com/cloudwego/eino) is a Go-first framework for agents and multi-agent systems, aligned with the conceptualization in [Google ADK](https://google.github.io/adk-docs/agents/).

It’s not just a library — it’s a complete system: unified interfaces, flexible composition, and strong collaboration primitives let you build complex agent systems like LEGO:

- Minimal glue: unified interfaces and event flows make decomposition natural.
- Fast orchestration: built-in patterns and workflows assemble pipelines quickly.
- Controllable: interrupt/resume/audit — collaboration you can see and trust.

Design philosophy: “simple things are simple; complex things are possible”. Focus on business logic without low-level complexity.

# Core Building Blocks

## ChatModelAgent — the Brain for Decisions

`ChatModelAgent` implements the classic [ReAct](https://react-lm.github.io/) loop:

1) Call LLM (Reason)
2) LLM returns a tool call (Action)
3) Execute the tool (Act)
4) Feed tool results back (Observation), repeat until no tool call is requested

<a href="/img/eino/eino_adk_chatmodel_agent.png" target="_blank"><img src="/img/eino/eino_adk_chatmodel_agent.png" width="100%" /></a>

Use cases include structured research and IT operations troubleshooting, with progressive reasoning and validation. Create a tool-enabled `ChatModelAgent` quickly:

```go
import github.com/cloudwego/eino/adk

// Create a ReAct ChatModelAgent with multiple tools
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

ReAct emphasizes the closed loop of "Think → Act → Observe → Think again", avoiding blind actions and separating reasoning from execution. Example scenarios:

- Industry track analysis
  - Think-1: identify needed info — policy support, growth rate, leaders’ profitability, supply chain bottlenecks
  - Act-1: call APIs to fetch financial reports
  - Think-2: infer high growth and policy tailwinds; rising upstream prices may squeeze downstream margins; verify impact
  - Act-2: fetch supply/demand and analyst reports
  - Think-3: synthesize and generate a report with sources
- IT incident operations
  - Think-1: outline common root causes (CPU overload, insufficient memory, disk full, service crash); check basic metrics first
  - Act-1: call monitoring API to query host metrics
  - Think-2: if CPU abnormal, inspect top CPU processes
  - Act-2: use process tooling to list top processes; check abnormal services
  - Think-3: suspect logging service; verify config and file size (oversized logs or misconfig)
  - Act-3: run bash commands; confirm oversized logs and missing rotation limits
  - Think-4: propose remediation: clean logs, enable rotation, update config, restart logging and application

## WorkflowAgents — Precision Pipelines

Eino ADK provides controlled execution patterns to coordinate sub-agents:

- **SequentialAgent** — run sub-agents in order; each gets full input plus prior outputs.
- **ParallelAgent** — run sub-agents concurrently with shared input; aggregate outputs.
- **LoopAgent** — repeat a sequence of sub-agents with max iterations or exit condition.

Examples:

```go
import github.com/cloudwego/eino/adk

// Execute: plan → search → write
sequential := adk.NewSequentialAgent(ctx, &adk.SequentialAgentConfig{
    Name: "research_pipeline",
    SubAgents: []adk.Agent{
        planAgent,   // plan research
        searchAgent, // search information
        writeAgent,  // write report
    },
})
```

<a href="/img/eino/eino_adk_sequential.png" target="_blank"><img src="/img/eino/eino_adk_sequential.png" width="100%" /></a>

SequentialAgent principles:

- Linear execution: strictly follows `SubAgents` order
- Output passing: each agent gets full input plus prior outputs
- Early exit: any sub-agent can terminate via exit/interrupt

ParallelAgent principles:

- Concurrency: all sub-agents start simultaneously in separate goroutines
- Shared input: all sub-agents receive the same initial input
- Wait and aggregate: use `sync.WaitGroup`; collect and emit results via `AsyncIterator`

```go
import github.com/cloudwego/eino/adk

// Concurrent: sentiment + keywords + summary
parallel := adk.NewParallelAgent(ctx, &adk.ParallelAgentConfig{
    Name: "multi_analysis",
    SubAgents: []adk.Agent{
        sentimentAgent,  // sentiment analysis
        keywordAgent,    // keyword extraction
        summaryAgent,    // summarization
    },
})
```

<a href="/img/eino/eino_adk_parallel.png"   target="_blank"><img src="/img/eino/eino_adk_parallel.png"   width="100%" /></a>

LoopAgent principles:

- Iterative sequence: repeat Sequential runs
- Accumulated context: later iterations can access historical outputs
- Conditional exit: exit on `ExitAction` or reaching `MaxIterations`; `MaxIterations=0` means infinite loop

```go
import github.com/cloudwego/eino/adk

// Loop 5 times: analyze → improve → validate
loop := adk.NewLoopAgent(ctx, &adk.LoopAgentConfig{
    Name: "iterative_optimization",
    SubAgents: []adk.Agent{
        analyzeAgent,  // analyze current state
        improveAgent,  // propose improvements
        validateAgent, // validate improvements
    },
    MaxIterations: 5,
})
```

<a href="/img/eino/eino_adk_loop_controller.png" target="_blank"><img src="/img/eino/eino_adk_loop_controller.png" width="100%" /></a>

## Prebuilt Multi-Agent Patterns

Two production-grade multi-agent paradigms:

### Supervisor — Centralized Coordination

One supervisor orchestrates multiple sub-agents; subs return results deterministically.

<a href="/img/eino/eino_adk_supervisor_flow.png" target="_blank"><img src="/img/eino/eino_adk_supervisor_flow.png" width="100%" /></a>

```go
import github.com/cloudwego/eino/adk/prebuilt/supervisor

// Research project management: create a supervisor-pattern multi-agent
// Sub-agents: research, experimentation, report
supervisor, err := supervisor.New(ctx, &supervisor.Config{
    SupervisorAgent: supervisorAgent,
    SubAgents: []adk.Agent{
        researchAgent,
        experimentationAgent,
        reportAgent,
    },
})
```

Supervisor characteristics:

- Centralized control: supervisor assigns tasks and adjusts based on sub-agent outputs
- Deterministic callback: sub-agents hand control/results back to the supervisor
- Loose coupling: sub-agents are independently developable, testable, and replaceable

Representative scenarios:

- Research project management: assign research/experiments/report writing to specialized agents
- Customer service: route to technical support/after-sales/sales based on issue type

### Plan-Execute — Structured Problem Solving

Planner creates a plan; Executor executes the current step; Replanner evaluates and adjusts.

<a href="/img/eino/eino_adk_plan_execute_replan_detail.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute_replan_detail.png" width="100%" /></a>

 

Plan-Execute characteristics:

- Clear layered cognition: plan → act → reflect/replan, improving reasoning quality and generality
- Dynamic iteration: replanner adjusts plans based on progress and results; robust to uncertainty
- Modular responsibilities: agents are interchangeable, promoting maintainability
- Extensible: independent of specific LLMs/tools; integrates diverse resources

Representative scenarios:

- Complex research analysis: multi-round retrieval/calculation with plan adjustments
- Automated workflows: structured steps combining DB queries, API calls, compute engines
- Multi-step problem solving: legal consulting, technical diagnosis, strategy formation
- Assistant task execution: plan steps, call tools, adjust based on feedback to ensure completeness

```go
import github.com/cloudwego/eino/adk/prebuilt/planexecute

researchAssistant := planexecute.New(ctx, &planexecute.Config{
    Planner: adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        Name: "research_planner",
        Instruction: "Create a detailed research plan including literature review, data collection, and analysis methods",
        Model: gpt4Model,
    }),
    Executor: adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        Name: "research_executor",
        ToolsConfig: adk.ToolsConfig{ Tools: []tool.BaseTool{ scholarSearchTool, dataAnalysisTool, citationTool } },
    }),
    Replanner: replannerAgent,
})
```

### DeepAgents — Planning-Driven Centralized Collaboration

DeepAgents centralizes coordination under a Main Agent that runs a ReAct loop with tool calls:

- WriteTodos: break goals into structured todos and track progress
- TaskTool: unified entry to select and call sub-agents; isolate main/sub contexts to avoid pollution
- Aggregate results from sub-agents; update todos or re-plan as needed until completion

<a href="/img/eino/eino_adk_deep_agents_overview.png" target="_blank"><img src="/img/eino/eino_adk_deep_agents_overview.png" width="100%" /></a>

Characteristics:

- Stronger decomposition and progress management via todos and milestones
- Context isolation for robustness; main agent aggregates without leaking intermediate chains
- Unified delegation entry; easy to add/replace specialized sub-agents
- Flexible plan–execute loop; skip planning for simple tasks to reduce LLM cost/time
- Trade-offs: over-decomposition increases calls/cost; requires good sub-task boundaries and stable tool-calling/planning capabilities

Representative scenarios:

- Multi-role business flows across R&D/test/release/legal/ops with stage gates and retries
- Long pipelines with staged management (cleaning/validation/lineage/QC) and isolated re-runs on failure
- Strict isolation environments: route tasks to legal/risk/finance; audit progress and retry without affecting other stages

```go
import github.com/cloudwego/eino/adk/prebuilt/deep

agent, err := deep.New(ctx, &deep.Config{
    Name:      "deep-agent",
    ChatModel: gpt4Model,
    SubAgents: []adk.Agent{ LegalAgent, RiskControlAgent, FinanceAgent },
    MaxIteration: 100,
})
```

# Foundation Design

## Unified Agent Abstraction

All agents share a minimal interface, with standardized inputs and event-driven outputs:

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

This standardization enables composition, observability, and control across complex systems.

## Asynchronous Event-Driven Architecture

ADK uses an asynchronous event stream via `AsyncIterator[*AgentEvent]`, and runs agents with a `Runner`:

- Real-time feedback: `AgentEvent` emits intermediate outputs (agent replies, tool results)
- Execution tracing: events carry state modifications and run-path for debugging/comprehension
- Automated control flow: `Runner` handles interrupts, jumps, and exits

## Flexible Collaboration Mechanisms

Agents in the same system can collaborate by sharing state or triggering runs:

- Shared Session: a KV store alive during a run for cross-agent state and data sharing

```go
func GetSessionValues(ctx context.Context) map[string]any
func GetSessionValue(ctx context.Context, key string) (any, bool)
func AddSessionValue(ctx context.Context, key string, value any)
func AddSessionValues(ctx context.Context, kvs map[string]any)
```

- Transfer: hand off execution to a sub-agent with current context; common with `ChatModelAgent` for dynamic routing

<a href="/img/eino/eino_adk_transfer.png" target="_blank"><img src="/img/eino/eino_adk_transfer.png" width="100%" /></a>

```go
func SetSubAgents(ctx context.Context, agent Agent, subAgents []Agent) (Agent, error)
func NewTransferToAgentAction(destAgentName string) *AgentAction
```

- ToolCall: call an agent as a tool when only parameters are needed; results return to the chat model. Also supports non-agent tools.

<a href="/img/eino/eino_adk_agent_as_tool.png" target="_blank"><img src="/img/eino/eino_adk_agent_as_tool.png" width="100%" /></a>

```go
func NewAgentTool(_ context.Context, agent Agent, options ...AgentToolOption) tool.BaseTool
```

## Interrupt and Resume

Agents can interrupt runs, persist state via `CheckPointStore`, and later resume from the interruption point — ideal for long waits, pauses, or human-in-the-loop inputs.

- Emit an event with `Interrupt Action` to notify the `Runner`
- `Runner` records run state into a configured `CheckPointStore`
- Resume with additional info via `Runner.Resume` to continue from the checkpoint

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{ Agent: complexAgent, CheckPointStore: memoryStore })
iter := runner.Query(ctx, "recommend a book to me", adk.WithCheckPointID("1"))
for {
    event, ok := iter.Next(); if !ok { break }
    if event.Err != nil { log.Fatal(event.Err) }
    if event.Action != nil && event.Action.Interrupted != nil {
        ii, _ := json.MarshalIndent(event.Action.Interrupted.Data, "", "\t")
        fmt.Printf("action: interrupted\n")
        fmt.Printf("interrupt snapshot: %v", string(ii))
    }
}

scanner := bufio.NewScanner(os.Stdin)
fmt.Print("\nyour input here: ")
scanner.Scan()
nInput := scanner.Text()

iter, err := runner.Resume(ctx, "1", adk.WithToolOptions([]tool.Option{subagents.WithNewInput(nInput)}))
```

# Quickstart

## Install

```go
go get github.com/cloudwego/eino@latest
```

## Project Manager Agent

A supervisor-pattern agent coordinating research, coding, and review:

- ProjectManagerAgent: routes and coordinates sub-agents based on dynamic user input
- ResearchAgent: generates feasible plans; supports interrupt/resume with extra user context
- CodeAgent: uses a knowledge base tool to recall relevant knowledge and produce high-quality code
- ReviewAgent: sequential workflow (analyze → generate evaluation → validate) to review research/code and provide reasoned feedback

<a href="/img/eino/eino_adk_project_manager.png" target="_blank"><img src="/img/eino/eino_adk_project_manager.png" width="100%" /></a>

Representative scenarios:

- Build a project from scratch: research → coding → review → deliver
- Improve an existing project: review identifies gaps → code implements → review validates
- Conduct technical research: research produces report → review critiques → caller decides next actions

Key engineering benefits vs traditional development:

<table>
<tr><td>Design</td><td>Traditional</td><td>With Eino ADK</td></tr>
<tr><td>Agent abstraction</td><td>No unified definition; hard collaboration; high maintenance</td><td>Unified; clear responsibilities; clean code; parallel agent development</td></tr>
<tr><td>Inputs/outputs</td><td>Unstandardized; rely on ad-hoc logs</td><td>Event-driven; iterator exposes run; WYSIWYG</td></tr>
<tr><td>Agent collaboration</td><td>Manual context passing</td><td>Framework-managed context</td></tr>
<tr><td>Interrupt/resume</td><td>Implement from scratch (serialize/restore/state)</td><td>Register `CheckPointStore` in Runner</td></tr>
<tr><td>Agent patterns</td><td>Implement from scratch</td><td>Prebuilt, production-ready patterns</td></tr>
</table>

```go
func main() {
    ctx := context.Background()

    tcm, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
       APIKey:  os.Getenv("OPENAI_API_KEY"),
       Model:   os.Getenv("OPENAI_MODEL"),
       BaseURL: os.Getenv("OPENAI_BASE_URL"),
       ByAzure: func() bool { return os.Getenv("OPENAI_BY_AZURE") == "true" }(),
    })
    if err != nil { log.Fatal(err) }

    researchAgent, err := agents.NewResearchAgent(ctx, tcm); if err != nil { log.Fatal(err) }
    codeAgent,    err := agents.NewCodeAgent(ctx, tcm);    if err != nil { log.Fatal(err) }
    reviewAgent,  err := agents.NewReviewAgent(ctx, tcm);  if err != nil { log.Fatal(err) }
    s,            err := agents.NewProjectManagerAgent(ctx, tcm); if err != nil { log.Fatal(err) }

    supervisorAgent, err := supervisor.New(ctx, &supervisor.Config{ Supervisor: s, SubAgents: []adk.Agent{researchAgent, codeAgent, reviewAgent} })
    if err != nil { log.Fatal(err) }

    runner := adk.NewRunner(ctx, adk.RunnerConfig{ Agent: supervisorAgent, EnableStreaming: true, CheckPointStore: newInMemoryStore() })

    query := "please generate a simple ai chat project with python."
    checkpointID := "1"

    iter := runner.Query(ctx, query, adk.WithCheckPointID(checkpointID))
    interrupted := false
    for {
       event, ok := iter.Next(); if !ok { break }
       if event.Err != nil { log.Fatal(event.Err) }
       if event.Action != nil && event.Action.Interrupted != nil { interrupted = true }
       prints.Event(event)
    }
    if !interrupted { return }

    scanner := bufio.NewScanner(os.Stdin)
    fmt.Print("\ninput additional context for web search: ")
    scanner.Scan()
    nInput := scanner.Text()

    iter, err = runner.Resume(ctx, checkpointID, adk.WithToolOptions([]tool.Option{agents.WithNewInput(nInput)}))
    if err != nil { log.Fatal(err) }
    for {
       event, ok := iter.Next(); if !ok { break }
       if event.Err != nil { log.Fatal(event.Err) }
       prints.Event(event)
    }
}
```

# Conclusion

Eino ADK is not just a framework — it’s a complete agent development ecosystem. Unified abstractions, flexible composition, and strong collaboration let Go developers build from simple chatbots to complex multi-agent systems.

> 💡
> **Start your agent development journey now**
>
> - Docs (EN): https://www.cloudwego.io/en/docs/eino/core_modules/eino_adk/
> - Source: https://github.com/cloudwego/eino/tree/main/adk
> - Examples: https://github.com/cloudwego/eino-examples/tree/main/adk
> - Community: join other developers to share experience and best practices
>
> Eino ADK makes agent development simple and powerful!

<a href="/img/eino/eino_adk_user_group.png" target="_blank"><img src="/img/eino/eino_adk_user_group.png" width="100%" /></a>
