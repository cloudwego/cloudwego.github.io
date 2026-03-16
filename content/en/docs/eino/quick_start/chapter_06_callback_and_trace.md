---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 6: Callback and Trace (observability)"
weight: 6
---

Goal of this chapter: understand the Callback mechanism and integrate tracing/observability for the Agent execution.

## Code location

- Entry code: [cmd/ch06/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch06/main.go)

## Full tutorial

- [ch06_callback.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch06_callback.md)

## What you learn

- How callbacks expose lifecycle hooks for key execution points (model calls, tool calls, streaming chunks).
- How to build logging/metrics/tracing without coupling instrumentation into core logic.
