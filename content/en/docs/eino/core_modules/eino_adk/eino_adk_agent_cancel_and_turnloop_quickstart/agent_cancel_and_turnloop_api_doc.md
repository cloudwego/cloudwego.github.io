---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Agent Cancel and TurnLoop API Documentation
weight: 1
---

# Agent Cancel and TurnLoop API Documentation

## Overview

This document describes the core advanced features in Eino ADK (Agent Development Kit):

1. **Agent Cancel**: Mechanisms for gracefully or immediately canceling a running agent
2. **TurnLoop**: A push-based event loop for managing agent execution cycles (depends on the Agent Cancel feature)

---

## Agent Cancel API

### Overview

The Agent Cancel feature provides fine-grained control over running agents. It supports both immediate cancellation and safe-point cancellation (waiting for specific execution points, such as after a chat model call or after tool calls). By default, the cancel mode only affects the root agent; child agents nested within AgentTools will not receive cancel notifications. Use `WithRecursive()` to propagate cancellation to the entire agent hierarchy (including nested child agents within AgentTools), triggering cancellation when any safe point is reached first anywhere in the hierarchy.

**Checkpoint Guarantee**: Regardless of which `CancelMode` is used, cancellation saves a checkpoint at the Runner level. After cancellation, execution can be resumed via `Runner.Resume` or `Runner.ResumeWithParams`. When using `WithRecursive`, child agents also attempt to trigger cancellation and cascade their interrupt information upward, ultimately generating a complete checkpoint at the root agent level that includes child agent checkpoints, enabling resumption from the child agent's interruption point.

### Core Types

#### `CancelMode`

Specifies when the agent should be canceled. Modes can be combined using bitwise OR.

```go
type CancelMode int

const (
    // CancelImmediate cancels the agent immediately without waiting for ChatModel or ToolCalls safe points.
    // By default, only the root agent is interrupted; child agents within AgentTools are cleaned up
    // as a side effect via context cancellation.
    // Use WithRecursive to propagate an explicit immediate-cancel signal to child agents
    // for clean teardown (with grace period).
    CancelImmediate CancelMode = 0

    // CancelAfterChatModel cancels after the root agent's next chat model call completes.
    // By default, only the root agent checks this safe point; nested child agents within AgentTools are unaware of cancellation.
    // Use WithRecursive to propagate cancellation to all child agents — whichever ChatModel completes first triggers cancellation.
    // Note: This safe point is only checked when the model returns tool calls — because tool calls
    // imply subsequent execution (call tool → call model again → ...), making cancellation meaningful.
    // If the model directly produces a final answer (no tool calls), execution flows to completion without passing through this checkpoint.
    CancelAfterChatModel CancelMode = 1 << iota

    // CancelAfterToolCalls cancels after the root agent's next round of tool calls all complete.
    // By default, only the root agent checks this safe point. Use WithRecursive to propagate to all child agents.
    CancelAfterToolCalls
)
```

#### `CancelHandle`

A handle used to wait for cancellation to complete.

```go
type CancelHandle struct{ /* unexported fields */ }

func (h *CancelHandle) Wait() error
```

**Wait Return Value:**

- `error`:
  - `nil`: Cancellation succeeded (see the interrupt absorption mechanism in CancelError)
  - `ErrCancelTimeout`: Safe-point cancellation timed out, automatically escalated to immediate cancellation (the cancellation itself still succeeded)
  - `ErrExecutionEnded`: The agent finished (completed normally or errored) before cancellation took effect — there was no execution to cancel

#### `AgentCancelFunc`

A function type used to cancel a running agent.

```go
type AgentCancelFunc func(...AgentCancelOption) (*CancelHandle, bool)
```

**Return Values:**

- `CancelHandle`:
  - Returned when the cancel request has been submitted
  - Use `Wait()` to wait for cancellation to complete and get the result
- `bool`:
  - Indicates whether this call "contributed" to the current execution's `CancelError`
  - `true`: This call's cancel options were incorporated before the `CancelError` was finalized
  - `false`: Cancellation was already finalized (e.g., already handled or execution already ended) — this call will not affect the `CancelError`
  - TurnLoop uses this return value to provide strict semantics for `TurnContext.Preempted` / `TurnContext.Stopped`

#### `AgentCancelOption`

An opaque option type for configuring a single agent cancel request. Users typically do not implement this type themselves; instead, use `WithAgentCancelMode`, `WithAgentCancelTimeout`, and `WithRecursive` to create options.

```go
type AgentCancelOption func(*agentCancelConfig)
```

#### `AgentCancelInfo`

Information about a cancel operation.

```go
type AgentCancelInfo struct {
    Mode      CancelMode  // The cancel mode used
    Escalated bool        // Whether it was escalated to immediate cancellation
    Timeout   bool        // Whether a timeout occurred
}
```

#### `CancelError`

The error sent via `AgentEvent.Err` when an agent is canceled. Extract it using `errors.As`.

**Interrupt Absorption Mechanism**: When cancellation is active, **any** interrupt — whether produced by a cancel safe-point node or by business logic (such as `tool.Interrupt` in a tool) — is converted to a `CancelError`. Cancellation "absorbs" business interrupts. This is intentional:

- In concurrent execution (parallel workflows, concurrent tool calls), cancel-triggered interrupts and business interrupts may arrive as a single composite signal and cannot be separated.
- Even in sequential execution, treating business interrupts as CancelError during active cancellation provides consistent semantics — the caller only needs to handle one signal type, `CancelError`, without distinguishing between "cancel-triggered interrupts" and "business interrupts that happened to fire during cancellation."
- Business interrupts **are not lost** — the checkpoint preserves the complete interrupt hierarchy. When resuming execution (`Runner.Resume`), the agent re-executes the interrupted code path, and business interrupts naturally re-trigger.

```go
type CancelError struct {
    Info              *AgentCancelInfo

    InterruptContexts []*InterruptCtx  // Contexts for targeted resumption (can be used with ResumeWithParams)
}
```

### Functions

#### `WithCancel`

Creates an `AgentRunOption` that enables cancellation. Returns the option and a cancel function.

```go
func WithCancel() (AgentRunOption, AgentCancelFunc)
```

**Return Values:**

- `AgentRunOption`: Option to pass to `Run()` or `Resume()`
- `AgentCancelFunc`: Function used to cancel

**Example:**

