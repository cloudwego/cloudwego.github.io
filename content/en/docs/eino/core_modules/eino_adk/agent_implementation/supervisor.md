---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino ADK: Supervisor Agent'
weight: 2
---

# Supervisor Agent Overview

## Introduction

Supervisor is a prebuilt Agent pattern in Eino ADK that adopts a **centralized orchestration** approach. A central Supervisor Agent coordinates multiple worker Agents, delegating tasks and synthesizing results.

<a href="/img/eino/eino_adk_supervisor.png" target="_blank"><img src="/img/eino/eino_adk_supervisor.png" width="100%" /></a>

## How It Works

The Supervisor pattern operates through:

1. **Task Analysis**: The Supervisor analyzes incoming requests
2. **Agent Selection**: Chooses the most appropriate worker Agent
3. **Delegation**: Transfers the task to the selected worker
4. **Result Collection**: Workers complete tasks and return to Supervisor
5. **Synthesis**: Supervisor combines results or delegates further

## Features

### Centralized Control

- Single point of coordination
- Consistent task routing
- Clear responsibility chain

### Dynamic Delegation

- LLM-driven agent selection
- Context-aware routing
- Automatic handoff to specialists

### Flexible Architecture

- Easy to add new worker Agents
- Independent worker implementations
- Scalable team composition

## Configuration

```go
type SupervisorConfig struct {
    Supervisor adk.Agent
    SubAgents  []adk.Agent
}

func NewSupervisor(ctx context.Context, conf *SupervisorConfig) (adk.Agent, error)
```

- `Supervisor`: The coordinating Agent that manages task delegation
- `SubAgents`: List of worker Agents available for task execution

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

func NewSupervisorAgent() adk.Agent {
    ctx := context.Background()
    cm := newChatModel()

    supervisorAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
       Name:        "Supervisor",
       Description: "Coordinates tasks between specialist agents",
       Instruction: "You are a supervisor. Analyze tasks and delegate to appropriate agents.",
       Model:       cm,
    })

    researchAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
       Name:        "Researcher",
       Description: "Performs research and information gathering",
       Instruction: "You are a research specialist. Gather and analyze information.",
       Model:       cm,
    })

    writerAgent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
       Name:        "Writer",
       Description: "Creates written content based on research",
       Instruction: "You are a content writer. Create clear, engaging content.",
       Model:       cm,
    })

    supervisor, err := prebuilt.NewSupervisor(ctx, &prebuilt.SupervisorConfig{
       Supervisor: supervisorAgent,
       SubAgents:  []adk.Agent{researchAgent, writerAgent},
    })
    if err != nil {
       log.Fatal(err)
    }
    return supervisor
}

func main() {
    ctx := context.Background()
    agent := NewSupervisorAgent()
    
    runner := adk.NewRunner(ctx, adk.RunnerConfig{
       Agent: agent,
    })
    
    iter := runner.Query(ctx, "Research AI trends and write a blog post about them")
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

Supervisor pattern is ideal for:

- Teams of specialized Agents
- Tasks requiring multiple expertise areas
- Workflows needing central coordination
- Projects with clear delegation hierarchy

## Summary

The Supervisor Agent provides a clean, centralized approach to multi-Agent orchestration. By having a dedicated coordinator, it simplifies task routing and ensures consistent handling of complex, multi-faceted requests.
