---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent Cancel and TurnLoop Quickstart
weight: 10
---

A quickstart guide for two core features in Eino ADK: **Agent Cancel** and **TurnLoop**. Introduced in [v0.9.0-alpha.9](https://github.com/cloudwego/eino/releases/tag/v0.9.0-alpha.9).

## Type Conventions

All examples in this document use the following generic instantiations:

- `T = string` (business item type pushed to TurnLoop)
- `M = *schema.Message` (Agent message type, i.e., the standard `Message`)

ADK type aliases:

```go
type Agent         = TypedAgent[*schema.Message]
type AgentInput    = TypedAgentInput[*schema.Message]
type AgentEvent    = TypedAgentEvent[*schema.Message]
```

When using `*schema.AgenticMessage`, simply replace `M` with the corresponding type — all API signatures are fully symmetric.

---

## Part 1: Agent Cancel

### Scenario

After sending a request to an agent, the user wants to cancel the current execution due to long wait times or changed requirements.

### Core API

```go
// Create cancel option and cancel function
cancelOpt, cancelFunc := adk.WithCancel()

// Start the agent, passing in the cancel option
iter := runner.Run(ctx, []*schema.Message{schema.UserMessage("Hello")}, cancelOpt)

// Initiate cancellation (can be called from any goroutine)
handle, contributed := cancelFunc(adk.WithAgentCancelMode(adk.CancelImmediate))
// contributed == true: this call influenced the execution result
// contributed == false: agent already ended or cancellation already completed, this call had no effect

err := handle.Wait()
```

Three possible return values from `CancelHandle.Wait()`:

```go
switch {
case err == nil:
    // Cancellation succeeded
case errors.Is(err, adk.ErrCancelTimeout):
    // Safe point timed out, automatically escalated to immediate cancel
case errors.Is(err, adk.ErrExecutionEnded):
    // Agent finished naturally before cancellation took effect
}
```

### Three Cancellation Modes

<table>
<tr><td>Mode</td><td>Behavior</td><td>Use Case</td></tr>
<tr><td><pre>CancelImmediate</pre></td><td>Interrupt immediately, don't wait for safe points</td><td>Emergency stop, timeout fallback</td></tr>
<tr><td><pre>CancelAfterChatModel</pre></td><td>Cancel after the current ChatModel call completes</td><td>Need complete model response</td></tr>
<tr><td><pre>CancelAfterToolCalls</pre></td><td>Cancel after all current ToolCalls complete</td><td>Ensure tool side effects complete</td></tr>
</table>

> 💡
> `CancelMode` is a bitmask and can be combined: `CancelAfterChatModel | CancelAfterToolCalls` is equivalent to "cancel at whichever safe point is reached first."

### Safe Point Cancellation

```go
// Cancel after ChatModel completes, with 5-second timeout protection
handle, _ := cancelFunc(
    adk.WithAgentCancelMode(adk.CancelAfterChatModel),
    adk.WithAgentCancelTimeout(5*time.Second),
)
```

> 💡
> Always pair safe point mode with `WithAgentCancelTimeout`. If the agent never reaches a safe point, it will automatically escalate to immediate cancel after timeout.

### Recursive Cancellation

By default, cancellation only affects the root agent. Use `WithRecursive()` to propagate cancellation to nested sub-agents within AgentTools:

```go
handle, _ := cancelFunc(
    adk.WithAgentCancelMode(adk.CancelAfterChatModel),
    adk.WithRecursive(),
)
```

### Identifying Cancellation on the Consumer Side

```go
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    if event.Err != nil {
        var cancelErr *adk.CancelError
        if errors.As(event.Err, &cancelErr) {
            log.Printf("Agent cancelled (mode=%v, escalated=%v)",
                cancelErr.Info.Mode, cancelErr.Info.Escalated)
        }
        break
    }
    // Process normal events...
}
```

---

## Part 2: TurnLoop

### Scenario

Build a continuously running agent service: users send messages at any time, the agent processes them in turns; urgent messages can preempt the current execution.

### Turn Lifecycle

<a href="/img/eino/XrWqwC669hGGoibW1q3c2ToTnvf.png" target="_blank"><img src="/img/eino/XrWqwC669hGGoibW1q3c2ToTnvf.png" width="100%" /></a>

### Basic Usage

```go
loop := adk.NewTurnLoop(adk.TurnLoopConfig[string, *schema.Message]{
    // GenInput: receive all buffered items and decide which to consume this turn
    GenInput: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], items []string) (*adk.GenInputResult[string, *schema.Message], error) {
        return &adk.GenInputResult[string, *schema.Message]{
            Input:    &adk.AgentInput{Messages: []*schema.Message{schema.UserMessage(strings.Join(items, "\n"))}},
            Consumed: items,
        }, nil
    },

    // PrepareAgent: build the Agent based on consumed items for this turn
    PrepareAgent: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], consumed []string) (adk.Agent, error) {
        return myAgent, nil
    },

    // OnAgentEvents: process the agent event stream (optional)
    OnAgentEvents: func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message], events *adk.AsyncIterator[*adk.AgentEvent]) error {
        for {
            event, ok := events.Next()
            if !ok {
                break
            }
            if event.Err != nil {
                return event.Err
            }
            log.Printf("Received event: agent=%s", event.AgentName)
        }
        return nil
    },
})

loop.Push("Message 1")
loop.Push("Message 2")
loop.Run(ctx)         // Non-blocking, starts background processing
loop.Push("Message 3") // Can still push while running
loop.Stop()
result := loop.Wait() // Blocks until exit
```

### Core Callbacks

<table>
<tr><td>Callback</td><td>Required</td><td>Responsibility</td></tr>
<tr><td><pre>GenInput</pre></td><td>✅</td><td>Receive all buffered items, return <pre>Consumed</pre> (for this turn) and <pre>Remaining</pre> (for subsequent turns). <strong>Items not in either are discarded.</strong></td></tr>
<tr><td><pre>PrepareAgent</pre></td><td>✅</td><td>Build the Agent based on Consumed items (set prompt, tools, middleware, etc.)</td></tr>
<tr><td><pre>OnAgentEvents</pre></td><td>❌</td><td>Process the agent event stream. When not set, events are drained by default and the first error is returned</td></tr>
<tr><td><pre>GenResume</pre></td><td>❌</td><td>Called when resuming from a checkpoint, decides how to merge interrupted/unhandled/new items</td></tr>
</table>

> 💡
> In `OnAgentEvents`, **do not propagate CancelError** — the framework handles it automatically. `CancelError` from Stop propagates as `ExitReason`; `CancelError` from Preempt is swallowed by the framework, and the loop continues to the next turn. The callback should only return a non-nil error when it encounters a fatal error of its own.

### Preemption

```go
// Push an urgent message, cancel the current agent at a safe point
accepted, ack := loop.Push("Urgent message!", adk.WithPreempt[string, *schema.Message](adk.AnySafePoint))

if accepted {
    <-ack // Wait for the preemption signal to be submitted (current turn is guaranteed to be cancelled)
}
```

Preemption is an atomic operation — "push new message" and "cancel current agent" execute as a whole:

1. The urgent message enters the buffer
2. The current agent is cancelled at a safe point
3. TurnLoop automatically starts a new turn
4. `GenInput` receives all buffered items (including the urgent message) and re-decides

> 💡
> `WithPreempt` always uses safe point cancellation and **does not automatically set WithRecursive**. However, `WithPreemptTimeout` automatically enables `WithRecursive` — when the timeout escalates to immediate cancel, nested sub-agents are also terminated.

### Preemption with Timeout / Delay

```go
// Safe point wait, escalate to immediate cancel after 5 seconds (automatically recursive)
loop.Push("Urgent", adk.WithPreemptTimeout[string, *schema.Message](adk.AnySafePoint, 5*time.Second))

// 2-second grace period before initiating preemption
loop.Push("New message",
    adk.WithPreempt[string, *schema.Message](adk.AnySafePoint),
    adk.WithPreemptDelay[string, *schema.Message](2*time.Second),
)
```

### Conditional Preemption: WithPushStrategy

When the preemption decision depends on the current turn state, use `WithPushStrategy` to avoid TOCTOU races:

```go
loop.Push(urgentItem, adk.WithPushStrategy(
    func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message]) []adk.PushOption[string, *schema.Message] {
        if tc == nil {
            return nil // No active turn, no need to preempt
        }
        if isLowPriority(tc.Consumed) {
            return []adk.PushOption[string, *schema.Message]{
                adk.WithPreempt[string, *schema.Message](adk.AnySafePoint),
            }
        }
        return nil // Current task is high priority, don't preempt
    },
))
```

### Sensing Preemption and Stop in OnAgentEvents

`TurnContext` provides `Preempted` and `Stopped` signal channels:

```go
OnAgentEvents: func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message], events *adk.AsyncIterator[*adk.AgentEvent]) error {
    for {
        event, ok := events.Next()
        if !ok {
            break
        }

        select {
        case <-tc.Preempted:
            log.Println("Current turn preempted, wrapping up...")
        case <-tc.Stopped:
            log.Printf("Loop is stopping, reason: %s", tc.StopCause())
        default:
        }

        if event.Err != nil {
            return event.Err
        }
        // Process events...
    }
    return nil
},
```

> 💡
> `Preempted` / `Stopped` are only closed when the corresponding cancel call actually "contributes" to the current turn's `CancelError`. If the cancellation has already been finalized by another signal, the channel remains open.

### Stopping TurnLoop

```go
// Wait for the current turn to complete, then exit (ExitReason is nil)
loop.Stop()

// Immediately abort the current agent (recursively propagates to nested agents)
loop.Stop(adk.WithImmediate())

// Safe point stop (recursively propagates, no timeout)
loop.Stop(adk.WithGraceful())

// Safe point stop with timeout (escalates to immediate cancel after timeout)
loop.Stop(adk.WithGracefulTimeout(10 * time.Second))

// Auto-shutdown after idle (stop after 30 seconds of continuous idleness)
loop.Stop(adk.UntilIdleFor(30 * time.Second))
```

> 💡
> You can call `Stop()` multiple times to upgrade the cancellation strategy. Typical pattern: first `WithGraceful()`, then `WithImmediate()` after timeout.

### Attaching a Stop Cause

```go
loop.Stop(
    adk.WithGraceful(),
    adk.WithStopCause("quota exceeded"),
)
result := loop.Wait()
log.Printf("Stop cause: %s", result.StopCause)
```

---

## Part 3: Declarative Checkpoint Recovery

### Scenario

After an Agent is cancelled or interrupted, the next startup automatically resumes from the breakpoint rather than starting over. TurnLoop automatically manages input bookkeeping; the application layer only needs to declare how interrupted/unhandled/new items re-enter subsequent turns.

### Configuring Checkpoint

Enable by setting both `Store` and `CheckpointID` in `TurnLoopConfig`:

```go
store := NewMyCheckpointStore() // Implements the CheckPointStore interface

cfg := adk.TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], items []string) (*adk.GenInputResult[string, *schema.Message], error) {
        return &adk.GenInputResult[string, *schema.Message]{
            Input:    &adk.AgentInput{Messages: []*schema.Message{schema.UserMessage(items[0])}},
            Consumed: items[:1],
            Remaining: items[1:],
        }, nil
    },

    PrepareAgent: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], consumed []string) (adk.Agent, error) {
        return myAgent, nil
    },

    // GenResume: called when resuming from a checkpoint
    GenResume: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], interruptedItems, unhandledItems, newItems []string) (*adk.GenResumeResult[string, *schema.Message], error) {
        all := append(append(interruptedItems, unhandledItems...), newItems...)
        return &adk.GenResumeResult[string, *schema.Message]{
            Consumed:  all[:1],
            Remaining: all[1:],
        }, nil
    },

    Store:        store,
    CheckpointID: "session-123",
}
```

### Recovery Flow

`Run()` automatically queries the Store on startup:

<table>
<tr><td>Checkpoint State</td><td>Behavior</td></tr>
<tr><td>Mid-turn checkpoint exists (agent was interrupted during execution)</td><td>Calls <pre>GenResume</pre>, passes interrupted/unhandled/new items to the application layer for decision before resuming</td></tr>
<tr><td>Between-turns checkpoint exists (stopped between turns)</td><td>Adds buffered items to the buffer and processes them normally through <pre>GenInput</pre></td></tr>
<tr><td>No checkpoint exists</td><td>Starts from scratch</td></tr>
</table>

```go
// First run
loop := adk.NewTurnLoop(cfg)
loop.Push("Message 1")
loop.Run(ctx)
loop.Stop(adk.WithGraceful())
exit := loop.Wait()
log.Printf("Checkpoint attempted: %v, err: %v", exit.CheckpointAttempted, exit.CheckpointErr)

// Second run (same cfg with same CheckpointID)
loop2 := adk.NewTurnLoop(cfg)
loop2.Push("New message") // Passed as newItems to GenResume
loop2.Run(ctx)            // Automatically detects checkpoint and resumes
result := loop2.Wait()
```

### Skipping Checkpoint

```go
loop.Stop(adk.WithSkipCheckpoint()) // Don't save checkpoint on this exit
```

### Implementing CheckPointStore

```go
type CheckPointStore interface {
    Get(ctx context.Context, checkPointID string) ([]byte, bool, error)
    Set(ctx context.Context, checkPointID string, checkPoint []byte) error
}
```

Optionally implement `CheckPointDeleter` to support explicit deletion of expired checkpoints:

```go
type CheckPointDeleter interface {
    Delete(ctx context.Context, checkPointID string) error
}
```

On normal exit (when no new checkpoint is saved), TurnLoop attempts to delete the previously loaded checkpoint to prevent stale recovery. **Only Stores that implement CheckPointDeleter will perform the deletion**; otherwise, the Store manages the lifecycle itself.

> 💡
> When using `Store`, the generic parameter `T` must support `encoding/gob` encode/decode — TurnLoop uses gob to persist runner checkpoints and item bookkeeping information.

---

## Part 4: Complete Example

Simulates a chat service with priority scheduling, preemption, and checkpoint recovery:

```go
package main

import (
    "context"
    "log"
    "strings"
    "time"

    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()
    store := adk.NewInMemoryStore()

    cfg := adk.TurnLoopConfig[string, *schema.Message]{
        GenInput: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], items []string) (*adk.GenInputResult[string, *schema.Message], error) {
            // Sort by priority, consume only the first item, leave the rest for subsequent turns
            sorted := sortByPriority(items)
            return &adk.GenInputResult[string, *schema.Message]{
                Input:     &adk.AgentInput{Messages: []*schema.Message{schema.UserMessage(sorted[0])}},
                Consumed:  sorted[:1],
                Remaining: sorted[1:], // Items not in Consumed or Remaining are discarded
            }, nil
        },

        GenResume: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], interruptedItems, unhandledItems, newItems []string) (*adk.GenResumeResult[string, *schema.Message], error) {
            all := append(append(interruptedItems, unhandledItems...), newItems...)
            return &adk.GenResumeResult[string, *schema.Message]{
                Consumed:  all[:1],
                Remaining: all[1:],
            }, nil
        },

        PrepareAgent: func(ctx context.Context, loop *adk.TurnLoop[string, *schema.Message], consumed []string) (adk.Agent, error) {
            return buildAgent(consumed), nil
        },

        OnAgentEvents: func(ctx context.Context, tc *adk.TurnContext[string, *schema.Message], events *adk.AsyncIterator[*adk.AgentEvent]) error {
            for {
                event, ok := events.Next()
                if !ok {
                    break
                }
                // Sense preemption/stop signals for cleanup
                select {
                case <-tc.Preempted:
                    log.Println("Preempted by a higher priority message")
                case <-tc.Stopped:
                    log.Printf("Service shutting down: %s", tc.StopCause())
                default:
                }
                if event.Err != nil {
                    // Don't propagate CancelError, the framework handles it automatically
                    return event.Err
                }
                log.Printf("[%s] %s", event.AgentName, extractText(event))
            }
            return nil
        },

        Store:        store,
        CheckpointID: "chat-session-001",
    }

    loop := adk.NewTurnLoop(cfg)
    loop.Push("Hello, can you check the weather for me")
    loop.Run(ctx)

    // Send an urgent message to preempt after 1 second
    time.AfterFunc(1*time.Second, func() {
        loop.Push("Stop! Handle this urgent issue first",
            adk.WithPreempt[string, *schema.Message](adk.AnySafePoint),
        )
    })

    // Graceful shutdown after 5 seconds
    time.AfterFunc(5*time.Second, func() {
        loop.Stop(
            adk.WithGracefulTimeout(3*time.Second),
            adk.WithStopCause("service shutdown"),
        )
    })

    result := loop.Wait()
    log.Printf("Exit reason: %v", result.ExitReason)
    log.Printf("Unhandled messages: %v", result.UnhandledItems)
    log.Printf("Stop cause: %s", result.StopCause)
    log.Printf("Checkpoint: attempted=%v, err=%v", result.CheckpointAttempted, result.CheckpointErr)

    // Next startup with the same cfg will automatically resume from checkpoint
}
```

---

## FAQ

### Q: Can safe point cancellation end up waiting forever for a safe point?

Yes. If the agent is stuck in a long-running tool or model call, the safe point may take a long time to reach. **Always use WithAgentCancelTimeout**, which automatically escalates to `CancelImmediate` after timeout.

### Q: When is `WithRecursive` needed?

By default, cancellation only affects the root agent. It's only needed when the agent hierarchy contains sub-agents nested within AgentTools, and you want the sub-agents to respond to cancellation at safe points too. When in doubt, don't add it.

### Q: What are the requirements for the generic parameter T?

When `Store` is configured, `T` must be encodable/decodable by `encoding/gob`. Primitive types (`string`, `int`, etc.) and structs with all exported fields are supported by default. If `T` contains interface fields, you need to register the concrete types via `gob.Register`.

### Q: What happens when `Push` is called after the loop has stopped?

`Push` returns `(false, closedCh)`. These "late items" are not included in the checkpoint and can be recovered via `result.TakeLateItems()` after `Wait()` returns. Once `TakeLateItems()` is called, subsequent `Push` calls will panic to prevent silent data loss.

### Q: What happens when `Stop()` is called multiple times?

It's safe — each call can upgrade the cancellation strategy. Typical pattern:

```go
loop.Stop(adk.WithGraceful())           // Try graceful stop first
time.AfterFunc(3*time.Second, func() {
    loop.Stop(adk.WithImmediate())       // Escalate to immediate cancel after 3 seconds
})
```

### Q: What happens to items in `GenInput` that are neither in Consumed nor in Remaining?

They are discarded. This is by design — it allows `GenInput` to filter out items that are not needed during decision-making.
