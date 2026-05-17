---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent Collaboration
weight: 4
---

# Multi-Agent Collaboration

Eino ADK provides two primary Agent collaboration approaches:

## AgentAsTool (Recommended)

Wraps a sub-Agent as a Tool, allowing the parent Agent to autonomously decide when to call it via ToolCall. The sub-Agent executes independently, and the result is returned to the parent Agent's context.

This is the most flexible and composable collaboration pattern:

- The parent Agent retains control and can continue reasoning based on the sub-Agent's result
- The sub-Agent receives an independent task description and does not inherit the parent Agent's full conversation history
- Multiple sub-Agents can be called in parallel

```go
import (
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/tool"
)

// Create sub-Agent
subAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "researcher",
    Description: "Search and summarize relevant information",
    Instruction: "You are a research assistant...",
    Model:       chatModel,
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{searchTool},
        },
    },
})

// Wrap as Tool
agentTool := adk.NewAgentTool(ctx, subAgent)

// Parent Agent registers the sub-Agent Tool
parentAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "coordinator",
    Description: "Main Agent that coordinates tasks",
    Instruction: "You are a task coordinator...",
    Model:       chatModel,
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{agentTool},
        },
    },
})
```

### AgentTool Options

<table>
<tr><td>Option</td><td>Description</td></tr>
<tr><td><pre>WithFullChatHistoryAsInput()</pre></td><td>Passes the parent Agent's full conversation history as the sub-Agent's input (by default, only the model-generated request parameters are passed)</td></tr>
<tr><td><pre>WithAgentInputSchema(schema)</pre></td><td>Customizes the sub-Agent's input schema</td></tr>
</table>

### Event Stream Passthrough

When `ToolsConfig.EmitInternalEvents = true`, the sub-Agent's events are passed through in real-time to the parent Agent's event stream, allowing end users to see the sub-Agent's intermediate process.

> 💡
> Passed-through events do not affect the parent Agent's state or checkpoint; they are for display purposes only. The only exception is the Interrupted action, which propagates across boundaries via CompositeInterrupt to support interrupt/resume.

### Pre-built Example: DeepAgents

[DeepAgents](/docs/eino/core_modules/eino_adk/agent_implementation/deepagents) is a best practice of the AgentAsTool pattern: the main Agent delegates subtasks to sub-Agents via **TaskTool**, combined with **WriteTodos** for task planning and progress tracking.

## Workflow Agents

Deterministic orchestration for multi-step tasks with fixed processes:

<table>
<tr><td>Type</td><td>Description</td><td>Constructor</td></tr>
<tr><td><strong>Sequential</strong></td><td>Executes sub-Agents sequentially in array order</td><td><pre>adk.NewSequentialAgent</pre></td></tr>
<tr><td><strong>Parallel</strong></td><td>Executes all sub-Agents concurrently, completes when all finish</td><td><pre>adk.NewParallelAgent</pre></td></tr>
<tr><td><strong>Loop</strong></td><td>Loops through the sub-Agent sequence until BreakLoop or MaxIterations is exceeded</td><td><pre>adk.NewLoopAgent</pre></td></tr>
</table>

Context is passed between Workflow Agents via Transfer: the upstream Agent's output is automatically concatenated into the downstream Agent's input Messages.

# Context Passing

## SessionValues

A global KV store across Agents that can be read and written concurrently-safely by any Agent within a single run:

```go
// Read/write API
adk.AddSessionValue(ctx, "key", value)
val, ok := adk.GetSessionValue(ctx, "key")
adk.AddSessionValues(ctx, map[string]any{"k1": v1, "k2": v2})
all := adk.GetSessionValues(ctx)
```

> 💡
> SessionValues is based on Context implementation. The Runner reinitializes the Context at runtime. To inject data before a run, use the `WithSessionValues` Option:

```go
iter := runner.Run(ctx, messages,
    adk.WithSessionValues(map[string]any{
        "user_id": "123",
    }),
)
```
