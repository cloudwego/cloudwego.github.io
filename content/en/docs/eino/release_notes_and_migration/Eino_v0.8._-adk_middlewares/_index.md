---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.8.*-adk middlewares'
weight: 8
---

This document introduces the main new features and improvements in Eino ADK v0.8.*.

> 💡
> Currently in the v0.8.0.Beta version stage: [https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1](https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1)

## Version Highlights

v0.8 is a significant feature enhancement release that introduces a new middleware interface architecture, adds multiple practical middlewares, and provides enhanced observability support.

<table><tbody><tr>
<td>
<strong>🔧 Flexible Middleware Architecture</strong>
New ChatModelAgentMiddleware interface</td><td>
<strong>📊 Enhanced Observability</strong>
Agent-level Callback support</td></tr></tbody></table>

---

## 1. ChatModelAgentMiddleware Interface

> 💡
> **Core Update**: A new middleware interface providing more flexible Agent extension mechanisms

`ChatModelAgentMiddleware` is the most important architectural update in v0.8, providing unified extension points for `ChatModelAgent` and Agents built on top of it (such as `DeepAgent`).

**Advantages over AgentMiddleware**:

<table>
<tr><td>Feature</td><td>AgentMiddleware</td><td>ChatModelAgentMiddleware</td></tr>
<tr><td>Extensibility</td><td>Closed</td><td>Open, supports custom handlers</td></tr>
<tr><td>Context Propagation</td><td>Callbacks only return error</td><td>All methods return (ctx, ..., error)</td></tr>
<tr><td>Configuration Management</td><td>Scattered in closures</td><td>Centralized in struct fields</td></tr>
</table>

**Interface Methods**:

- `BeforeAgent` - Modify configuration before Agent runs
- `BeforeModelRewriteState` - Process state before model invocation
- `AfterModelRewriteState` - Process state after model invocation
- `WrapInvokableToolCall` - Wrap synchronous tool calls
- `WrapStreamableToolCall` - Wrap streaming tool calls
- `WrapModel` - Wrap model invocation

