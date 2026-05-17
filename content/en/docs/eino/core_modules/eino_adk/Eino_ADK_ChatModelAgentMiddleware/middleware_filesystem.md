---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: FileSystem
weight: 2
---

The FileSystem middleware injects a set of file system operation tools (ls, read\_file, write\_file, edit\_file, glob, grep) and an optional command execution tool (execute) into the Agent, enabling the Agent to interact with local or remote file systems.

```
import "github.com/cloudwego/eino/adk/middlewares/filesystem"
```

---

## Quick Start

```go
import (
    "context"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

// 1. Create middleware
middleware, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend: myBackend, // Implements the filesystem.Backend interface
})

// 2. Inject into Agent
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

---

## Constructors

<table>
<tr><td>Function Signature</td><td>Description</td></tr>
<tr><td><pre>New(ctx, *MiddlewareConfig) (ChatModelAgentMiddleware, error)</pre></td><td><strong>Recommended</strong>. Returns <pre>ChatModelAgentMiddleware</pre>, supports dynamically modifying Instruction and Tools through the <pre>BeforeAgent</pre> hook.</td></tr>
<tr><td><pre>NewTyped[M MessageType](ctx, *MiddlewareConfig) (TypedChatModelAgentMiddleware[M], error)</pre></td><td>Generic version, type parameter <pre>M</pre> supports <pre>*schema.Message</pre> and <pre>*schema.AgenticMessage</pre>. <pre>New</pre> is equivalent to <pre>NewTyped[*schema.Message]</pre>.</td></tr>
</table>

> 💡
> **Deprecated**: `NewMiddleware(ctx, *Config) (AgentMiddleware, error)` is the legacy constructor; new code should use `New`. `NewMiddleware` returns the struct `AgentMiddleware`, which lacks the flexibility of the `BeforeAgent` hook; additionally, it enables the "large result offloading" feature by default (see below), which has been removed in the `New` path.

---

## MiddlewareConfig

`MiddlewareConfig` is the configuration struct used by `New` / `NewTyped`.

### Core Fields

<table>
<tr><td>Field</td><td>Type</td><td>Description</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>filesystem.Backend</pre></td><td><strong>Required</strong>. Provides file system operation capabilities, powering the 6 tools: ls, read\_file, write\_file, edit\_file, glob, grep. The interface is defined in the <pre>github.com/cloudwego/eino/adk/filesystem</pre> package.</td></tr>
<tr><td><pre>Shell</pre></td><td><pre>filesystem.Shell</pre></td><td>Optional. Provides command execution capability; when set, registers the <pre>execute</pre> tool. <strong>Mutually exclusive</strong> with <pre>StreamingShell</pre>.</td></tr>
<tr><td><pre>StreamingShell</pre></td><td><pre>filesystem.StreamingShell</pre></td><td>Optional. Provides streaming command execution capability; when set, registers the streaming <pre>execute</pre> tool. <strong>Mutually exclusive</strong> with <pre>Shell</pre>.</td></tr>
<tr><td><pre>UseMultiModalRead</pre></td><td><pre>bool</pre></td><td>Optional, defaults to <pre>false</pre>. When enabled, the <pre>read_file</pre> tool becomes an <pre>EnhancedInvokableTool</pre>, supporting multi-modal content such as images/PDFs. <strong>Requires the Backend to also implement the filesystem.MultiModalReader interface</strong>.</td></tr>
<tr><td><pre>CustomSystemPrompt</pre></td><td><pre>*string</pre></td><td>Optional. Overrides the system prompt appended to the Agent Instruction. If <pre>nil</pre>, <strong>no system prompt is appended</strong>.</td></tr>
</table>

### Tool Configuration Fields

Each tool has a corresponding `*ToolConfig` field for customizing the tool name, description, replacing the implementation, or disabling it:

<table>
<tr><td>Field</td><td>Corresponding Tool</td></tr>
<tr><td><pre>LsToolConfig</pre></td><td>ls</td></tr>
<tr><td><pre>ReadFileToolConfig</pre></td><td>read\_file</td></tr>
<tr><td><pre>WriteFileToolConfig</pre></td><td>write\_file</td></tr>
<tr><td><pre>EditFileToolConfig</pre></td><td>edit\_file</td></tr>
<tr><td><pre>GlobToolConfig</pre></td><td>glob</td></tr>
<tr><td><pre>GrepToolConfig</pre></td><td>grep</td></tr>
</table>

> The `execute` tool currently does not support customization via `ToolConfig`; its registration is controlled solely by whether `Shell` / `StreamingShell` is set.

---

## ToolConfig

```go
type ToolConfig struct {
    Name       string         // Override tool name, empty string uses default
    Desc       *string        // Override tool description, nil uses default
    CustomTool tool.BaseTool  // Custom tool implementation, replaces Backend default when set
    Disable    bool           // Set to true to not register this tool
}
```

**Priority**: `Disable=true` > `CustomTool` > Backend default implementation.

---

## Tool Name Constants

```go
const (
    ToolNameLs        = "ls"
    ToolNameReadFile  = "read_file"
    ToolNameWriteFile = "write_file"
    ToolNameEditFile  = "edit_file"
    ToolNameGlob      = "glob"
    ToolNameGrep      = "grep"
    ToolNameExecute   = "execute"
)
```

---

## Injected Tools

<table>
<tr><td>Tool</td><td>Default Name</td><td>Registration Condition</td><td>Description</td></tr>
<tr><td>ls</td><td><pre>ls</pre></td><td>Backend ≠ nil</td><td>List files and subdirectories in a directory</td></tr>
<tr><td>read\_file</td><td><pre>read_file</pre></td><td>Backend ≠ nil</td><td>Read file content, supports offset/limit pagination. When <pre>UseMultiModalRead</pre> is enabled, can read images and PDFs</td></tr>
<tr><td>write\_file</td><td><pre>write_file</pre></td><td>Backend ≠ nil</td><td>Create or overwrite a file</td></tr>
<tr><td>edit\_file</td><td><pre>edit_file</pre></td><td>Backend ≠ nil</td><td>Precise string replacement editing, supports <pre>replace_all</pre></td></tr>
<tr><td>glob</td><td><pre>glob</pre></td><td>Backend ≠ nil</td><td>Match file paths by glob pattern</td></tr>
<tr><td>grep</td><td><pre>grep</pre></td><td>Backend ≠ nil</td><td>Regex search of file content, supports multiple output modes and pagination</td></tr>
<tr><td>execute</td><td><pre>execute</pre></td><td>Shell ≠ nil or StreamingShell ≠ nil</td><td>Execute shell commands</td></tr>
</table>

---

## Backend Interface

`Backend` is defined in the `github.com/cloudwego/eino/adk/filesystem` package. The middleware package re-exports request/response types via type aliases (e.g., `ReadRequest`, `FileContent`), but **the Backend interface itself needs to be referenced from the adk/filesystem package**.

```go
type Backend interface {
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    Write(ctx context.Context, req *WriteRequest) error
    Edit(ctx context.Context, req *EditRequest) error
}
```

### Shell and StreamingShell

```go
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (*ExecuteResponse, error)
}

