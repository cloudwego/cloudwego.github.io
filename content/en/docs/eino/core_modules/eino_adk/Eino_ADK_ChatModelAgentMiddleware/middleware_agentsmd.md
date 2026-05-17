---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: AgentsMD
weight: 9
---

## Overview

`agentsmd` is an Eino ADK middleware that **automatically injects the content of Agents.md files into the message sequence before each model call**. The injected messages are persisted to the agent's internal state by the framework, but **idempotency checks** (the `Extra["__agentsmd_content__"]` marker) ensure no duplicate injection. Since the injected content is fixed upon first appearance, **it does not change with subsequent summarization/compression**. **Core value**: Define system-level behavioral instructions and context for the Agent through Agents.md files (similar to Claude Code's CLAUDE.md), without manually managing system prompt concatenation. **Package path**: `github.com/cloudwego/eino/adk/middlewares/agentsmd`

## Quick Start

```go
ctx := context.Background()

// 1. Create the agentsmd middleware
mw, err := agentsmd.New(ctx, &agentsmd.Config{
    Backend:       myBackend, // Implements the agentsmd.Backend interface
    AgentsMDFiles: []string{"/project/agents.md"},
})
if err != nil {
    panic(err)
}

// 2. Configure into the Agent
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    chatModel,
    Handlers: []adk.ChatModelAgentMiddleware{mw},
})
```

---

## Configuration Details

### Config Struct

```go
type Config struct {
    Backend             Backend
    AgentsMDFiles       []string
    AllAgentsMDMaxBytes int
    OnLoadWarning       func(filePath string, err error)
}
```

### Parameter Description

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>Yes</td><td>—</td><td>File reading backend, responsible for actual file I/O</td></tr>
<tr><td><pre>AgentsMDFiles</pre></td><td><pre>[]string</pre></td><td>Yes</td><td>—</td><td>List of Agents.md file paths to load (at least one), loaded and injected in order</td></tr>
<tr><td><pre>AllAgentsMDMaxBytes</pre></td><td><pre>int</pre></td><td>No</td><td><pre>0</pre> (unlimited)</td><td>Total byte limit for all files; subsequent files are skipped when exceeded, but each file is always loaded completely</td></tr>
<tr><td><pre>OnLoadWarning</pre></td><td><pre>func(string, error)</pre></td><td>No</td><td><pre>log.Printf</pre></td><td>Callback for non-fatal errors (missing file, circular @import, depth exceeded, etc.)</td></tr>
</table>

### Validation Rules

`New` / `NewTyped` validates the Config during creation:

- `Config` cannot be nil
- `Backend` cannot be nil
- `AgentsMDFiles` must contain at least one path
- `AllAgentsMDMaxBytes` cannot be negative

---

## Constructors

### New — Standard Constructor

```go
func New(ctx context.Context, cfg *Config) (adk.ChatModelAgentMiddleware, error)
```

Returns `ChatModelAgentMiddleware` (i.e., `TypedChatModelAgentMiddleware[*schema.Message]`), suitable for standard `ChatModelAgent`.

### NewTyped — Generic Constructor

```go
func NewTyped[M adk.MessageType](_ context.Context, cfg *Config) (adk.TypedChatModelAgentMiddleware[M], error)
```

Generic version supporting both `*schema.Message` and `*schema.AgenticMessage` message types. `New` internally calls `NewTyped[*schema.Message]`.

## Backend Interface

### Interface Definition

```go
type Backend interface {
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
}
```

### Type Definitions

`ReadRequest` and `FileContent` are aliases of the same-named types in the `github.com/cloudwego/eino/adk/filesystem` package:

```go
type ReadRequest = filesystem.ReadRequest
type FileContent = filesystem.FileContent
```

> 💡
> **Backend Implementation Requirements**
>
> - When a file does not exist, the error **must** wrap `os.ErrNotExist` (making `errors.Is(err, os.ErrNotExist)` return `true`); the loader uses this to distinguish "file missing" from "real I/O error"
> - Other errors (permission denied, I/O errors) will **abort the entire loading process** and are not treated as warnings
> - The `Read` method should be concurrency-safe

---

## @import Syntax

Agents.md files support the `@path` syntax for recursively including other files.

### Syntax Format

```markdown
# Project Instructions

You are a code assistant.

Please refer to the following specifications:
@rules/code-style.md
@rules/api-conventions.md
```

### Matching Rules

The loader scans file content using the regex `@([a-zA-Z0-9_.~/][a-zA-Z0-9_.~/\-]*)`, combined with the following filtering logic:

