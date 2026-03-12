---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 7: Interrupt/Resume (Human-in-the-Loop)"
weight: 7
---

Goal of this chapter: understand the Interrupt/Resume mechanism and implement a Tool approval workflow so users can confirm before sensitive operations.

## Code Location

- Entry code: [cmd/ch07/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch07/main.go)

## Prerequisites

Same as Chapter 1: configure a working ChatModel (OpenAI or Ark). Also set `PROJECT_ROOT` as in Chapter 4:

```bash
export PROJECT_ROOT=/path/to/eino  # Eino core repo root (defaults to current directory if unset)
```

## Run

From `examples/quickstart/chatwitheino`:

```bash
# set project root
export PROJECT_ROOT=/path/to/your/project

go run ./cmd/ch07
```

Example output:

```
you> Please run: echo hello

⚠️  Approval Required ⚠️
Tool: execute
Arguments: {"command":"echo hello"}

Approve this action? (y/n): y
[tool result] hello

hello
```

## From Auto-Execution to Human Approval: Why Interrupt

In previous chapters, the Agent automatically executed all Tool calls. In some scenarios this is dangerous:

**Risks of auto-execution:**

- deleting files: accidental data loss
- sending emails: wrong content or recipients
- executing commands: dangerous operations
- modifying configs: breaking system settings

**What Interrupt is for:**

- **Interrupt pauses the Agent**: stop before critical operations and wait for user confirmation
- **Interrupt can carry information**: show users what will be executed
- **Interrupt is resumable**: continue after approval; return a rejection message if disapproved

**Analogy:**

- **auto-execution** = “autopilot”
- **Interrupt** = “human takeover” for critical decisions

## Key Concepts

### Interrupt Mechanism

`Interrupt` is Eino’s core mechanism for human-in-the-loop collaboration.

Core idea: **pause before a sensitive action, then continue after user confirmation.**

An approval-required tool call is split into **two phases**:

1. **First call (trigger interrupt)**: the Tool stores the current arguments, then returns an interrupt signal. Runner pauses execution and emits an Interrupt event.
2. **Resume after approval**: Runner calls the Tool again. The Tool detects it is in a resumed run, reads the user’s approval result, and executes (or rejects).

**Simplified pseudocode:**

```
func myTool(ctx, args):
    if first call:
        store args
        return interrupt signal  // Runner pauses and shows an approval prompt
    else:  // second call after Resume
        if approved:
            return doOperation(stored args)
        else:
            return "Operation rejected by user"
```

**Full example with key fields:**

```go
// Trigger interrupt in a Tool.
func myTool(ctx context.Context, args string) (string, error) {
    // wasInterrupted: whether this is the second call after Resume (false on first call)
    // storedArgs: arguments saved via StatefulInterrupt during the first call; available after Resume
    wasInterrupted, _, storedArgs := tool.GetInterruptState[string](ctx)

    if !wasInterrupted {
        // First call: trigger interrupt and save args for Resume.
        return "", tool.StatefulInterrupt(ctx, &ApprovalInfo{
            ToolName:        "my_tool",
            ArgumentsInJSON: args,
        }, args)  // the third argument is saved state (retrieved later via storedArgs)
    }

    // Second call after Resume: read user approval result.
    // isTarget: whether this Resume targets the current Tool (each Resume targets one Tool)
    // hasData:  whether Resume carries approval result data
    // data:     approval result provided by user
    isTarget, hasData, data := tool.GetResumeContext[*ApprovalResult](ctx)
    if isTarget && hasData {
        if data.Approved {
            return doSomething(storedArgs)  // execute with saved args
        }
        return "Operation rejected by user", nil
    }

    // Other cases (isTarget=false means this Resume is for a different Tool): interrupt again.
    return "", tool.StatefulInterrupt(ctx, &ApprovalInfo{
        ToolName:        "my_tool",
        ArgumentsInJSON: storedArgs,
    }, storedArgs)
}
```

### ApprovalMiddleware

`ApprovalMiddleware` is a reusable approval middleware that intercepts specific Tool calls:

