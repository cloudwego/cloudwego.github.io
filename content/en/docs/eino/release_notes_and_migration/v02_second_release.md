---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.2.*-second release'
weight: 2
---

## v0.2.6

> Release Date: 2024-11-27

### Features

- Added streaming Pre and Post StateHandler
- Support for StateChain
- Added MessageParser node to convert ChatModel output Message to business-customized structures
  - Parse(ctx context.Context, m *Message) (T, error)
- Support for WithNodeKey() when Chain AppendNode

### BugFix

- Fixed the issue where the first Chunk was modified during ConcatMessage due to lack of deep Copy.
- During ConcatMessage, FinishReason now only retains the valid value from the last Chunk

## v0.2.5

> Release Date: 2024-11-21

### BugFix

- Fixed panic caused by disabling keywords like include in Gonja

## v0.2.4

> Release Date: 2024-11-20

### Features

- Added TokenUsage field in Eino Message ResponseMeta
- Eino Message ToolsCall sorted by index

### BugFix

## v0.2.3

> Release Date: 2024-11-12

### Features

- Support for context Timeout and Cancel during Graph invocation

### BugFix

- FinishReason may be returned in any chunk, not necessarily in the last chunk
- callbacks.HandlerBuilder no longer provides a default Needed() method. This method defaults to returning false, which causes all aspect functions to fail in embedded callbacks.HandlerBuilder scenarios

## v0.2.2

> Release Date: 2024-11-12

### Features

- Added FinishReason field in Message
- Added GetState[T]() method to get State struct in nodes
- Lazy Init Gonja SDK

### BugFix

## v0.2.1

> Release Date: 2024-11-07

### BugFix

- Fixed the SSTI vulnerability in the Jinja chat template [langchaingo has gonja template injection vulnerability](https://bytedance.larkoffice.com/docx/UvqxdlFfSoTIr1xtsQ5cIZTVn2b)

## v0.2.0

> Release Date: 2024-11-07

### Features

- Callback API refactoring (compatible update)

  - For component implementers: Hidden and deprecated callbacks.Manager, providing simpler utility functions for injecting callback aspects.
  - For Handler implementers: Provides template methods for quick callbacks.Handler implementation, encapsulating details such as component type checking, input/output type assertion and conversion. Users only need to provide specific implementations of specific callback methods for specific components.
  - Runtime mechanism: For a specific callback aspect timing during a run, additional filtering of handlers to execute is performed based on component type and specific methods implemented by Handler.
- Added Host Multi-Agent: Implemented Host mode Multi-Agent, where Host performs intent recognition and then redirects to various Specialist Agents for specific generation.
- React Agent API changes (incompatible)

  - Removed AgentCallback definition, changed to quickly inject ChatModel and Tool CallbackHandlers through BuildAgentCallback utility function. Usage:

    ```go
    func BuildAgentCallback(modelHandler *model.CallbackHandler, toolHandler *tool.CallbackHandler) callbacks.Handler {
        return template.NewHandlerHelper().ChatModel(modelHandler).Tool(toolHandler).Handler()
    }
    ```

    - This achieves semantic alignment between AgentCallback and components, allowing ctx to be returned and using extended tool.CallbackInput, tool.CallbackOutput.
  - Removed react.Option definition. React Agent now uses the common agent.Option definition for Agent, facilitating orchestration at the multi-agent level.

    - WithAgentCallback is no longer needed to inject special AgentCallback, new usage:

    ```
    agent.WithComposeOptions(compose.WithCallbacks(xxxCallbackHandler))
    ```
- Added Document Parser interface definition: As a dependency of the Loader component, responsible for parsing io.Reader into Document, and provides ExtParser implementation for parsing based on file extension.

### BugFix

- Fixed potential null pointer exception caused by embedding.GetCommonOptions and indexer.GetCommonOptions not checking apply for null.
- During Graph runtime, preProcessor and postProcessor use the current ctx.

## v0.2.0-dev.1

> Release Date: 2024-11-05

### Features

- Initial design and support for Checkpoint mechanism, available for early trial

### BugFix
