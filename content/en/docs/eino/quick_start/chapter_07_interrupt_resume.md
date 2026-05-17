---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 7: Interrupt/Resume (Interrupt and Resume)"
weight: 7
---

Goal of this chapter: understand the Interrupt/Resume mechanism and implement a Tool approval flow, allowing users to confirm before sensitive operations.

## Code Location

- Entry code: [cmd/ch07/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch07/main.go)

## Prerequisites

Same as Chapter 1: you need a configured ChatModel (OpenAI or Ark). Also, like Chapter 4, you need to set `PROJECT_ROOT`:

```bash
export PROJECT_ROOT=/path/to/eino  # Eino core library root directory (defaults to current directory if not set)
```

## Running

In the `examples/quickstart/chatwitheino` directory, run:

```bash
# Set project root directory
export PROJECT_ROOT=/path/to/your/project

go run ./cmd/ch07
```

Output example:

```
you> Please execute the command echo hello

⚠️  Approval Required ⚠️
Tool: execute
Arguments: {"command":"echo hello"}

Approve this action? (y/n): y
[tool result] hello

hello
```

## From Automatic Execution to Human Approval: Why Interrupt Is Needed

The Agent we implemented in previous chapters automatically executes all Tool calls, but in certain scenarios this is dangerous:

**Risks of automatic execution:**

- Deleting files: accidentally removing important data
- Sending emails: sending incorrect content
- Executing commands: running dangerous operations
- Modifying configuration: breaking system settings

**The role of Interrupt:**

- **Interrupt is the Agent's pause mechanism**: pauses before critical operations, waiting for user confirmation
- **Interrupt can carry information**: shows the user what operation is about to be executed
- **Interrupt supports resumption**: continues execution after user approval, or returns an error on rejection

**Simple analogy:**

- **Automatic execution** = "autopilot" (fully trusting the system)
- **Interrupt** = "manual override" (critical decisions made by humans)

## Key Concepts

### Interrupt Mechanism

`Interrupt` is the core mechanism for implementing human-machine collaboration in Eino.

**Core idea: pause before executing critical operations, and continue after user confirmation.**

A Tool requiring approval is executed in **two phases**:

1. **First call (triggers interrupt)**: The Tool saves the current arguments, then returns an interrupt signal. The Runner pauses execution and returns an Interrupt event to the caller.
2. **Resume after user approval**: The Runner re-invokes the Tool. This time the Tool detects it has been "interrupted before" and directly reads the user's approval result to execute (or reject).

**Simplified pseudocode:**

```
func myTool(ctx, args):
    if first call:
        save args
        return interrupt signal  // Runner pauses, shows approval prompt
    else:  // Second call after Resume
        if user approved:
            return execute_operation(saved args)
        else:
            return "Operation rejected by user"
```

**Complete code with key field explanations:**

```go
// Trigger interrupt in a Tool
func myTool(ctx context.Context, args string) (string, error) {
    // wasInterrupted: whether this is the second call after Resume (false on first call, true after Resume)
    // storedArgs: arguments saved via StatefulInterrupt on first call, retrievable after Resume
    wasInterrupted, _, storedArgs := tool.GetInterruptState[string](ctx)

    if !wasInterrupted {
        // First call: trigger interrupt and save args for use after Resume
        return "", tool.StatefulInterrupt(ctx, &ApprovalInfo{
            ToolName:        "my_tool",
            ArgumentsInJSON: args,
        }, args)  // Third argument is the state to save (retrievable via storedArgs after Resume)
    }

    // Second call after Resume: read user's approval result
    // isTarget: whether this Resume targets the current Tool (each Resume targets only one Tool)
    // hasData:  whether the Resume carries approval result data
    // data:     the user's approval result
    isTarget, hasData, data := tool.GetResumeContext[*ApprovalResult](ctx)
    if isTarget && hasData {
        if data.Approved {
            return doSomething(storedArgs)  // Execute actual operation using saved arguments
        }
        return "Operation rejected by user", nil
    }

    // Other cases (isTarget=false means this Resume does not target the current Tool): re-interrupt
    return "", tool.StatefulInterrupt(ctx, &ApprovalInfo{
        ToolName:        "my_tool",
        ArgumentsInJSON: storedArgs,
    }, storedArgs)
}
```

