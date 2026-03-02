---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Backend: Ark Agentkit Sandbox'
weight: 1
---

## Agentkit Sandbox Backend

Package: `github.com/cloudwego/eino-ext/adk/backend/agentkit`

Note: If your eino version is v0.8.0 or above, you need to use ark agentkit backend [v0.2.0-alpha](https://github.com/cloudwego/eino-ext/releases/tag/adk%2Fbackend%2Fagentkit%2Fv0.2.0-alpha.1) version.

### Overview

Agentkit Sandbox Backend is a remote sandbox implementation of EINO ADK FileSystem that executes file system operations in an isolated cloud environment through Volcengine Agentkit service.

#### Core Features

- Security Isolation - All operations execute in a remote sandbox environment
- Session Management - Supports session isolation with configurable TTL
- Request Signing - Automatic AK/SK authentication for Volcengine API

### Installation

```bash
go get github.com/cloudwego/eino-ext/adk/backend/agentkit
```

### Configuration

#### Environment Variables

```bash
export VOLC_ACCESS_KEY_ID="your_access_key"
export VOLC_SECRET_ACCESS_KEY="your_secret_key"
export VOLC_TOOL_ID="your_tool_id"
```

#### Config Structure

```go
type Config struct {
    // Required
    AccessKeyID     string  // Access Key ID
    SecretAccessKey string  // Access Key Secret
    ToolID          string  // Sandbox Tool ID

    // Optional
    UserSessionID    string        // User session ID for isolation
    Region           Region        // Region, defaults to cn-beijing
    SessionTTL       int           // Session TTL (60-86400 seconds)
    ExecutionTimeout int           // Command execution timeout
    HTTPClient       *http.Client  // Custom HTTP client
}
```

### Quick Start

#### Basic Usage

```go
import (
    "context"
    "os"
    "time"

    "github.com/cloudwego/eino-ext/adk/backend/agentkit"
    "github.com/cloudwego/eino/adk/filesystem"
)

func main() {
    ctx := context.Background()

    backend, err := agentkit.NewSandboxToolBackend(&agentkit.Config{
        AccessKeyID:     os.Getenv("VOLC_ACCESS_KEY_ID"),
        SecretAccessKey: os.Getenv("VOLC_SECRET_ACCESS_KEY"),
        ToolID:          os.Getenv("VOLC_TOOL_ID"),
        UserSessionID:   "session-" + time.Now().Format("20060102-150405"),
        Region:          agentkit.RegionOfBeijing,
    })
    if err != nil {
        panic(err)
    }

    // Write file
    err = backend.Write(ctx, &filesystem.WriteRequest{
        FilePath: "/home/gem/hello.txt",
        Content:  "Hello, Sandbox!",
    })

    // Read file
    content, err := backend.Read(ctx, &filesystem.ReadRequest{
        FilePath: "/home/gem/hello.txt",
    })
}
```

#### Integration with Agent

```go
import (
    "github.com/cloudwego/eino/adk"
    fsMiddleware "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

// Create Backend
backend, _ := agentkit.NewSandboxToolBackend(config)

// Create Middleware
middleware, _ := fsMiddleware.New(ctx, &fsMiddleware.Config{
    Backend: backend,
    Shell: backend,
})

// Create Agent
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "SandboxAgent",
    Description: "AI Agent with secure file system access capabilities",
    Model:       chatModel,
    Handlers:    []adk.ChatModelAgentMiddleware{middleware},
})
```

### API Reference

<table>
<tr><td>Method</td><td>Description</td></tr>
<tr><td>LsInfo</td><td>List directory contents</td></tr>
<tr><td>Read</td><td>Read file content (supports pagination)</td></tr>
<tr><td>Write</td><td>Create new file (error if exists)</td></tr>
<tr><td>Edit</td><td>Replace file content</td></tr>
<tr><td>GrepRaw</td><td>Search file content</td></tr>
<tr><td>GlobInfo</td><td>Find files by pattern</td></tr>
<tr><td>Execute</td><td>Execute shell commands</td></tr>
</table>

#### Examples

```go
// List directory
files, _ := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/home/gem",
})

// Read file (paginated)
content, _ := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/home/gem/file.txt",
    Offset:   0,
    Limit:    100,
})

// Search content
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Path:    "/home/gem",
    Pattern: "keyword",
    Glob:    "*.txt",
})

// Find files
files, _ := backend.GlobInfo(ctx, &filesystem.GlobInfoRequest{
    Path:    "/home/gem",
    Pattern: "**/*.txt",
})

// Edit file
backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/home/gem/file.txt",
    OldString:  "old",
    NewString:  "new",
    ReplaceAll: true,
})

// Execute command
result, _ := backend.Execute(ctx, &filesystem.ExecuteRequest{
    Command: "ls -la /home/gem",
})
```

### Comparison with Local Backend

<table>
<tr><td>Feature</td><td>Agentkit</td><td>Local</td></tr>
<tr><td>Execution Model</td><td>Remote Sandbox</td><td>Local Direct</td></tr>
<tr><td>Network Dependency</td><td>Required</td><td>Not Required</td></tr>
<tr><td>Configuration Complexity</td><td>Requires Credentials</td><td>Zero Config</td></tr>
<tr><td>Security Model</td><td>Isolated Sandbox</td><td>OS Permissions</td></tr>
<tr><td>Use Cases</td><td>Multi-tenant/Production</td><td>Development/Local</td></tr>
</table>

### FAQ

**Q: Write returns "file already exists" error**

This is a security feature. Use a different filename or use Edit to modify existing files.

**Q: Authentication failed**

Check environment variables, verify AK/SK match, and ensure account has Ark Sandbox permissions.

**Q: Request timeout**

Increase ExecutionTimeout or HTTPClient.Timeout configuration.
