---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: Eino v0.8 Breaking Changes
weight: 1
---

> This document records all incompatible changes in the `alpha/08` branch compared to the `main` branch.

## 1. API Incompatible Changes

### 1.1 filesystem Shell Interface Rename

**Location**: `adk/filesystem/backend.go` **Change Description**: Shell-related interfaces have been renamed and no longer embed the `Backend` interface. **Before (main)**:

```go
type ShellBackend interface {
    Backend
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

type StreamingShellBackend interface {
    Backend
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

**After (alpha/08)**:

```go
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

**Impact**:

- `ShellBackend` renamed to `Shell`
- `StreamingShellBackend` renamed to `StreamingShell`
- Interfaces no longer embed `Backend`, if your implementation relies on composite interfaces, you need to implement them separately **Migration Guide**:

```go
// Before
type MyBackend struct {}
func (b *MyBackend) Execute(...) {...}
// MyBackend implementing ShellBackend needs to also implement all methods of Backend

// After
type MyShell struct {}
func (s *MyShell) Execute(...) {...}
// MyShell only needs to implement methods of the Shell interface
// If Backend functionality is also needed, implement both interfaces separately
```

---

## 2. Behavior Incompatible Changes

### 2.1 AgentEvent Emission Mechanism Change

**Location**: `adk/chatmodel.go`

**Change Description**: `ChatModelAgent`'s `AgentEvent` emission mechanism changed from eino callback mechanism to Middleware mechanism.

**Before (main)**:

- `AgentEvent` was sent through eino's callback mechanism
- If users customized ChatModel or Tool Decorator/Wrapper, and the original ChatModel/Tool had embedded Callback points internally, `AgentEvent` would be sent **inside** the Decorator/Wrapper
- This applies to all ChatModels implemented by eino-ext, but may not apply to most user-implemented Tools and first-party Tools provided by eino

**After (alpha/08)**:

- `AgentEvent` is sent through Middleware mechanism
- `AgentEvent` will be sent **outside** user-customized Decorator/Wrapper

**Impact**:

- Under normal circumstances, users won't notice this change
- If users previously implemented their own ChatModel or Tool Decorator/Wrapper, the relative position of event emission will change
- Position change may also cause `AgentEvent` content to change: previous events didn't include changes made by Decorator/Wrapper, current events will include them

**Reason for Change**:

- In normal business scenarios, events sent should include changes made by Decorator/Wrapper

**Migration Guide**:

If you previously wrapped ChatModel or Tool through Decorator/Wrapper, you need to implement the `ChatModelAgentMiddleware` interface instead:

```go
// Before: Wrap ChatModel through Decorator/Wrapper
type MyModelWrapper struct {
    inner model.BaseChatModel
}

func (w *MyModelWrapper) Generate(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // Custom logic
    return w.inner.Generate(ctx, input, opts...)
}

// After: Implement ChatModelAgentMiddleware's WrapModel method
type MyMiddleware struct{}

func (m *MyMiddleware) WrapModel(ctx context.Context, chatModel model.BaseChatModel, mc *ModelContext) (model.BaseChatModel, error) {
    return &myWrappedModel{inner: chatModel}, nil
}

// For Tool Wrapper, implement WrapInvokableToolCall / WrapStreamableToolCall and other methods instead
```

### 2.2 filesystem.ReadRequest.Offset Semantic Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `Offset` field changed from 0-based to 1-based. **Before (main)**:

```go
type ReadRequest struct {
    FilePath string
    // Offset is the 0-based line number to start reading from.
    Offset int
    Limit  int
}
```

**After (alpha/08)**:

```go
type ReadRequest struct {
    FilePath string
    // Offset specifies the starting line number (1-based) for reading.
    // Line 1 is the first line of the file.
    // Values < 1 will be treated as 1.
    Offset int
    Limit  int
}
```

**Migration Guide**:

```go
// Before: Read starting from line 0 (i.e., first line)
req := &ReadRequest{Offset: 0, Limit: 100}

// After: Read starting from line 1 (i.e., first line)
req := &ReadRequest{Offset: 1, Limit: 100}

// If originally using Offset: 10 to start from line 11
// Now need to use Offset: 11
```

---

### 2.3 filesystem.FileInfo.Path Semantic Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `FileInfo.Path` field is no longer guaranteed to be an absolute path. **Before (main)**:

```go
type FileInfo struct {
    // Path is the absolute path of the file or directory.
    Path string
}
```

**After (alpha/08)**:

```go
type FileInfo struct {
    // Path is the path of the file or directory, which can be a filename,
    // relative path, or absolute path.
    Path string
    // ...
}
```

**Impact**:

- Code that relies on `Path` being an absolute path may have issues
- Need to check and handle relative path cases

---

### 2.4 filesystem.WriteRequest Behavior Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `WriteRequest` write behavior changed from "error if file exists" to "overwrite if file exists". **Before (main)**:

```go
// WriteRequest comment:
// The file will be created if it does not exist, or error if file exists.
```

**After (alpha/08)**:

```go
// WriteRequest comment:
// Creates the file if it does not exist, overwrites if it exists.
```

**Impact**:

- Code that relied on "error if file exists" behavior will no longer error, but overwrite directly
- May cause unexpected data loss **Migration Guide**:
- If you need to preserve the original behavior, check if file exists before writing

---

### 2.5 GrepRequest.Pattern Semantic Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `GrepRequest.Pattern` changed from literal matching to regular expression matching. **Before (main)**:

```go
// Pattern is the literal string to search for. This is not a regular expression.
// The search performs an exact substring match within the file's content.
```

**After (alpha/08)**:

```go
// Pattern is the search pattern, supports full regular expression syntax.
// Uses ripgrep syntax (not grep).
```

**Impact**:

- Search patterns containing regular expression special characters will behave differently
- For example, searching for `interface{}` now needs to be escaped as `interface\{\}` **Migration Guide**:

```go
// Before: Literal search
req := &GrepRequest{Pattern: "interface{}"}

// After: Regular expression search, need to escape special characters
req := &GrepRequest{Pattern: "interface\\{\\}"}

// Or if you want to search for literals containing . * + ? etc., also need to escape
// Before
req := &GrepRequest{Pattern: "config.json"}
// After
req := &GrepRequest{Pattern: "config\\.json"}
```

---

## Migration Recommendations

1. **Handle compilation errors first**: Type changes (such as Shell interface rename) will cause compilation failure, need to fix first
2. **Pay attention to semantic changes**: `ReadRequest.Offset` changed from 0-based to 1-based, `Pattern` changed from literal to regular expression, these won't cause compilation errors but will change runtime behavior
3. **Check file operations**: `WriteRequest` overwrite behavior change may cause data loss, need additional checks
4. **Migrate Decorator/Wrapper**: If you have custom ChatModel/Tool Decorator/Wrapper, migrate to implementing `ChatModelAgentMiddleware`
5. **Test verification**: After migration, perform comprehensive testing, especially code involving file operations and search functionality