```go
cancelOpt, cancelFunc := WithCancel()
iter := runner.Run(ctx, messages, cancelOpt)

// Later, cancel the agent
handle, contributed := cancelFunc(WithAgentCancelMode(CancelAfterChatModel))
if contributed {
    // This call's cancel options took effect
    switch err := handle.Wait(); {
    case err == nil:
        // Cancellation succeeded
    case errors.Is(err, ErrExecutionEnded):
        // Agent finished before cancellation took effect
    case errors.Is(err, ErrCancelTimeout):
        // Safe-point cancellation timed out, automatically escalated to immediate cancellation
    }
}
```

### Options

#### `WithAgentCancelMode`

Sets the cancel mode for an agent cancel operation.

```go
func WithAgentCancelMode(mode CancelMode) AgentCancelOption
```

**Parameters:**

- `mode CancelMode`: The cancel mode to use

**Example:**

```go
handle, _ := cancelFunc(WithAgentCancelMode(CancelAfterToolCalls))
_ = handle.Wait()
```

#### `WithAgentCancelTimeout`

Sets the timeout for a cancel operation. Only applies to safe-point modes.

```go
func WithAgentCancelTimeout(timeout time.Duration) AgentCancelOption
```

**Parameters:**

- `timeout time.Duration`: Timeout duration

**Behavior:**

- Only takes effect for `CancelAfterChatModel` / `CancelAfterToolCalls`; if the safe point is not reached within the timeout, it automatically escalates to `CancelImmediate`. After escalation, a checkpoint is still saved and can be resumed via `Runner.Resume`
- `timeout <= 0` does not set an effective deadline, so timeout escalation will not be triggered
- When timeout escalation occurs, `CancelHandle.Wait()` returns `ErrCancelTimeout`, and `CancelError.Info.Timeout=true` and `CancelError.Info.Escalated=true`

**Example:**

```go
handle, _ := cancelFunc(
    WithAgentCancelMode(CancelAfterChatModel),
    WithAgentCancelTimeout(5*time.Second),
)
_ = handle.Wait()
```

#### `WithRecursive`

Enables recursive cancel propagation. By default, the cancel mode only affects the root agent; child agents within AgentTools will not receive cancel notifications. `WithRecursive` propagates cancellation to all child agents:

- **CancelAfterChatModel / CancelAfterToolCalls**: Child agents check their own safe points — whichever is reached first triggers cancellation.
- **CancelImmediate**: Child agents receive explicit immediate-cancel signals for clean teardown; the root agent uses a grace period to collect child agent interrupts.

When `WithRecursive` is enabled, not only the root agent saves a checkpoint, but child agents within running AgentTools also save their own checkpoints. When resuming, execution can continue from the child agent's interruption point without re-executing from the root agent.

Once any cancel call includes `WithRecursive`, the flag remains effective throughout the entire cancel lifecycle (monotonic escalation).

```go
func WithRecursive() AgentCancelOption
```

**Example:**

```go
// Propagate cancellation to nested child agents
handle, _ := cancelFunc(
    WithAgentCancelMode(CancelAfterChatModel),
    WithRecursive(),
)
_ = handle.Wait()

// Escalation: first cancel non-recursively, then add recursive in a subsequent call
handle1, _ := cancelFunc(WithAgentCancelMode(CancelAfterChatModel))
handle2, _ := cancelFunc(WithRecursive()) // Escalate to recursive — all child agents now begin checking safe points
```

### Sentinel Errors

#### `ErrCancelTimeout`

Returned by `CancelHandle.Wait` when a cancel operation times out.

```go
var ErrCancelTimeout = errors.New("cancel timed out")
```

#### `ErrExecutionEnded`

Returned by `CancelHandle.Wait` when the agent finished (completed normally or errored) before cancellation took effect.

Note: Business interrupts that occur while cancellation is active are absorbed as `CancelError` (see CancelError documentation), so they result in `nil` (cancellation succeeded), **not** `ErrExecutionEnded`. This error is only returned when execution has completely ended without any interrupts occurring.

```go
var ErrExecutionEnded = errors.New("execution already ended")
```

#### `ErrStreamCanceled`

When `CancelImmediate` triggers while streaming output is in progress, the framework immediately aborts the underlying stream and returns `ErrStreamCanceled` in the `.Recv()` of `AgentEvent.Output.MessageOutput.MessageStream`. This applies equally to ChatModel streaming responses and StreamableTool streaming output — both streams are exposed to users through `AgentEvent.Output.MessageOutput.MessageStream`, and the cancel monitoring mechanism is fully symmetric.

**When it appears**: Only during `CancelImmediate` (including automatic escalation after safe-point cancel timeout) when a ChatModel or StreamableTool is actively streaming output. Safe-point cancellation (`CancelAfterChatModel` / `CancelAfterToolCalls`) does not produce this error, as they wait until the safe point before interrupting.

**Where it appears**: `ErrStreamCanceled` appears in `AgentEvent.Output.MessageOutput.MessageStream.Recv()`, not in `AgentEvent.Err`. The Runner then emits a separate event with `AgentEvent.Err` as `*CancelError`, indicating cancellation is complete. Note that this event does not contain `AgentEvent.Action.Interrupted` — `Action.Interrupted` is reserved for business interrupts only, while cancellation is always conveyed through `CancelError`.

```go
var ErrStreamCanceled error = &StreamCanceledError{}
```

#### `StreamCanceledError`

The concrete error type for `ErrStreamCanceled`. This type is exported to allow stream cancellation errors to be serialized via gob during checkpoint saving; business code typically uses `errors.Is(err, ErrStreamCanceled)` for checking.

```go
type StreamCanceledError struct{}

func (e *StreamCanceledError) Error() string
```

```go
// Handling ErrStreamCanceled in streaming events
for {
    event, ok := events.Next()
    if !ok {
        break
    }

    if event.Output != nil && event.Output.MessageOutput != nil && event.Output.MessageOutput.IsStreaming {
        stream := event.Output.MessageOutput.MessageStream
        for {
            chunk, err := stream.Recv()
            if err != nil {
                if errors.Is(err, ErrStreamCanceled) {
                    // Stream was immediately aborted by cancellation (ChatModel or StreamableTool) — a CancelError will follow in a subsequent event
                    break
                }
                if err == io.EOF {
                    break
                }
            }
            // Process chunk...
            _ = chunk
        }
    }

    if event.Err != nil {
        var cancelErr *CancelError
        if errors.As(event.Err, &cancelErr) {
            // Cancellation complete — CancelError contains cancel mode, interrupt contexts, etc.
            break
        }
    }
}
```

## TurnLoop API

### Overview

`TurnLoop` is a push-based event loop that manages agent execution in units of turns. Users push data items into TurnLoop's buffer, and TurnLoop processes them through a configured agent. This design enables flexible, event-driven agent workflows.

