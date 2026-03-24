---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: AgentsMD
weight: 9
---

## Overview

`agentsmd` is an Eino ADK middleware that **automatically injects the content of Agents.md into the model input messages on every model call**. The injection is ephemeral: it is added dynamically for each model call and is not persisted into the session state, so it **won’t be processed by summarization/compression middlewares**.

**Core value**: define system-level behavior instructions and context for an agent via an Agents.md file (similar to Claude Code’s CLAUDE.md), without manually composing system prompts.

**Package**: `github.com/cloudwego/eino/adk/middlewares/agentsmd`

---

## Quick Start

### Minimal Example

```go
package main

import (
        "context"
        "fmt"

        "github.com/cloudwego/eino/adk"
        "github.com/cloudwego/eino/adk/middlewares/agentsmd"
)

func main() {
        ctx := context.Background()

        // 1. Prepare Backend (file reading backend)
        backend := NewLocalFileBackend("/path/to/project")

        // 2. Create agentsmd middleware
        mw, err := agentsmd.New(ctx, &agentsmd.Config{
                Backend:       backend,
                AgentsMDFiles: []string{"/home/user/project/agents.md"},
        })
        if err != nil {
                panic(err)
        }

        // 3. Attach the middleware to the agent
        // agent := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        //     Middlewares: []adk.ChatModelAgentMiddleware{mw},
        // })
        _ = mw
        fmt.Println("agentsmd middleware created successfully")
}
```

---

## Configuration

### Config

```go
type Config struct {
    // Backend provides file access to load Agents.md files.
    // It can be a local filesystem, remote storage, or any other backend.
    // Required.
    Backend Backend

    // AgentsMDFiles is an ordered list of Agents.md file paths to load.
    // Files are loaded and injected in the given order.
    // Files support recursive @import (max depth 5).
    AgentsMDFiles []string

    // AllAgentsMDMaxBytes limits the total bytes of all loaded Agents.md content.
    // Files are loaded in order; once the cumulative size exceeds this limit,
    // the remaining files will be skipped.
    // Each individual file is always loaded in full.
    // 0 means unlimited.
    AllAgentsMDMaxBytes int

    // OnLoadWarning is an optional callback invoked on non-fatal errors during loading
    // (e.g. file not found, cyclic @import, depth limit exceeded).
    // If nil, warnings are printed via log.Printf.
    //
    // Note: Backend.Read errors other than os.ErrNotExist (e.g. permission denied, I/O errors)
    // are not treated as warnings and will abort the loading process.
    OnLoadWarning func(filePath string, err error)
}
```

### Parameters

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>Yes</td><td>-</td><td>File reading backend that performs the actual I/O</td></tr>
<tr><td><pre>AgentsMDFiles</pre></td><td><pre>[]string</pre></td><td>Yes</td><td>-</td><td>List of Agents.md file paths to load (at least one)</td></tr>
<tr><td><pre>AllAgentsMDMaxBytes</pre></td><td><pre>int</pre></td><td>No</td><td><pre>0</pre> (unlimited)</td><td>Total byte limit for all files</td></tr>
<tr><td><pre>OnLoadWarning</pre></td><td><pre>func(string, error)</pre></td><td>No</td><td><pre>log.Printf</pre></td><td>Callback for non-fatal errors</td></tr>
</table>

---

## Backend Interface

### Definition

```go
type Backend interface {
    // Read reads file content.
    // If the file does not exist, implementations should return an error that wraps os.ErrNotExist
    // (so errors.Is(err, os.ErrNotExist) returns true).
    // This lets the loader skip missing files silently and notify via OnLoadWarning.
    // Other errors (permission denied, I/O errors) abort the loading process.
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
}
```

### Types

```go
// ReadRequest defines request parameters for reading a file
type ReadRequest struct {
    FilePath string // file path
    Offset   int    // starting line number (1-based)
}

// FileContent defines the return structure of file content
type FileContent struct {
    Content string // file text content
}
```

---

## @import Syntax

Agents.md supports `@import` to recursively include other files.

### Syntax

In Agents.md, use `@path/to/file` to reference another file:

```markdown
# Project instructions

You are a coding assistant.

Please follow these rules:
@rules/code-style.md
@rules/api-conventions.md
```

### Rules

1. **Path resolution**: relative paths are resolved from the current file’s directory; absolute paths are used as-is
2. **Max recursion depth**: 5 (beyond that the import is skipped and `OnLoadWarning` is triggered)
3. **Cycle detection**: cyclic imports are detected and skipped (`OnLoadWarning` is triggered)
4. **Global de-duplication**: the same file is not loaded twice
5. **Supported extensions** (when the path contains no `/`): `.md`, `.txt`, `.mdx`, `.yaml`, `.yml`, `.json`, `.toml`
6. **False-positive filtering**: `@ref` without `/` whose extension is not allowed will be ignored (to avoid treating `@someone` or `@example.com` as an import)

