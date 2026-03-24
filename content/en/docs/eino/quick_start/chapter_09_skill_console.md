---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: "Chapter 9: Skill (Console)"
weight: 9
---

Goal of this chapter: on top of Chapter 8 (RAG + Interrupt/Resume + Checkpoint), introduce the `skill` middleware so the agent can discover and load reusable skill documents (`SKILL.md`) and invoke them via tool calls.

## Code location

- Entry: [cmd/ch09/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go)
- Sync script: [scripts/sync_eino_ext_skills.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/scripts/sync_eino_ext_skills.go)

## Prerequisites

- Same as Chapter 1: configure a ChatModel (OpenAI or Ark)
- Prepare skills provided by the eino-ext PR (`eino-guide` / `eino-component` / `eino-compose` / `eino-agent`)

Why these four?

ChatWithEino is positioned as “help users learn Eino and assist with Eino coding using AI.” These four skills cover the key knowledge areas:

- `eino-guide`: entry point and navigation (where to start, how to run quickly)
- `eino-component`: component interfaces and implementation references (Model/Embedding/Retriever/Tool/Callback, etc.)
- `eino-compose`: orchestration and deterministic workflow references (Graph/Chain/Workflow, etc.)
- `eino-agent`: ADK/Agent references (Agent/Runner/Middleware/Filesystem/Human-in-the-loop, etc.)

Skill sources:

- Local path to the `eino-ext` repository (the script reads `<src>/skills/...`)
- Or any directory where skills are already installed (containing the above subdirectories)

## From Graph Tool to Skill: why “skill docs”

Chapter 8 solves “how to make a complex workflow callable as a Tool” (Graph Tool). But for a framework-learning/development assistant agent, there is another problem: **how to inject stable, reusable knowledge and instructions into the agent, and let it load them on demand at runtime**.

That is the role of Skills:

- **Tool** is more like an “action/capability”: read files, run workflows, call external systems
- **Skill** is more like a “reusable knowledge/instruction pack”: a set of markdown files (`SKILL.md` + `reference/*.md`) that describe “how to do something”

Simple analogy:

- **Tool** = “what you can do” (function/interface)
- **Skill** = “how to do it” (reusable handbook/manual)

## Run

In `quickstart/chatwitheino`, do:

### 1) Sync eino-ext skills into a local directory

To let the `skill` middleware discover skills, place them under a single directory and follow the scan convention:

- `EINO_EXT_SKILLS_DIR/<skillName>/SKILL.md`

Sync command (recommended):

```bash
go run ./scripts/sync_eino_ext_skills.go -src /path/to/eino-ext -dest ./skills/eino-ext -clean
```

Notes:

- `-src` supports two forms:
  - The root of the `eino-ext` repo (the script reads `<src>/skills/...`)
  - A directory where skills are already installed (should contain `eino-guide/`, `eino-component/`, etc.)
- `-dest` defaults to `./skills/eino-ext` (can be omitted)

### 2) Start Chapter 9

```bash
EINO_EXT_SKILLS_DIR=/absolute/path/to/chatwitheino/skills/eino-ext go run ./cmd/ch09
```

Output example (snippet):

```
Skills dir: /.../skills/eino-ext
Enter your message (empty line to exit):
```

## Enable Skill in DeepAgent

Skill invocation is not automatic. You must register the `skill` middleware when building the agent. It’s a three-step setup:

1. Use a local filesystem backend (this chapter uses `eino-ext/adk/backend/local`) to provide file reading/Glob
2. Use `skill.NewBackendFromFilesystem` to turn `EINO_EXT_SKILLS_DIR` into a skill backend
3. Use `skill.NewMiddleware` to create the middleware and attach it to DeepAgent’s `Handlers`

**Key snippet (simplified; see cmd/ch09/main.go for full code):**

```go
backend, _ := localbk.NewBackend(ctx, &localbk.Config{})

skillBackend, _ := skill.NewBackendFromFilesystem(ctx, &skill.BackendFromFilesystemConfig{
    Backend: backend,
    BaseDir: skillsDir, // = $EINO_EXT_SKILLS_DIR
})
skillMiddleware, _ := skill.NewMiddleware(ctx, &skill.Config{
    Backend: skillBackend,
})

agent, _ := deep.New(ctx, &deep.Config{
    ChatModel: cm,
    Backend: backend,
    StreamingShell: backend,
    Handlers: []adk.ChatModelAgentMiddleware{
        skillMiddleware,
        // ... other middlewares like approval/safeTool/retry
    },
})
```

Notes:

- This quickstart checks `EINO_EXT_SKILLS_DIR` existence at runtime: if it exists, it registers `skillMiddleware`; otherwise it skips it (the agent still runs and can use RAG tools).
- Skill tool input is JSON: `{"skill": "<skillName>"}`, e.g. `{"skill":"eino-guide"}`.

## Quick verification (recommended)

After startup, send a prompt that forces a skill tool call to verify that skills are discovered and loadable:

```
Use the skill tool with skill="eino-guide" and tell me what the entry point is for getting started.
```

You should see output similar to:

- `[tool result] Launching skill: eino-guide`
- Tool result includes `Base directory for this skill: .../eino-guide`

## What you will see

- When the model calls the skill tool, the console prints:
  - `[tool call] ...`
  - `[tool result] ...` (truncated)
- Sessions are stored under `SESSION_DIR` (default `./data/sessions`) and can be resumed:
  - `go run ./cmd/ch09 --session <id>`