**Usage**:

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    model,
    Handlers: []adk.ChatModelAgentMiddleware{mw1, mw2, mw3},
})
```

See [Eino ADK: ChatModelAgentMiddleware](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware) for details

---

### 1.1 Summarization Middleware

> 💡
> **Function**: Automatic conversation history summarization to prevent exceeding model context window limits

📚 **Detailed Documentation**: [Middleware: Summarization](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_summarization)

When the token count of conversation history exceeds a threshold, automatically calls LLM to generate a summary and compress the context.

**Core Capabilities**:

- Configurable trigger conditions (token threshold)
- Support for retaining recent user messages
- Support for recording complete conversation history to files
- Provides pre and post processing hooks

**Quick Start**:

```go
mw, err := summarization.New(ctx, &summarization.Config{
    Model: chatModel,
    Trigger: &summarization.TriggerCondition{
        ContextTokens: 100000,
    },
})
```

### 1.2 ToolReduction Middleware

> 💡
> **Function**: Tool result compression to optimize context usage efficiency

📚 **Detailed Documentation**: [Middleware: ToolReduction](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_toolreduction)

Provides two-phase tool output management:

<table>
<tr><td>Phase</td><td>Trigger Time</td><td>Effect</td></tr>
<tr><td>Truncation</td><td>After tool returns</td><td>Truncate overlong output, save to file</td></tr>
<tr><td>Clear</td><td>Before model invocation</td><td>Clear historical tool results, free up tokens</td></tr>
</table>

**Quick Start**:

```go
mw, err := reduction.New(ctx, &reduction.Config{
    Backend:           fsBackend,
    MaxLengthForTrunc: 30000,
    MaxTokensForClear: 50000,
})
```

### 1.3 Filesystem Middleware

> 💡
> **Function**: File system operation toolset

📚 **Detailed Documentation**: [Middleware: FileSystem](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_filesystem)

**New Capabilities**:

- **Grep Enhancement**: Support for full regular expression syntax
- **New Options**: `CaseInsensitive`, `EnableMultiline`, `FileType` filtering
- **Custom Tool Names**: All filesystem tools support custom naming

### 1.4 Skill Middleware

> 💡
> **Function**: Dynamic loading and execution of Skills

📚 **Detailed Documentation**: [Middleware: Skill](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_skill)

**New Capabilities**:

- **Context Modes**: Support for `fork` and `isolate` context modes
- **Custom Configuration**: Support for custom system prompts and tool descriptions
- **FrontMatter Extension**: Support for specifying agent and model via FrontMatter

### 1.5 PlanTask Middleware

> 💡
> **Function**: Task planning and execution tools

📚 **Detailed Documentation**: [Middleware: PlanTask](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_plantask)

Supports Agent creation and management of task plans, suitable for complex task scenarios requiring step-by-step execution.

### 1.6 ToolSearch Middleware

> 💡
> **Function**: Tool search with dynamic retrieval from a large number of tools

📚 **Detailed Documentation**: [Middleware: ToolSearch](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_toolsearch)

When there are many tools, dynamically selects the most relevant tools through semantic search to avoid context overload.

### 1.7 PatchToolCalls Middleware

> 💡
> **Function**: Patch dangling tool calls to ensure message history completeness

📚 **Detailed Documentation**: [Middleware: PatchToolCalls](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_patchtoolcalls)

Scans message history and inserts placeholder messages for tool calls missing responses. Suitable for scenarios where tool calls are interrupted or cancelled.

**Quick Start**:

```go
mw, err := patchtoolcalls.New(ctx, nil)
```

## 2. Agent Callback Support

> 💡
> **Function**: Agent-level callback mechanism for observation and tracing

Supports registering callbacks throughout the Agent execution lifecycle for logging, tracing, monitoring, and other functions.

**Core Types**:

- `AgentCallbackInput` - Callback input containing Agent input or resume information
- `AgentCallbackOutput` - Callback output containing Agent event stream

**Usage**:

```go
agent.Run(ctx, input, adk.WithCallbacks(
    callbacks.NewHandler(
        callbacks.WithOnStart(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
            agentInput := adk.ConvAgentCallbackInput(input)
            // Handle Agent start event
            return ctx
        }),
        callbacks.WithOnEnd(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
            agentOutput := adk.ConvAgentCallbackOutput(output)
            // Handle Agent completion event
            return ctx
        }),
    ),
))
```

See [Eino ADK: Agent Callback](/docs/eino/core_modules/eino_adk/adk_agent_callback) for details

---

## 3. Language Setting

> 💡
> **Function**: Global language settings

Supports global setting of ADK language preferences, affecting the language of built-in prompts and messages.

**Usage**:

```go
adk.SetLanguage(adk.LanguageChinese)  // Set to Chinese
adk.SetLanguage(adk.LanguageEnglish)  // Set to English (default)
```

---

## Middleware Usage Recommendations

> 💡
> **Recommended Combination**: The following middlewares can be combined to cover most long conversation scenarios

```go
handlers := []adk.ChatModelAgentMiddleware{
    patchMW,          // 1. Patch dangling tool calls
    reductionMW,      // 2. Compress tool output
    summarizationMW,  // 3. Summarize conversation history
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    model,
    Handlers: handlers,
})
```

---

## Breaking Changes

> 💡
> Before upgrading to v0.8, please review the Breaking Changes documentation for all incompatible changes

📚 **Complete Documentation**: [Eino v0.8 Breaking Changes](/docs/eino/release_notes_and_migration/Eino_v0.8._-adk_middlewares/Eino_v0.8_Breaking_Changes)

**Change Overview**:

<table>
<tr><td>Type</td><td>Change Item</td></tr>
<tr><td>API Change</td><td><pre>ShellBackend</pre> → <pre>Shell</pre> interface rename</td></tr>
<tr><td>Behavior Change</td><td><pre>AgentEvent</pre> sending mechanism changed to Middleware</td></tr>
<tr><td>Behavior Change</td><td><pre>ReadRequest.Offset</pre> changed from 0-based to 1-based</td></tr>
<tr><td>Behavior Change</td><td><pre>FileInfo.Path</pre> no longer guaranteed to be absolute path</td></tr>
<tr><td>Behavior Change</td><td><pre>WriteRequest</pre> changed from error on file exists to overwrite</td></tr>
<tr><td>Behavior Change</td><td><pre>GrepRequest.Pattern</pre> changed from literal to regular expression</td></tr>
</table>

## Upgrade Guide

For detailed migration steps and code examples, please refer to: [Eino v0.8 Breaking Changes](/docs/eino/release_notes_and_migration/Eino_v0.8._-adk_middlewares/Eino_v0.8_Breaking_Changes)

**Quick Checklist**:

1. Check if you are using `ShellBackend` / `StreamingShellBackend` interface (needs renaming)
2. Check `ReadRequest.Offset` usage (0-based → 1-based)
3. Check `GrepRequest.Pattern` usage (literal → regex, special characters need escaping)
4. Check if you depend on `WriteRequest`'s "error on file exists" behavior
5. Check if you depend on `FileInfo.Path` being absolute path
6. If you have custom ChatModel/Tool Decorator/Wrapper, consider migrating to `ChatModelAgentMiddleware`
7. Run tests to verify functionality