```go
type approvalMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *approvalMiddleware) WrapInvokableToolCall(
    _ context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    tCtx *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    // Only intercept tools that require approval.
    if tCtx.Name != "execute" {
        return endpoint, nil
    }
    
    return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
        wasInterrupted, _, storedArgs := tool.GetInterruptState[string](ctx)
        
        if !wasInterrupted {
            return "", tool.StatefulInterrupt(ctx, &commontool.ApprovalInfo{
                ToolName:        tCtx.Name,
                ArgumentsInJSON: args,
            }, args)
        }
        
        isTarget, hasData, data := tool.GetResumeContext[*commontool.ApprovalResult](ctx)
        if isTarget && hasData {
            if data.Approved {
                return endpoint(ctx, storedArgs, opts...)
            }
            if data.DisapproveReason != nil {
                return fmt.Sprintf("tool '%s' disapproved: %s", tCtx.Name, *data.DisapproveReason), nil
            }
            return fmt.Sprintf("tool '%s' disapproved", tCtx.Name), nil
        }
        
        // Interrupt again.
        return "", tool.StatefulInterrupt(ctx, &commontool.ApprovalInfo{
            ToolName:        tCtx.Name,
            ArgumentsInJSON: storedArgs,
        }, storedArgs)
    }, nil
}

func (m *approvalMiddleware) WrapStreamableToolCall(
    _ context.Context,
    endpoint adk.StreamableToolCallEndpoint,
    tCtx *adk.ToolContext,
) (adk.StreamableToolCallEndpoint, error) {
    // If the agent configures StreamingShell, execute uses streaming; implement this method to intercept it.
    if tCtx.Name != "execute" {
        return endpoint, nil
    }
    return func(ctx context.Context, args string, opts ...tool.Option) (*schema.StreamReader[string], error) {
        wasInterrupted, _, storedArgs := tool.GetInterruptState[string](ctx)
        if !wasInterrupted {
            return nil, tool.StatefulInterrupt(ctx, &commontool.ApprovalInfo{
                ToolName:        tCtx.Name,
                ArgumentsInJSON: args,
            }, args)
        }

        isTarget, hasData, data := tool.GetResumeContext[*commontool.ApprovalResult](ctx)
        if isTarget && hasData {
            if data.Approved {
                return endpoint(ctx, storedArgs, opts...)
            }
            if data.DisapproveReason != nil {
                return singleChunkReader(fmt.Sprintf("tool '%s' disapproved: %s", tCtx.Name, *data.DisapproveReason)), nil
            }
            return singleChunkReader(fmt.Sprintf("tool '%s' disapproved", tCtx.Name)), nil
        }

        isTarget, _, _ = tool.GetResumeContext[any](ctx)
        if !isTarget {
            return nil, tool.StatefulInterrupt(ctx, &commontool.ApprovalInfo{
                ToolName:        tCtx.Name,
                ArgumentsInJSON: storedArgs,
            }, storedArgs)
        }

        return endpoint(ctx, storedArgs, opts...)
    }, nil
}
```

### CheckPointStore

`CheckPointStore` is the key component for interrupt/resume:

```go
type CheckPointStore interface {
    // Persist a checkpoint.
    Put(ctx context.Context, key string, checkpoint *Checkpoint) error
    
    // Load a checkpoint.
    Get(ctx context.Context, key string) (*Checkpoint, error)
}
```

**Why CheckPointStore?**

- persist state during interrupts: Tool args, execution position, etc.
- load state on resume: continue from the interruption point
- support cross-process recovery: resume after process restart

## Implementing Interrupt/Resume

### 1. Configure Runner with CheckPointStore

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
    CheckPointStore: adkstore.NewInMemoryStore(),  // in-memory store
})
```

### 2. Configure the Agent with ApprovalMiddleware

```go
agent, err := deep.New(ctx, &deep.Config{
    // ... other config
    Handlers: []adk.ChatModelAgentMiddleware{
        &approvalMiddleware{},  // add approval middleware
        &safeToolMiddleware{},  // convert Tool errors to strings (interrupt errors still propagate)
    },
})
```

### 3. Handle Interrupt Events

```go
checkPointID := sessionID

events := runner.Run(ctx, history, adk.WithCheckPointID(checkPointID))
content, interruptInfo, err := printAndCollectAssistantFromEvents(events)
if err != nil {
    return err
}

if interruptInfo != nil {
    // Tip: use the same stdin reader for both "user input" and "approval y/n",
    // to avoid treating the approval input as the next `you>` message.
    content, err = handleInterrupt(ctx, runner, checkPointID, interruptInfo, reader)
    if err != nil {
        return err
    }
}

_ = session.Append(schema.AssistantMessage(content, nil))
```

## Interrupt/Resume Execution Flow

```
┌─────────────────────────────────────────┐
│  user: run echo hello                    │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  agent analyzes intent │
        │  chooses execute        │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  ApprovalMiddleware   │
        │  intercepts Tool call │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  trigger Interrupt     │
        │  store state to Store  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  return Interrupt event│
        │  wait for approval     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  user inputs y/n       │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  runner.ResumeWith...  │
        │  resume execution      │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  execute execute       │
        │  or return rejection   │
        └──────────────────────┘
```

## Summary

- **Interrupt**: pauses before critical operations and waits for confirmation
- **Resume**: resumes execution after approval, or returns a rejection message
- **ApprovalMiddleware**: reusable approval middleware intercepting specific Tool calls
- **CheckPointStore**: persists interrupt state for cross-process recovery
- **Human-in-the-loop**: humans confirm critical decisions to improve safety

## Further Thoughts

**Other Interrupt scenarios:**

- multi-choice approval: user chooses one option
- parameter completion: user provides missing parameters
- conditional branching: user decides execution path

**Approval strategies:**

- whitelist: approve only sensitive operations
- blacklist: approve everything except safe operations
- dynamic rules: decide based on argument content
