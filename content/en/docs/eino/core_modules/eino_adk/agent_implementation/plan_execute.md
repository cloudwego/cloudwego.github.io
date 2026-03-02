---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino ADK: Plan-Execute-Replan Agent'
weight: 3
---

# Plan-Execute-Replan Agent Overview

## Introduction

The Plan-Execute-Replan Agent adopts a **Plan-Execute-Replan** workflow, suitable for tasks requiring structured planning and execution tracking.

<a href="/img/eino/eino_adk_plan_execute.png" target="_blank"><img src="/img/eino/eino_adk_plan_execute.png" width="100%" /></a>

## How It Works

The agent operates in three alternating phases:

1. **Planning**: Generates a structured plan with discrete steps
2. **Execution**: Executes steps sequentially using available tools
3. **Replanning**: Evaluates progress and adjusts the plan as needed

## Features

### Structured Planning

- Clear step-by-step breakdown
- Dependency tracking between steps
- Progress monitoring

### Adaptive Execution

- Dynamic plan adjustment based on results
- Graceful handling of step failures
- Context preservation across steps

### State Management

- Maintains execution history
- Tracks completed vs pending steps
- Stores intermediate results

## Configuration

```go
type PlanExecuteReplanAgentConfig struct {
    Name        string
    Description string

    PlannerChatModel  model.ToolCallingChatModel
    ExecutorChatModel model.ToolCallingChatModel
    ReplannerChatModel model.ToolCallingChatModel

    Tools []tool.BaseTool

    MaxIterations int
    OutputKey     string
}
```

- `Name`: Agent name
- `Description`: Agent description
- `PlannerChatModel`: Chat model for initial plan creation
- `ExecutorChatModel`: Chat model for step execution
- `ReplannerChatModel`: Chat model for plan revision
- `Tools`: Available tools for execution
- `MaxIterations`: Maximum planning cycles (default: 10)
- `OutputKey`: Session key to store final result

## Usage Example

```go
import (
    "context"
    "log"
    "os"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/prebuilt"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/tool"
)

func newChatModel() model.ToolCallingChatModel {
    cm, err := openai.NewChatModel(context.Background(), &openai.ChatModelConfig{
       APIKey: os.Getenv("OPENAI_API_KEY"),
       Model:  "gpt-4o",
    })
    if err != nil {
       log.Fatal(err)
    }
    return cm
}

func NewPlanExecuteAgent() adk.Agent {
    ctx := context.Background()
    cm := newChatModel()
    a, err := prebuilt.NewPlanExecuteReplanAgent(ctx, &prebuilt.PlanExecuteReplanAgentConfig{
       Name:               "PlanExecuteAgent",
       Description:        "An agent that plans and executes complex tasks",
       PlannerChatModel:   cm,
       ExecutorChatModel:  cm,
       ReplannerChatModel: cm,
       Tools:              []tool.BaseTool{ /* your tools */ },
       MaxIterations:      10,
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func main() {
    ctx := context.Background()
    agent := NewPlanExecuteAgent()
    
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: agent,
    })
    
    iter := runner.Query(ctx, "Research the company's quarterly report and create a summary presentation")
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Err != nil {
          log.Fatal(event.Err)
       }
       // Process events...
    }
}
```

## Applicable Scenarios

Plan-Execute-Replan Agent is ideal for:

- Multi-step tasks with dependencies
- Tasks requiring execution tracking
- Scenarios where plans may need adjustment
- Projects with clear deliverables

## Summary

The Plan-Execute-Replan Agent provides a disciplined approach to complex task execution through structured planning and adaptive replanning. It's particularly effective for tasks that benefit from explicit step tracking and the ability to adjust course based on intermediate results.
