---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.7.*-interrupt resume refactor'
weight: 7
---

## Version Overview

v0.7.0 is an **important milestone release** for the Eino framework. The core highlight is the **architecture-level refactoring of Human in the Loop (HITL) / Interrupt-Resume capabilities**, providing a more powerful and flexible interrupt-resume mechanism. It also introduces Skill middleware, ChatModel retry mechanism, multimodal tool support, and other core capabilities.

---

## v0.7.0

**Release Date**: 2025-11-20

### 🔥 Core Changes: Interrupt-Resume Architecture Refactor (#563)

v0.7.0 performed an architecture-level refactor of the interrupt-resume mechanism, with massive code changes (+7527/-1692 lines), involving major modifications to 28 files.

#### New Core Modules

- **compose/resume.go**: Provides type-safe resume state retrieval API
  - `GetInterruptState[T]`: Get the persisted state from last interrupt
  - `GetResumeContext`: Check if current component is the resume target
- **internal/core/interrupt.go**: Interrupt signal core definitions
  - `InterruptSignal`: Nested interrupt signal structure support
  - `InterruptState`: State and layer-specific payload support
  - `InterruptConfig`: Interrupt configuration parameters
- **internal/core/address.go**: Component address system
- **internal/core/resume.go**: Core implementation of resume logic

#### Refactored Core Modules

- **adk/interrupt.go**: ADK layer interrupt handling refactor (+238 lines)
- **compose/interrupt.go**: Orchestration layer interrupt handling refactor (+256 lines)
- **adk/workflow.go**: Workflow Agent supports interrupt-resume (+510 lines refactored)
- **compose/graph_run.go**: Graph execution interrupt-resume support
- **compose/tool_node.go**: Tool node interrupt support

#### New Resume Strategies

Two resume strategies are supported:

1. **Implicit "Resume All"**: Single "continue" button resumes all interrupt points
2. **Explicit "Targeted Resume"**: Independent resumption of specific interrupt points (recommended)

#### Agent Tool Interrupt Improvements

- Use `GetInterruptState` instead of manual state management
- Support `CompositeInterrupt` composite interrupts
- Agent Tool correctly propagates internal interrupt signals

### Other Improvements

- **ADK serialization enhancement** (#557): Fixed missing type registration for gob serialization in checkpoint
- **DeepAgent optimization** (#558): Automatically remove task tool when no sub-Agents
- **ChatModelAgent improvement** (#552): Correctly apply compose option when no tools configured
- **Plan-Execute enhancement** (#555): Correctly report error when no tool calls
- **MultiAgent fix** (#548): Fixed default summary prompt not working issue

---

## v0.7.1 - v0.7.36 Main Updates

### Interrupt-Resume Continuous Enhancement

Building on v0.7.0's architecture refactor, subsequent versions continue to improve interrupt-resume capabilities:

#### Tool Interrupt API (#691)

- **New tool interrupt API**: Support triggering interrupts during tool execution
- **Extended isResumeTarget**: Support descendant target identification

#### Nested Agent Interrupt Resume (#647, #672)

- **Nested preset/workflow Agents**: Support interrupt-resume for arbitrary level Agent wrappers
- **Wrapped FlowAgents**: Correctly handle deterministic transfer skip

#### Checkpoint Enhancement

- **Node input persistence** (#634): Persist rerun node inputs in checkpoint
- **Graph resume improvement** (#695): Correctly enable ProcessState in OnStart during resume
- **Serialization fixes** (#608, #606): Fixed array/slice deserialization panic

#### Tool Error Handling (#583)

- Tool error handler no longer wraps interrupt error

### Major New Features

#### Skill Middleware (#661)

- Encapsulate reusable capabilities as Skills
- Extend Agent capabilities through middleware
- Optimized Skill prompts (#724)

#### ChatModel Retry Mechanism (#635)

- ChatModelAgent supports automatic retry on call failure
- Configurable ModelRetryConfig (#648)
- Added WillRetryError for error chain checking (#707)

#### Multimodal Tool Support (#760)

- compose module enhanced tool interface
- Support multimodal input and output

#### Nested Graph State Access (#584)

- Nested Graph can access parent Graph state

### Feature Enhancements

- **Execute Backend & Tool** (#682)
- **OutputKey configuration** (#711): Store final answer to SessionValues
- **Nested Runner shared session** (#645)
- **Agent event emission** (#620, #791)
- **ToJSONSchema deterministic output** (#630)
- **Token usage details** (#629)

### Bug Fixes

- AfterChatModel returns modified message (#717, #792)
- Loop Agent BreakLoopAction interrupt (#814)
- Sub-Agent error terminates loop Agent (#813)
- Streaming execution command no output error (#790)
- DeepAgent auto instruction rendering (#726)
- Graph duplicate skip reporting (#694)
- Graph unique successors (#693)

### Documentation & Engineering

- Rewrote README focusing on ADK (#748, #686, #719)
- Enabled golangci-lint (#602)
- Added code style guide (#673)
