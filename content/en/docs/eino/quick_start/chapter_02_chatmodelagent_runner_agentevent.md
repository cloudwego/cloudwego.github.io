---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 2: ChatModelAgent, Runner, and AgentEvent (Console Multi-Turn)"
weight: 2
---

Goal of this chapter: introduce the ADK execution abstraction (Agent + Runner) and implement a multi-turn conversation in a console program.

## Code Location

- Entry code: [cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark).

## Run

From `examples/quickstart/chatwitheino`:

```bash
go run ./cmd/ch02
```

After you see the prompt, type questions (empty line to exit):

```
you> Hi — what is an Agent in Eino?
...
you> Summarize it in one sentence
...
```

## Key Concepts

### From Component to Agent

In Chapter 1 we learned **Components**: replaceable, composable capability units in Eino:

- `ChatModel`: call an LLM
- `Tool`: execute specific tasks
- `Retriever`: retrieve information
- `Loader`: load data

**Relationship between Components and Agents:**

- **A Component is not a complete AI app**: it is just a capability unit that must be organized/orchestrated/executed
- **An Agent is a complete AI app**: it encapsulates business logic and can run directly
- **Agents use Components internally**: the most fundamental are `ChatModel` (conversation) and `Tool` (actions)

**Why do we need Agents?**

If you only had Components, you would need to build a lot yourself:

- manage conversation history
- orchestrate call flow (when to call the model, when to call tools)
- handle streaming output
- implement interrupt/resume
- ...

**What does an Agent provide?**

- **A complete runtime framework**: `Runner` uniformly manages execution
- **A standard event-stream output**: `Run() -> AsyncIterator[*AgentEvent]`, enabling streaming, interrupt, and resume
- **Extensibility**: add tools, middleware, interrupts, etc.
- **Out of the box**: once created, an Agent can run without caring about internals

**This chapter’s example:**

`ChatModelAgent` is the simplest Agent. Internally it only uses `ChatModel`, but it already provides the full Agent runtime shape. Later chapters add `Tool` and more capabilities.

### Agent Interface

`Agent` is the core interface in ADK and defines the basic behavior of an agent:

```go
type Agent interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string
    
    // Run executes the Agent and returns an event stream.
    Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent]
}
```

**Responsibilities:**

- `Name()` / `Description()`: identify the Agent
- `Run()`: execute the Agent, take input messages, and return an event stream

**Design ideas:**

- **Unified abstraction**: all Agents (ChatModelAgent, WorkflowAgent, SupervisorAgent, etc.) implement this interface
- **Event-driven**: the execution is emitted as `AsyncIterator[*AgentEvent]` to support streaming responses
- **Extensibility**: adding tools/middleware/interrupts later does not change the interface

### ChatModelAgent

`ChatModelAgent` is an implementation of the Agent interface built on a ChatModel:

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "Ch02ChatModelAgent",
    Description: "A minimal ChatModelAgent with in-memory multi-turn history.",
    Instruction: instruction,
    Model:       cm,
})
```

**ChatModel vs ChatModelAgent: what’s the difference?**

<table>
<tr><td>Dimension</td><td>ChatModel</td><td>ChatModelAgent</td></tr>
<tr><td><strong>Role</strong></td><td>Component</td><td>Agent</td></tr>
<tr><td><strong>Interface</strong></td><td><pre>Generate() / Stream()</pre></td><td><pre>Run() -> AsyncIterator[*AgentEvent]</pre></td></tr>
<tr><td><strong>Output</strong></td><td>Returns message content directly</td><td>Returns an event stream (messages + control actions)</td></tr>
<tr><td><strong>Capability</strong></td><td>Pure model calling</td><td>Extensible with tools, middleware, interrupts, etc.</td></tr>
<tr><td><strong>When to use</strong></td><td>Simple chat</td><td>Complex agent applications</td></tr>
</table>

**Why ChatModelAgent?**

1. **Unified abstraction**: ChatModel is one Component; an Agent is a higher-level abstraction combining multiple Components
2. **Event-driven output**: streaming response, interrupt/resume, state transitions, etc.
3. **Extensibility**: add tools/middleware/interrupts; ChatModel itself only calls the model
4. **Orchestration-friendly**: managed by Runner and supports runtime features like checkpoints and recovery

**In short:**

- **ChatModel** = “a component that talks to LLM providers and abstracts differences (OpenAI, Ark, Claude, etc.)”
- **ChatModelAgent** = “an agent built on a model: it can call the model, and it can do more”

**Analogy:**

- **ChatModel** is like a “database driver”: hides differences between MySQL/PostgreSQL
- **ChatModelAgent** is like the “business logic layer”: built on the driver, plus rules and runtime management

**Characteristics:**

- encapsulates ChatModel calling logic
- provides a unified `Run() -> AgentEvent` output shape
- can be extended with tools/middleware later

### Runner

`Runner` is the entry point for executing an Agent and manages the Agent lifecycle:

```go
type Runner struct {
    a Agent  // Agent to execute
    enableStreaming bool
    store CheckPointStore  // state store for interrupt/resume
}
```

**Why do we need Runner?**

Although an Agent exposes `Run()`, calling it directly lacks many runtime capabilities:

1. **Lifecycle management**: start/recover/interrupt states
2. **Checkpoint support**: with `CheckPointStore` to implement interrupt/resume (later chapters)
3. **Unified entry**: convenient methods like `Run()` and `Query()`
4. **Event stream wrapping**: packages the agent’s output into a consumable `AsyncIterator[*AgentEvent]`

**Usage:**

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
})

// Option 1: pass a message list
events := runner.Run(ctx, history)

// Option 2: convenience method with a single query string
events := runner.Query(ctx, "hello")
```

