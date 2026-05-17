---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 4: Tool and File System Access"
weight: 4
---

Goal of this chapter: add Tool capabilities to the Agent so it can access the file system.

## Why Tools Are Needed

In the first three chapters, the Agent we built can only chat and cannot perform actual operations.

**Agent's limitations:**

- Can only generate text replies
- Cannot access external resources (files, APIs, databases, etc.)
- Cannot perform actual tasks (computation, queries, modifications, etc.)

**Tool's role:**

- **Tool is a capability extension for the Agent**: enabling the Agent to perform concrete operations
- **Tool encapsulates specific implementations**: the Agent doesn't care how the Tool works internally, only about its inputs and outputs
- **Tools are composable**: an Agent can have multiple Tools and choose which to call as needed

**Simple analogy:**

- **Agent** = "intelligent assistant" (can understand instructions, but needs tools to execute)
- **Tool** = "toolbox" (file operations, network requests, database queries, etc.)

## Why File System Access Is Needed

This example is ChatWithDoc (chatting with documentation), with the goal of helping users learn the Eino framework and write Eino code. So, what is the best documentation?

**The answer is: the Eino repository's code itself.**

- **Code**: Source code shows the framework's real implementation
- **Comments**: Code comments provide design rationale and usage instructions
- **Examples**: Example code demonstrates best practices

Through file system access, the Agent can directly read Eino source code, comments, and examples to provide users with the most accurate and up-to-date technical support.

## Key Concepts

### Tool Interface

`Tool` is the interface in Eino that defines executable capabilities:

```go
// BaseTool provides tool metadata that ChatModel uses to decide whether and how to call the tool
type BaseTool interface {
    Info(ctx context.Context) (*schema.ToolInfo, error)
}

// InvokableTool is a tool that can be executed by ToolsNode
type InvokableTool interface {
    BaseTool
    // InvokableRun executes the tool; arguments are a JSON-encoded string, returns a string result
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (string, error)
}

// StreamableTool is the streaming variant of InvokableTool
type StreamableTool interface {
    BaseTool
    // StreamableRun executes the tool in streaming mode, returning a StreamReader
    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...Option) (*schema.StreamReader[string], error)
}
```

**Interface hierarchy:**

- `BaseTool`: Base interface, provides metadata only
- `InvokableTool`: Executable tool (extends BaseTool)
- `StreamableTool`: Streaming tool (extends BaseTool)

### Backend Interface

`Backend` is the abstract interface in Eino for file system operations:

```go
type Backend interface {
    // List file info in a directory
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    
    // Read file content, supports line offset and limit
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    
    // Search for matching content in files
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    
    // Match files by glob pattern
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    
    // Write file content
    Write(ctx context.Context, req *WriteRequest) error
    
    // Edit file content (string replacement)
    Edit(ctx context.Context, req *EditRequest) error
}
```

### LocalBackend

`LocalBackend` is the local file system implementation of Backend, directly accessing the operating system's file system:

```go
import localbk "github.com/cloudwego/eino-ext/adk/backend/local"

backend, err := localbk.NewBackend(ctx, &localbk.Config{})
```

**Features:**

- Directly accesses the local file system, implemented with Go standard library
- Supports all Backend interface methods
- Supports executing shell commands (ExecuteStreaming)
- Path safety: requires absolute paths to prevent directory traversal attacks
- Zero configuration: works out of the box with no additional setup

## Implementation: Using DeepAgent

This chapter uses the DeepAgent prebuilt Agent, which provides first-class configuration for Backend and StreamingShell, making it easy to register file system related tools.

### From ChatModelAgent to DeepAgent: When to Switch?

Previous chapters used `ChatModelAgent`, which can already handle multi-turn conversations. But to access the file system, we need to switch to `DeepAgent`.

**ChatModelAgent vs DeepAgent comparison:**

<table>
<tr><td>Capability</td><td>ChatModelAgent</td><td>DeepAgent</td></tr>
<tr><td>Multi-turn conversation</td><td>✅</td><td>✅</td></tr>
<tr><td>Add custom Tools</td><td>✅ Manually register each Tool</td><td>✅ Manual or automatic registration</td></tr>
<tr><td>File system access (Backend)</td><td>❌ Must manually create and register all file tools</td><td>✅ First-class config, auto-registered</td></tr>
<tr><td>Command execution (StreamingShell)</td><td>❌ Must manually create</td><td>✅ First-class config, auto-registered</td></tr>
<tr><td>Built-in task management</td><td>❌</td><td>✅ <pre>write_todos</pre> tool</td></tr>
<tr><td>Sub-Agent support</td><td>❌</td><td>✅</td></tr>
</table>

**Recommended choice:**

- Pure conversation scenarios (no external access) → use `ChatModelAgent`
- Need file system access or command execution → use `DeepAgent`

### Why Use DeepAgent?

Compared to using ChatModelAgent directly, DeepAgent offers these advantages:

1. **First-class configuration**: Backend and StreamingShell are first-class configs — just pass them in
2. **Automatic tool registration**: After configuring Backend, file system tools are registered automatically — no manual creation needed
3. **Built-in task management**: Provides the `write_todos` tool for task planning and tracking
4. **Sub-Agent support**: Can configure specialized sub-Agents for specific tasks
5. **More powerful**: Integrates file system, command execution, and many other capabilities