### ApprovalMiddleware

`ApprovalMiddleware` is a generic approval middleware that can intercept specific Tool calls:

```go
type approvalMiddleware struct {
    *adk.BaseChatModelAgentMiddleware
}

func (m *approvalMiddleware) WrapInvokableToolCall(
    _ context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    tCtx *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    // Only intercept Tools that require approval
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
        
        isTarget, _, _ = tool.GetResumeContext[any](ctx)
        if !isTarget {
            return "", tool.StatefulInterrupt(ctx, &commontool.ApprovalInfo{
                ToolName:        tCtx.Name,
                ArgumentsInJSON: storedArgs,
            }, storedArgs)
        }

        return endpoint(ctx, storedArgs, opts...)
    }, nil
}

func (m *approvalMiddleware) WrapStreamableToolCall(
    _ context.Context,
    endpoint adk.StreamableToolCallEndpoint,
    tCtx *adk.ToolContext,
) (adk.StreamableToolCallEndpoint, error) {
    // If the agent is configured with StreamingShell, execute will use streaming calls, so this method must be implemented to intercept it
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

`CheckPointStore` is a key component for implementing interrupt and resume:

```go
type CheckPointStore interface {
    // Save checkpoint
    Put(ctx context.Context, key string, checkpoint *Checkpoint) error
    
    // Get checkpoint
    Get(ctx context.Context, key string) (*Checkpoint, error)
}
```

**Why is CheckPointStore needed?**

- Saves state on interrupt: Tool arguments, execution position, etc.
- Loads state on resume: continues execution from the interrupt point
- Supports cross-process recovery: can resume even after process restart

## Interrupt/Resume Implementation

### 1. Configuring the Runner with CheckPointStore

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent:           agent,
    EnableStreaming: true,
    CheckPointStore: adkstore.NewInMemoryStore(),  // In-memory storage
})
```

### 2. Configuring the Agent with ApprovalMiddleware

```go
agent, err := deep.New(ctx, &deep.Config{
    // ... other configuration
    Handlers: []adk.ChatModelAgentMiddleware{
        &approvalMiddleware{},  // Add approval middleware
        &safeToolMiddleware{},  // Convert Tool errors to strings (interrupt errors continue to propagate upward)
    },
})
```

### 3. Handling Interrupt Events

```go
checkPointID := sessionID

events := runner.Run(ctx, history, adk.WithCheckPointID(checkPointID))
content, interruptInfo, err := printAndCollectAssistantFromEvents(events)
if err != nil {
    return err
}

if interruptInfo != nil {
    // Note: it's recommended to use the same stdin reader for both "user input" and "approval y/n"
    // to avoid approval input being treated as the next you> message
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
│  User: Execute command echo hello       │
└─────────────────────────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Agent analyzes      │
        │  intent              │
        │  Decides to call     │
        │  execute             │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  ApprovalMiddleware  │
        │  Intercepts Tool     │
        │  call                │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Triggers Interrupt  │
        │  Saves state to      │
        │  Store               │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Returns Interrupt   │
        │  event               │
        │  Waits for user      │
        │  approval            │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  User inputs y/n     │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  runner.ResumeWith...│
        │  Resumes execution   │
        └──────────────────────┘
                   ↓
        ┌──────────────────────┐
        │  Executes execute    │
        │  Or returns          │
        │  rejection message   │
        └──────────────────────┘
```

## Chapter Summary

- **Interrupt**: the Agent's pause mechanism, pausing before critical operations to wait for confirmation
- **Resume**: resumes execution — continues after user approval or returns an error on rejection
- **ApprovalMiddleware**: a generic approval middleware that intercepts specific Tool calls
- **CheckPointStore**: saves interrupt state, supports cross-process recovery
- **Human-machine collaboration**: critical decisions confirmed by humans, improving safety

## Further Reading

**Other Interrupt scenarios:**

- Multi-option approval: user selects one of multiple options
- Parameter completion: user provides missing parameters
- Conditional branching: user decides the execution path

**Approval strategies:**

- Whitelist: only require approval for sensitive operations
- Blacklist: require approval for all operations except safe ones
- Dynamic rules: decide whether to require approval based on argument content
