---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 3: Memory and Session (Persistent Conversations)"
weight: 3
---

Goal of this chapter: implement persistent storage for conversation history and support session recovery across processes.

> **⚠️ Important note: Business-layer concepts vs. framework concepts**

> **Memory, Session, and Store introduced in this chapter are business-layer concepts**, **not core Eino framework components**.

>

> In other words, the Eino framework is only responsible for "how to process messages", while "how to store messages" is entirely up to the business layer. The implementation provided in this chapter is a simple reference example; you can choose a completely different storage solution (database, Redis, cloud storage, etc.) based on your business needs.

## Code Location

- Entry code: [cmd/ch03/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch03/main.go)
- Memory implementation: [mem/store.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/mem/store.go)

## Prerequisites

Same as Chapter 1: you need to configure an available ChatModel (OpenAI or Ark).

## Run

In the `examples/quickstart/chatwitheino` directory:

```bash
# Create a new session
go run ./cmd/ch03

# Resume an existing session
go run ./cmd/ch03 --session <session-id>
```

Example output:

```
Created new session: 083d16da-6b13-4fe6-afb0-c45d8f490ce1
Session title: New Session
Enter your message (empty line to exit):
you> Hello, my name is Zhang San
[assistant] Hello Zhang San! Nice to meet you...
you> What is my name?
[assistant] Your name is Zhang San...

Session saved: 083d16da-6b13-4fe6-afb0-c45d8f490ce1
Resume with: go run ./cmd/ch03 --session 083d16da-6b13-4fe6-afb0-c45d8f490ce1
```

## From In-Memory to Persistent: Why Memory Is Needed

In Chapter 2 we implemented multi-turn conversation, but there is one problem: **conversation history only exists in memory**.

**Limitations of in-memory storage:**

- Conversation history is lost when the process exits
- Cannot resume sessions across devices or processes
- Cannot implement session management (listing, deletion, search, etc.)

**Memory's role:**

- **Memory is persistent storage for conversation history**: saving conversations to disk or database
- **Memory supports Session management**: each Session represents a complete conversation
- **Memory is decoupled from Agent**: the Agent doesn't care about storage details, only the message list

**Simple analogy:**

- **In-memory storage** = "scratch paper" (gone when the process exits)
- **Memory** = "notebook" (permanently saved, browsable anytime)

## Key Concepts

> **Reminder**: The Session, Store, and other concepts below are all **business-layer implementations** for managing conversation history storage. The Eino framework itself does not provide these components; instead, the business layer is responsible for managing the message list, then passing messages to `adk.Runner` for processing.

### Session (Business-Layer Concept)

`Session` represents a complete conversation session:

```go
type Session struct {
    ID        string
    CreatedAt time.Time

    messages []*schema.Message  // conversation history
    // ...
}
```

**Core methods:**

- `Append(msg)`: Append a message to the session and persist it
- `GetMessages()`: Get all messages
- `Title()`: Generate a session title from the first user message

### Store (Business-Layer Concept)

`Store` manages persistent storage of multiple Sessions:

```go
type Store struct {
    dir   string              // storage directory
    cache map[string]*Session // in-memory cache
}
```

**Core methods:**

- `GetOrCreate(id)`: Get or create a Session
- `List()`: List all Sessions
- `Delete(id)`: Delete a Session

### JSONL File Format

Each Session is stored as a `.jsonl` file:

```
{"type":"session","id":"083d16da-...","created_at":"2026-03-11T10:00:00Z"}
{"role":"user","content":"Hello, who am I?"}
{"role":"assistant","content":"Hello! I don't know who you are yet..."}
{"role":"user","content":"My name is Zhang San"}
{"role":"assistant","content":"Got it, Zhang San, nice to meet you!"}
```

**Why JSONL?**

- **Simple**: One JSON object per line, easy to read and write
- **Extensible**: New messages can be appended without rewriting the entire file
- **Readable**: Can be viewed directly with a text editor
- **Fault-tolerant**: A corrupted line doesn't affect other lines

## Memory Implementation (Business-Layer Example)

Below is a simple business-layer implementation example using JSONL files to store conversation history. This is just one of many possible implementations; you can choose database, Redis, or other storage solutions based on your actual needs.

### 1. Create a Store

```go
sessionDir := "./data/sessions"
store, err := mem.NewStore(sessionDir)
if err != nil {
    log.Fatal(err)
}
```

### 2. Get or Create a Session