**Note**: Some TurnLoop features (such as preemption and stopping) depend on the Agent Cancel feature.

### Core Types

#### `TurnLoop[T, M]`

The main event loop instance. Created via `NewTurnLoop()`, then started by calling `Run()`.

```go
type TurnLoop[T any, M MessageType] struct { ... }
```

#### `MessageType`

Constrains the message types usable by ADK. Currently only `*schema.Message` and `*schema.AgenticMessage` are supported; external packages cannot extend this union type.

```go
type MessageType interface {
    *schema.Message | *schema.AgenticMessage
}
```

#### `TypedAgent[M]`

The agent interface that TurnLoop actually runs each turn.

```go
type TypedAgent[M MessageType] interface {
    Name(ctx context.Context) string
    Description(ctx context.Context) string

    Run(ctx context.Context, input *TypedAgentInput[M], options ...AgentRunOption) *AsyncIterator[*TypedAgentEvent[M]]
}

type Agent = TypedAgent[*schema.Message]
```

#### `TypedAgentInput[M]`

The input passed to an agent.

```go
type TypedAgentInput[M MessageType] struct {
    Messages        []M
    EnableStreaming bool
}

type AgentInput = TypedAgentInput[*schema.Message]
```

#### `TypedAgentEvent[M]`

Events emitted during agent execution. Consumed by TurnLoop's `OnAgentEvents` callback.

```go
type TypedAgentEvent[M MessageType] struct {
    AgentName string
    RunPath   []RunStep
    Output    *TypedAgentOutput[M]
    Action    *AgentAction
    Err       error
}

type AgentEvent = TypedAgentEvent[*schema.Message]
```

#### `TurnLoopConfig[T, M]`

Configuration structure for creating a TurnLoop.

```go
type TurnLoopConfig[T any, M MessageType] struct {
    // GenInput receives the TurnLoop instance and all buffered items, deciding what to process.
    // Returns which items to consume now and which to defer to subsequent turns.
    // The loop parameter allows calling Push() or Stop() directly within the callback.
    // Required.
    GenInput func(ctx context.Context, loop *TurnLoop[T, M], items []T) (*GenInputResult[T, M], error)

    // GenResume is called at most once during Run(). When CheckpointID is configured,
    // Run() queries the Store for a checkpoint:
    //   - If the checkpoint contains runner state (i.e., the agent was interrupted mid-turn),
    //     Run() calls GenResume to plan the resume turn.
    //   - Otherwise (no checkpoint or between-turns checkpoint), GenResume is not called,
    //     and TurnLoop processes normally via GenInput.
    // Parameter meanings:
    //   - inFlightItems: items that were being processed when the previous run was canceled or interrupted by a business interrupt
    //   - unhandledItems: items that were buffered but unprocessed when the previous run exited
    //   - newItems: new items buffered via Push() before the Run() call
    //
    // Returns GenResumeResult, describing how to resume the interrupted agent turn
    // (optionally with ResumeParams) and how to manage the buffer (Consumed/Remaining).
    // Optional; required only when resumption is needed.
    GenResume func(ctx context.Context, loop *TurnLoop[T, M], inFlightItems, unhandledItems, newItems []T) (*GenResumeResult[T, M], error)

    // PrepareAgent returns a configured TypedAgent to handle the consumed items.
    // Called once per turn, receiving the items that GenInput decided to consume.
    // The loop parameter allows calling Push() or Stop() directly within the callback.
    // Required.
    PrepareAgent func(ctx context.Context, loop *TurnLoop[T, M], consumed []T) (TypedAgent[M], error)

    // OnAgentEvents handles events emitted by the agent.
    // TurnContext provides per-turn information and control:
    //   - tc.Consumed: the consumed items that triggered this agent execution
    //   - tc.Loop: allows calling Push() or Stop() directly within the callback
    //   - tc.Preempted / tc.Stopped: signals while processing events
    //
    // Error handling: The returned error is only for when the callback itself wants to abort the TurnLoop.
    // When the callback sees a CancelError, it should never re-throw it — the framework handles it automatically:
    //   - On Stop: The framework automatically throws the CancelError as the ExitReason, terminating the TurnLoop.
    //   - On Preempt: The framework does not throw the CancelError; if the callback also returns nil, TurnLoop proceeds to the next turn.
    // In practice, only return a non-nil error when an internal callback failure requires terminating the TurnLoop.
    //
    // Optional. If not provided, events are consumed, and the first error (including CancelError from Stop) is returned as ExitReason.
    OnAgentEvents func(ctx context.Context, tc *TurnContext[T, M], events *AsyncIterator[*TypedAgentEvent[M]]) error

    // Store is the checkpoint store for persistence and recovery. Optional.
    // When used together with CheckpointID, enables automatic checkpoint recovery.
    // TurnLoop always persists runner checkpoint bytes and item bookkeeping
    // (InFlightItems, UnhandledItems) via gob encoding, so T must be gob-encodable/decodable when using Store.
    Store CheckPointStore

    // CheckpointID works with Store to enable declarative automatic checkpoint recovery.
    // During Run(), TurnLoop queries the Store using this ID:
    //   - If a checkpoint with runner state exists (mid-turn interrupt), GenResume is called to plan the resume turn.
    //   - If a checkpoint without runner state exists (between-turns), the stored unhandled items are buffered,
    //     and processing proceeds normally via GenInput.
    //   - If no checkpoint exists, TurnLoop starts fresh.
    //
    // On exit, if TurnLoop saved a new checkpoint, it uses the same CheckpointID to save.
    // When no new checkpoint is saved, TurnLoop attempts to delete the old checkpoint under the same CheckpointID
    // to prevent stale recovery (requires Store to implement CheckPointDeleter).
    // Use WithSkipCheckpoint() to explicitly skip checkpoint saving.
    CheckpointID string
}
```

#### `TurnContext[T, M]`

Per-turn context information available to the `OnAgentEvents` callback.

```go
type TurnContext[T any, M MessageType] struct {
    // Loop is the TurnLoop instance, allowing Push()/Stop() calls within the callback.
    Loop *TurnLoop[T, M]

    // Consumed is the consumed items that triggered this agent execution.
    Consumed []T

    // Preempted is closed when at least one preemptive Push actually contributes to the current turn's
    // CancelError (via Push + WithPreempt).
    // "contribute" means that the cancel call's options were incorporated before the CancelError was finalized.
    // If no contributing preemption occurred during this turn (e.g., cancellation was already finalized), this channel remains open.
    //
    // Preempted and Stopped may both be closed within the same turn — when both signals arrive
    // while the agent is still in the cancellation process. Signals arriving after cancellation is fully handled do not contribute.
    Preempted <-chan struct{}

    // Stopped is closed when Stop()'s cancel call actually contributes to the current turn's CancelError.
    // If Stop did not contribute (e.g., cancellation was already finalized), this channel remains open.
    //
    // For the relationship between Preempted and Stopped, see the Preempted documentation.
    Stopped <-chan struct{}

    // StopCause returns the business-side stop reason passed via WithStopCause.
    // This value is only meaningful after the Stopped channel is closed. Returns an empty string before then.
    StopCause func() string
}
```

