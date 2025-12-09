---
Description: ""
date: "2025-11-20"
lastmod: ""
tags: []
title: 'Eino ADK: Agent Runner & Extensions'
weight: 3
---

# Agent Runner

## Definition

Runner is the core engine that executes Agents in Eino ADK. It manages the full lifecycle: multi‑agent collaboration, context passing, and cross‑cutting aspects like interrupt and callback. Any Agent should run via Runner.

## Interrupt & Resume

Runner provides runtime interrupt and resume. It allows a running Agent to actively interrupt execution and persist current state, then resume from the breakpoint. Commonly used when external input is needed, long waits occur, or workflows are pausable.

Three key points in one interrupt→resume process:

1. Interrupted Action: emitted by Agent, intercepted by Runner
2. Checkpoint: after intercepting, Runner persists current state
3. Resume: when conditions are ready, Runner resumes from the breakpoint

### Interrupted Action

During execution, an Agent can actively interrupt Runner by emitting an AgentEvent containing Interrupted Action. Runner treats an event as interrupted when `Interrupted` is non‑nil:

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

When interruption occurs, use `InterruptInfo` to attach custom data. This data:

1. Is returned to the caller to explain the interruption reason
2. Will be passed back to the interrupted Agent on resume, so the Agent can recover based on it

```go
// e.g., ChatModelAgent emits the following AgentEvent on interrupt:
h.Send(&AgentEvent{AgentName: h.agentName, Action: &AgentAction{
    Interrupted: &InterruptInfo{
       Data: &ChatModelAgentInterruptInfo{Data: data, Info: info},
    },
}})
```

### State Persistence (Checkpoint)

Runner terminates the current run after capturing an event with Interrupted Action. If:

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

2. WithCheckPointID is passed when calling Runner

```go
// github.com/cloudwego/eino/adk/interrupt.go
func WithCheckPointID(id string) _AgentRunOption_
```

Runner persists current state (original input, history, etc.) and the Agent’s InterruptInfo into CheckPointStore under CheckPointID.

> To preserve interface concrete types, Eino ADK uses gob (https://pkg.go.dev/encoding/gob) to serialize runtime state. For custom types, register via gob.Register or gob.RegisterName (prefer the latter; the former uses path+type name as default identifiers, so both location and name must remain unchanged). Eino auto‑registers framework built‑in types.

### Resume

```go
// github.com/cloudwego/eino/adk/runner.go
func (r *Runner) Resume(ctx context.Context, checkPointID string, opts ...AgentRunOption) (*AsyncIterator[*AgentEvent], error)
```

Resume requires the interrupted Agent to implement `ResumableAgent`. Runner reads state from CheckPointStore and resumes; `InterruptInfo` and last run’s `EnableStreaming` are provided as inputs:

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

If Resume needs to pass new inputs to the Agent, define AgentRunOption and supply it when calling Runner.Resume.
