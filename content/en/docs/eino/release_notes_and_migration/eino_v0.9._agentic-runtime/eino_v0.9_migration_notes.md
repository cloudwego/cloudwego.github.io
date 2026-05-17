---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Eino V0.9 Migration Notes
weight: 1
---

This document lists the API and semantic changes that existing users should be aware of when upgrading from V0.8.x to V0.9 `agentic-runtime`. Newly added capabilities not listed here generally do not affect existing `*schema.Message` paths.

## Explicit API Changes

### ChatModelAgentMiddleware Adds AfterAgent

`ChatModelAgentMiddleware` now includes a new `AfterAgent` method. Types that manually implement this interface need to add this method, otherwise compilation will fail.

Recommended approaches:

- If the middleware does not need special teardown logic, embed `*adk.BaseChatModelAgentMiddleware`.
- If the middleware needs to clean up state, record events, or collect statistics after the Agent completes successfully, implement `AfterAgent(ctx, state)`.

Impact scope:

- Only affects user code that explicitly implements `ChatModelAgentMiddleware`.
- Code that extends via `BaseChatModelAgentMiddleware` composition remains compatible.

### summarization.SummarizeMessages Removed

`summarization.SummarizeMessages` and `summarization.SummarizeOutput` are no longer exported.

Migration approach:

- Continue using `summarization.New` or `summarization.NewTyped` when constructing summarization middleware.
- When you need to actively trigger synchronous summarization, use `TypedMiddleware.Summarize`.

This adjustment consolidates the configuration, state reading, and execution logic of summarization into the middleware, preventing semantic divergence between standalone functions and runtime state.

## Capabilities Requiring Attention to Semantic Changes

### Summarization Finalize Post-Processing Semantic Change

In V0.8.x, the summarization middleware would first perform default summary post-processing, then call the user-configured `Finalize`. Therefore, custom `Finalize` received a `summary` that already included `PreserveUserMessages` replacement, `TranscriptFilePath` injection, and the summary preamble.

In V0.9, if `Config.Finalize` is set, the middleware passes the raw model-generated summary directly to `Finalize` without automatically performing default post-processing. Affected configurations include:

- `PreserveUserMessages`
- `TranscriptFilePath`

Migration approach:

- If you want to retain default post-processing, do not set `Finalize` — let the middleware use the default finalization path.
- If you must customize `Finalize` but still want default post-processing, first construct the default finalizer via `DefaultFinalizer`, then explicitly compose it in your custom logic.
- `DefaultFinalizer` does not automatically read the outer `Config.PreserveUserMessages` and `Config.TranscriptFilePath`; they must be explicitly passed via `DefaultFinalizerConfig`.
- Code using `NewFinalizer().PreserveSkills(...).Build()` requires special attention: this finalizer only handles preserve skills and will not automatically add `PreserveUserMessages` and `TranscriptFilePath`.

### Tool List Modification Path Adjustment

`ModelContext.Tools` is no longer the recommended entry point for modifying the tool list.

Upgrade recommendations:

- Modify `state.ToolInfos` in `BeforeModelRewriteState`.
- If you need model-native deferred tool search, modify `state.DeferredToolInfos`.
- Modifying the tool list in `WrapModel` is not recommended; such modifications only affect the current model call — subsequent middleware, subsequent turns, or checkpoint/resume will not inherit the modification.

### Model Retry Decision Semantic Enhancement

`ModelRetryConfig` now includes `ShouldRetry`. When `ShouldRetry` is non-nil, `IsRetryAble` is ignored.

Points to note:

- The legacy `IsRetryAble` can still be used for simple error-dimension retries.
- When using `ShouldRetry`, you should explicitly handle scenarios where the output is successful but business-unacceptable.
- Interrupt and `ErrStreamCanceled` are not treated as ordinary retry errors.

### Cancel Error Semantics

With the introduction of active cancellation semantics in V0.9, applications need to distinguish between active cancellation, ordinary errors, and business interrupts.

Upgrade recommendations:

- The upper layer should distinguish between `CancelError`, ordinary errors, and business interrupts.
- If the application actively uses `WithCancel`, do not treat `CancelError` as an ordinary business failure.

### AgenticMessage Migration Requires Understanding the New Message Structure

`TypedChatModelAgent[*schema.AgenticMessage]` is the new path for model-native Agentic protocols. Migrating to this path is not just about changing the generic parameter from `*schema.Message` to `*schema.AgenticMessage` — you also need to handle message content according to `AgenticMessage`'s content block structure.

Points to note:

- The AgenticMessage path uses `AgenticModel` and `AgenticToolsNode` for tool calling.
- Tool calls and tool results are expressed through `AgenticMessage` content blocks; correct handling of tool call / tool result content blocks is particularly important.
- Agent transfer capability is not applicable to the AgenticMessage path.
- If existing applications do not need model-native Agentic protocols, it is recommended to continue using the default `*schema.Message` path; only migrate when you explicitly need to integrate with the `AgenticModel` protocol.

### Model Adapters Need to Recognize New Options

With the introduction of `AgenticModel` in V0.9, model adapters need to handle call-time options more strictly. `AgenticModel` is an alias for `BaseModel[*schema.AgenticMessage]` and no longer provides enhanced interfaces like `ToolCallingChatModel.WithTools`; tool binding is unified through `model.WithTools` passed as a `model.Option`.

Points to note:

- All model adapters supporting AgenticMessage should read `Options.Tools` and map them to the provider's tool calling protocol.
- `AgenticModel` should not require users to call a `WithTools` method first to obtain a "tool-equipped model instance"; ADK passes the current tool list via `model.WithTools` on each model call.
- If an adapter only reads tools from its own config while ignoring `model.WithTools`, the model will not see tools or the tool list will not update with runtime state in the ChatModelAgent / AgenticToolsNode path.

V0.9 also adds the following to `model.Options`:

- `DeferredTools`
- `ToolSearchTool`
- `AgenticToolChoice`

Existing model adapters that ignore these options typically will not cause compilation failures, but will result in deferred tool search, model-native tool search, or agentic tool choice not taking effect. Adapter maintainers should add conversion logic according to the target provider's protocol.

### ToolInfo Serialization Format Change

`ToolInfo` now has explicit JSON/Gob encoding/decoding to preserve `ParamsOneOf`.

Impact:

- `ToolInfo` is now part of `ChatModelAgentState.ToolInfos` / `DeferredToolInfos`, and may therefore enter checkpoints along with Agent state.
- Explicit JSON/Gob encoding/decoding ensures that `ParamsOneOf` is not lost during checkpoint, deep copy, and recovery processes.
- If external systems directly depend on the legacy `ToolInfo` JSON format, serialization compatibility should be re-verified.
