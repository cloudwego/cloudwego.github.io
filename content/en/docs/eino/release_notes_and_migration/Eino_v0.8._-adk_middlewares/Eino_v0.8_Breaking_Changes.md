---
Description: ""
date: "2026-03-10"
lastmod: ""
tags: []
title: Eino v0.8 Breaking Changes
weight: 1
---

## 1. API Breaking Changes

### 1.1 filesystem Shell Interface Renamed

**Location**: `adk/filesystem/backend.go` **Change Description**: Shell-related interfaces have been renamed and no longer embed the `Backend` interface. **Before (v0.7.x)**:

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

**After (v0.8.0)**:

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
- Interfaces no longer embed `Backend`. If your implementation depends on the composite interface, you need to implement them separately **Migration Guide**:

```go
// Before
type MyBackend struct {}
func (b *MyBackend) Execute(...) {...}
// MyBackend implementing ShellBackend needed to implement all Backend methods

// After
type MyShell struct {}
func (s *MyShell) Execute(...) {...}
// MyShell only needs to implement Shell interface methods
// If you also need Backend functionality, implement both interfaces separately
```

---

## 2. Behavioral Breaking Changes

### 2.1 AgentEvent Sending Mechanism Change

**Location**: `adk/chatmodel.go` **Change Description**: `ChatModelAgent`'s `AgentEvent` sending mechanism changed from eino callback mechanism to Middleware mechanism. **Before (v0.7.x)**:

- `AgentEvent` was sent through eino's callback mechanism
- If users customized ChatModel or Tool Decorator/Wrapper, and the original ChatModel/Tool had embedded Callback points, `AgentEvent` would be sent **inside** the Decorator/Wrapper
- This applied to all ChatModels implemented in eino-ext, but may not apply to most user-implemented Tools and Tools provided by eino **After (v0.8.0)**:
- `AgentEvent` is sent through Middleware mechanism
- `AgentEvent` is sent **outside** user-customized Decorator/Wrapper **Impact**:
- Under normal circumstances, users won't notice this change
- If users previously implemented their own ChatModel or Tool Decorator/Wrapper, the relative position of event sending will change
- Position change may cause `AgentEvent` content to change: previous events didn't include Decorator/Wrapper modifications, current events will include them **Reason for Change**:
- In normal business scenarios, we want emitted events to include Decorator/Wrapper modifications **Migration Guide**: If you previously wrapped ChatModel or Tool through Decorator/Wrapper, you need to implement the `ChatModelAgentMiddleware` interface instead:

```go
// Before: Wrapping ChatModel through Decorator/Wrapper
type MyModelWrapper struct {
    inner model.BaseChatModel
}

func (w *MyModelWrapper) Generate(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // Custom logic
    return w.inner.Generate(ctx, input, opts...)
}

// After: Implement WrapModel method of ChatModelAgentMiddleware
type MyMiddleware struct{}

func (m *MyMiddleware) WrapModel(ctx context.Context, chatModel model.BaseChatModel, mc *ModelContext) (model.BaseChatModel, error) {
    return &myWrappedModel{inner: chatModel}, nil
}

// For Tool Wrappers, implement WrapInvokableToolCall / WrapStreamableToolCall methods instead
```

### 2.2 filesystem.ReadRequest.Offset Semantic Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `Offset` field changed from 0-based to 1-based. **Before (v0.7.x)**:

```go
type ReadRequest struct {
    FilePath string
    // Offset is the 0-based line number to start reading from.
    Offset int
    Limit  int
}
```

**After (v0.8.0)**:

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
// Before: Read from line 0 (i.e., first line)
req := &ReadRequest{Offset: 0, Limit: 100}

// After: Read from line 1 (i.e., first line)
req := &ReadRequest{Offset: 1, Limit: 100}

// If you previously used Offset: 10 to mean starting from line 11
// Now you need to use Offset: 11
```

---

### 2.3 filesystem.FileInfo.Path Semantic Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `FileInfo.Path` field is no longer guaranteed to be an absolute path. **Before (v0.7.x)**:

```go
type FileInfo struct {
    // Path is the absolute path of the file or directory.
    Path string
}
```

**After (v0.8.0)**:

```go
type FileInfo struct {
    // Path is the path of the file or directory, which can be a filename,
    // relative path, or absolute path.
    Path string
    // ...
}
```

**Impact**:

- Code that depends on `Path` being an absolute path may have issues
- Need to check and handle relative path cases

---

### 2.4 filesystem.WriteRequest Behavior Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `WriteRequest` write behavior changed from "error if file exists" to "overwrite if file exists". **Before (v0.7.x)**:

```go
// WriteRequest comment:
// The file will be created if it does not exist, or error if file exists.
```

**After (v0.8.0)**:

```go
// WriteRequest comment:
// Creates the file if it does not exist, overwrites if it exists.
```

**Impact**:

- Code that previously relied on "error if file exists" behavior will no longer error, but directly overwrite
- May cause unexpected data loss **Migration Guide**:
- If you need to preserve the original behavior, check if the file exists before writing

---

### 2.5 GrepRequest.Pattern Semantic Change

**Location**: `adk/filesystem/backend.go` **Change Description**: `GrepRequest.Pattern` changed from literal matching to regular expression matching. **Before (v0.7.x)**:

```go
// Pattern is the literal string to search for. This is not a regular expression.
// The search performs an exact substring match within the file's content.
```

**After (v0.8.0)**:

```go
// Pattern is the search pattern, supports full regular expression syntax.
// Uses ripgrep syntax (not grep).
```

**Impact**:

- Search patterns containing regex special characters will behave differently
- For example, searching for `interface{}` now needs to be escaped as `interface\{\}` **Migration Guide**:

```go
// Before: Literal search
req := &GrepRequest{Pattern: "interface{}"}

// After: Regex search, need to escape special characters
req := &GrepRequest{Pattern: "interface\\{\\}"}

// Or if searching for literals containing . * + ?, also need to escape
// Before
req := &GrepRequest{Pattern: "config.json"}
// After
req := &GrepRequest{Pattern: "config\\.json"}
```

---

## Migration Recommendations

1. **Handle compile errors first**: Type changes (like Shell interface renaming) will cause compilation failures, need to fix first
2. **Pay attention to semantic changes**: `ReadRequest.Offset` changed from 0-based to 1-based, `Pattern` changed from literal to regex - these won't cause compile errors but will change runtime behavior
3. **Check file operations**: `WriteRequest` overwrite behavior change may cause data loss, requires additional checks
4. **Migrate Decorator/Wrapper**: If you have custom ChatModel/Tool Decorator/Wrapper, change to implement `ChatModelAgentMiddleware`
5. Upgrade backend implementations as needed: If using local/ark agentkit backend provided by eino-ext, upgrade to corresponding alpha versions: [local backend v0.2.0-alpha](https://github.com/cloudwego/eino-ext/releases/tag/adk%2Fbackend%2Flocal%2Fv0.2.0-alpha.1), [ark agentkit backend v0.2.0-alpha](https://github.com/cloudwego/eino-ext/releases/tag/adk%2Fbackend%2Fagentkit%2Fv0.2.0-alpha.1)
6. **Test verification**: After migration, perform comprehensive testing, especially for code involving file operations and search functionality