type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (*schema.StreamReader[*ExecuteResponse], error)
}
```

These two are mutually exclusive — only one can be set. `StreamingShell` supports streaming output, suitable for long-running commands.

---

## MultiModalReader Extension Interface

When `UseMultiModalRead = true`, the Backend needs to additionally implement the `MultiModalReader` interface:

```go
type MultiModalReader interface {
    MultiModalRead(ctx context.Context, req *MultiModalReadRequest) (*MultiFileContent, error)
}
```

**Behavior**:

- The `read_file` tool is upgraded from `InvokableTool` to `EnhancedInvokableTool`, returning multi-modal results via `schema.ToolResult.Parts`
- The default implementation supports reading image files (PNG, JPG, etc.) and PDF files (supports the `pages` parameter to specify page ranges, up to 20 pages at a time)
- The tool description automatically appends a multi-modal capability suffix; if the description is customized via `ReadFileToolConfig.Desc`, no suffix is appended

> 💡
> When using `ChatModelAgentMiddleware`, you need to implement the `WrapEnhancedInvokableToolCall` method for the multi-modal read\_file tool to work.

```go
// MultiModalReadRequest extends ReadRequest
type MultiModalReadRequest struct {
    ReadRequest
    Pages string  // PDF page range, e.g., "1-5", "3", "10-20"
}

// MultiFileContent return result
type MultiFileContent struct {
    *FileContent            // Plain text result
    Parts []FileContentPart // Multi-modal result (mutually exclusive with FileContent; FileContent is ignored when Parts is non-empty)
}

type FileContentPart struct {
    Type     FileContentPartType // "image" or "pdf"
    MIMEType string              // e.g., "image/png", "application/pdf"
    Data     []byte              // Raw binary data
}
```

---

## Deprecated: Legacy Config and Large Result Offloading

> 💡
> The following content only applies to the `NewMiddleware` + `Config` legacy path. The `New` / `NewTyped` path **does not include** the large result offloading feature.

The legacy `Config` provides an additional "Large Tool Result Offloading" mechanism on top of `MiddlewareConfig`:

<table>
<tr><td>Field</td><td>Description</td></tr>
<tr><td><pre>WithoutLargeToolResultOffloading bool</pre></td><td>Set to <pre>true</pre> to disable offloading, defaults to <pre>false</pre> (enabled)</td></tr>
<tr><td><pre>LargeToolResultOffloadingTokenLimit int</pre></td><td>Token threshold, defaults to <pre>20000</pre></td></tr>
<tr><td><pre>LargeToolResultOffloadingPathGen func(ctx, *compose.ToolInput) (string, error)</pre></td><td>Offloading path generation function, defaults to <pre>/large_tool_result/{ToolCallID}</pre></td></tr>
</table>

**Trigger condition**: Offloading is triggered when the character count of the tool's return result exceeds `tokenLimit × 4`.

**Offloading behavior**: The complete result is written to a file via `Backend.Write`, and the original return is replaced with a summary (first 10 lines + file path hint). The Agent can read the full result via `read_file` with pagination.