#### `GenInputResult[T, M]`

Return result of the `GenInput` callback.

```go
type GenInputResult[T any, M MessageType] struct {
    // RunCtx is the execution context for this turn (optional).
    // If set, it will be used for PrepareAgent, the agent's Run/Resume, and OnAgentEvents.
    // Should be derived from the ctx passed to GenInput to preserve TurnLoop's cancellation semantics and inherited values.
    // For example:
    //   runCtx := context.WithValue(ctx, traceKey{}, extractTraceID(items))
    //   return &GenInputResult[T, M]{RunCtx: runCtx, ...}, nil
    // If nil, TurnLoop's context is used.
    RunCtx context.Context

    // Input is the agent input to execute
    Input *TypedAgentInput[M]

    // RunOpts are options for this agent run.
    // Note: No need to pass WithCheckPointID here — TurnLoop automatically injects the checkpointID into the Runner.
    RunOpts []AgentRunOption

    // Consumed is the items selected for processing in this turn:
    // These items are removed from the buffer and passed as input to PrepareAgent.
    Consumed []T

    // Remaining is the items kept in the buffer for future turns:
    // TurnLoop pushes Remaining back into the buffer before starting agent execution for this turn.
    //
    // Note: Items in items that are neither in Consumed nor in Remaining are discarded.
    Remaining []T
}
```

#### `GenResumeResult[T, M]`

Return result of the `GenResume` callback.

```go
type GenResumeResult[T any, M MessageType] struct {
    // RunCtx is the execution context for this resume turn (optional).
    RunCtx context.Context

    // RunOpts are options for this agent resume run.
    // Note: No need to pass WithCheckPointID here — TurnLoop automatically injects the checkpointID into the Runner.
    RunOpts []AgentRunOption

    // ResumeParams contains parameters for resuming the interrupted agent (optional).
    ResumeParams *ResumeParams

    // Consumed is the items selected for processing in this resume turn:
    // These items are removed from the buffer and passed as input to PrepareAgent.
    Consumed []T

    // Remaining is the items kept in the buffer for future turns:
    // TurnLoop pushes Remaining back into the buffer before resuming the agent for this turn.
    //
    // Note: Items in (inFlightItems, unhandledItems, newItems) that are neither in Consumed nor in Remaining
    // are discarded.
    Remaining []T
}
```

#### `InterruptError`

When an agent produces a business interrupt (`AgentAction.Interrupted`) causing the TurnLoop to exit, the `ExitReason` is `*InterruptError`. It indicates the agent actively paused at a business-defined interrupt point, rather than being canceled.

```go
type InterruptError struct {
    // InterruptContexts provides the interrupt contexts needed for targeted resumption.
    // Each context represents a location in the agent hierarchy where an interrupt occurred.
    InterruptContexts []*InterruptCtx
}

func (e *InterruptError) Error() string
```

**Behavior:**

- `*InterruptError` triggers TurnLoop checkpoint saving; when resuming, the original turn's in-flight items are available via the `inFlightItems` parameter of `GenResume`
- `InterruptContexts` can be used to construct `ResumeParams.Targets` and passed to `Runner.ResumeWithParams` via `GenResumeResult.ResumeParams`
- Unlike `CancelError`, `InterruptError` represents a business-side active pause; interrupts occurring during active cancellation are still absorbed as `CancelError`

#### `TurnLoopExitState[T, M]`

The state returned when the TurnLoop exits, containing the exit reason and unhandled items.

```go
type TurnLoopExitState[T any, M MessageType] struct {
    // ExitReason indicates why the TurnLoop exited.
    // nil means normal exit (Stop() was called and TurnLoop completed normally).
    // Non-nil may be a context error, callback error, *CancelError, etc.
    // When Stop() cancels a running agent, ExitReason is *CancelError.
    // This field does not include checkpoint errors — see CheckpointErr.
    ExitReason error

    // UnhandledItems contains items that were buffered but not processed.
    // i.e., items where Push returned true but were not consumed by any turn.
    // Always valid regardless of ExitReason.
    UnhandledItems []T

    // InFlightItems contains items that the interrupted turn was processing.
    // Cancellation (Stop + WithImmediate, WithGraceful, or WithGracefulTimeout) and business interrupts
    // both populate this field; if the agent completed normally before cancellation took effect, it is empty.
    // When resuming, these are passed to the user via the inFlightItems parameter of GenResume.
    InFlightItems []T

    // StopCause is the business-side stop reason passed via WithStopCause.
    // Empty string if Stop was not called or no cause was provided.
    StopCause string

    // CheckpointAttempted indicates whether TurnLoop attempted to save a checkpoint on exit.
    // Only true when Store is configured, CheckpointID is set, TurnLoop is not idle on exit,
    // WithSkipCheckpoint is not used, and exit was triggered by Stop() or a business interrupt.
    CheckpointAttempted bool

    // CheckpointErr is the error from checkpoint saving (if any).
    // nil when CheckpointAttempted is false (no save attempt) or when saving succeeded.
    CheckpointErr error

    // TakeLateItems returns items that were pushed after the TurnLoop stopped
    // (i.e., items where Push returned false). These items are not included in the checkpoint.
    //
    // This function is idempotent: the first call computes and caches the result,
    // subsequent calls return the same slice.
    //
    // After calling TakeLateItems, subsequent Push() calls will panic
    // to prevent items from being silently lost.
    //
    // Can be safely called from any goroutine after Wait() returns.
    // If TakeLateItems is never called, late items are garbage collected normally.
    TakeLateItems func() []T
}
```

### Functions

#### `NewTurnLoop`

Creates a new TurnLoop without starting it. The returned TurnLoop immediately accepts `Push` and `Stop` calls; pushed items are buffered until `Run` is called.

Panics if `GenInput` or `PrepareAgent` is nil.

```go
func NewTurnLoop[T any, M MessageType](cfg TurnLoopConfig[T, M]) *TurnLoop[T, M]
```

**Parameters:**

- `cfg TurnLoopConfig[T, M]`: Configuration for the TurnLoop

