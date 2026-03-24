---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: FileSystem Backend
weight: 1
---

> 💡
> Package: [github.com/cloudwego/eino/adk/filesystem](https://github.com/cloudwego/eino/tree/main/adk/filesystem)

## Background and Goals

In AI Agent scenarios, the agent often needs to interact with a filesystem: reading file content, searching code, editing configs, executing commands, and so on. However, different runtime environments access the filesystem very differently:

- **Local development**: operate on the local filesystem directly, works out of the box
- **Cloud sandbox**: operate on an isolated sandbox filesystem via remote APIs, requires authentication and networking
- **Testing**: use an in-memory simulated filesystem without real disk I/O
- **Custom storage**: integrate with OSS, databases, or other non-traditional “filesystems”

If each environment implements its own set of file operations, middleware and agent code become tightly coupled to the underlying storage implementation, making reuse and testing difficult.

To address this, Eino ADK defines the `filesystem.Backend` interface as a **unified filesystem operation protocol**. Its design goals are:

1. **Decouple storage from business logic**: middleware depends only on the Backend interface and does not care whether the underlying implementation is local disk, a remote sandbox, or an in-memory mock
2. **Pluggable replacement**: by switching Backend implementations, the same agent can run in different environments without changing any business code
3. **Testability**: a built-in `InMemoryBackend` makes it easy to simulate filesystem behavior in unit tests
4. **Extensibility**: all methods use struct parameters, so adding new fields in the future won’t break compatibility for existing implementations

## Backend Interface

```go
type Backend interface {
    // List files and directories under the given path
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    // Read file content, supports line-based pagination (offset + limit)
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    // Search for matches of pattern under the given path and return the match list
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    // Find matching files by glob pattern and base path
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    // Write or create a file
    Write(ctx context.Context, req *WriteRequest) error
    // Replace string content in a file
    Edit(ctx context.Context, req *EditRequest) error
}
```

### Extension Interfaces

Besides the core file operations, a Backend can optionally implement shell command execution:

```go
// Shell provides synchronous command execution
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

// StreamingShell provides streaming command execution for long-running commands
type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

When a Backend implements `Shell` or `StreamingShell`, the FileSystem middleware additionally registers the `execute` tool so the agent can run shell commands.

### Core Data Types

<table>
<tr><td>Type</td><td>Description</td></tr>
<tr><td><pre>FileInfo</pre></td><td>File/directory info: path, isDir, size, modified time</td></tr>
<tr><td><pre>FileContent</pre></td><td>File content with line number information</td></tr>
<tr><td><pre>GrepMatch</pre></td><td>Search match: content, path, line number</td></tr>
<tr><td><pre>ReadRequest</pre></td><td>Read request: path, offset (1-based line), limit (line count)</td></tr>
<tr><td><pre>GrepRequest</pre></td><td>Search request: pattern (regex), path, glob filter, file type filters, etc.</td></tr>
<tr><td><pre>WriteRequest</pre></td><td>Write request: path, content</td></tr>
<tr><td><pre>EditRequest</pre></td><td>Edit request: path, old string, new string, replace all</td></tr>
<tr><td><pre>ExecuteRequest</pre></td><td>Command request: command string, background flag</td></tr>
<tr><td><pre>ExecuteResponse</pre></td><td>Command result: stdout/stderr, exit code, truncated flag</td></tr>
</table>

## Built-in Implementation: InMemoryBackend

`InMemoryBackend` is a built-in Backend implementation that stores files in an in-memory map, mainly used for:

- **Unit tests**: test agent and middleware file operations without a real filesystem
- **Lightweight scenarios**: temporary file operations without persistence
- **Large tool result offloading**: the FileSystem middleware’s large tool result offloading feature uses InMemoryBackend by default

```go
import "github.com/cloudwego/eino/adk/filesystem"

ctx := context.Background()
backend := filesystem.NewInMemoryBackend()

// Write file
err := backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/example/test.txt",
    Content:  "Hello, World!\nLine 2\nLine 3",
})

// Read file (paginated)
content, err := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/example/test.txt",
    Offset:   1,
    Limit:    10,
})

// List directory
files, err := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/example",
})

// Search content (regex supported)
matches, err := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Pattern: "Hello",
    Path:    "/example",
})

// Edit file
err = backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/example/test.txt",
    OldString:  "Hello",
    NewString:  "Hi",
    ReplaceAll: false,
})
```

Features:

- Thread-safe (based on `sync.RWMutex`)
- GrepRaw supports regex, case-insensitive, context lines, and other advanced options
- GrepRaw uses parallel processing internally (up to 10 workers)

## External Implementations

The following Backend implementations live in the [eino-ext](https://github.com/cloudwego/eino-ext) repository:

- **Local Backend** — a local filesystem implementation that operates on the host disk with zero configuration
- **Ark Agentkit Sandbox Backend** — a Volcengine Agentkit remote sandbox implementation that executes file operations in an isolated cloud environment

### Implementation Comparison

<table>
<tr><td>Feature</td><td>InMemory</td><td>Local</td><td>Agentkit Sandbox</td></tr>
<tr><td>Execution model</td><td>In-memory</td><td>Local direct</td><td>Remote sandbox</td></tr>
<tr><td>Network dependency</td><td>No</td><td>No</td><td>Yes</td></tr>
<tr><td>Configuration complexity</td><td>Zero config</td><td>Zero config</td><td>Credentials required</td></tr>
<tr><td>Persistence</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Shell support</td><td>No</td><td>Yes (including streaming)</td><td>Yes</td></tr>
<tr><td>Use cases</td><td>Tests/temporary</td><td>Development/local</td><td>Multi-tenant/production</td></tr>
</table>

## Custom Implementations

To integrate custom storage (e.g. OSS, databases), you only need to implement the `Backend` interface:

```go
type MyBackend struct {
    // ...
}

func (b *MyBackend) LsInfo(ctx context.Context, req *filesystem.LsInfoRequest) ([]filesystem.FileInfo, error) {
    // Custom implementation
}

func (b *MyBackend) Read(ctx context.Context, req *filesystem.ReadRequest) (*filesystem.FileContent, error) {
    // Custom implementation
}

// ... implement the remaining methods
```

If you also need command execution, implement `Shell` or `StreamingShell` as well.
