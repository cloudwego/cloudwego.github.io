---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 4: Tools and file system access"
weight: 4
---

Goal of this chapter: add Tool capabilities so the Agent can access the file system.

## Why Tools

In Chapters 1–3, the Agent can only chat; it cannot perform real actions.

Typical limitations without tools:

- Only generates text responses
- Cannot access external resources (files/APIs/databases)
- Cannot execute real tasks (compute/query/modify)

## Code location

- Entry code: [cmd/ch04/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch04/main.go)

## Full tutorial

- [ch04_tool_backend_filesystem.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch04_tool_backend_filesystem.md)

## What you learn

- How to expose file reads as tools and let the model call them through the Agent.
- How to keep tool boundaries explicit (inputs/outputs) so they are testable and observable.
