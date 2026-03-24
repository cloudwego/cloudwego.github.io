---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: PlanTask
weight: 4
---

# PlanTask Middleware

adk/middlewares/plantask

> 💡
> This middleware was introduced in [v0.8.0.Beta](https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1).

## Overview

`plantask` is a task management middleware that allows Agents to create and manage task lists. The middleware injects four tools through the `BeforeAgent` hook:

- **TaskCreate**: Create a task
- **TaskGet**: View task details
- **TaskUpdate**: Update a task
- **TaskList**: List all tasks

Main purposes:

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
│  │    - TaskCreate                                                    │  │
│  │    - TaskGet                                                       │  │
│  │    - TaskUpdate                                                    │  │
│  │    - TaskList                                                      │  │
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
    BaseDir string   // Task file directory, required
}
```

- Note that the Backend implementation should be isolated by session, with different sessions corresponding to different Backends (task lists)

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
    Blocks      []string       `json:"blocks"`      // Tasks blocked by this one
    BlockedBy   []string       `json:"blockedBy"`   // Tasks blocking this one
    ActiveForm  string         `json:"activeForm"`  // Active form text
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

Status transition: `pending` → `in_progress` → `completed`, any status can be directly `deleted`.

---

## Tools

### TaskCreate

Create a task.

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>Yes</td><td>Title</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>Yes</td><td>Description</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>No</td><td>Active form text, e.g., "Running tests"</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>No</td><td>Custom data</td></tr>
</table>

When to use:

- The task is relatively complex with 3 or more steps
- The user has given a list of things to do
- You need to show progress to the user

When not to use:

- It's just a simple task
- Something that can be done quickly

### TaskGet

View task details.

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>Yes</td><td>Task ID</td></tr>
</table>

Returns complete information about the task: title, description, status, dependencies, etc.

### TaskUpdate

Update a task.

<table>
<tr><td>Parameter</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>taskId</pre></td><td>string</td><td>Yes</td><td>Task ID</td></tr>
<tr><td><pre>subject</pre></td><td>string</td><td>No</td><td>New title</td></tr>
<tr><td><pre>description</pre></td><td>string</td><td>No</td><td>New description</td></tr>
<tr><td><pre>activeForm</pre></td><td>string</td><td>No</td><td>New active form text</td></tr>
<tr><td><pre>status</pre></td><td>string</td><td>No</td><td>New status</td></tr>
<tr><td><pre>addBlocks</pre></td><td>[]string</td><td>No</td><td>Add blocked tasks</td></tr>
<tr><td><pre>addBlockedBy</pre></td><td>[]string</td><td>No</td><td>Add tasks blocking this one</td></tr>
<tr><td><pre>owner</pre></td><td>string</td><td>No</td><td>Responsible agent</td></tr>
<tr><td><pre>metadata</pre></td><td>object</td><td>No</td><td>Custom data (set to null to delete)</td></tr>
</table>

Notes:

- `status: "deleted"` will directly delete the task file
- Circular dependencies are checked when adding dependencies
- Automatic cleanup occurs when all tasks are completed

### TaskList

List all tasks, no parameters required.

Returns a summary of each task: ID, status, title, responsible agent, dependencies.

---

## Usage Example

```go
ctx := context.Background()

// The plantask middleware should normally be session-scoped
// Different sessions correspond to different task lists
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
   - Change #1 to in_progress
       │
       ▼
6. When done, TaskUpdate
   - Change #1 to completed
       │
       ▼
7. Loop 4-6 until all completed
       │
       ▼
8. Automatic cleanup
```

---

## Dependency Management

- **blocks**: These tasks can start after I complete
- **blockedBy**: I can start after these tasks complete

```
Task #1 (blocks: ["2"])  ────►  Task #2 (blockedBy: ["1"])

#2 can only start after #1 completes
```

Circular dependencies will throw an error:

```
#1 blocks #2
#2 blocks #1  ← Not allowed, circular
```

---

## Automatic Cleanup

When all tasks are `completed`, all task files will be automatically deleted.

---

## Notes

- Task files are stored in JSON format in the `BaseDir` directory, with filenames as `{id}.json`
- The `.highwatermark` file is used to record the maximum assigned task ID, ensuring IDs don't repeat
- All tool operations are protected by mutex locks and are concurrency-safe
- The tool descriptions contain detailed usage guidelines that the Agent will follow

---

## Multi-language Support

Tool descriptions support Chinese and English switching via `adk.SetLanguage()`:

```go
// Use Chinese descriptions
adk.SetLanguage(adk.LanguageChinese)

// Use English descriptions (default)
adk.SetLanguage(adk.LanguageEnglish)
```

This setting is global and affects all ADK built-in prompts and tool descriptions.
