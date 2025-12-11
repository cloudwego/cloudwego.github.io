---
Description: ""
date: "2025-12-11"
lastmod: ""
tags: []
title: 'Eino ADK: Overview'
weight: 1
---

# What is Eino ADK?

Eino ADK, inspired by Google ADK, is a flexible Go framework for building Agents and Multi‑Agent applications. It standardizes context passing, event streaming and conversion, task transfer, interrupts & resume, and cross‑cutting aspects. It is model‑agnostic and deployment‑agnostic, aiming to make Agent and Multi‑Agent development simpler and more robust while offering production‑grade governance capabilities.

Eino ADK helps developers build and manage agent applications, providing a resilient development environment to support conversational and non‑conversational agents, complex tasks, and workflows.

# Architecture

<a href="/img/eino/eino_adk_module_architecture.png" target="_blank"><img src="/img/eino/eino_adk_module_architecture.png" width="100%" /></a>

## Agent Interface

The core of ADK is the `Agent` abstraction. See the full details in [Eino ADK: Agent Interface](/en/docs/eino/core_modules/eino_adk/agent_interface).

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string

    // Run runs the agent.
    // The returned AgentEvent within the AsyncIterator must be safe to modify.
    // If the returned AgentEvent within the AsyncIterator contains MessageStream,
    // the MessageStream MUST be exclusive and safe to be received directly.
    // NOTE: it's recommended to use SetAutomaticClose() on the MessageStream of AgentEvents emitted by AsyncIterator,
    // so that even the events are not processed, the MessageStream can still be closed.
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

`Agent.Run`:

1. Reads task details and related data from `AgentInput`, `AgentRunOption`, and optional session context
2. Executes the task and writes progress/results into an `AgentEvent` iterator
3. Requires a future‑style asynchronous execution. In practice (see ChatModelAgent `Run`):
   - Create a pair of Iterator/Generator
   - Start the agent’s async task with the Generator, process `AgentInput` (e.g., call LLM) and emit events into the Generator
   - Return the Iterator immediately to the caller

## Collaboration

ADK provides rich composition primitives to build Multi‑Agent systems: Supervisor, Plan‑Execute, Group‑Chat, etc. See [Eino ADK: Agent Collaboration](/en/docs/eino/core_modules/eino_adk/agent_collaboration).

Primitives:

<table>
<tr><td>Collaboration</td><td>Description</td></tr>
<tr><td>Transfer</td><td>Directly transfer the task to another Agent; current Agent exits and does not track the transferred task</td></tr>
<tr><td>ToolCall (AgentAsTool)</td><td>Treat an Agent as a tool call, wait for its response, consume its output, and continue processing</td></tr>
</table>

Context strategies:

<table>
<tr><td>Context Strategy</td><td>Description</td></tr>
<tr><td>Upstream full dialogue</td><td>Provide the child Agent with the complete upstream conversation</td></tr>
<tr><td>New task description</td><td>Ignore upstream conversation and provide a fresh summarized task as the child Agent’s input</td></tr>
</table>

Decision autonomy:

<table>
<tr><td>Autonomy</td><td>Description</td></tr>
<tr><td>Autonomous</td><td>Inside the Agent, choose downstream Agents as needed (often via LLM). Even if decisions are based on preset logic, from the outside this is treated as autonomous.</td></tr>
<tr><td>Preset</td><td>Pre‑define the next Agent. Execution order is fixed and predictable.</td></tr>
</table>

Compositions:

