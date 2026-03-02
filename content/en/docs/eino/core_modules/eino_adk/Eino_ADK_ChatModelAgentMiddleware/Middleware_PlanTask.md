---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: PlanTask'
weight: 4
---

# PlanTask Middleware

adk/middlewares/plantask

> 💡
> This middleware was introduced in [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13).

## Overview

`plantask` is a task management middleware that allows Agents to create and manage task lists. The middleware injects four tools via the `BeforeAgent` hook:

- **TaskCreate**: Create tasks
- **TaskGet**: View task details
- **TaskUpdate**: Update tasks
- **TaskList**: List all tasks

Main use cases:

- Track progress of complex tasks
- Break large tasks into smaller steps
- Manage dependencies between tasks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Agent                                      │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  BeforeAgent: Inject task tools                                   │  │
│  │    - TaskCreate                                                   │  │
│  │    - TaskGet                                                      │  │
│  │    - TaskUpdate                                                   │  │
│  │    - TaskList                                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Backend                                     │
│                                                                         │
│  Storage structure:                                                     │
│    baseDir/                                                             │
│    ├── .highwatermark    # ID counter                                   │
│    ├── 1.json            # Task #1                                      │
│    ├── 2.json            # Task #2                                      │
│    └── ...                                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

```go
type Config struct {
    Backend Backend  // Storage backend, required
    BaseDir string   // Task files directory, required
}
```

- Note that the Backend implementation should be isolated at the session level, with different sessions corresponding to different Backends (task lists)

---

## Backend Interface

```go
type Backend interface {
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    Read(ctx context.Context, req *ReadRequest) (string, error)
    Write(ctx context.Context, req *WriteRequest) error
    Delete(ctx context.Context, req *DeleteRequest) error
}
```

---

## Task Structure

```go
type task struct {
    ID          string         `json:"id"`          // Task ID
    Subject     string         `json:"subject"`     // Title
    Description string         `json:"description"` // Description
    Status      string         `json:"status"`      // Status
    Blocks      []string       `json:"blocks"`      // Which tasks this blocks
    BlockedBy   []string       `json:"blockedBy"`   // Which tasks block this
    ActiveForm  string         `json:"activeForm"`  // In-progress description
    Owner       string         `json:"owner"`       // Responsible agent
    Metadata    map[string]any `json:"metadata"`    // Custom data
}
```

### Status

<table>
<tr><td>Status</td><td>Description</td></tr>
<tr><td><pre>pending</pre></td><td>Pending (default)</td></tr>
<tr><td><pre>in_progress</pre></td><td>In progress</td></tr>
<tr><td><pre>completed</pre></td><td>Completed</td></tr>
<tr><td><pre>deleted</pre></td><td>Deleted (will delete the file)</td></tr>
</table>

Status flow: `pending` → `in_progress` → `completed`, any status can be directly `deleted`.

---

## Tools

### TaskCreate

Create a task.

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>Yes</td><td>Title</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>Yes</td><td>Description</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>No</td><td>In-progress description, e.g., "Running tests"</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>No</td><td>Custom data</td></tr>
</table>

When to use:

- Task is complex, has more than 3 steps
- User gave a bunch of things to do
- Need to show progress to the user

When not to use:

- Just a simple task
- Can be done quickly

### TaskGet

View task details.

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>Yes</td><td>Task ID</td></tr>
</table>

Returns complete task information: title, description, status, dependencies, etc.

### TaskUpdate

Update a task.

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>Yes</td><td>Task ID</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>No</td><td>New title</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>No</td><td>New description</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>No</td><td>New in-progress description</td></tr>
<tr><td><pre>status</pre></td><td>string</td><td>No</td><td>New status</td></tr>
<tr><td><pre>addBlocks</pre></td><td>[]string</td><td>No</td><td>Add blocked tasks</td></tr>
<tr><td><pre>addBlockedBy</pre></td><td>[]string</td><td>No</td><td>Add blocking tasks</td></tr>
<tr><td><pre>owner</pre></td><td>string</td><td>No</td><td>Responsible agent</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>No</td><td>Custom data (set null to delete)</td></tr>
</table>

Notes:

- `status: "deleted"` will delete the task file directly
- Circular dependencies are checked when adding dependencies
- Tasks are automatically cleaned up after all are completed

### TaskList

List all tasks, no parameters needed.

Returns a summary of each task: ID, status, title, responsible agent, dependencies.

---

## Usage Example

```go
ctx := context.Background()

// plantask middleware should normally be at session level
// different sessions correspond to different task lists
middleware, err := plantask.New(ctx, &plantask.Config{
    Backend: myBackend,
    BaseDir: "/tasks",
})
if err != nil {
    return err
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    myModel,
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

### Typical Flow

```
1. Receive complex task
       │
       ▼
2. TaskCreate to create tasks
   - #1: Analyze requirements
   - #2: Write code
       │
       ▼
3. TaskUpdate to set dependencies
   - #2 depends on #1
   - #3 depends on #2
       │
       ▼
4. TaskList to see what tasks exist
       │
       ▼
5. TaskUpdate to start working
   - #1 changed to in_progress
       │
       ▼
6. Done, TaskUpdate
   - #1 changed to completed
       │
       ▼
7. Loop 4-6 until all complete
       │
       ▼
8. Auto cleanup
```

---

## Dependency Management

- **blocks**: After I complete, these tasks can start
- **blockedBy**: After these tasks complete, I can start

```
Task #1 (blocks: ["2"])  ────►  Task #2 (blockedBy: ["1"])

#2 can start after #1 completes
```

Circular dependencies will error:

```
#1 blocks #2
#2 blocks #1  ← Not allowed, circular
```

---

## Auto Cleanup

After all tasks are `completed`, task files will be automatically deleted.

---

## Notes

- Task files are stored in JSON format in the `BaseDir` directory, filename is `{id}.json`
- `.highwatermark` file records the maximum allocated task ID to ensure IDs don't repeat
- All tool operations are protected by mutex locks, concurrent-safe
- Tool descriptions already contain detailed usage guides, Agent will use tools according to these guides

---

## Multi-language Support

Tool descriptions support Chinese and English switching via `adk.SetLanguage()`:

```go
// Use Chinese description
adk.SetLanguage(adk.LanguageChinese)

// Use English description (default)
adk.SetLanguage(adk.LanguageEnglish)
```

This setting is global and affects all ADK built-in prompts and tool descriptions.
