---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 1: ChatModel and Message (Console)"
weight: 1
---

## Introduction to the Eino Framework

**What is Eino?**

Eino is a Go-based AI application development framework (Agent Development Kit) designed to help developers build AI applications that are extensible and maintainable.

**What problems does Eino solve?**

1. **Model abstraction**: A unified interface over different LLM providers (OpenAI, Ark, Claude, etc.). Switching models does not require business-code changes.
2. **Capability composition**: Replaceable, composable capability units via the Component interfaces (chat, tools, retrieval, etc.).
3. **Orchestration framework**: Agent, Graph, and Chain abstractions for complex multi-step AI workflows.
4. **Runtime support**: Streaming output, interrupt/resume, state management, and callback observability.

**The main repositories:**

- **eino** (this repo): core library, defines interfaces, orchestration abstractions, and ADK
- **eino-ext**: extensions, concrete implementations of components (OpenAI, Ark, Milvus, etc.)
- **eino-examples**: example code, including this quickstart series

---

## ChatWithEino: An Assistant That Talks With Eino Docs

**What is ChatWithEino?**

ChatWithEino is an assistant built with the Eino framework to help developers learn Eino and write Eino code. It answers questions based on the Eino repositories’ source code, comments, and examples.

**Core capabilities:**

- **Conversational interaction**: Understand Eino-related questions and provide clear answers
- **Code access**: Read Eino source code, comments, and examples to answer based on real implementations
- **Persistent sessions**: Multi-turn conversations with remembered context, recoverable across processes
- **Tool calling**: Execute operations like file reads and code search

**Architecture:**

- **ChatModel**: Communicate with LLMs (OpenAI, Ark, Claude, etc.)
- **Tool**: Capability extensions such as filesystem access and code search
- **Memory**: Persist conversation history
- **Agent**: A unified execution framework coordinating all components

## Quickstart Series: Build ChatWithEino From Scratch

This series starts from the simplest ChatModel call and incrementally builds a complete ChatWithEino Agent.

**Learning path:**

<table>
<tr><td>Chapter</td><td>Topic</td><td>What you build</td><td>Capability</td></tr>
<tr><td><strong>Chapter 1</strong></td><td>ChatModel and Message</td><td>Understand the Component abstraction, implement a single-turn chat</td><td>Basic chat</td></tr>
<tr><td><strong>Chapter 2</strong></td><td>Agent and Runner</td><td>Introduce the execution abstraction, implement multi-turn chat</td><td>Session management</td></tr>
<tr><td><strong>Chapter 3</strong></td><td>Memory and Session</td><td>Persist chat history and support session recovery</td><td>Persistence</td></tr>
<tr><td><strong>Chapter 4</strong></td><td>Tool and filesystem</td><td>Add file-access capability and read source code</td><td>Tool calling</td></tr>
<tr><td><strong>Chapter 5</strong></td><td>Middleware</td><td>Middleware mechanism to handle cross-cutting concerns</td><td>Extensibility</td></tr>
<tr><td><strong>Chapter 6</strong></td><td>Callback</td><td>Callback mechanism to observe Agent execution</td><td>Observability</td></tr>
<tr><td><strong>Chapter 7</strong></td><td>Interrupt and Resume</td><td>Interrupt/resume for long-running tasks</td><td>Reliability</td></tr>
<tr><td><strong>Chapter 8</strong></td><td>Graph and Tool</td><td>Use Graph to orchestrate complex workflows</td><td>Advanced orchestration</td></tr>
<tr><td><strong>Chapter 9</strong></td><td>A2UI</td><td>Integration from Agent to UI</td><td>Production readiness</td></tr>
</table>

**Why this design?**

Each chapter adds one core capability on top of the previous one, so you can:

1. **Understand each component’s role**: Introduce features gradually instead of all at once
2. **See how the architecture evolves**: From simple to complex, and why each abstraction exists
3. **Build practical skills**: Every chapter includes runnable code for hands-on practice

---

Goal of this chapter: understand Eino’s Component abstraction, call a ChatModel with minimal code (with streaming output), and learn the basic usage of `schema.Message`.

## Code Location

- Entry code: [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)

