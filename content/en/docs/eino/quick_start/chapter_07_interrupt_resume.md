---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: "Chapter 7: Interrupt/Resume (human-in-the-loop)"
weight: 7
---

Goal of this chapter: understand Interrupt/Resume and implement an approval flow so users can confirm before sensitive tool operations.

## Code location

- Entry code: [cmd/ch07/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch07/main.go)

## Full tutorial

- [ch07_interrupt_resume.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch07_interrupt_resume.md)

## What you learn

- How to pause an execution at a safe boundary and request user input.
- How to resume from checkpoints to support long-running or approval-gated tasks.