### AgentEvent

`AgentEvent` is the event unit returned by Runner:

```go
type AgentEvent struct {
    AgentName string
    RunPath   []RunStep

    Output *AgentOutput  // output content
    Action *AgentAction  // control actions
    Err    error         // execution error
}
```

**Key fields:**

- `event.Err`: execution error
- `event.Output.MessageOutput`: message or message stream (streaming)
- `event.Action`: control actions such as interrupt/transition/exit (later chapters)

### AsyncIterator: How to Consume an Event Stream

`Runner.Run()` returns `*AsyncIterator[*AgentEvent]`, a non-blocking streaming iterator.

**Why AsyncIterator instead of returning a final result directly?**

Agent execution is **streaming**: the model generates token by token, with tool calls interleaved. Waiting for the full completion would increase perceived latency. `AsyncIterator` lets you consume events as they arrive.

**Consumption pattern:**

```go
// events is *AsyncIterator[*AgentEvent], returned by runner.Run()
events := runner.Run(ctx, history)

for {
    event, ok := events.Next()  // blocks until there is an event or the stream ends
    if !ok {
        break  // iterator closed, all events consumed
    }
    if event.Err != nil {
        // handle error
    }
    if event.Output != nil && event.Output.MessageOutput != nil {
        // handle message output (may be streaming)
    }
}
```

Note: each `runner.Run()` creates a new iterator. After consumption it cannot be reused.

## Implementing Multi-Turn Conversation

This chapter implements a simple multi-turn loop: user input → model reply → user input → ...

**How it works:**

Without tools, `ChatModelAgent` completes a single model call within one `Run()`. Multi-turn chat is implemented by the caller maintaining history:

1. Keep `history []*schema.Message` as accumulated conversation
2. For each user input, append `UserMessage` to history
3. Call `runner.Run(ctx, history)` and consume the event stream to collect assistant text
4. Append the assistant reply back into history and continue

Key snippet (note: this is a simplified excerpt and not directly runnable; see [cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)):

```go
history := make([]*schema.Message, 0, 16)

for {
    // 1. Read user input
    line := readUserInput()
    if line == "" {
        break
    }
    
    // 2. Append user message into history
    history = append(history, schema.UserMessage(line))
    
    // 3. Execute the Agent via Runner
    events := runner.Run(ctx, history)
    
    // 4. Consume the stream and collect assistant reply
    content := collectAssistantFromEvents(events)
    
    // 5. Append assistant message back into history
    history = append(history, schema.AssistantMessage(content, nil))
}
```

**Flow:**

```
┌─────────────────────────────────────────┐
│  initialize history = []                 │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  user input UserMessage│
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  append to history    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  runner.Run(history)  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  consume event stream │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  append AssistantMessage│
        └──────────────────────┘
                   ↓
                (loop)
```

## Summary

- **Agent interface**: defines the agent’s behavior; the core is `Run() -> AsyncIterator[*AgentEvent]`
- **ChatModelAgent**: an Agent built on ChatModel, providing a unified execution abstraction
- **Runner**: the execution entry, managing lifecycle, checkpoints, and event streams
- **AgentEvent**: event-driven output unit supporting streaming and control actions
- **Multi-turn conversation**: maintained by caller-side history; each `Run()` completes one turn