## Why a Component Interface?

Eino defines a set of Component interfaces (`ChatModel`, `Tool`, `Retriever`, `Loader`, etc.). Each interface describes a replaceable capability:

```go
type BaseChatModel interface {
    Generate(ctx context.Context, input []*schema.Message, opts ...Option) (*schema.Message, error)
    Stream(ctx context.Context, input []*schema.Message, opts ...Option) (
        *schema.StreamReader[*schema.Message], error)
}
```

**Benefits of interfaces:**

1. **Replaceable implementations**: `eino-ext` provides OpenAI, Ark, Claude, Ollama, and more. Business code depends only on the interface; switching models only changes construction.
2. **Composable orchestration**: Agent/Graph/Chain depend only on Component interfaces, not implementations. Replace OpenAI with Ark without changing orchestration code.
3. **Mock-friendly testing**: Interfaces are easy to mock; unit tests do not need real model calls.

This chapter focuses only on `ChatModel`. Later chapters will introduce `Tool`, `Retriever`, and more.

## schema.Message: The Basic Unit of a Conversation

`Message` is the basic structure for conversation data in Eino:

```go
type Message struct {
    Role      RoleType    // system / user / assistant / tool
    Content   string      // text content
    ToolCalls []ToolCall  // only assistant messages may have this
    // ...
}
```

Common constructors:

```go
schema.SystemMessage("You are a helpful assistant.")
schema.UserMessage("What is the weather today?")
schema.AssistantMessage("I don't know.", nil)  // the second argument is ToolCalls
schema.ToolMessage("tool result", "call_id")
```

**Role semantics:**

- `system`: system instruction, usually first in the message list
- `user`: user input
- `assistant`: model response
- `tool`: tool execution result (used in later chapters)

## Prerequisites

### Get the Code

```bash
git clone https://github.com/cloudwego/eino-examples.git
cd eino-examples/quickstart/chatwitheino
```

- Go version: Go 1.21+ (see `go.mod`)
- A callable ChatModel (default: OpenAI; Ark is also supported)

### Option A: OpenAI (Default)

```bash
export OPENAI_API_KEY="..."
export OPENAI_MODEL="gpt-4.1-mini"  # OpenAI model (2025), or gpt-4o / gpt-4o-mini, etc.
# Optional:
# OPENAI_BASE_URL (proxy or compatible service)
# OPENAI_BY_AZURE=true (use Azure OpenAI)
```

### Option B: Ark

```bash
export MODEL_TYPE="ark"
export ARK_API_KEY="..."
export ARK_MODEL="..."
# Optional: ARK_BASE_URL
```

## Run

From `examples/quickstart/chatwitheino`:

```bash
go run ./cmd/ch01 -- "In one sentence, what problem does Eino’s Component design solve?"
```

Example output (streaming print):

```
[assistant] Eino’s Component design defines unified interfaces...
```

## What the Entry Code Does

In execution order:

1. **Create the ChatModel**: select OpenAI or Ark based on the `MODEL_TYPE` environment variable
2. **Build input messages**: `SystemMessage(instruction)` + `UserMessage(query)`
3. **Call Stream**: all ChatModel implementations must support `Stream()`, which returns `StreamReader[*Message]`
4. **Print output**: iterate over the `StreamReader` and print assistant chunks

Key snippet (note: this is a simplified excerpt and not directly runnable; see the full code in [cmd/ch01/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch01/main.go)):

```go
// Build input
messages := []*schema.Message{
    schema.SystemMessage(instruction),
    schema.UserMessage(query),
}

// Call Stream (all ChatModels must implement this)
stream, err := cm.Stream(ctx, messages)
if err != nil {
    log.Fatal(err)
}
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if errors.Is(err, io.EOF) {
        break
    }
    if err != nil {
        log.Fatal(err)
    }
    fmt.Print(chunk.Content)
}
```

## Summary

- **Component interfaces**: define replaceable, composable, and testable capability boundaries
- **Message**: the basic unit of conversation data, with semantics defined by role
- **ChatModel**: the fundamental Component, providing `Generate` and `Stream`
- **Implementation choice**: switch between OpenAI/Ark via env/config without changing business code
