---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.8.*-adk middlewares'
weight: 8
---

This document introduces the main new features and improvements of Eino ADK v0.8.* version.

> 💡
> Currently in alpha stage: [https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.14](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.14)

## Version Highlights

v0.8 is an important feature enhancement release that introduces a new middleware interface architecture, adds multiple practical middlewares, and provides enhanced observability support.

<table><tbody><tr>
<td>
<strong>🔧 Flexible Middleware Architecture</strong>
New ChatModelAgentMiddleware interface</td><td>
<strong>📊 Enhanced Observability</strong>
Agent-level Callback support</td></tr></tbody></table>

---

## 1. ChatModelAgentMiddleware Interface

> 💡
> **Core Update**: New middleware interface providing more flexible Agent extension mechanism

`ChatModelAgentMiddleware` is the most important architectural update in v0.8, providing unified extension points for `ChatModelAgent` and Agents built on it (such as `DeepAgent`).

**Advantages over AgentMiddleware**:

<table>
<tr><td>Feature</td><td>AgentMiddleware</td><td>ChatModelAgentMiddleware</td></tr>
<tr><td>Extensibility</td><td>Closed</td><td>Open, can implement custom handlers</td></tr>
<tr><td>Context Propagation</td><td>Callbacks only return error</td><td>All methods return (ctx, ..., error)</td></tr>
<tr><td>Configuration Management</td><td>Scattered in closures</td><td>Centralized in struct fields</td></tr>
</table>

**Interface Methods**:

- `BeforeAgent` - Modify configuration before Agent runs
- `BeforeModelRewriteState` - Handle state before model call
- `AfterModelRewriteState` - Handle state after model call
- `WrapInvokableToolCall` - Wrap synchronous tool calls
- `WrapStreamableToolCall` - Wrap streaming tool calls
- `WrapModel` - Wrap model calls