**Return Value:**

- `*TurnLoop[T, M]`: An unstarted TurnLoop instance

**Example:**

```go
loop := NewTurnLoop(TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], items []string) (*GenInputResult[string, *schema.Message], error) {
        return &GenInputResult[string, *schema.Message]{
            Input:    &TypedAgentInput[*schema.Message]{Messages: []Message{schema.UserMessage(items[0])}},
            Consumed: items,
        }, nil
    },
    PrepareAgent: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], consumed []string) (TypedAgent[*schema.Message], error) {
        return myAgent, nil
    },
})

// Can push items or pass references before starting
_, _ = loop.Push("initial_item")
loop.Run(ctx)
```

### Methods

All methods can be safely called when the TurnLoop has not yet started (lenient API):

- `Push`: Items are buffered and processed after `Run` is called.
- `Stop`: Sets the stop flag; subsequent `Run` will exit immediately.
- `Wait`: Blocks until `Run` is called and the TurnLoop exits. If `Run` is never called, `Wait` will block forever.

> Note: Items written via Push before startup are processed once Run starts for the first time.

#### `Run`

Starts the TurnLoop's processing goroutine. This method is non-blocking: the TurnLoop runs in the background, and results are obtained via `Wait`.

If `CheckpointID` is configured in `TurnLoopConfig` and a matching checkpoint exists in the `Store`, the TurnLoop will automatically attempt to resume from that checkpoint; otherwise, it starts processing items that have been `Push()`-ed from scratch. Multiple calls to `Run` are idempotent no-ops: only the first call starts the TurnLoop.

```go
func (l *TurnLoop[T, M]) Run(ctx context.Context)
```

**Parameters:**

- `ctx context.Context`: Context for the TurnLoop's lifecycle

**Example:**

```go
loop := NewTurnLoop(cfg)
loop.Run(context.Background())
```

#### `Push`

Adds an item to the TurnLoop's buffer for processing. This method is non-blocking and thread-safe.

```go
func (l *TurnLoop[T, M]) Push(item T, opts ...PushOption[T, M]) (bool, <-chan struct{})
```

**Parameters:**

- `item T`: The item to add to the buffer
- `opts ...PushOption[T, M]`: Optional push options

**Return Values:**

- `bool`: Returns `false` if the TurnLoop has already stopped (the item is still retained and can be retrieved via `TurnLoopExitState.TakeLateItems()`); otherwise returns `true` (including when `Run` has not been called yet — items will be buffered)
- `<-chan struct{}`: Only returns a non-nil value when `WithPreempt` / `WithPreemptTimeout` is used. The caller can wait for this channel to close, confirming that the preemption signal has been received by the TurnLoop and the cancel request has been submitted — i.e., the current turn will definitely be preempted. Specific timing:
  - If there is a running agent: the channel closes after the TurnLoop calls cancel
  - If there is no running agent (TurnLoop is idle or not yet started): the channel closes immediately (no cancellation needed)
  - If confirmation is not needed, this return value can be ignored

**Example:**

```go
// Normal push
ok, _ := loop.Push("message1")
if !ok {
    // Loop has stopped — items can be retrieved via TakeLateItems()
}

// Preemptive push: push a new item and request cancellation of the current turn
ok, ack := loop.Push("urgent_message", WithPreempt[string, *schema.Message](AnySafePoint))
if !ok {
    // Loop has stopped
} else {
    <-ack // Wait for confirmation: preemption signal received, current turn will definitely be canceled
}
```

##### SafePoint Type

`SafePoint` describes at which boundary an agent can be canceled. Values can be combined using bitwise OR to accept multiple safe points.

`SafePoint` is used exclusively in the preemption API (`WithPreempt`/`WithPreemptTimeout`). A key design constraint: **preemption always targets safe points** — the user's intent is to cancel at a well-defined boundary, not to abort immediately. Immediate cancellation is only reachable via timeout escalation (through `WithPreemptTimeout`), not as the user's direct choice. This is why `SafePoint` has no "immediate" value, and `WithPreempt` requires a non-zero `SafePoint` (otherwise it panics).

`SafePoint` maps internally to `CancelMode`, but this detail is hidden from TurnLoop users.

```go
type SafePoint int

const (
    AfterChatModel SafePoint = 1 << iota // Allow the agent to be canceled after completing the current chat-model call
    AfterToolCalls                       // Allow the agent to be canceled after completing the current tool call round
    AnySafePoint = AfterChatModel | AfterToolCalls // Shorthand for AfterChatModel | AfterToolCalls
)
```

##### `PushOption[T, M]`

An opaque option type for configuring a single `Push` call. Users typically do not implement this type themselves; instead, use `WithPreempt`, `WithPreemptTimeout`, `WithPreemptDelay`, or `WithPushStrategy` to create options.

```go
type PushOption[T any, M MessageType] func(*pushConfig[T, M])
```

##### `WithPreempt`

Pushes a new item while requesting cancellation of the current agent turn at the specified `SafePoint`. After cancellation completes, TurnLoop starts a new turn, and `GenInput` will see all buffered items (including the just-pushed one). Use `WithPreemptTimeout` to add a timeout for escalation to immediate abort.

Since safe points trigger at turn-level boundaries (after chat model returns or after all tool calls complete), **no nested agent is running when cancellation occurs** — nested agents within AgentTools have either not started yet (AfterChatModel) or have already completed (AfterToolCalls). Therefore, `WithPreempt` cancellation does not involve nested agents. However, `WithPreemptTimeout`, when it escalates to immediate cancellation on timeout, will also terminate nested agents running within AgentTools.

`WithPreempt` and `WithPreemptTimeout` are mutually exclusive; if both are passed to the same `Push` call, the latter takes effect.

`safePoint` must not be zero; passing `SafePoint(0)` will panic.

```go
func WithPreempt[T any, M MessageType](safePoint SafePoint) PushOption[T, M]
```

**Parameters:**

- `safePoint SafePoint`: Specifies at which safe point the agent should yield

**Example:**

```go
_, _ = loop.Push("urgent_item", WithPreempt[string, *schema.Message](AnySafePoint))
_, _ = loop.Push("item", WithPreempt[string, *schema.Message](AfterToolCalls))
```

##### `WithPreemptTimeout`

Similar to `WithPreempt`, but with a timeout added. If the agent does not reach the safe point within the timeout, preemption escalates to immediate cancellation. On timeout escalation, nested agents within AgentTools also receive cancel signals and are terminated.

`timeout <= 0` does not set an effective deadline, so timeout escalation will not be triggered.

