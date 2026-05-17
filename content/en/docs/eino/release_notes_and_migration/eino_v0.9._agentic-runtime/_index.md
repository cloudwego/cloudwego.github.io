---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: v0.9.* agentic-runtime
weight: 9
---

The theme of V0.9 is `agentic-runtime`. This release focuses on ADK's message protocol, Agent runtime control, and multi-turn runtime capabilities. While preserving the `*schema.Message` default path, it introduces `AgenticMessage` along with corresponding generic abstractions, laying the groundwork for richer model-native Agent protocols, server-side tool calls, and runtime interrupt and resume.

## 1. AgenticMessage and ADK Support

V0.9 introduces `schema.AgenticMessage` for expressing richer Agentic message structures beyond the traditional `schema.Message`.

- `AgenticMessage` adopts a content block model, supporting structured fragments such as text, reasoning content, tool calls, tool results, server-side tools, MCP tools, and multimodal content.
- `[]ContentBlock` more completely preserves block ordering from different model protocol responses; new block types also better align with structures like tool use, reasoning, and streaming metadata in protocols such as OpenAI Responses API, Claude, and Gemini.
- `components/model` introduces a new `AgenticModel` component for integrating model implementations that use `AgenticMessage` as input/output.
- ADK provides typed agent, typed event, typed runner, and typed `ChatModelAgent` support for the `AgenticMessage` path, enabling AgenticModel to participate in ADK's Agent lifecycle.

## 2. ChatModelAgent Capability Enhancements

V0.9 delivers systematic enhancements to `ChatModelAgent`'s runtime control, model call reliability, and middleware extension points.

### Cancel

- New Agent Cancel capability for externally terminating a running Agent.
- Supports safe point cancellation, recursive cancellation, cancel timeout escalation, and checkpoint persistence during cancellation.
- Interrupts occurring during cancellation are unified under cancel semantics; callers can distinguish between active cancellation and normal business failures through `CancelError`.

### Model Retry

- Retry has been expanded from simple error retry to `ShouldRetry(ctx, RetryContext) -> RetryDecision`.
- Retry decisions can read model output, reject unsatisfactory output, modify the next input, append model options, and override backoff.

### Model Failover

- New Model Failover capability for switching to a backup model after a model call failure.
- Failover decisions can read the failed attempt's output, error, original input, and attempt number, and select the next model to use.
- Supports rewriting input for backup models; also supports preferentially reusing the last successfully called model, reducing the cost of starting from the fixed primary model each time.

### Middleware Enhancements

- `ChatModelAgentMiddleware` adds `AfterAgent` for executing cleanup logic after Agent completes successfully.
- Summarization, reduction, skill, filesystem, plan-task, patch-tool-calls, and other middleware have been generified to support the `AgenticMessage` path.
- Summarization middleware adds `TypedMiddleware.Summarize`, consolidating synchronous summarization capability from standalone functions into the middleware.
- Filesystem middleware enhances multimodal reading capabilities and adds PDF page validation.
- New `agentsmd` middleware for loading and injecting `AGENTS.md`-style project instructions.
- `ChatModelAgentState` adds `ToolInfos` and `DeferredToolInfos` as the primary path for middleware to adjust the model-visible tool set.
- `ToolInfos` represents tools directly visible to the current model call; `DeferredToolInfos` represents candidate tools that the model can discover on-demand through tool search mechanisms.
- Tool search middleware supports three tool loading approaches: using model-native tool search capability to load from deferred tools on demand; providing a fixed-schema `ToolSearchTool` per model protocol requirements, allowing the model to search deferred tools through this entry point; using Eino's custom `tool_search` tool independently of model-side protocols to retrieve tools and append matches to regular `ToolInfos`.
- Compose adds `AgenticToolsNode`; `ToolsNode` gains tool name and argument alias support.

## 3. TurnLoop

V0.9 introduces `TurnLoop` for elevating one-shot Agent runs to continuously running, externally-driven turn-level runtimes.

- Multi-turn oriented: `TurnLoop` continuously receives external input, with each turn independently planning input, constructing Agents, and consuming events — suitable for long-lived interactive Agents.
- Input merging support: `GenInput` decides at turn boundaries which inputs to consume this turn and which to keep waiting, enabling applications to implement batching, deduplication, and merging of consecutive user inputs.
- Preemption support: `Push` with preempt options atomically writes new input and requests cancellation of the current turn, allowing high-priority input to interrupt a running Agent.
- Declarative checkpoint/resume support: during recovery, applications don't need to manually restore the input queue; `TurnLoop` distinguishes between interrupted input, unhandled input, and newly arrived input after recovery — applications only need to declare how these inputs re-enter subsequent turns.
