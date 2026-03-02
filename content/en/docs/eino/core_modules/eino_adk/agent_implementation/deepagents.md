---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino ADK: Deep Research Agents'
weight: 4
---

# DeepAgents Overview

## Introduction

DeepAgents is an Agent implementation in Eino ADK that adopts a **research-plan-answer** approach for handling complex, open-ended questions. It breaks down complex queries into structured research plans, conducts multi-round iterative research, and synthesizes findings into comprehensive answers.

<a href="/img/eino/eino_adk_deep_agents.png" target="_blank"><img src="/img/eino/eino_adk_deep_agents.png" width="100%" /></a>

## How It Works

The workflow consists of three main phases:

1. **Planning Phase**: Analyzes the user's question and creates a structured research plan with multiple parallel investigation paths
2. **Research Phase**: Executes parallel research branches, with each branch potentially conducting multiple iterative rounds of investigation
3. **Answering Phase**: Synthesizes all research findings into a comprehensive, well-structured response

## Features

### Multi-Branch Research

- Decomposes queries into parallel research streams
- Each branch can run independently
- Branches can iterate up to 3 rounds by default

### Adaptive Investigation

- Dynamic iteration based on findings
- Automatic stopping when enough evidence is gathered
- Cross-branch knowledge sharing

### Structured Output

- Comprehensive answers with citations
- Section-based organization
- Key findings summary

## Configuration

```go
type DeepAgentsConfig struct {
    Name        string
    Description string

    PlannerChatModel   model.ToolCallingChatModel
    ResearchChatModel  model.ToolCallingChatModel
    WriterChatModel    model.ToolCallingChatModel

    Tools []tool.BaseTool

    MaxResearchIterations int
    OutputKey             string
}
```

- `Name`: Agent name
- `Description`: Agent description
- `PlannerChatModel`: Chat model for plan generation
- `ResearchChatModel`: Chat model for research execution
- `WriterChatModel`: Chat model for final answer generation
- `Tools`: Available tools for research
- `MaxResearchIterations`: Maximum research iterations per branch (default: 3)
- `OutputKey`: Session key to store final answer

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

func NewDeepAgents() adk.Agent {
    ctx := context.Background()
    cm := newChatModel()
    a, err := prebuilt.NewDeepAgents(ctx, &prebuilt.DeepAgentsConfig{
       Name:               "DeepResearchAgent",
       Description:        "An agent that performs deep research on complex topics",
       PlannerChatModel:   cm,
       ResearchChatModel:  cm,
       WriterChatModel:    cm,
       Tools:              []tool.BaseTool{ /* your research tools */ },
       MaxResearchIterations: 3,
    })
    if err != nil {
       log.Fatal(err)
    }
    return a
}

func main() {
    ctx := context.Background()
    agent := NewDeepAgents()
    
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: agent,
    })
    
    iter := runner.Query(ctx, "What are the latest developments in quantum computing and their potential impact on cryptography?")
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

DeepAgents is ideal for:

- Complex research questions requiring multi-faceted investigation
- Topics requiring multiple information sources
- Questions needing iterative exploration
- Scenarios requiring comprehensive, well-organized answers

## Summary

DeepAgents provides a sophisticated research pattern that combines planning, parallel execution, and synthesis to handle complex questions that would overwhelm simpler agent architectures. Its iterative approach ensures thorough investigation while its structured output delivers actionable insights.