- **Paths containing /**: Treated directly as @import (e.g., `@rules/style.md`)
- **Paths without /**: Only treated as @import when the extension is in the allowed list, otherwise ignored. **Allowed extensions**: `.md`, `.txt`, `.mdx`, `.yaml`, `.yml`, `.json`, `.toml`. This design avoids misidentifying `@someone`, `@example.com`, etc. as import targets.

### Resolution Behavior

<table>
<tr><td>Rule</td><td>Description</td></tr>
<tr><td>Path resolution</td><td>Relative paths are resolved based on the current file's directory; absolute paths are used directly</td></tr>
<tr><td>Maximum recursion depth</td><td><strong>5 levels</strong> (exceeding this is skipped and triggers <pre>OnLoadWarning</pre>)</td></tr>
<tr><td>Circular reference detection</td><td>Paths already present in the current ancestor chain are skipped (triggers <pre>OnLoadWarning</pre>)</td></tr>
<tr><td>Global deduplication</td><td>The same file path is read and injected only once during the entire loading process</td></tr>
<tr><td>Original text preserved</td><td>Files referenced by @import are appended as separate paragraphs; the <pre>@path</pre> text in the original is <strong>not removed</strong></td></tr>
<tr><td>Byte budget</td><td>Once cumulative bytes exceed <pre>AllAgentsMDMaxBytes</pre>, subsequent imports are skipped</td></tr>
</table>

### Directory Structure Example

```
project/
├── Agents.md               # Main entry file
├── rules/
│   ├── code-style.md       # @rules/code-style.md
│   ├── api-conventions.md  # @rules/api-conventions.md
│   └── testing.md
└── context/
    └── architecture.md
```

---

## How It Works

### Implementation Hook

The middleware implements the `BeforeModelRewriteState` method of the `TypedChatModelAgentMiddleware` interface (**not** WrapModel). This hook is triggered before each model call when the state is being rewritten.

### Injection Flow

### Message Sequence After Injection

```
[System]     System prompt
[User]       ← Agents.md content (with Extra marker)
[User]       User history message 1
[Assistant]  Assistant reply 1
[User]       Current user message
```

### Key Mechanisms

**1. Persistent Injection + Idempotency Guarantee** The framework persists the state returned by `BeforeModelRewriteState` to the agent's internal state (`st.Messages = state.Messages`). Injected messages are marked with `Extra["__agentsmd_content__"]`; each time the hook is entered, it scans first — if the marker already exists, the original state is returned directly, avoiding duplicate injection. The effect is: content is injected and persisted on the first model call, and subsequent iterations do not re-insert. **2. Run-Level Caching** Within the same `Run()`, content loaded for the first time is cached to RunLocal storage via `adk.SetRunLocalValue`. Subsequent model calls (e.g., multi-round tool calls) reuse the cache directly via `adk.GetRunLocalValue`. Each new `Run()` reloads, so file modifications take effect on the next Run. **4. Insertion Position** Content is inserted as a `User` role message **before the first User message** in the message sequence. If there are no User messages in the sequence, it is appended to the end. **5. Content Formatting** Loaded file content undergoes formatting:

- Wrapped in `<system-reminder>` tags
- Includes i18n header (prompting the model to follow instructions) and footer (noting context may not be relevant)
- Each file is displayed independently with a prefix of `File content: {path} (instructions):`
- Language (Chinese/English) is controlled globally via `adk.SetLanguage`

---

## Notes

### Middleware Order

> 💡
> **It is recommended to place the agentsmd middleware after the summarization/compression middleware.** This way, Agents.md content will not be summarized or compressed, and each model call receives the complete instructions.

```go
Handlers: []adk.ChatModelAgentMiddleware{
    summarizationMiddleware, // Summarize first
    agentsMDMiddleware,      // Then inject Agents.md
}
```

### Error Handling

<table>
<tr><td>Scenario</td><td>Behavior</td></tr>
<tr><td>File does not exist (<pre>os.ErrNotExist</pre>)</td><td>Skip the file, trigger <pre>OnLoadWarning</pre></td></tr>
<tr><td>Circular @import</td><td>Skip the circular file, trigger <pre>OnLoadWarning</pre></td></tr>
<tr><td>@import depth exceeds 5 levels</td><td>Skip, trigger <pre>OnLoadWarning</pre></td></tr>
<tr><td>Cumulative size exceeds <pre>AllAgentsMDMaxBytes</pre></td><td>Skip subsequent files, trigger <pre>OnLoadWarning</pre> (the first file is always loaded completely)</td></tr>
<tr><td>Permission denied / I/O error</td><td><strong>Abort loading, return error</strong></td></tr>
<tr><td>All file contents are empty</td><td>No injection, pass messages through unchanged</td></tr>
</table>

### Performance Considerations

- Set `AllAgentsMDMaxBytes` appropriately to avoid injecting too much content that occupies the context window
- Agents.md content is loaded only once per `Run()` (run-level caching), but **each new Run() reloads**
- Avoid @importing too many files; the recursion depth limit is 5 levels

### Agents.md Writing Tips

- Keep content concise, only including instructions that genuinely affect model behavior
- Use @import to split by concern area (code conventions, API conventions, architecture descriptions, etc.)
- Avoid including large code examples or data to conserve context window space
- File content is delivered to the model wrapped in `<system-reminder>` tags

---

## FAQ

**Q: Is Agents.md content saved to the conversation history?**

A: Yes. The state returned by `BeforeModelRewriteState` is persisted by the framework. However, due to the idempotency check (`Extra["__agentsmd_content__"]` marker), content is only injected once on the first model call, and subsequent iterations skip it. It is recommended to place agentsmd after summarization to avoid the injected content being summarized or compressed.

**Q: What happens if an Agents.md file does not exist?**

A: The file is skipped, triggering the `OnLoadWarning` callback (default `log.Printf`), without affecting loading of other files.

**Q: What directory are @import paths relative to?**

A: Relative to the current file's directory. For example, `@rules/style.md` in `/project/Agents.md` resolves to `/project/rules/style.md`.

**Q: Will the same file be loaded multiple times if @imported from multiple files?**

A: No. The loader maintains a global deduplication map (`seen`); the same path is read and injected only once.

**Q: Are the @path references in the original text replaced?**

A: No. Files referenced by @import are appended as separate paragraphs after the original text; the original content remains unchanged.

**Q: What is the difference between New and NewTyped?**

A: `New` returns `ChatModelAgentMiddleware` (i.e., `TypedChatModelAgentMiddleware[*schema.Message]`), suitable for standard Agents. `NewTyped` is the generic version that additionally supports the `*schema.AgenticMessage` type for Agentic Model scenarios.
