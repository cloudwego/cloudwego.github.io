---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: "Chapter 9: Skill (Console)"
weight: 9
---

Goal of this chapter: introduce the `skill` middleware so the Agent can discover and load reusable skill documents (`SKILL.md`) and use them on demand through tool calls.

## Code location

- Entry code: [cmd/ch09/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go)
- Sync script: [scripts/sync_eino_ext_skills.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/scripts/sync_eino_ext_skills.go)

## Full tutorial

- [ch09_skill.md](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/docs/ch09_skill.md)

## What you learn

- How “progressive disclosure” works for skills (index → load on demand).
- How to integrate skills into an Agent without permanently inflating prompt context.
