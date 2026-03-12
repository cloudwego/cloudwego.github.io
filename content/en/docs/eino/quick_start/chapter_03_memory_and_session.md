---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 3: Memory and Session (Persistent Conversations)"
weight: 3
---

Goal of this chapter: persist conversation history and support session recovery across processes.

> Important: business-layer concepts vs framework concepts
>
> The **Memory**, **Session**, and **Store** described in this chapter are **business-layer concepts**, and **not core components of the Eino framework**.
>
> In other words, Eino is responsible for “how to process messages”, while “how to store messages” is entirely up to your application. The implementation shown here is a simple reference; you can choose a completely different storage solution (database, Redis, cloud storage, etc.).

## Code Location

- Entry code: [cmd/ch03/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch03/main.go)
- Memory implementation: [mem/store.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/mem/store.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark).

## Run

From `examples/quickstart/chatwitheino`:

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
you> Hello, I am Zhang San
[assistant] Hi Zhang San! Nice to meet you...
you> What is my name?
[assistant] Your name is Zhang San...

Session saved: 083d16da-6b13-4fe6-afb0-c45d8f490ce1
Resume with: go run ./cmd/ch03 --session 083d16da-6b13-4fe6-afb0-c45d8f490ce1
```

## From In-Memory to Persistence: Why We Need “Memory”

In Chapter 2 we implemented multi-turn chat, but there is a problem: **the conversation history exists only in memory**.

**Limitations of in-memory storage:**

- history is lost when the process exits
- sessions cannot be recovered across devices/processes
- session management (list/delete/search, etc.) is hard to implement

**Positioning of “Memory”:**

- **Memory is persistent storage for chat history**: save conversations to disk or a database
- **Memory enables session management**: each Session represents one complete conversation
- **Memory is decoupled from Agent**: the Agent does not care about storage details, only the message list

**Analogy:**

- **in-memory** = “scratch paper” (gone when the process exits)
- **Memory** = “notebook” (saved permanently, can be reviewed anytime)

## Key Concepts

> Reminder: the Session/Store concepts below are **business-layer implementations** used to manage storage of chat history. Eino itself does not provide these components. Your application manages the message list, then passes it to `adk.Runner` for processing.

### Session (Business-Layer Concept)

`Session` represents a complete conversation:

```go
type Session struct {
    ID        string
    CreatedAt time.Time

    messages []*schema.Message  // conversation history
    // ...
}
```

**Core methods:**

- `Append(msg)`: append a message into the session and persist it
- `GetMessages()`: get all messages
- `Title()`: derive a title from the first user message

### Store (Business-Layer Concept)

`Store` manages persistent storage for multiple sessions:

```go
type Store struct {
    dir   string              // storage directory
    cache map[string]*Session // in-memory cache
}
```

**Core methods:**

- `GetOrCreate(id)`: get or create a session
- `List()`: list all sessions
- `Delete(id)`: delete a session

### JSONL File Format

Each Session is stored as a `.jsonl` file:

```
{"type":"session","id":"083d16da-...","created_at":"2026-03-11T10:00:00Z"}
{"role":"user","content":"Hello, who am I?"}
{"role":"assistant","content":"Hi! I don’t know who you are yet..."}
{"role":"user","content":"My name is Zhang San"}
{"role":"assistant","content":"Got it, Zhang San. Nice to meet you!"}
```

**Why JSONL?**

- **Simple**: one JSON object per line, easy to read/write
- **Append-friendly**: append new messages without rewriting the whole file
- **Readable**: view directly with a text editor
- **Fault-tolerant**: a corrupted line doesn’t break the whole file

## “Memory” Implementation (Business-Layer Example)

Below is a simple example that stores conversation history in JSONL files. This is just one possible approach; you can use databases, Redis, and other storage options based on your needs.

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
userMsg := schema.UserMessage("hello")
if err := session.Append(userMsg); err != nil {
    log.Fatal(err)
}
```

### 4. Get History and Call the Agent

```go
history := session.GetMessages()
events := runner.Run(ctx, history)
content := collectAssistantFromEvents(events)
```

### 5. Append an Assistant Message

```go
assistantMsg := schema.AssistantMessage(content, nil)
if err := session.Append(assistantMsg); err != nil {
    log.Fatal(err)
}
```

Key snippet (note: this is a simplified excerpt and not directly runnable; see [cmd/ch03/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch03/main.go)):

```go
// Create or resume a session
session, err := store.GetOrCreate(sessionID)
if err != nil {
    log.Fatal(err)
}

// User input
userMsg := schema.UserMessage(line)
if err := session.Append(userMsg); err != nil {
    log.Fatal(err)
}

// Call the Agent
history := session.GetMessages()
events := runner.Run(ctx, history)
content := collectAssistantFromEvents(events)

// Save assistant reply
assistantMsg := schema.AssistantMessage(content, nil)
if err := session.Append(assistantMsg); err != nil {
    log.Fatal(err)
}
```

## Session vs Agent: How Business Layer and Framework Layer Work Together

**Key takeaways:**

- **Session is a business-layer concept**: implemented/managed by your code, responsible for storing/loading history
- **Agent (Runner) is a framework-layer concept**: provided by Eino, responsible for processing messages and producing replies
- **Integration point**: the business layer calls `session.GetMessages()` to obtain the message list, and passes it to `runner.Run(ctx, history)`

**Layering:**

```
┌─────────────────────────────────────────────────────────────┐
│                 Business layer (your code)                  │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Session   │───→│ GetMessages() │───→│ runner.Run()  │  │
│  │  (storage)  │    │ (message list)│    │ (framework)   │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ↑                                      │            │
│         │                                      ↓            │
│  ┌─────────────┐                      ┌───────────────┐    │
│  │  Append()   │←─────────────────────│ assistant reply│    │
│  │ (persist)   │                      └───────────────┘    │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 Framework layer (Eino)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ adk.Runner: accepts message list, calls ChatModel,     │  │
│  │ and returns replies                                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Flow:**

```
┌─────────────────────────────────────────┐
│  user input                               │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  session.Append()     │
        │  persist user message │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  session.GetMessages()│
        │  get full history     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  runner.Run(history)  │
        │  agent processes      │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  collect reply        │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  session.Append()     │
        │  persist assistant    │
        └──────────────────────┘
```

## Summary

**Framework layer vs business layer:**

- **Eino framework**: provides base abstractions like `adk.Runner` and `schema.Message`; it does not care how messages are stored
- **Business layer (this chapter’s sample)**: Memory/Session/Store are application-level concepts managing storage of chat history

**Business-layer concepts:**

- **Memory**: persistent storage for history, supports cross-process recovery
- **Session**: one complete conversation with ID, timestamps, message list
- **Store**: manages multiple sessions (create/get/list/delete)
- **JSONL**: a simple file format that is easy to append and inspect

**How the two layers interact:**

- business layer stores messages and calls `session.GetMessages()` to get the list
- pass the list to `runner.Run(ctx, history)` for processing
- collect replies from the framework and persist them back via the business layer

> Tip: this chapter’s implementation is one simple example. In real projects, you can use databases, Redis, cloud storage, and implement additional capabilities like expiration cleanup, search, sharing, etc.

## Further Thoughts: Choosing a Storage Solution

The JSONL approach works for simple single-machine apps. In production you may need other options:

**Other storage implementations:**

- databases (MySQL, PostgreSQL, MongoDB)
- Redis (distributed support)
- cloud storage (S3, OSS)

**Advanced features:**

- session expiration cleanup
- session search
- session export/import
- session sharing
