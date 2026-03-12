---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 4: Tools and Filesystem Access"
weight: 4
---

Goal of this chapter: add Tool capability to the Agent so it can access the filesystem.

## Why Tools

In the first three chapters, our Agent could only chat and could not perform real operations.

**Limitations of an Agent without tools:**

- can only generate text responses
- cannot access external resources (files, APIs, databases, etc.)
- cannot execute real tasks (compute, query, modify, etc.)

**What a Tool is for:**

- **Tools extend an Agent’s capabilities**: enable the Agent to perform concrete operations
- **Tools encapsulate implementation details**: the Agent cares only about inputs/outputs
- **Tools are composable**: an Agent can have multiple Tools and call them as needed

**Analogy:**

- **Agent** = “an assistant” (can understand instructions, but needs tools to act)
- **Tool** = “a toolbox” (file ops, network requests, DB queries, etc.)

## Why Filesystem Access

This example is “ChatWithDoc” (chat with docs). The goal is to help users learn Eino and write Eino code. So what is the best documentation?

The answer: **the Eino repository code itself.**

- **Code**: shows the real implementation
- **Comments**: explain design rationale and usage details
- **Examples**: demonstrate best practices

With filesystem access, the Agent can read Eino source code, comments, and examples to provide accurate and up-to-date technical support.

## Key Concepts

### Tool Interfaces

`Tool` is the interface family that defines executable capabilities in Eino:

```go
// BaseTool provides tool metadata. ChatModel uses it to decide whether and how to call the tool.
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}

// InvokableTool can be executed by ToolsNode.
type InvokableTool interface {
    BaseTool
    // InvokableRun executes the tool. The argument is a JSON-encoded string and returns a string result.
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (string, error)
}

// StreamableTool is the streaming variant of InvokableTool.
type StreamableTool interface {
    BaseTool
    // StreamableRun executes the tool in streaming mode and returns a StreamReader.
    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (*schema.StreamReader[string], error)
}
```

**Interface hierarchy:**

- `BaseTool`: base interface, metadata only
- `InvokableTool`: executable tool (extends BaseTool)
- `StreamableTool`: streaming tool (extends BaseTool)

### Backend Interface

`Backend` is the abstraction used by Eino for filesystem operations:

```go
type Backend interface {
    // List file info in a directory.
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    
    // Read file content with optional line offset and limit.
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    
    // Search for matching content in files.
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    
    // Match files by glob patterns.
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    
    // Write file content.
    Write(ctx context.Context, req *WriteRequest) error
    
    // Edit file content (string replacements).
    Edit(ctx context.Context, req *EditRequest) error
}
```

### LocalBackend

`LocalBackend` is a local filesystem implementation of Backend, directly accessing the OS filesystem:

```go
import localbk "github.com/cloudwego/eino-ext/adk/backend/local"

backend, err := localbk.NewBackend(ctx, &localbk.Config{})
```

**Characteristics:**

- direct access to local filesystem using Go standard library
- supports all Backend methods
- supports executing shell commands (ExecuteStreaming)
- path safety: requires absolute paths to prevent directory traversal attacks
- zero configuration: works out of the box

## Implementation: Using DeepAgent

This chapter uses the prebuilt DeepAgent. It exposes Backend and StreamingShell as top-level configuration, making it easy to register filesystem-related tools.

### From ChatModelAgent to DeepAgent: When to Switch?

In earlier chapters we used `ChatModelAgent`, which already supports multi-turn chat. To access the filesystem, we switch to `DeepAgent`.

**ChatModelAgent vs DeepAgent:**

<table>
<tr><td>Capability</td><td>ChatModelAgent</td><td>DeepAgent</td></tr>
<tr><td>Multi-turn chat</td><td>✅</td><td>✅</td></tr>
<tr><td>Add custom tools</td><td>✅ register each tool manually</td><td>✅ register manually or auto-register</td></tr>
<tr><td>Filesystem access (Backend)</td><td>❌ build and register all file tools manually</td><td>✅ top-level config, auto-register</td></tr>
<tr><td>Command execution (StreamingShell)</td><td>❌ build manually</td><td>✅ top-level config, auto-register</td></tr>
<tr><td>Built-in task management</td><td>❌</td><td>✅ <pre>write_todos</pre> tool</td></tr>
<tr><td>Sub-agent support</td><td>❌</td><td>✅</td></tr>
</table>

**Guidance:**

- chat-only scenarios (no external access) → use `ChatModelAgent`
- filesystem access or command execution → use `DeepAgent`

### Why DeepAgent?

Compared to using ChatModelAgent directly, DeepAgent provides:

