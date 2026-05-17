---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent 协作
weight: 4
---

# 多 Agent 协作

Eino ADK 提供两种主要的 Agent 协作方式：

## AgentAsTool（推荐）

将子 Agent 包装为 Tool，父 Agent 通过 ToolCall 自主决定何时调用。子 Agent 独立执行，结果返回父 Agent 的上下文。

这是最灵活、最可组合的协作模式：

- 父 Agent 保持控制权，可基于子 Agent 结果继续推理
- 子 Agent 接收独立的任务描述，不继承父 Agent 的完整对话历史
- 多个子 Agent 可并行调用

```go
import (
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/compose"
    "github.com/cloudwego/eino/components/tool"
)

// 创建子 Agent
subAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "researcher",
    Description: "搜索并总结相关信息",
    Instruction: "你是一个研究助手...",
    Model:       chatModel,
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{searchTool},
        },
    },
})

// 包装为 Tool
agentTool := adk.NewAgentTool(ctx, subAgent)

// 父 Agent 注册子 Agent Tool
parentAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "coordinator",
    Description: "协调任务的主 Agent",
    Instruction: "你是一个任务协调者...",
    Model:       chatModel,
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: []tool.BaseTool{agentTool},
        },
    },
})
```

### AgentTool 选项

<table>
<tr><td>选项</td><td>说明</td></tr>
<tr><td><pre>WithFullChatHistoryAsInput()</pre></td><td>将父 Agent 的完整对话历史作为子 Agent 输入（默认只传模型生成的 request 参数）</td></tr>
<tr><td><pre>WithAgentInputSchema(schema)</pre></td><td>自定义子 Agent 的输入 schema</td></tr>
</table>

### 事件流透传

当 `ToolsConfig.EmitInternalEvents = true` 时，子 Agent 的事件会实时透传到父 Agent 的事件流，允许终端用户看到子 Agent 的中间过程。

> 💡
> 透传的事件不影响父 Agent 的状态或 checkpoint，仅用于用户展示。唯一例外是 Interrupted action，会通过 CompositeInterrupt 跨边界传播以支持中断恢复。

### 预构建示例：DeepAgents

[DeepAgents](/zh/docs/eino/core_modules/eino_adk/agent_implementation/deepagents) 是 AgentAsTool 模式的最佳实践：主 Agent 通过 **TaskTool** 将子任务委派给子 Agent 执行，配合 **WriteTodos** 进行任务规划和进度追踪。

## Workflow Agents

确定性编排，用于流程固定的多步任务：

<table>
<tr><td>类型</td><td>说明</td><td>构造函数</td></tr>
<tr><td><strong>Sequential</strong></td><td>按数组顺序依次执行子 Agent</td><td><pre>adk.NewSequentialAgent</pre></td></tr>
<tr><td><strong>Parallel</strong></td><td>并发执行所有子 Agent，全部完成后结束</td><td><pre>adk.NewParallelAgent</pre></td></tr>
<tr><td><strong>Loop</strong></td><td>循环执行子 Agent 序列，直到 BreakLoop 或超过 MaxIterations</td><td><pre>adk.NewLoopAgent</pre></td></tr>
</table>

Workflow Agent 之间通过 Transfer 传递上下文：上游 Agent 的输出自动拼接到下游 Agent 的输入 Messages 中。

# 上下文传递

## SessionValues

跨 Agent 的全局 KV 存储，一次运行内任何 Agent 可并发安全地读写：

```go
// 读写 API
adk.AddSessionValue(ctx, "key", value)
val, ok := adk.GetSessionValue(ctx, "key")
adk.AddSessionValues(ctx, map[string]any{"k1": v1, "k2": v2})
all := adk.GetSessionValues(ctx)
```

> 💡
> SessionValues 基于 Context 实现，Runner 运行时会重新初始化 Context。如需在运行前注入数据，使用 `WithSessionValues` Option：

```go
iter := runner.Run(ctx, messages,
    adk.WithSessionValues(map[string]any{
        "user_id": "123",
    }),
)
```