### Code Implementation

```go
import (
    localbk "github.com/cloudwego/eino-ext/adk/backend/local"
    "github.com/cloudwego/eino/adk/prebuilt/deep"
)

// Create LocalBackend
backend, err := localbk.NewBackend(ctx, &localbk.Config{})

// Create DeepAgent with auto-registered file system tools
agent, err := deep.New(ctx, &deep.Config{
    Name:           "Ch04ToolAgent",
    Description:    "ChatWithDoc agent with filesystem access via LocalBackend.",
    ChatModel:      cm,
    Instruction:    agentInstruction,
    Backend:        backend,        // Provides file system operation capabilities
    StreamingShell: backend,        // Provides command execution capabilities
    MaxIteration:   50,
})
```

### Tools Auto-Registered by DeepAgent

When Backend and StreamingShell are configured, DeepAgent automatically registers the following tools:

- `read_file`: Read file content
- `write_file`: Write file content
- `edit_file`: Edit file content
- `glob`: Find files by glob pattern
- `grep`: Search content in files
- `execute`: Execute shell commands

## Code Location

- Entry code: [cmd/ch04/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch04/main.go)

## Prerequisites

Same as Chapter 1: you need to configure an available ChatModel (OpenAI or Ark).

This chapter also requires setting `PROJECT_ROOT` (optional, see run instructions below).

## Run

In the `examples/quickstart/chatwitheino` directory:

```bash
# Optional: set the root directory path of the Eino core library
# When not set, the Agent defaults to using the current working directory (chatwitheino directory) as root
# To let the Agent search the full Eino codebase, point this to the eino core library root
export PROJECT_ROOT=/path/to/eino

# Verify the path is correct (you should see directories like adk, components, compose, etc.)
ls $PROJECT_ROOT

go run ./cmd/ch04
```

**PROJECT_ROOT notes:**

- **When not set**: `PROJECT_ROOT` defaults to the current working directory (the `chatwitheino` directory), and the Agent can only access files in this example project. This is sufficient for quick experimentation.
- **When set**: Points to the Eino core library root, allowing the Agent to search the complete Eino framework codebase (core library, extension library, examples library). This is the full ChatWithEino use case.

**Recommended three-repo directory structure (for full experience):**

```
eino/                    # PROJECT_ROOT (Eino core library)
├── adk/
├── components/
├── compose/
├── ext/                 # eino-ext (extension components, e.g., OpenAI, Ark implementations)
├── examples/            # eino-examples (this repo, where this example resides)
│   └── quickstart/
│       └── chatwitheino/
└── ...
```

You can use the `dev_setup.sh` script to automatically set up this directory structure:

```bash
# Run in the eino root directory to auto-clone extension and example repos to the correct locations
bash scripts/dev_setup.sh
```

Example output:

```
you> List the files in the current directory
[assistant] Let me list the files in the current directory for you...
[tool call] glob(pattern: "*")
[tool result] Found 5 files:
- main.go
- go.mod
- go.sum
- README.md
- cmd/

you> Read the content of main.go
[assistant] Let me read the main.go file...
[tool call] read_file(file_path: "main.go")
[tool result] File content:
...
```

**Note:** If you encounter Tool errors during execution that cause the Agent to interrupt, don't panic — this is normal. Tool errors are common, for example due to incorrect arguments, non-existent files, etc. How to gracefully handle Tool errors will be covered in detail in the next chapter.

## Tool Call Flow

When the Agent needs to call a Tool:

```
┌─────────────────────────────────────────┐
│  User: List the files in the current    │
│  directory                              │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Agent analyzes      │
        │  intent, decides to  │
        │  call the glob tool  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Generate Tool Call  │
        │  {"pattern": "*"}    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Execute Tool        │
        │  glob("*")           │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Return Tool Result  │
        │  {"files": [...]}    │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Agent generates     │
        │  reply               │
        │  "Found 5 files..."  │
        └──────────────────────┘
```

## Chapter Summary

- **Tool**: A capability extension for the Agent, enabling it to perform concrete operations
- **Backend**: An abstract interface for file system operations, providing unified file operation capabilities
- **LocalBackend**: The local file system implementation of Backend, directly accessing the OS file system
- **DeepAgent**: A prebuilt advanced Agent, providing first-class configuration for Backend and StreamingShell
- **Automatic tool registration**: File system tools are auto-registered after configuring Backend
- **Tool call flow**: Agent analyzes intent → generates Tool Call → executes Tool → returns result → generates reply

## Further Thoughts

**Other Tool types:**

- HTTP Tool: Call external APIs
- Database Tool: Query databases
- Calculator Tool: Perform calculations
- Code Executor Tool: Run code

**Other Backend implementations:**

- Other storage backends can be implemented based on the Backend interface
- For example: cloud storage, database storage, etc.
- LocalBackend already provides complete file system operation capabilities

**Custom Tool creation:**

If you need to create custom Tools, you can use `utils.InferTool` to automatically infer from a function. See:

- [Tool interface documentation](https://github.com/cloudwego/eino/tree/main/components/tool)
- [Tool creation examples](https://github.com/cloudwego/eino-examples/tree/main/components/tool)