1. **Top-level configuration**: Backend and StreamingShell are passed directly
2. **Auto tool registration**: configuring Backend auto-registers filesystem tools
3. **Built-in task management**: the `write_todos` tool for planning and tracking
4. **Sub-agent support**: configure specialized sub-agents for specific tasks
5. **More power**: integrates filesystem, command execution, and more

### Code

```go
import (
    localbk "github.com/cloudwego/eino-ext/adk/backend/local"
    "github.com/cloudwego/eino/adk/prebuilt/deep"
)

// Create LocalBackend.
backend, err := localbk.NewBackend(ctx, &localbk.Config{})

// Create DeepAgent and auto-register filesystem tools.
agent, err := deep.New(ctx, &deep.Config{
    Name:           "Ch04ToolAgent",
    Description:    "ChatWithDoc agent with filesystem access via LocalBackend.",
    ChatModel:      cm,
    Instruction:    instruction,
    Backend:        backend,        // filesystem operations
    StreamingShell: backend,        // command execution
    MaxIteration:   50,
})
```

### Tools Auto-Registered by DeepAgent

When `Backend` and `StreamingShell` are configured, DeepAgent automatically registers:

- `read_file`: read file content
- `write_file`: write file content
- `edit_file`: edit file content
- `glob`: find files by glob pattern
- `grep`: search for content in files
- `execute`: run shell commands

## Code Location

- Entry code: [cmd/ch04/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch04/main.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark).

This chapter also uses `PROJECT_ROOT` (optional; see below).

## Run

From `examples/quickstart/chatwitheino`:

```bash
# Optional: set the root directory of the Eino core repo.
# If unset, the Agent uses the current working directory (the chatwitheino directory) as root.
# To let the Agent search the full Eino codebase, point this to the Eino core repo root.
export PROJECT_ROOT=/path/to/eino

# Verify the path (you should see adk/, components/, compose/, etc.)
ls $PROJECT_ROOT

go run ./cmd/ch04
```

**About PROJECT_ROOT:**

- **Unset**: defaults to current working directory (the `chatwitheino` directory). The Agent can only access files in this example project; good enough for a quick try.
- **Set**: point to the Eino core repo root. The Agent can search the full Eino codebase (core, extensions, examples). This is the full ChatWithEino scenario.

**Recommended three-repo layout (for the full experience):**

```
eino/                    # PROJECT_ROOT (Eino core repo)
├── adk/
├── components/
├── compose/
├── ext/                 # eino-ext (extensions: OpenAI, Ark, etc.)
├── examples/            # eino-examples (this repo, where this sample lives)
│   └── quickstart/
│       └── chatwitheino/
└── ...
```

You can use `dev_setup.sh` to set up this layout automatically:

```bash
# Run in the eino root to clone the extension repo and examples repo into the right locations.
bash scripts/dev_setup.sh
```

Example output:

```
you> List files in the current directory
[assistant] Sure, let me list the files...
[tool call] glob(pattern: "*")
[tool result] Found 5 files:
- main.go
- go.mod
- go.sum
- README.md
- cmd/

you> Read the contents of main.go
[assistant] Sure, let me read main.go...
[tool call] read_file(file_path: "main.go")
[tool result] File content:
...
```

Note: if you encounter Tool errors and the Agent gets interrupted, don’t panic—this is normal. Tool failures are common (bad parameters, missing files, etc.). We’ll discuss graceful Tool error handling in the next chapter.

## Tool Call Flow

When the Agent needs to call a tool:

```
┌─────────────────────────────────────────┐
│  user: list files in current directory   │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  agent analyzes intent │
        │  chooses glob tool     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  create Tool Call     │
        │  {"pattern": "*"}     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  execute Tool         │
        │  glob("*")            │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  return Tool Result   │
        │  {"files": [...]}     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  agent responds       │
        │  "found 5 files..."   │
        └──────────────────────┘
```

## Summary

- **Tool**: extends an Agent so it can perform concrete operations
- **Backend**: an abstraction for filesystem operations
- **LocalBackend**: local filesystem implementation of Backend
- **DeepAgent**: a prebuilt advanced Agent with top-level Backend/StreamingShell config
- **Auto tool registration**: configuring Backend auto-registers filesystem tools
- **Tool call flow**: intent → tool call → execute → result → reply

## Further Thoughts

**Other tool types:**

- HTTP tools: call external APIs
- database tools: query databases
- calculator tools: perform computations
- code executor tools: run code

**Other Backend implementations:**

- implement alternative storage backends based on the Backend interface
- e.g. cloud storage, database storage
- LocalBackend already provides a complete local filesystem backend

**Creating custom tools:**

If you need custom tools, you can use `utils.InferTool` to infer a Tool from a function. See:

- [Tool interface docs](https://github.com/cloudwego/eino/tree/main/components/tool)
- [Tool creation examples](https://github.com/cloudwego/eino-examples/tree/main/components/tool)
