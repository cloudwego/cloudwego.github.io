---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: FileSystem
weight: 2
---

> 💡 Package: [github.com/cloudwego/eino/adk/middlewares/filesystem](https://github.com/cloudwego/eino/tree/main/adk/middlewares/filesystem)

## Overview

The FileSystem middleware provides filesystem access for agents. It operates the filesystem through the [FileSystem Backend](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/filesystem_backend) interface and automatically injects a set of file operation tools and the corresponding system prompt, enabling the agent to read/write/search/edit files directly.

Core capabilities:

- **Filesystem tool injection** — automatically registers tools such as ls, read_file, write_file, edit_file, glob, grep
- **Shell command execution** — optionally injects the execute tool, supports both sync and streaming execution
- **Per-tool configuration** — each tool can be configured independently (name/description/custom implementation/disable)
- **Multilingual prompts** — tool descriptions and system prompts support Chinese/English switching

## Create the Middleware

It is recommended to use `New` to create the middleware (returns `ChatModelAgentMiddleware`):

```go
import "github.com/cloudwego/eino/adk/middlewares/filesystem"

middleware, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend: myBackend,
    // To enable shell command execution, set Shell or StreamingShell
    Shell: myShell,
})
if err != nil {
    // handle error
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

> 💡
> `New` returns `ChatModelAgentMiddleware` with better context propagation (it can modify the agent’s instruction and tools at runtime via the `BeforeAgent` hook).

## MiddlewareConfig

```go
type MiddlewareConfig struct {
    // Backend provides filesystem operations
    // Required
    Backend filesystem.Backend

    // Shell provides synchronous shell command execution
    // If set, the execute tool will be registered
    // Optional, mutually exclusive with StreamingShell
    Shell filesystem.Shell

    // StreamingShell provides streaming shell command execution
    // If set, the streaming execute tool will be registered (real-time output)
    // Optional, mutually exclusive with Shell
    StreamingShell filesystem.StreamingShell

    // Per-tool configuration (all optional)
    LsToolConfig        *ToolConfig  // ls tool config
    ReadFileToolConfig  *ToolConfig  // read_file tool config
    WriteFileToolConfig *ToolConfig  // write_file tool config
    EditFileToolConfig  *ToolConfig  // edit_file tool config
    GlobToolConfig      *ToolConfig  // glob tool config
    GrepToolConfig      *ToolConfig  // grep tool config

    // CustomSystemPrompt overrides the default system prompt
    // Optional, defaults to ToolsSystemPrompt
    CustomSystemPrompt *string

    // Deprecated fields, use the corresponding *ToolConfig.Desc instead
    // CustomLsToolDesc, CustomReadFileToolDesc, CustomGrepToolDesc,
    // CustomGlobToolDesc, CustomWriteFileToolDesc, CustomEditToolDesc
}
```

### ToolConfig

Each tool can be configured independently via `ToolConfig`:

```go
type ToolConfig struct {
    // Name overrides the tool name
    // Optional. Defaults to the built-in name (e.g. "ls", "read_file")
    Name string

    // Desc overrides the tool description
    // Optional. Defaults to the built-in description
    Desc *string

    // CustomTool provides a custom tool implementation
    // If set, it replaces the default implementation built on Backend
    // Optional
    CustomTool tool.BaseTool

    // Disable disables this tool
    // When true, the tool will not be registered
    // Optional, defaults to false
    Disable bool
}
```

Example — rename a tool and disable write:

```go
middleware, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend: myBackend,
    ReadFileToolConfig: &filesystem.ToolConfig{
        Name: "cat_file",  // custom name
    },
    WriteFileToolConfig: &filesystem.ToolConfig{
        Disable: true,  // disable write tool
    },
})
```

## Injected Tools

<table>
<tr><td>Tool</td><td>Default name</td><td>Description</td><td>Condition</td></tr>
<tr><td>List directory</td><td><pre>ls</pre></td><td>List files and directories under the given path</td><td>Injected when Backend is not nil</td></tr>
<tr><td>Read file</td><td><pre>read_file</pre></td><td>Read file content, supports line-based pagination (offset + limit)</td><td>Injected when Backend is not nil</td></tr>
<tr><td>Write file</td><td><pre>write_file</pre></td><td>Create or overwrite a file</td><td>Injected when Backend is not nil</td></tr>
<tr><td>Edit file</td><td><pre>edit_file</pre></td><td>Replace strings in a file</td><td>Injected when Backend is not nil</td></tr>
<tr><td>Glob</td><td><pre>glob</pre></td><td>Find files by glob pattern</td><td>Injected when Backend is not nil</td></tr>
<tr><td>Search content</td><td><pre>grep</pre></td><td>Search file content by pattern, supports multiple output modes</td><td>Injected when Backend is not nil</td></tr>
<tr><td>Execute command</td><td><pre>execute</pre></td><td>Execute shell commands</td><td>Requires Shell or StreamingShell</td></tr>
</table>

Each tool can be disabled via its corresponding `*ToolConfig` (`Disable: true`) or replaced with a custom implementation (`CustomTool`).

## Multilingual Support

Tool descriptions and built-in prompts default to English. To switch to Chinese, use `adk.SetLanguage()`:

```go
import "github.com/cloudwego/eino/adk"

adk.SetLanguage(adk.LanguageChinese)  // switch to Chinese
adk.SetLanguage(adk.LanguageEnglish)  // switch to English (default)
```

You can also customize each tool’s text via `ToolConfig.Desc` or override the system prompt via `CustomSystemPrompt`.

## [deprecated] Large Tool Result Offloading

> 💡
> This feature will be deprecated in 0.8.0. Please migrate to Middleware: ToolReduction.

> Note: Large tool result offloading is only available in the legacy `Config` + `NewMiddleware` API. The recommended `MiddlewareConfig` + `New` does not include it. If you need it, use the ToolReduction middleware.

When tool call results are too large (e.g. reading large files, grep matching too many lines), keeping the full result in the conversation context can cause:

- token usage to spike
- agent history context pollution
- worse reasoning efficiency

So the legacy middleware (`NewMiddleware`) provides an automatic offloading mechanism:

- when the result exceeds a threshold (default 20,000 tokens), it does not return the full content to the LLM
- the actual result is saved to the filesystem (Backend)
- the context contains only a summary and a file path (the agent can call `read_file` again to fetch on demand)

This feature is enabled by default and can be configured via `Config` (not `MiddlewareConfig`):

```go
type Config struct {
    // ... Backend, Shell, StreamingShell, ToolConfig fields are the same as MiddlewareConfig

    // Disable automatic offloading
    WithoutLargeToolResultOffloading bool

    // Custom threshold (default 20000 tokens)
    LargeToolResultOffloadingTokenLimit int

    // Custom offloading path generator
    // Default path format: /large_tool_result/{ToolCallID}
    LargeToolResultOffloadingPathGen func(ctx context.Context, input *compose.ToolInput) (string, error)
}
```