### Example Directory Layout

```
project/
├── Agents.md               # entry file
├── rules/
│   ├── code-style.md       # code style rules
│   ├── api-conventions.md  # API conventions
│   └── testing.md          # testing rules
└── context/
    └── architecture.md     # architecture notes
```

---

## How It Works

### Injection Flow

```
User message + history
       │
       ▼
┌─────────────────────┐
│  agentsmd middleware │
│  (WrapModel)         │
│                      │
│  1. Load Agents.md   │
│  2. Cache in RunLocal│
│  3. Build injected msg│
└─────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Injected message sequence           │
│                                     │
│  [System]  system prompt            │
│  [User]    ← Agents.md injection    │  ← inserted before the first User message
│  [User]    previous user message 1  │
│  [Assistant] assistant reply 1      │
│  [User]    current user message     │
└─────────────────────────────────────┘
       │
       ▼
Model call (Generate / Stream)
```

### Key Mechanics

1. **Ephemeral injection**: Agents.md content is inserted only for model calls and not written into `ChatModelAgentState`, so it won’t be summarized/compressed
2. **Run-level caching**: within a single agent `Run()`, the loaded Agents.md content is cached in `RunLocalValue`; subsequent model calls reuse it to avoid repeated reads
3. **Insertion position**: injected as a `User` role message before the first user message; if there is no user message, it is appended to the end
4. **I18n**: formatted output adapts to Chinese/English automatically (based on the system language environment)

---

## Notes

### Middleware Ordering

**It is recommended to place the `agentsmd` middleware after summarization/compression middlewares.** This ensures Agents.md content:

- won’t be compressed away by summarization
- is fully available on every model call

```go
Middlewares: []adk.ChatModelAgentMiddleware{
    summarizationMiddleware, // summarize first
    agentsMDMiddleware,      // then inject Agents.md
}
```

### Error Handling

<table>
<tr><td>Scenario</td><td>Behavior</td></tr>
<tr><td>File not found (<pre>os.ErrNotExist</pre>)</td><td>Skip the file and trigger <pre>OnLoadWarning</pre></td></tr>
<tr><td>Cyclic <pre>@import</pre></td><td>Skip the cyclic file and trigger <pre>OnLoadWarning</pre></td></tr>
<tr><td><pre>@import</pre> depth &gt; 5</td><td>Skip and trigger <pre>OnLoadWarning</pre></td></tr>
<tr><td>Total size exceeds <pre>AllAgentsMDMaxBytes</pre></td><td>Skip remaining files and trigger <pre>OnLoadWarning</pre> (the first file is always loaded fully)</td></tr>
<tr><td>Permission denied / I/O error</td><td><strong>Abort loading and return error</strong></td></tr>
<tr><td>All file contents empty</td><td>Do not inject; pass through original messages</td></tr>
</table>

### Backend Requirements

- When a file does not exist, implementations **must** return an error that wraps `os.ErrNotExist` (e.g. `fmt.Errorf(\"... : %w\", os.ErrNotExist)`), otherwise the loader cannot distinguish “missing file” vs “real I/O error”
- `Read` should be concurrency-safe

### Performance Considerations

- Set `AllAgentsMDMaxBytes` reasonably to avoid injecting too much content and consuming the model context window
- Agents.md is loaded once per `Run()` (run-level caching), but **every new `Run()` reloads it**, so file edits take effect on the next run
- Avoid importing too many files; the recursion depth limit is 5

### Writing Agents.md

- Keep it concise and include only instructions that truly affect model behavior
- Use `@import` to split concerns (code style, API conventions, architecture notes, etc.)
- Avoid large code examples or datasets in Agents.md to prevent wasting context window
- The content is wrapped in `<system-reminder>` tags when passed to the model, so the model treats it as system-level instructions

---

## FAQ

**Q: Will Agents.md content be saved into the conversation history?**
A: No. The content is injected dynamically during model calls and is not written into `ChatModelAgentState`, so it won’t appear in history.

**Q: What happens if an Agents.md file does not exist?**
A: The file is skipped and `OnLoadWarning` is triggered (defaults to `log.Printf`). It does not fail the whole load.

**Q: What is the base directory for @import paths?**
A: The directory of the current file. For example, `@rules/style.md` in `/project/Agents.md` resolves to `/project/rules/style.md`.

**Q: If multiple files import the same file, will it be loaded multiple times?**
A: No. The loader maintains a global de-duplication map; the same file path is read and injected only once.
