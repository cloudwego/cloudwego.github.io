---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Local File System
weight: 2
---

## Local Backend

**Package**: `github.com/cloudwego/eino-ext/adk/backend/local`

> 💡
> eino v0.8.0+ requires local backend v0.2.1 or above.

Local Backend is the local implementation of Eino ADK FileSystem, directly operating on the local file system. It implements both the `filesystem.Backend` (file operations) and `filesystem.StreamingShell` (streaming command execution) interfaces.

**Core features**: Zero configuration, native performance, enforced absolute paths, streaming command execution, optional command validation.

---

## Installation

```bash
go get github.com/cloudwego/eino-ext/adk/backend/local
```

## Configuration

```go
type Config struct {
    // Optional: command validation function for security control of ExecuteStreaming.
    // Rejects execution when a non-nil error is returned.
    ValidateCommand func(string) error
}
```

## Quick Start

```go
backend, err := local.NewBackend(ctx, &local.Config{})

// Write file (must be absolute path; overwrites if file exists)
err = backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/tmp/hello.txt",
    Content:  "Hello, Local Backend!",
})

// Read file (supports line-level pagination)
fc, err := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/tmp/hello.txt",
    Offset:   1,   // Starting line number (1-based)
    Limit:    50,  // Maximum lines, 0 means all
})
```

### Integration with Agent

```go
import (
    "github.com/cloudwego/eino/adk"
    fsMiddleware "github.com/cloudwego/eino/adk/middlewares/filesystem"
    "github.com/cloudwego/eino-ext/adk/backend/local"
)

backend, _ := local.NewBackend(ctx, &local.Config{})

middleware, _ := fsMiddleware.New(ctx, &fsMiddleware.Config{
    Backend:        backend, // Required: registers ls/read/write/edit/glob/grep tools
    StreamingShell: backend, // Optional: registers streaming execute tool
})

agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    chatModel,
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

> 💡
> `Shell` and `StreamingShell` are mutually exclusive in the middleware Config. Local Backend only implements `StreamingShell` (streaming command execution), not the non-streaming `Shell`.

---

## Implemented Interfaces and Methods

### filesystem.Backend

<table>
<tr><td>Method</td><td>Signature</td><td>Description</td></tr>
<tr><td><pre>LsInfo</pre></td><td><pre>(ctx, *LsInfoRequest) ([]FileInfo, error)</pre></td><td>List directory contents</td></tr>
<tr><td><pre>Read</pre></td><td><pre>(ctx, *ReadRequest) (*FileContent, error)</pre></td><td>Read file, supports line-level pagination (Offset 1-based, Limit 0=all)</td></tr>
<tr><td><pre>Write</pre></td><td><pre>(ctx, *WriteRequest) error</pre></td><td>Write file; auto-creates parent directories; <strong>overwrites if file exists</strong></td></tr>
<tr><td><pre>Edit</pre></td><td><pre>(ctx, *EditRequest) error</pre></td><td>String replacement; supports <pre>ReplaceAll</pre>; errors if <pre>OldString</pre> is not unique (in non-ReplaceAll mode)</td></tr>
<tr><td><pre>GrepRaw</pre></td><td><pre>(ctx, *GrepRequest) ([]GrepMatch, error)</pre></td><td>ripgrep-based search, <strong>supports full regex syntax</strong>; supports case-insensitive, multiline matching, context lines</td></tr>
<tr><td><pre>GlobInfo</pre></td><td><pre>(ctx, *GlobInfoRequest) ([]FileInfo, error)</pre></td><td>Glob pattern file matching, supports <pre>*</pre>/<pre>**</pre>/<pre>?</pre>/<pre>[abc]</pre></td></tr>
</table>

### filesystem.StreamingShell

<table>
<tr><td>Method</td><td>Signature</td><td>Description</td></tr>
<tr><td><pre>ExecuteStreaming</pre></td><td><pre>(ctx, *ExecuteRequest) (*StreamReader[*ExecuteResponse], error)</pre></td><td>Streaming shell command execution with real-time output; supports background running (<pre>RunInBackendGround</pre>)</td></tr>
</table>

---

## Usage Examples

### Search Content (Regex)

```go
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Path:    "/home/user/project",
    Pattern: "TODO|FIXME",       // ripgrep regex syntax
    Glob:    "*.go",
    CaseInsensitive: true,
})
```

### Edit File

```go
backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/tmp/file.txt",
    OldString:  "old text",
    NewString:  "new text",
    ReplaceAll: true,
})
```

### Streaming Command Execution

```go
reader, _ := backend.ExecuteStreaming(ctx, &filesystem.ExecuteRequest{
    Command: "tail -f /var/log/app.log",
})
for {
    resp, err := reader.Recv()
    if err == io.EOF {
        break
    }
    fmt.Print(resp.Output)
}
```

### With Command Validation

```go
backend, _ := local.NewBackend(ctx, &local.Config{
    ValidateCommand: func(cmd string) error {
        allowed := map[string]bool{"ls": true, "cat": true, "grep": true}
        parts := strings.Fields(cmd)
        if len(parts) == 0 || !allowed[parts[0]] {
            return fmt.Errorf("command not allowed: %s", parts[0])
        }
        return nil
    },
})
```

---

## Path Requirements

All file paths must be absolute paths (starting with `/`). Relative paths can be converted using `filepath.Abs()`.

---

## Comparison with Agentkit Backend

<table>
<tr><td>Feature</td><td>Local</td><td>Agentkit</td></tr>
<tr><td>Execution model</td><td>Local direct</td><td>Remote sandbox</td></tr>
<tr><td>Network dependency</td><td>None</td><td>Required</td></tr>
<tr><td>Configuration complexity</td><td>Zero config</td><td>Requires credentials</td></tr>
<tr><td>Security model</td><td>OS permissions + ValidateCommand</td><td>Isolated sandbox</td></tr>
<tr><td>Streaming output</td><td>Supported (StreamingShell)</td><td>Not supported</td></tr>
<tr><td>Platform support</td><td>Unix/Linux/macOS</td><td>Any</td></tr>
<tr><td>Use case</td><td>Development / local environment</td><td>Multi-tenant / production</td></tr>
</table>

---

## FAQ

**Q: Does GrepRaw support regex?**

A: Yes. It uses ripgrep (`rg`) under the hood and supports full regex syntax. The system must have ripgrep installed, otherwise it will report `ripgrep (rg) is not installed or not in PATH`. See [https://github.com/BurntSushi/ripgrep#installation](https://github.com/BurntSushi/ripgrep#installation) for installation instructions.

**Q: Does Write create or overwrite?**

A: Overwrite. `Write` uses `O_CREATE|O_TRUNC` flags — if the file exists, its content is overwritten; if it doesn't exist, it is created (including auto-creation of parent directories).

**Q: Is Windows supported?**

A: No. `ExecuteStreaming` depends on `/bin/sh`. File operations themselves can run on any platform, but command execution is limited to Unix-based systems.

**Q: Does Local Backend support non-streaming Execute?**

A: No. Local only implements `StreamingShell` (`ExecuteStreaming`), not `Shell` (`Execute`). `Shell` and `StreamingShell` are mutually exclusive in the middleware Config — choose one.