```go
sessionID := "083d16da-6b13-4fe6-afb0-c45d8f490ce1"
session, err := store.GetOrCreate(sessionID)
if err != nil {
    log.Fatal(err)
}
```

### 3. Append a User Message

```go
userMsg := schema.UserMessage("Hello")
if err := session.Append(userMsg); err != nil {
    log.Fatal(err)
}
```

### 4. Get History and Call the Agent

```go
history := session.GetMessages()
events := runner.Run(ctx, history)
content := printAndCollectAssistantFromEvents(events)
```

### 5. Append the Assistant Message

```go
assistantMsg := schema.AssistantMessage(content, nil)
if err := session.Append(assistantMsg); err != nil {
    log.Fatal(err)
}
```

**Key code snippet** (note: this is a simplified snippet that cannot be run directly; for the full code see [cmd/ch03/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch03/main.go)):

```go
// Create or resume a Session
session, err := store.GetOrCreate(sessionID)
if err != nil {
    log.Fatal(err)
}

// User input
userMsg := schema.UserMessage(line)
if err := session.Append(userMsg); err != nil {
    log.Fatal(err)
}

// Call Agent
history := session.GetMessages()
events := runner.Run(ctx, history)
content := printAndCollectAssistantFromEvents(events)

// Save assistant reply
assistantMsg := schema.AssistantMessage(content, nil)
if err := session.Append(assistantMsg); err != nil {
    log.Fatal(err)
}
```

## The Relationship Between Session and Agent: Business Layer and Framework Layer Collaboration

**Key understanding:**

- **Session is a business-layer concept**: Implemented and managed by business code, responsible for storing and loading conversation history
- **Agent (Runner) is a framework-layer concept**: Provided by the Eino framework, responsible for processing messages and generating replies
- **Their interaction point**: The business layer gets the message list via `session.GetMessages()` and passes it to `runner.Run(ctx, history)` for processing

**Architecture layers:**

```
┌─────────────────────────────────────────────────────────────┐
│                   Business Layer (your code)                │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Session   │───→│ GetMessages() │───→│ runner.Run()  │  │
│  │  (storage)  │    │ (message list)│    │(framework call)│  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ↑                                      │            │
│         │                                      ↓            │
│  ┌─────────────┐                      ┌───────────────┐    │
│  │   Append()  │←─────────────────────│ Assistant reply│    │
│  │(save message)│                      └───────────────┘    │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 Framework Layer (Eino framework)            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ adk.Runner: receives message list, calls ChatModel,   │  │
│  │ returns reply                                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Flow diagram:**

```
┌─────────────────────────────────────────┐
│  User input                             │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  session.Append()    │
        │  Save user message   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  session.GetMessages()│
        │  Get complete history │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  runner.Run(history) │
        │  Agent processes msgs │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Collect assistant   │
        │  reply               │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  session.Append()    │
        │  Save assistant msg  │
        └──────────────────────┘
```

## Chapter Summary

**Framework layer vs. business layer:**

- **Eino framework layer**: Provides foundational abstractions like `adk.Runner` and `schema.Message`; does not concern itself with how messages are stored
- **Business layer (this chapter's implementation)**: Memory/Session/Store are business-layer concepts for managing conversation history storage

**Business-layer concepts:**

- **Memory**: Persistent storage for conversation history, supporting cross-process recovery
- **Session**: A complete conversation session, containing ID, creation time, and message list
- **Store**: Manages storage of multiple Sessions, supporting create, get, list, and delete operations
- **JSONL format**: A simple file format, easy to read, write, and extend

**Business layer and framework layer interaction:**

- The business layer is responsible for storing messages, getting the message list via `session.GetMessages()`
- The message list is passed to the framework layer's `runner.Run(ctx, history)` for processing
- The reply returned by the framework layer is collected and saved back to storage by the business layer

> **💡 Tip**: The implementation in this chapter is just one simple example among many storage solutions. In real projects, you can choose database, Redis, cloud storage, or other solutions based on business needs, and even implement more advanced features like session expiration cleanup, search, sharing, etc.

## Further Thoughts: Choosing a Business-Layer Storage Solution

The JSONL file storage solution provided in this chapter is suitable for simple standalone applications. In real business scenarios, you may need to consider other storage solutions:

**Other storage implementations:**

- Database storage (MySQL, PostgreSQL, MongoDB)
- Redis storage (supports distributed setups)
- Cloud storage (S3, OSS)

**Advanced features:**

- Session expiration cleanup
- Session search
- Session export/import
- Session sharing
