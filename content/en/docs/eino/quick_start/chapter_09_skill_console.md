---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: "Chapter 9: Skill (Console)"
weight: 9
---

Goal of this chapter: building on Chapter 8 (RAG + Interrupt/Resume + Checkpoint), introduce the `skill` middleware so the Agent can discover and load a set of reusable skill documents (`SKILL.md`) and invoke them via tool calls when needed.

## Code Location

- Entry code: [cmd/ch09/main.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch09/main.go)
- Sync script: [scripts/sync_eino_ext_skills.go](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/scripts/sync_eino_ext_skills.go)

## Prerequisites

- Same as Chapter 1: you need a configured ChatModel (OpenAI or Ark)
- Prepare the skills provided by the eino-ext PR (`eino-guide` / `eino-component` / `eino-compose` / `eino-agent`)

Why these four?

ChatWithEino is positioned as "helping users learn the Eino framework and assisting with Eino coding using AI." These four skills cover exactly the key knowledge areas needed for this goal:

- `eino-guide`: learning entry point and navigation (where to start, how to get running quickly)
- `eino-component`: Component interfaces and implementation references (Model/Embedding/Retriever/Tool/Callback, etc.)
- `eino-compose`: orchestration and deterministic workflow references (Graph/Chain/Workflow, etc.)
- `eino-agent`: ADK/Agent references (Agent, Runner, Middleware, Filesystem, Human-in-the-loop, etc.)

Skill sources can be:

- Local path to the `eino-ext` repository (the script automatically reads `<src>/skills/...`)
- Or a directory where you have already installed skills (containing the above four subdirectories)

## From Graph Tool to Skill: Why "Skill Documents" Are Needed

Chapter 8 solved "how to make a complex workflow callable as a Tool" (Graph Tool). But when building a framework-learning/development-assistance Agent, you encounter another type of problem: **how to inject a set of stable, reusable knowledge and instructions into the Agent, and let it load them on demand at runtime.**

This is the role of Skills:

- **Tool** is more like an "action/capability": read files, run workflows, call external systems
- **Skill** is more like a "reusable knowledge/instruction pack": a set of markdown files (`SKILL.md` + `reference/*.md`) that describe "how to do a certain type of task"

Simple analogy:

- **Tool** = "what can be done" (function/interface)
- **Skill** = "how to do it" (reusable handbook/manual)

## Running

In the `quickstart/chatwitheino` directory, run:

### 1) Sync eino-ext skills to a local directory

To let the `skill` middleware "discover" these skills, you need to place them under a unified directory that follows the scan convention:

- `EINO_EXT_SKILLS_DIR/<skillName>/SKILL.md`

Sync command (recommended):

```bash
go run ./scripts/sync_eino_ext_skills.go -src /path/to/eino-ext -dest ./skills/eino-ext -clean
```

Notes:

- `-src` supports two forms:
  - The root of the `eino-ext` repository (the script automatically reads `<src>/skills/...`)
  - A directory where you have already installed skills (should contain `eino-guide/`, `eino-component/`, etc. subdirectories)
- `-dest` defaults to `./skills/eino-ext` (can be omitted)

### 2) Start Chapter 9

```bash
EINO_EXT_SKILLS_DIR=/absolute/path/to/chatwitheino/skills/eino-ext go run ./cmd/ch09
```

Output example (excerpt):

```
Skills dir: /.../skills/eino-ext
Enter your message (empty line to exit):
```

## Enabling Skill in DeepAgent

"Skills being callable" does not happen automatically in this chapter — you need to register the `skill` middleware when building the Agent. The core is three steps:

1. Use a local filesystem backend (this chapter uses `eino-ext/adk/backend/local`) to provide file reading/Glob capabilities
2. Use `skill.NewBackendFromFilesystem` to turn `EINO_EXT_SKILLS_DIR` into a Skill Backend
3. Use `skill.NewMiddleware` to generate the middleware and attach it to DeepAgent's `Handlers`

**Key code snippet (Note: this is a simplified snippet that cannot run directly. See** **cmd/ch09/main.go** **for the complete code):**

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

Additional notes:

- This quickstart checks for the existence of `EINO_EXT_SKILLS_DIR` at runtime: if it exists, `skillMiddleware` is registered; otherwise it is skipped (the agent can still chat and use RAG tools).
- The Skill tool input is JSON: `{"skill": "<skillName>"}`, e.g., `{"skill":"eino-guide"}`.

## Quick Verification (Recommended)

After startup, enter a prompt that explicitly asks the model to call the skill tool (to verify skills are discovered and loadable):

```
Use the skill tool with skill="eino-guide" and tell me what the entry point is for getting started.
```

You should see output similar to:

- `[tool result] Launching skill: eino-guide`
- Tool result includes `Base directory for this skill: .../eino-guide`

## What You Will See

- When the model calls the skill tool, the console prints:
  - `[tool call] ...`
  - `[tool result] ...` (result is displayed truncated)
- Sessions are stored under `SESSION_DIR` (default `./data/sessions`) and can be resumed:
  - `go run ./cmd/ch09 --session <id>`
