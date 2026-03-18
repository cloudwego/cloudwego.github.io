---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.5.*-ADK implementation'
weight: 5
---

## Version Overview

v0.5.0 is an important milestone release that introduces the **ADK (Agent Development Kit)** framework. ADK provides a complete set of intelligent agent development tools, supporting Agent orchestration, preset Agents, session management, interrupt and resume, and other core capabilities.

---

## v0.5.0

**Release Date**: 2025-09-10

### Major New Features

#### ADK Framework (#262)

ADK is a complete solution for intelligent agent development, mainly including:

- **ChatModelAgent**: Basic intelligent agent implementation based on large language models
  - Support MaxIterations configuration
  - Support tool calling
  - Streaming output support
- **Agent as Tool**: Support wrapping Agent as a tool for other Agents to call
- **Preset Multi-Agent Patterns**:
  - **Supervisor**: Supervisor pattern, where a main Agent coordinates multiple sub-Agents
  - **Sequential**: Sequential execution pattern, Agents execute in order and inherit context
  - **Plan-Execute-Replan**: Plan-Execute-Replan pattern
- **Session Management**:
  - Session event storage and management
  - Session Values support
  - History Rewriter capability
- **Interrupt and Resume**:
  - Support Agent execution interrupt
  - Support resume execution from checkpoint
  - Deterministic Transfer interrupt resume support
- **Agent Run Options**:
  - `WithSessionValues` supports passing session-level variables
  - Agent CallOption extension

---

## v0.5.1 - v0.5.15 Main Updates

### Feature Enhancements

- **DeepAgent preset implementation** (#540): Support deep Agent pattern
- **Agent middleware support** (#533): Allow extending Agent behavior through middleware
- **Global callback support** (#512): Built-in Agent supports global Callbacks
- **MessageRewriter configuration** (#496): React Agent supports message rewriting
- **BreakLoopAction definition** (#492): Support loop Agent interruption
- **Cancel interrupt support** (#425): Support canceling ongoing interrupt operations
- **Multimodal support**:
  - Message added multimodal output content (#459)
  - Default prompt template supports multimodal (#470)
  - Format function supports UserInputMultiContent (#516)

### Bug Fixes

- Fixed ChatModelAgent max step calculation (#549)
- Fixed Session only storing events with output (#503)
- Fixed Sequential Agent exit on error issue (#484)
- Fixed Workflow only executing action on last event (#463)
- Fixed ChatModelAgent return directly tool panic (#464)
- Fixed Go 1.25 compilation error (#457)
- Fixed empty slice and empty field serialization issues (#473)