`safePoint` must not be zero; passing `SafePoint(0)` will panic.

```go
func WithPreemptTimeout[T any, M MessageType](safePoint SafePoint, timeout time.Duration) PushOption[T, M]
```

**Parameters:**

- `safePoint SafePoint`: Specifies at which safe point the agent should yield
- `timeout time.Duration`: Timeout after which to escalate to immediate cancellation

**Example:**

```go
_, _ = loop.Push("urgent_item", WithPreemptTimeout[string, *schema.Message](AnySafePoint, 5*time.Second))
```

##### `WithPreemptDelay`

Sets a delay before preemption takes effect. Must be used together with `WithPreempt` or `WithPreemptTimeout`.

`delay <= 0` is equivalent to no delay.

```go
func WithPreemptDelay[T any, M MessageType](delay time.Duration) PushOption[T, M]
```

**Parameters:**

- `delay time.Duration`: Delay duration before preemption

**Example:**

```go
_, _ = loop.Push("item", WithPreempt[string, *schema.Message](AnySafePoint), WithPreemptDelay[string, *schema.Message](2*time.Second))
```

##### `WithPushStrategy`

Provides dynamic push option resolution based on the current turn state. The callback receives the current turn's context and `TurnContext` (nil if no turn is active), returning the list of `PushOption`s to actually apply.

When `WithPushStrategy` is used, all other `PushOption`s passed in the same `Push` call are ignored. The returned options must not contain another `WithPushStrategy`; nested strategies are silently stripped.

TurnLoop first holds the current run loop under an internal lock to obtain a stable turn snapshot, then invokes the callback on that snapshot; the turn state read by the callback and the final push decision do not cross into the next turn.

```go
func WithPushStrategy[T any, M MessageType](fn func(ctx context.Context, tc *TurnContext[T, M]) []PushOption[T, M]) PushOption[T, M]
```

**Parameters:**

- `fn func(ctx context.Context, tc *TurnContext[T, M]) []PushOption[T, M]`: Strategy callback function
  - `ctx`: Current turn's context (`context.Background()` when no turn is active)
  - `tc`: Current turn's `TurnContext` (`nil` when no turn is active)

**Example:**

```go
_, _ = loop.Push(urgentItem, WithPushStrategy(func(ctx context.Context, tc *TurnContext[MyItem, *schema.Message]) []PushOption[MyItem, *schema.Message] {
    if tc == nil {
        return nil // Between turns, normal push
    }
    if isLowPriority(tc.Consumed) {
        return []PushOption[MyItem, *schema.Message]{WithPreempt[MyItem, *schema.Message](AnySafePoint)}
    }
    return nil // Don't preempt high-priority tasks
}))
```

#### `Stop`

Sends a stop signal to the TurnLoop and returns immediately (non-blocking).

Without options, the current agent turn runs to completion, and the TurnLoop exits at the turn boundary without starting a new turn. In this case, `ExitReason` is `nil`.

Use `WithImmediate()` to immediately abort the running agent turn. Use `WithGraceful()` to cancel at the nearest safe point with recursive propagation to nested agents. Use `WithGracefulTimeout()` to cancel at a safe point with an escalation deadline. Use `UntilIdleFor()` to delay stopping until the TurnLoop has been continuously idle for a period before automatically shutting down.

Can be called before `Run`, in which case the subsequent `Run` will exit immediately.

Multiple calls are allowed; subsequent calls update cancel options. A `Stop()` call without `UntilIdleFor` immediately shuts down the TurnLoop, even if a prior `UntilIdleFor` is still waiting. Note that `WithSkipCheckpoint` and `WithStopCause` have sticky semantics — see their respective documentation.

If the running agent does not support `WithCancel` as an `AgentRunOption`, all cancel-related options (`WithImmediate`, `WithGraceful`, `WithGracefulTimeout`) degrade to "exit TurnLoop when entering the next iteration" — the current agent turn runs to completion before the TurnLoop exits.

Call `Wait()` to block until the TurnLoop has fully exited and obtain the result.

```go
func (l *TurnLoop[T, M]) Stop(opts ...StopOption)
```

**Parameters:**

- `opts ...StopOption`: Optional stop options

**Example:**

```go
// Without options: exit at turn boundary (stop after current turn completes, ExitReason is nil)
loop.Stop()

// Immediately abort the current agent turn
loop.Stop(WithImmediate())

// Safe-point stop (graceful shutdown, recursively propagated to nested agents)
loop.Stop(WithGraceful())

// Safe-point stop with timeout
loop.Stop(WithGracefulTimeout(10 * time.Second))

// Stop after idle (automatically shut down after being continuously idle for 30 seconds)
loop.Stop(UntilIdleFor(30 * time.Second))
```

##### `StopOption`

An opaque option type for configuring a single `Stop` call. Users typically do not implement this type themselves; instead, use `WithImmediate`, `WithGraceful`, `WithGracefulTimeout`, `UntilIdleFor`, `WithSkipCheckpoint`, or `WithStopCause` to create options.

```go
type StopOption func(*stopConfig)
```

##### `WithImmediate`

Immediately aborts the running agent turn without waiting for any safe point. Nested agents within AgentTools also receive cancel signals and are terminated.

This is the most aggressive stop mode, suitable for scenarios where the priority is to shut down as quickly as possible. If you also know that future resumption is not needed, additionally use `WithSkipCheckpoint()`.

```go
func WithImmediate() StopOption
```

**Example:**

```go
loop.Stop(WithImmediate())
```

##### `WithGraceful`

Requests a graceful stop: waits at the nearest safe point (after tool calls or after chat-model calls) with recursive propagation to nested agents. No time limit is set; use `WithGracefulTimeout` to add a timeout for escalation to immediate cancellation.

`WithGraceful` and `WithGracefulTimeout` are mutually exclusive; if both are passed to the same `Stop` call, the latter takes effect.

```go
func WithGraceful() StopOption
```

**Example:**

```go
loop.Stop(WithGraceful())
```

##### `WithGracefulTimeout`

Similar to `WithGraceful`, but with a timeout. If the agent does not reach a safe point within the `gracePeriod`, stopping escalates to immediate cancellation.

`gracePeriod` must be positive; passing zero or negative values will panic.

```go
func WithGracefulTimeout(gracePeriod time.Duration) StopOption
```

**Parameters:**

- `gracePeriod time.Duration`: Timeout after which to escalate to immediate cancellation

**Example:**

```go
loop.Stop(WithGracefulTimeout(10 * time.Second))
```

##### `UntilIdleFor`

Delays stopping until the TurnLoop has been continuously idle (blocked between turns with no pending items) for the specified duration. The timer resets to zero whenever new items arrive.