**Usage**:

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    model,
    Handlers: []adk.ChatModelAgentMiddleware{mw1, mw2, mw3},
})
```

See [Eino ADK: ChatModelAgentMiddleware](/docs/eino/core_modules/eino_adk/Eino_ADK_ChatModelAgentMiddleware) for details

---

### 1.1 Summarization Middleware

> 💡
> **Function**: Automatic conversation history summarization to prevent exceeding model context window limits

📚 **Detailed Documentation**: [Middleware: Summarization](https://www.feishu.cn/wiki/KFJ9wnrMmicvI4kWuz4cymnTnfe)

When the token count of conversation history exceeds the threshold, automatically call LLM to generate summary and compress context.

**Core Capabilities**:

- Configurable trigger conditions (Token threshold)
- Support retaining recent user messages
- Support recording complete conversation history to file
- Provide pre and post processing hooks

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
> **Function**: Tool result compression, optimizing context usage efficiency

📚 **Detailed Documentation**: [Middleware: ToolReduction](https://www.feishu.cn/wiki/C5QAwAg3QisDo5kwaWicJBo9ndd)

Provides two-stage tool output management:

<table>
<tr><td>Stage</td><td>Trigger Time</td><td>Function</td></tr>
<tr><td>Truncation</td><td>After tool returns</td><td>Truncate overly long output, save to file</td></tr>
<tr><td>Clear</td><td>Before model call</td><td>Clear historical tool results, release Tokens</td></tr>
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
> **Function**: File system operation tool set

📚 **Detailed Documentation**: [Middleware: FileSystem](https://www.feishu.cn/wiki/NODlwh1Q9imdetkhmgKcyF0Vncd)

**New Capabilities**:

- **Grep functionality enhancement**: Support full regular expression syntax
- **New options**: `CaseInsensitive`, `EnableMultiline`, `FileType` filtering
- **Custom tool names**: All filesystem tools support custom names

### 1.4 Skill Middleware

> 💡
> **Function**: Dynamic loading and execution of Skills

📚 **Detailed Documentation**: [Middleware: Skill](https://www.feishu.cn/wiki/NG1xwde86ig3qhkdMhQc5bh2nIm)

**New Capabilities**:

- **Context mode**: Support `fork` and `isolate` two context modes
- **Custom configuration**: Support custom system prompts and tool descriptions
- **FrontMatter extension**: Support specifying agent and model through FrontMatter

### 1.5 PlanTask Middleware

> 💡
> **Function**: Task planning and execution tools

📚 **Detailed Documentation**: [Middleware: PlanTask](https://www.feishu.cn/wiki/H7dlwwO0ZiotwBk8iTpcxesKn4d)

Supports Agent creating and managing task plans, suitable for complex task scenarios requiring step-by-step execution.

### 1.6 ToolSearch Middleware

> 💡
> **Function**: Tool search, supports dynamic retrieval from a large number of tools

📚 **Detailed Documentation**: [Middleware: ToolSearch](https://www.feishu.cn/wiki/GVgXww3HJiZUx0kS7O6cfOHpnZf)

When there are many tools, dynamically select the most relevant tools through semantic search to avoid context overload.

### 1.7 PatchToolCalls Middleware

> 💡
> **Function**: Patch dangling tool calls, ensure message history completeness

📚 **Detailed Documentation**: [Middleware: PatchToolCalls](https://www.feishu.cn/wiki/WpkUwXnwMidkUVkGTx8ckIWWnjg)

Scans message history and inserts placeholder messages for tool calls missing responses. Suitable for scenarios where tool calls are interrupted or canceled.

**Quick Start**:

```go
mw, err := patchtoolcalls.New(ctx, nil)
```

## 2. Agent Callback Support

> 💡
> **Function**: Agent-level callback mechanism for observation and tracing

Supports registering callbacks throughout the Agent execution lifecycle for logging, tracing, monitoring, and other functions.

**Core Types**:

- `AgentCallbackInput` - Callback input, contains Agent input or resume information
- `AgentCallbackOutput` - Callback output, contains Agent event stream

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
> **Function**: Global language setting

Supports globally setting ADK's language preference, affecting the language of built-in prompts and messages.

**Usage**:

```go
adk.SetLanguage(adk.LanguageChinese)  // Set to Chinese
adk.SetLanguage(adk.LanguageEnglish)  // Set to English (default)
```

---

## Middleware Usage Recommendations

> 💡
> **Recommended Combination**: The following middlewares can be used in combination to cover most long conversation scenarios

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
> Before upgrading to v0.8, please review the Breaking Changes document to understand all incompatible changes

📚 **Complete Documentation**: [Eino v0.8 Breaking Changes](/docs/eino/release_notes_and_migration/Eino_v0.8._-adk_middlewares/Eino_v0.8_Breaking_Changes)

**Change Overview**:

<table>
<tr><td>Type</td><td>Change Item</td></tr>
<tr><td>API Change</td><td><pre>ShellBackend</pre> → <pre>Shell</pre> interface rename</td></tr>
<tr><td>Behavior Change</td><td><pre>AgentEvent</pre> emission mechanism changed to Middleware</td></tr>
<tr><td>Behavior Change</td><td><pre>ReadRequest.Offset</pre> changed from 0-based to 1-based</td></tr>
<tr><td>Behavior Change</td><td><pre>FileInfo.Path</pre> no longer guaranteed to be absolute path</td></tr>
<tr><td>Behavior Change</td><td><pre>WriteRequest</pre> changed from error on file exists to overwrite</td></tr>
<tr><td>Behavior Change</td><td><pre>GrepRequest.Pattern</pre> changed from literal to regular expression</td></tr>
</table>

## Upgrade Guide

For detailed migration steps and code examples, please refer to: [Eino v0.8 Breaking Changes](/docs/eino/release_notes_and_migration/Eino_v0.8._-adk_middlewares/Eino_v0.8_Breaking_Changes)

**Quick Checklist**:

1. Check if `ShellBackend` / `StreamingShellBackend` interfaces are used (need to rename)
2. Check `ReadRequest.Offset` usage (0-based → 1-based)
3. Check `GrepRequest.Pattern` usage (literal → regular expression, special characters need escaping)
4. Check if code relies on `WriteRequest`'s "error on file exists" behavior
5. Check if code relies on `FileInfo.Path` being absolute path
6. If you have custom ChatModel/Tool Decorator/Wrapper, consider migrating to `ChatModelAgentMiddleware`
7. Run tests to verify functionality is working correctly
