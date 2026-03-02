---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: v0.2.*-second release'
weight: 2
---

## v0.2.6

> Release date: 2024-11-27

### Features

- Added streaming Pre, Post StateHandler
- Support for StateChain
- Added MessageParser node to convert ChatModel output Message to business-defined struct
  - Parse(ctx context.Context, m *Message) (T, error)
- Support for WithNodeKey() when Chain AppendNode

### BugFix

- Fixed first Chunk being modified due to not deep copying during ConcatMessage.
- When ConcatMessage, FinishReason only keeps the valid value from the last Chunk

## v0.2.5

> Release date: 2024-11-21

### BugFix

- Fixed panic caused by Gonja disabling include and other keywords

## v0.2.4

> Release date: 2024-11-20

### Features

- Added TokenUsage field in Eino Message ResponseMeta
- Eino Message ToolsCall sorted by index

### BugFix

## v0.2.3

> Release date: 2024-11-12

### Features

- Graph calls support context Timeout and Cancel

### BugFix

- FinishReason may be returned in any chunk, not necessarily in the last chunk
- callbacks.HandlerBuilder no longer provides default Needed() method. This method defaults to return false, which causes all aspect functions to become ineffective when embedding callbacks.HandlerBuilder

## v0.2.2

> Release date: 2024-11-12

### Features

- Added FinishReason field in Message
- Added GetState[T]() method to get State struct in nodes
- Lazy Init Gonja SDK

### BugFix

## v0.2.1

> Release date: 2024-11-07

### BugFix

- Fixed the SSTI vulnerability in the Jinja chat template

## v0.2.0

> Release date: 2024-11-07

### Features

- Callback API refactoring (compatible update)

  - For component implementers: Hide and deprecate callbacks.Manager, provide simpler tool functions for injecting callback aspects.
  - For Handler implementers: Provide template methods for quick implementation of callbacks.Handler, encapsulating details such as component type judgment, input/output type assertion and conversion. Users only need to provide specific implementations of specific callback methods for specific components.
  - Runtime mechanism: For a specific callback aspect timing during a run, additionally filter out the specific handlers that need to be executed based on component type and the specific methods implemented by the Handler.
- Added Host Multi-Agent: Implement Host mode Multi-Agent, where Host performs intent recognition then jumps to various Specialist Agents for specific generation.
- React Agent API changes (incompatible)

  - Removed AgentCallback definition, changed to using BuildAgentCallback tool function to quickly inject ChatModel and Tool CallbackHandlers. Usage:

    ```go
    func BuildAgentCallback(modelHandler *model.CallbackHandler, toolHandler *tool.CallbackHandler) callbacks.Handler {
        return template.NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
    }
    ```

    - This aligns AgentCallback semantics with components, can return ctx, can use extended tool.CallbackInput, tool.CallbackOutput.
  - Removed react.Option definition. React Agent now uses the general agent.Option definition, facilitating combination and orchestration at the multi-agent level.

    - No longer need WithAgentCallback to inject special AgentCallback, new usage:

    ```
    agent.WithComposeOptions(compose.WithCallbacks(xxxCallbackHandler))
    ```
- Added Document Parser interface definition: As a dependency of the Loader component, responsible for parsing io.Reader into Document, and provides ExtParser implementation for parsing based on file extension.

### BugFix

- Fixed null pointer exception that may be caused by embedding.GetCommonOptions and indexer.GetCommonOptions not null-checking apply.
- Graph runtime preProcessor and postProcessor use current ctx.

## v0.2.0-dev.1

> Release date: 2024-11-05

### Features

- Initial design and support for Checkpoint mechanism, experimental preview

### BugFix