Useful when business code monitors agent activity externally and wants to shut down the TurnLoop after a period of no work, without racing with concurrent `Push` calls.

`UntilIdleFor` does not affect a running agent; it only takes effect when the TurnLoop is idle. Cancel options in the same call (`WithImmediate`, `WithGraceful`, `WithGracefulTimeout`) are silently ignored. `UntilIdleFor` can be combined with non-cancel options (`WithSkipCheckpoint`, `WithStopCause`).

To escalate to immediate shutdown during idle waiting, issue a new `Stop` call without `UntilIdleFor` to override the idle wait:

```go
loop.Stop(UntilIdleFor(30 * time.Second))  // Wait for idle
// ... later, if immediate abort is needed:
loop.Stop(WithImmediate())                 // Override idle wait, shut down immediately
```

Only the first `UntilIdleFor`'s duration takes effect; subsequent calls with different durations are ignored.

`duration` must be positive; passing zero or negative values will panic.

```go
func UntilIdleFor(duration time.Duration) StopOption
```

**Parameters:**

- `duration time.Duration`: Idle wait duration

**Example:**

```go
// Automatically shut down after being continuously idle for 30 seconds
loop.Stop(UntilIdleFor(30 * time.Second))

// Idle shutdown without saving checkpoint
loop.Stop(UntilIdleFor(30*time.Second), WithSkipCheckpoint())
```

##### `WithSkipCheckpoint`

Tells the TurnLoop not to persist a checkpoint on this Stop. Suitable for scenarios where the caller is certain that future resumption will not be needed.

The flag is sticky: once any `Stop()` call sets this option, subsequent escalation calls cannot undo it.

```go
func WithSkipCheckpoint() StopOption
```

**Example:**

```go
// Permanent stop without saving checkpoint
loop.Stop(WithSkipCheckpoint())

// Combined with cancel options: immediately abort without saving checkpoint
loop.Stop(WithImmediate(), WithSkipCheckpoint())
```

##### `WithStopCause`

Attaches a business-side stop reason string to the Stop call.

The reason is exposed in two places:

- `TurnLoopExitState.StopCause`: Available after `Wait()` returns
- `TurnContext.StopCause()`: Available in `OnAgentEvents` after `<-tc.Stopped` closes

If multiple `Stop()` calls provide a cause, the first non-empty value is used.

```go
func WithStopCause(cause string) StopOption
```

**Parameters:**

- `cause string`: Business-side stop reason

**Example:**

```go
loop.Stop(WithStopCause("user session timeout"))

// Combined usage
loop.Stop(
    WithGraceful(),
    WithStopCause("quota exceeded"),
)
```

#### `Wait`

Blocks until the TurnLoop exits and returns the exit state. Can be safely called from multiple goroutines — all callers will receive the same result. Blocks until `Run` is called and the TurnLoop exits; if `Run` is never called, it will block forever.

```go
func (l *TurnLoop[T, M]) Wait() *TurnLoopExitState[T, M]
```

**Return Value:**

- `*TurnLoopExitState[T, M]`: Exit state containing the exit reason, unhandled items, checkpoint status, and business stop cause

**Example:**

```go
loop.Stop()
result := loop.Wait()
if result.ExitReason != nil {
    log.Printf("Loop exited with error: %v", result.ExitReason)
}
```

### Extension Interfaces

#### `CheckPointStore`

A storage interface for saving and reading checkpoints. Used by `TurnLoopConfig.Store`; automatic recovery and persistence are only enabled when configured together with `CheckpointID`.

```go
type CheckPointStore interface {
    Get(ctx context.Context, checkPointID string) ([]byte, bool, error)
    Set(ctx context.Context, checkPointID string, checkPoint []byte) error
}
```

#### `CheckPointDeleter`

An optional extension interface for `CheckPointStore`. Stores that implement this interface support explicit checkpoint deletion.

When TurnLoop does not save a new checkpoint, it attempts to delete the previously loaded checkpoint to prevent stale recovery. **Only Stores that implement CheckPointDeleter will perform this deletion**; otherwise, the stale checkpoint's lifecycle is managed by the Store itself.

```go
type CheckPointDeleter interface {
    Delete(ctx context.Context, checkPointID string) error
}
```

---

## Usage Examples

### Basic Agent Cancel Usage

```go
ctx := context.Background()
runner := NewRunner(ctx, RunnerConfig{
    Agent: myAgent,
})

// Enable cancel functionality
cancelOpt, cancelFunc := WithCancel()
iter := runner.Run(ctx, messages, cancelOpt)

// In another goroutine, cancel after chat model completes
go func() {
    time.Sleep(2 * time.Second)
    handle, _ := cancelFunc(
        WithAgentCancelMode(CancelAfterChatModel),
        WithAgentCancelTimeout(5*time.Second),
    )
    err := handle.Wait()
    if err != nil {
        log.Printf("Cancel failed: %v", err)
    }
}()

// Process events
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    if event.Err != nil {
        var cancelErr *CancelError
        if errors.As(event.Err, &cancelErr) {
            log.Printf("Agent canceled: mode=%v, escalated=%v", 
                cancelErr.Info.Mode, cancelErr.Info.Escalated)
        }
        break
    }
    // Process event
}
```

### Basic TurnLoop Usage

```go
ctx := context.Background()

loop := NewTurnLoop(TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], items []string) (*GenInputResult[string, *schema.Message], error) {
        // Process all items and bind trace context for this turn
        runCtx := context.WithValue(ctx, traceKey{}, extractTrace(items[0]))
        return &GenInputResult[string, *schema.Message]{
            RunCtx:   runCtx,
            Input:    &TypedAgentInput[*schema.Message]{Messages: []Message{schema.UserMessage(strings.Join(items, "\n"))}},
            Consumed: items,
        }, nil
    },
    PrepareAgent: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], consumed []string) (Agent, error) {
        return myAgent, nil
    },
    OnAgentEvents: func(ctx context.Context, tc *TurnContext[string, *schema.Message], events *AsyncIterator[*TypedAgentEvent[*schema.Message]]) error {
        for {
            event, ok := events.Next()
            if !ok {
                break
            }
            if event.Err != nil {
                var cancelErr *CancelError
                if errors.As(event.Err, &cancelErr) {
                    // Cancellation is captured by TurnLoop and converted to exit state — the callback does not need to re-throw.
                    continue
                }
                return event.Err
            }
            // Process event
        }
        return nil
    },
})

// Can push items before starting
_, _ = loop.Push("user message 1")
_, _ = loop.Push("user message 2")

// Start the loop
loop.Run(ctx)

// Stop and wait (exit at turn boundary, ExitReason is nil)
loop.Stop()
result := loop.Wait()
```

