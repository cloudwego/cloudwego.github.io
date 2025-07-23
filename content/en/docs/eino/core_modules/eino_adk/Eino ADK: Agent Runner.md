---
Description: ""
date: "2025-07-22"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Extension'
weight: 0
---

# Agent Runner

Runner is the core engine responsible for executing Agents in Eino ADK. Its main role is to manage and control the entire lifecycle of Agents, such as handling multi-Agent collaboration, saving and passing context, etc. Aspect capabilities like interrupt and callback also rely on Runner for implementation. Any Agent should be run through Runner.

# Interrupt & Resume

This feature allows a running Agent to actively interrupt its execution, save the current state, and resume execution from the interruption point later. This is very useful for handling tasks that require external input, long waits, or pausable workflows.

## Interrupted Action

During Agent execution, you can actively interrupt the Runner's operation by generating an AgentEvent containing an Interrupted Action:

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

When an interruption occurs, custom interruption information can be attached through the InterruptInfo struct. This information:

1. Will be passed to the caller, which can use this information to explain the reason for interruption to the caller
2. If the Agent needs to be resumed later, InterruptInfo will be passed back to the interrupted Agent during resumption, and the Agent can use this information to resume operation

## State Persistence (Checkpoint)

When Runner captures this Event with an Interrupted Action, it will immediately terminate the current execution flow. If:

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

2. CheckPointID is passed through AgentRunOption WithCheckPointID when calling Runner

```go
// github.com/cloudwego/eino/adk/interrupt.go
func WithCheckPointID(id string) _AgentRunOption_
```

After terminating execution, Runner will persist the current running state (original input, conversation history, etc.) and the InterruptInfo thrown by the Agent to CheckPointStore using CheckPointID as the key.

> 💡
> To preserve the original types of data in interfaces, Eino ADK uses gob ([https://pkg.go.dev/encoding/gob](https://pkg.go.dev/encoding/gob)) to serialize the running state. Therefore, when using custom types, you need to register types in advance using gob.Register or gob.RegisterName (the latter is more recommended, as the former uses path plus type name as the default name, so neither the location nor the name of the type can be changed). Eino will automatically register built-in framework types.

## Resume

When execution is interrupted, you can call Runner's Resume interface with the CheckPointID from the interruption to resume execution:

```go
// github.com/cloudwego/eino/adk/runner.go
func (r *Runner) Resume(ctx context.Context, checkPointID string, opts ...AgentRunOption) (*AsyncIterator[*AgentEvent], error)
```

Resuming Agent execution requires that the Agent where the interruption occurred implements the ResumableAgent interface. Runner reads the running state from CheckPointerStore and resumes execution, where InterruptInfo and the EnableStreaming configured in the last run will be provided as input to the Agent:

```go
// github.com/cloudwego/eino/adk/interface.go
type ResumableAgent interface {
    Agent

    Resume(ctx context.Context, info *ResumeInfo, opts ...AgentRunOption) *AsyncIterator[*AgentEvent]
}

// github.com/cloudwego/eino/adk/interrupt.go
type ResumeInfo struct {
    EnableStreaming bool
    *_InterruptInfo_
}
```

If Resume needs to pass new information to the Agent, you can define AgentRunOption and pass it when calling Runner.Resume.

# Callback

TODO