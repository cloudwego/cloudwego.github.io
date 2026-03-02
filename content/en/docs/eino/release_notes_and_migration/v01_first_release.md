---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: v0.1.*-first release'
weight: 1
---

## v0.1.6

> Release date: 2024-11-04

### Features

- NewTool, InferTool generic parameters now support struct
- Deprecated WithGraphRunOption(), added new WithRuntimeMaxSteps method
- Adjusted ToolsNode NodeName, added TooCallbackInput/Output struct
- Added MultiQuery, Router two types of Retriever in Flow
- Added document.Loader, document.Transformer two component abstractions
- Added file_url, audio_url, video_url three types to Message MultiPart

### BugFix

- Error handling when InputKey does not exist in the map for nodes with InputKey
- Adjusted Name, Type, ID combination method when merging Message Stream (ConcatMessage)

## v0.1.5

> Release date: 2024-10-25

### Features

- When ConcatMessages, validate whether nil chunks exist in the Message stream, throw error if they do, preventing stream producers from inserting nil messages
- Added Type field in Message.ToolCall to represent ToolType, and added incremental merging of ToolType in ConcatMessages

## v0.1.4

> Release date: 2024-10-23

### Features

- Adjusted Chain implementation, wrapped Chain based on Graph[I, O]
- When upstream output node is an interface and downstream input node is an implementation of that interface, support attempting to assert upstream output interface as downstream input instance.
  - For example, now supports scenarios like: Node1[string, any] -> Node2[string, int]. In such scenarios, it previously threw an error at Compile time, now it attempts to assert any as string, and if assertion succeeds, continues execution.
- Added Type field to schema.Message

### BugFix

- Corrected Eino Callback RunInfo information during Tool execution
  - Corrected RunInfo Component and Type fields
  - ToolName used as RunInfo.Name
- Passthrough node now allows setting OutputKey

## v0.1.3

> Release date: 2024-10-17

### BugFix

- Fixed ToolsNode returning Message with extra ToolCalls causing model errors
  - This issue was introduced in v0.1.1's react agent support for tool return directly, which extended ToolsNode returned information. This patch uses a different approach to implement tool return directly, avoiding this issue.

## v0.1.2

> Release date: 2024-10-14

### Features

- StreamReader.Copy() method re-optimized to Goroutine Free Copy method. Prevents Goroutine leaks when business forgets to call StreamReader.Close()
- Validation check: Passthrough nodes do not allow adding InputKey/OutputKey
- Compile Callback Option now supports InputKey, OutputKey passback

## v0.1.1

> Release date: 2024-10-14

### Features

- React Agent supports static configuration of Tool ReturnDirectly

### BugFix

- Reverted new Stream Copy logic.
  - Due to implementing Goroutine Free Stream Copy, Recv could potentially hang. Expected to fix in next Patch

## v0.1.0

> Release date: 2024-10-12

### Features

- Support for ChatTemplate/ChatModel/Tool/LoaderAndSplitter/Indexer/Retriever/Embedding multiple component abstractions and implementations
- Support for Graph/Chain/StateGraph and other orchestration tools
- Based on whether input and output are streaming, supports 4 interaction modes with built-in Stream tools
- Flexible and extensible aspect design
