---
Description: ""
date: "2026-03-12"
lastmod: ""
tags: []
title: "Chapter 3: Memory and Session (persistent conversations)"
weight: 3
---

Goal of this chapter: persist conversation history and support session recovery across processes.

> ⚠️ Important note: **Memory, Session, and Store here are business-layer concepts**, not core Eino framework components.
>
> Eino focuses on “how to process messages”; “how to store messages” is entirely up to your application (DB/Redis/object storage/etc.). The implementation in this chapter is a simple reference you can replace.

## Code location

- Entry code: [cmd/ch03/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch03/main.go)

## Full tutorial

- [ch03_memory_session_jsonl.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch03_memory_session_jsonl.md)

## What you learn

- How to model “Session” as a stable ID and resume a conversation by reloading stored messages.
- A simple storage format (JSONL) as a baseline for implementing your own persistence layer.
- How to integrate persistence with the Agent/Runner loop without coupling it into Eino itself.
