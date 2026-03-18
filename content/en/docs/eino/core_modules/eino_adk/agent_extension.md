---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Runner and Extension'
weight: 6
---

# Agent Runner

## Definition

Runner is the core engine in Eino ADK responsible for executing Agents. Its main purpose is to manage and control the entire lifecycle of Agents, such as handling multi-Agent collaboration, saving and passing context, etc. Cross-cutting capabilities like interrupt, callback, etc. all rely on Runner for implementation. Any Agent should be run through Runner.

## Interrupt & Resume

Agent Runner provides runtime interrupt and resume functionality. This allows a running Agent to proactively interrupt its execution and save the current state, supporting resumption from the interrupt point. This functionality is commonly used in scenarios where the Agent processing flow requires external input, long waits, or pausable operations.

Below we introduce three key points in an interrupt-to-resume process:

1. Interrupted Action: Thrown by the Agent as an interrupt event, intercepted by Agent Runner
2. Checkpoint: Agent Runner intercepts the event and saves the current running state
3. Resume: After running conditions are ready again, Agent Runner resumes running from the checkpoint

### Interrupted Action

During the Agent's execution, you can proactively interrupt the Runner's operation by producing an AgentEvent containing an Interrupted Action.

When the Event's Interrupted is not empty, the Agent Runner considers an interrupt to have occurred:

```go
// github.com/cloudwego/eino/adk/interface.go
type AgentAction struct {
    // other actions
    Interrupted *InterruptInfo
    // other actions
}

// github.com/cloudwego/eino/adk/interrupt.go
type InterruptInfo struct {
    Data any
}
```

When an interrupt occurs, you can attach custom interrupt information through the InterruptInfo structure. This information:

1. Will be passed to the caller, which can be used to explain the reason for the interrupt, etc.
2. If the Agent run needs to be resumed later, the InterruptInfo will be re-passed to the interrupted Agent upon resumption, and the Agent can use this information to resume running

```go
// For example, when ChatModelAgent interrupts, it sends the following AgentEvent:
h.Send(&AgentEvent{AgentName: h.agentName, Action: &AgentAction{
    Interrupted: &InterruptInfo{
       Data: &ChatModelAgentInterruptInfo{Data: data, Info: info},
    },
}})
```

### State Persistence (Checkpoint)

When Runner captures this Event with Interrupted Action, it immediately terminates the current execution flow. If:

1. CheckPointStore is set in Runner

```go
// github.com/cloudwego/eino/adk/runner.go
type RunnerConfig struct {
    // other fields
    CheckPointStore CheckPointStore
}

// github.com/cloudwego/eino/adk/interrupt.go
type CheckPointStore interface {
    Set(ctx context.Context, key string, value []byte) error
    Get(ctx context.Context, key string) ([]byte, bool, error)
}
```

1. CheckPointID is passed via AgentRunOption WithCheckPointID when calling Runner

```go
// github.com/cloudwego/eino/adk/interrupt.go
func WithCheckPointID(id string) AgentRunOption
```

After terminating running, Runner persists the current running state (original input, conversation history, etc.) and the InterruptInfo thrown by the Agent to CheckPointStore using CheckPointID as the key.

> 💡
> To preserve the original types of data in interfaces, Eino ADK uses gob ([https://pkg.go.dev/encoding/gob](https://pkg.go.dev/encoding/gob)) to serialize running state. Therefore, when using custom types, you need to register the types in advance using gob.Register or gob.RegisterName (the latter is more recommended; the former uses path plus type name as the default name, so both the type's location and name cannot change). Eino automatically registers types built into the framework.

### Resume

When running is interrupted, calling Runner's Resume interface with the CheckPointID from the interrupt can resume running:

```go
// github.com/cloudwego/eino/adk/runner.go
func (r *Runner) Resume(ctx context.Context, checkPointID string, opts ...AgentRunOption) (*AsyncIterator[*AgentEvent], error)
```

Resuming Agent running requires the interrupted Agent to implement the ResumableAgent interface. Runner reads the running state from CheckPointerStore and resumes running, where the InterruptInfo and the EnableStreaming configured in the previous run are provided as input to the Agent:

```go
// github.com/cloudwego/eino/adk/interface.go
type ResumableAgent interface {
    Agent

    Resume(ctx context.Context, info *ResumeInfo, opts ...AgentRunOption) *AsyncIterator[*AgentEvent]
}

// github.com/cloudwego/eino/adk/interrupt.go
type ResumeInfo struct {
    EnableStreaming bool
    *InterruptInfo
}
```

To pass new information to the Agent during Resume, you can define an AgentRunOption and pass it when calling Runner.Resume.
