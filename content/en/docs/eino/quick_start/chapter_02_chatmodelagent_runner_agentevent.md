---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 2: ChatModelAgent, Runner, AgentEvent (Console multi-turn)"
weight: 2
---

Goal of this chapter: introduce ADK execution abstractions (Agent + Runner) and implement a multi-turn conversation in a Console program.

## Code location

- Entry code: [cmd/ch02/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch02/main.go)

## Full tutorial

This page is a website-friendly overview. For the full runnable walkthrough, see:

- [ch02_chatmodel_agent_runner_console.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch02_chatmodel_agent_runner_console.md)

## What you learn

- Why “Agent” is a higher-level abstraction than “ChatModel”: it owns the interaction loop and tool routing.
- What “Runner” does: it provides the runtime (streaming, events, interrupt/resume plumbing) for running an Agent.
- How “AgentEvent” models the execution stream: user input, model output, tool calls, tool results, and lifecycle signals.
