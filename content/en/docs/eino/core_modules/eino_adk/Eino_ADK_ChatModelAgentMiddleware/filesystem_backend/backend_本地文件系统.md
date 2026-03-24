---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: Local File System
weight: 2
---

## Local Backend

Package: `github.com/cloudwego/eino-ext/adk/backend/local`

Note: If your eino version is v0.8.0 or above, you need to use local backend [adk/backend/local/v0.2.1](https://github.com/cloudwego/eino-ext/releases/tag/adk%2Fbackend%2Flocal%2Fv0.2.1).

### Overview

Local Backend is the local file system implementation of EINO ADK FileSystem, directly operating on the local file system, providing native performance and zero-configuration experience.

#### Core Features

- Zero Configuration - Works out of the box
- Native Performance - Direct file system access, no network overhead
- Path Safety - Enforces absolute paths
- Streaming Execution - Supports real-time command output streaming
- Command Validation - Optional security validation hooks

### Installation

```bash
go get github.com/cloudwego/eino-ext/adk/backend/local
```

### Configuration

```go
type Config struct {
    // Optional: Command validation function for Execute() security control
    ValidateCommand func(string) error
}
```

### Quick Start

#### Basic Usage

```go
import (
    "context"

    "github.com/cloudwego/eino-ext/adk/backend/local"
    "github.com/cloudwego/eino/adk/filesystem"
)

func main() {
    ctx := context.Background()

    backend, err := local.NewBackend(ctx, &local.Config{})
    if err != nil {
        panic(err)
    }

    // Write file (must be absolute path)
    err = backend.Write(ctx, &filesystem.WriteRequest{
        FilePath: "/tmp/hello.txt",
        Content:  "Hello, Local Backend!",
    })

    // Read file
    fcontent, err := backend.Read(ctx, &filesystem.ReadRequest{
        FilePath: "/tmp/hello.txt",
    })
    fmt.Println(fcontent.Content)
}
```

#### With Command Validation

```go
func validateCommand(cmd string) error {
    allowed := map[string]bool{"ls": true, "cat": true, "grep": true}
    parts := strings.Fields(cmd)
    if len(parts) == 0 || !allowed[parts[0]] {
        return fmt.Errorf("command not allowed: %s", parts[0])
    }
    return nil
}

backend, _ := local.NewBackend(ctx, &local.Config{
    ValidateCommand: validateCommand,
})
```

#### Integration with Agent

```go
import (
    "github.com/cloudwego/eino/adk"
    fsMiddleware "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

// Create Backend
backend, _ := local.NewBackend(ctx, &local.Config{})

// Create Middleware
middleware, _ := fsMiddleware.New(ctx, &fsMiddleware.Config{
    Backend: backend,
    StreamingShell: backend,
})

// Create Agent
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "LocalFileAgent",
    Description: "AI Agent with local file system access capabilities",
    Model:       chatModel,
    Handlers:    []adk.ChatModelAgentMiddleware{middleware},
})
```

### API Reference

<table>
<tr><td>Method</td><td>Description</td></tr>
<tr><td>LsInfo</td><td>List directory contents</td></tr>
<tr><td>Read</td><td>Read file content (supports pagination, default 200 lines)</td></tr>
<tr><td>Write</td><td>Create new file (error if exists)</td></tr>
<tr><td>Edit</td><td>Replace file content</td></tr>
<tr><td>GrepRaw</td><td>Search file content (literal match)</td></tr>
<tr><td>GlobInfo</td><td>Find files by pattern</td></tr>
<tr><td>Execute</td><td>Execute shell commands</td></tr>
<tr><td>ExecuteStreaming</td><td>Execute commands with streaming output</td></tr>
</table>

#### Examples

```go
// List directory
files, _ := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/home/user",
})

// Read file (paginated)
content, _ := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/path/to/file.txt",
    Offset:   0,
    Limit:    50,
})

// Search content (literal match, not regex)
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Path:    "/home/user/project",
    Pattern: "TODO",
    Glob:    "*.go",
})

// Find files
files, _ := backend.GlobInfo(ctx, &filesystem.GlobInfoRequest{
    Path:    "/home/user",
    Pattern: "**/*.go",
})

// Edit file
backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/tmp/file.txt",
    OldString:  "old",
    NewString:  "new",
    ReplaceAll: true,
})

// Execute command
result, _ := backend.Execute(ctx, &filesystem.ExecuteRequest{
    Command: "ls -la /tmp",
})

// Streaming execution
reader, _ := backend.ExecuteStreaming(ctx, &filesystem.ExecuteRequest{
    Command: "tail -f /var/log/app.log",
})
for {
    resp, err := reader.Recv()
    if err == io.EOF {
        break
    }
    fmt.Print(resp.Stdout)
}
```

### Path Requirements

All paths must be absolute paths (starting with `/`):

```go
// Correct
backend.Read(ctx, &filesystem.ReadRequest{FilePath: "/home/user/file.txt"})

// Incorrect
backend.Read(ctx, &filesystem.ReadRequest{FilePath: "./file.txt"})
```

Convert relative paths:

```go
absPath, _ := filepath.Abs("./relative/path")
```

### Comparison with Agentkit Backend

<table>
<tr><td>Feature</td><td>Local</td><td>Agentkit</td></tr>
<tr><td>Execution Model</td><td>Local Direct</td><td>Remote Sandbox</td></tr>
<tr><td>Network Dependency</td><td>None</td><td>Required</td></tr>
<tr><td>Configuration Complexity</td><td>Zero Config</td><td>Requires Credentials</td></tr>
<tr><td>Security Model</td><td>OS Permissions</td><td>Isolated Sandbox</td></tr>
<tr><td>Streaming Output</td><td>Supported</td><td>Not Supported</td></tr>
<tr><td>Platform Support</td><td>Unix/Linux/macOS</td><td>Any</td></tr>
<tr><td>Use Cases</td><td>Development/Local</td><td>Multi-tenant/Production</td></tr>
</table>

### FAQ

**Q: Why does running grep fail with `ripgrep (rg) is not installed or not in PATH. Please install it:` [https://github.com/BurntSushi/ripgrep#installation](https://github.com/BurntSushi/ripgrep#installation)?**

The local Grep command relies on `ripgrep` by default. If your system does not have `ripgrep` installed, install it following the official guide.

**Q: Does GrepRaw support regex?**

Yes. GrepRaw uses `ripgrep` under the hood for grep operations, so regex patterns are supported.

**Q: Windows support?**

Not supported, depends on `/bin/sh`.
