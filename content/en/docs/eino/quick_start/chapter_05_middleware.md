---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: "Chapter 5: Middleware (cross-cutting concerns)"
weight: 5
---

Goal of this chapter: understand the middleware pattern and implement Tool error handling and ChatModel retry.

## Why Middleware

Once you add tools (Chapter 4), failures become normal in real-world systems:

- Tool failures: file not found, invalid args, missing permissions, etc.
- ChatModel failures: rate limits (429), network timeouts, temporary outages, etc.

Middleware provides a single place to handle these cross-cutting concerns without scattering logic throughout your business code.

## Code location

- Entry code: [cmd/ch05/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go)

## Full tutorial

- [ch05_middleware.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch05_middleware.md)

## What you learn

- How to wrap tool execution with consistent error handling.
- How to add retry policies around ChatModel calls in a composable way.
- How middleware keeps the Agent core clean and extensible.