### TurnLoop with Preemption

```go
loop := NewTurnLoop(TurnLoopConfig[string, *schema.Message]{...})
loop.Run(ctx)

// Push an urgent item and preempt the current agent
_, ack := loop.Push("urgent_message", WithPreempt[string, *schema.Message](AnySafePoint))
if ack != nil {
    <-ack
}

// Or with delay
_, _ = loop.Push("item", WithPreempt[string, *schema.Message](AnySafePoint), WithPreemptDelay[string, *schema.Message](1*time.Second))
```

### TurnLoop Declarative Checkpoint Recovery

```go
ctx := context.Background()

// First run — configure Store and CheckpointID to enable automatic checkpointing
cfg := TurnLoopConfig[string, *schema.Message]{
    GenInput: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], items []string) (*GenInputResult[string, *schema.Message], error) {
        return &GenInputResult[string, *schema.Message]{
            Input:    &TypedAgentInput[*schema.Message]{Messages: []Message{schema.UserMessage(items[0])}},
            Consumed: items,
        }, nil
    },
    GenResume: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], inFlightItems, unhandledItems, newItems []string) (*GenResumeResult[string, *schema.Message], error) {
        all := append(append(inFlightItems, unhandledItems...), newItems...)
        return &GenResumeResult[string, *schema.Message]{
            Consumed: all,
        }, nil
    },
    PrepareAgent: func(ctx context.Context, loop *TurnLoop[string, *schema.Message], consumed []string) (Agent, error) {
        return myAgent, nil
    },
    Store:        myStore,
    CheckpointID: "my-session-id",
}

loop := NewTurnLoop(cfg)
_, _ = loop.Push("message1")
loop.Run(ctx)

// Stop the run
loop.Stop(WithGraceful())
exit := loop.Wait()

// Resume from checkpoint — use the same cfg (containing the same CheckpointID),
// Run() will automatically detect and resume from the checkpoint
loop2 := NewTurnLoop(cfg)
_, _ = loop2.Push("new_message") // New items are passed as newItems to GenResume
loop2.Run(ctx)
result2 := loop2.Wait()
```

---

## Best Practices

### Agent Cancel

1. **Choose the right mode**: Use safe-point modes (`CancelAfterChatModel`, `CancelAfterToolCalls`) for graceful cancellation, and `CancelImmediate` for emergencies
2. **Set timeouts**: It is recommended to set timeouts for safe-point modes to prevent indefinite waiting
3. **Handle CancelError**: Check for `CancelError` in event errors to distinguish between cancellation and failure
4. **Understand interrupt absorption**: Business interrupts during active cancellation are absorbed as `CancelError`, but the checkpoint preserves complete data — business interrupts naturally re-trigger when resumed
5. **Resumption capability**: Use `InterruptContexts` in `CancelError` for targeted resumption
6. **Recursive propagation**: By default, cancellation only affects the root agent. When the agent hierarchy contains child agents nested in AgentTools, use `WithRecursive()` to propagate cancellation to all child agents. When in doubt, start without `WithRecursive()` — only enable it when you explicitly need child agents to respond to cancel safe points

### TurnLoop

1. **Process all events**: If `OnAgentEvents` is provided, the event iterator should be fully consumed; if not provided, the framework automatically drains events
2. **Detect preemption/stopping**: Use `TurnContext.Preempted` / `TurnContext.Stopped` (`select`) in `OnAgentEvents` to detect preemption/stopping; note that they are only closed when the corresponding cancel call actually contributed to this turn's `CancelError`
3. **Declarative checkpointing**: Configure both `Store` and `CheckpointID` in `TurnLoopConfig` to enable automatic checkpoint recovery; `Run()` automatically detects and resumes from existing checkpoints
4. **Resuming runs**: Create a new TurnLoop with the same `CheckpointID` and call `Run()` — the framework automatically detects the checkpoint and calls `GenResume`; new items are buffered via `Push()` before `Run()`
5. **Stale checkpoint cleanup**: When no new checkpoint is saved, the framework automatically deletes the previously loaded checkpoint to prevent stale recovery; **only Stores that implement the CheckPointDeleter interface will perform this deletion**
6. **Distinguish CancelError from business interrupts**: `*CancelError` represents the cancellation path, `*InterruptError` represents business-side active interrupts; both may produce checkpoints and pass in-flight items back through the `inFlightItems` parameter of `GenResume`
7. **Skip checkpoints**: When you are certain resumption is no longer needed, use `WithSkipCheckpoint()` to avoid unnecessary checkpoint writes; this flag remains sticky across escalation calls
8. **Business stop causes**: Attach business-level stop reasons via `WithStopCause()`, separated from the technical-level `ExitReason`; in `OnAgentEvents`, read `tc.StopCause()` after `<-tc.Stopped` closes
9. **T's gob compatibility**: When using `Store`, `T` must be gob-encodable/decodable, as the framework persists runner bytes and item bookkeeping via gob
10. **Stop escalation**: `Stop()` can be called multiple times — subsequent calls update cancel options (e.g., escalating from `WithGraceful()` to `WithImmediate()`)
11. **Idle shutdown**: Use `UntilIdleFor()` to automatically shut down when there is no work, avoiding races with concurrent `Push` calls
12. **Context derivation**: For per-turn tracing, derive `RunCtx` from `ctx` in `GenInput`/`GenResume`
13. **Late items recovery**: When `Push()` returns `false`, items are not lost — retrieve them via `TurnLoopExitState.TakeLateItems()`; note that after calling `TakeLateItems`, `Push()` can no longer be called
14. **Separate exit results from checkpoint results**: `ExitReason` reflects the loop's own exit reason, `CheckpointAttempted` + `CheckpointErr` reflects the checkpoint persistence result — judge them independently

### Integration Usage

1. **Preempt vs. Stop**: Use `WithPreempt()` for urgent items during execution, and `Stop()` for final shutdown
2. **Conditional preemption**: When preemption decisions depend on the current turn state, use `WithPushStrategy` instead of reading state then calling `Push` — it executes under an atomic snapshot, avoiding TOCTOU races
3. **Context cancellation**: Canceling the `ctx` passed to `Run(ctx)` can abort the current turn and cause the loop to exit (`ExitReason` is typically `context.Canceled`/`context.DeadlineExceeded`); `Stop()` is more suitable for orderly shutdown and allows controlling the cancel strategy via `WithGraceful`/`WithGracefulTimeout`