<table>
<tr><td>Type</td><td>Description</td><td>Run Mode</td><td>Collaboration</td><td>Context</td><td>Autonomy</td></tr>
<tr><td><strong>SubAgents</strong></td><td>Treat a user‑provided Agent as the parent, and its subAgents list as children, forming an autonomously deciding Agent. Name/Description identify the Agent.<li>Currently limited to one parent per Agent</li><li>Use SetSubAgents to build a “multi‑branch tree” Multi‑Agent</li><li>AgentName must be unique within the tree</li></td><td><a href="/img/eino/eino_adk_preview_tree.png" target="_blank"><img src="/img/eino/eino_adk_preview_tree.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Autonomous</td></tr>
<tr><td><strong>Sequential</strong></td><td>Compose SubAgents to execute in order. Name/Description identify the Sequential Agent. Executes subagents sequentially until all finish.</td><td><a href="/img/eino/eino_adk_overview_sequential.png" target="_blank"><img src="/img/eino/eino_adk_overview_sequential.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Preset</td></tr>
<tr><td><strong>Parallel</strong></td><td>Compose SubAgents to run concurrently under the same context. Name/Description identify the Parallel Agent. Executes subagents in parallel, ends after all complete.</td><td><a href="/img/eino/eino_adk_parallel_controller_overview.png" target="_blank"><img src="/img/eino/eino_adk_parallel_controller_overview.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Preset</td></tr>
<tr><td><strong>Loop</strong></td><td>Compose SubAgents to run in array order, repeat cyclically. Name/Description identify the Loop Agent. Executes subagents in sequence per loop.</td><td><a href="/img/eino/eino_adk_yet_another_loop.png" target="_blank"><img src="/img/eino/eino_adk_yet_another_loop.png" width="100%" /></a></td><td>Transfer</td><td>Upstream full dialogue</td><td>Preset</td></tr>
<tr><td><strong>AgentAsTool</strong></td><td>Convert an Agent into a Tool for use by other Agents. Whether an Agent can call other Agents as Tools depends on its implementation. ChatModelAgent supports AgentAsTool.</td><td><a href="/img/eino/eino_adk_agent_as_tool_sequence_diagram_1.png" target="_blank"><img src="/img/eino/eino_adk_agent_as_tool_sequence_diagram_1.png" width="100%" /></a></td><td>ToolCall</td><td>New task description</td><td>Autonomous</td></tr>
</table>

## ChatModelAgent

`ChatModelAgent` is the key implementation of the agent abstraction. It wraps LLM interaction and implements a ReAct‑style control flow via Eino Graph, exporting events as `AgentEvent`s. See [Eino ADK: ChatModelAgent](/en/docs/eino/core_modules/eino_adk/agent_implementation/chat_model).

```go
type ChatModelAgentConfig struct {
    // Name of the agent. Better be unique across all agents.
    Name string
    // Description of the agent's capabilities.
    // Helps other agents determine whether to transfer tasks to this agent.
    Description string
    // Instruction used as the system prompt for this agent.
    // Optional. If empty, no system prompt will be used.
    // Supports f-string placeholders for session values in default GenModelInput, for example:
    // "You are a helpful assistant. The current time is {Time}. The current user is {User}."
    // These placeholders will be replaced with session values for "Time" and "User".
    Instruction string

    Model model.ToolCallingChatModel

    ToolsConfig ToolsConfig

    // GenModelInput transforms instructions and input messages into the model's input format.
    // Optional. Defaults to defaultGenModelInput which combines instruction and messages.
    GenModelInput GenModelInput

    // Exit defines the tool used to terminate the agent process.
    // Optional. If nil, no Exit Action will be generated.
    // You can use the provided 'ExitTool' implementation directly.
    Exit tool.BaseTool

    // OutputKey stores the agent's response in the session.
    // Optional. When set, stores output via AddSessionValue(ctx, outputKey, msg.Content).
    OutputKey string

    // MaxIterations defines the upper limit of ChatModel generation cycles.
    // The agent will terminate with an error if this limit is exceeded.
    // Optional. Defaults to 20.
    MaxIterations int
}

func NewChatModelAgent(_ context.Context, config *ChatModelAgentConfig) (*ChatModelAgent, error) {
    // omit code
}
```

## AgentRunner

Runner executes agents and enables advanced features. See [Eino ADK: Agent Runner & Extensions](/en/docs/eino/core_modules/eino_adk/agent_extension).

Runner‑only capabilities:

- Interrupt & Resume
- Cross‑cutting hooks (coming)
- Context preprocessing

```go
type RunnerConfig struct {
    Agent           Agent
    EnableStreaming bool

    CheckPointStore compose.CheckPointStore
}

func NewRunner(_ context.Context, conf RunnerConfig) *Runner {
    // omit code
}
```

 
