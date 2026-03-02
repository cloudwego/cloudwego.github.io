---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: Eino v0.8 不兼容更新
weight: 1
---

> 本文档记录了 `alpha/08` 分支相比 `main` 分支的所有不兼容变更。

## 1. API 不兼容变更

### 1.1 filesystem Shell 接口重命名

**位置**: `adk/filesystem/backend.go` **变更描述**: Shell 相关接口被重命名，且不再嵌入 `Backend` 接口。**Before (main)**:

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

**影响**:

- `ShellBackend` 重命名为 `Shell`
- `StreamingShellBackend` 重命名为 `StreamingShell`
- 接口不再嵌入 `Backend`，如果你的实现依赖组合接口，需要分别实现**迁移指南**:

```go
// Before
type MyBackend struct {}
func (b *MyBackend) Execute(...) {...}
// MyBackend 实现 ShellBackend 需要同时实现 Backend 的所有方法

// After
type MyShell struct {}
func (s *MyShell) Execute(...) {...}
// MyShell 只需要实现 Shell 接口的方法
// 如果同时需要 Backend 功能，需要分别实现两个接口
```

---

## 2. 行为不兼容变更

### 2.1 AgentEvent 发送机制变更

**位置**: `adk/chatmodel.go`

**变更描述**: `ChatModelAgent` 的 `AgentEvent` 发送机制从 eino callback 机制改为 Middleware 机制。

**Before (main)**:

- `AgentEvent` 通过 eino 的 callback 机制发送
- 如果用户自定义了 ChatModel 或 Tool 的 Decorator/Wrapper，且原始 ChatModel/Tool 内部埋入了 Callback 点位，则 `AgentEvent` 会在 Decorator/Wrapper 的**内部**发送
- 这对 eino-ext 实现的所有 ChatModel 适用，但对大部分用户自行实现的 Tool 以及 eino 一方提供的 Tool 可能不适用

**After (alpha/08)**:

- `AgentEvent` 通过 Middleware 机制发送
- `AgentEvent` 会在用户自定义的 Decorator/Wrapper 的**外部**发送

**影响**:

- 正常情况下用户不感知此变更
- 如果用户之前自行实现了 ChatModel 或 Tool 的 Decorator/Wrapper，事件发送的相对位置会发生变化
- 位置变化可能导致 `AgentEvent` 的内容也发生变化：之前的事件不包含 Decorator/Wrapper 做出的变更，现在的事件会包含

**变更原因**:

- 正常业务场景下，希望发出的事件包含 Decorator/Wrapper 做出的变更

**迁移指南**:

如果你之前通过 Decorator/Wrapper 包装了 ChatModel 或 Tool，需要改为实现 `ChatModelAgentMiddleware` 接口：

```go
// Before: 通过 Decorator/Wrapper 包装 ChatModel
type MyModelWrapper struct {
    inner model.BaseChatModel
}

func (w *MyModelWrapper) Generate(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.Message, error) {
    // 自定义逻辑
    return w.inner.Generate(ctx, input, opts...)
}

// After: 实现 ChatModelAgentMiddleware 的 WrapModel 方法
type MyMiddleware struct{}

func (m *MyMiddleware) WrapModel(ctx context.Context, chatModel model.BaseChatModel, mc *ModelContext) (model.BaseChatModel, error) {
    return &myWrappedModel{inner: chatModel}, nil
}

// 对于 Tool 的 Wrapper，改为实现 WrapInvokableToolCall / WrapStreamableToolCall 等方法
```

### 2.2 filesystem.ReadRequest.Offset 语义变更

**位置**: `adk/filesystem/backend.go` **变更描述**: `Offset` 字段从 0-based 改为 1-based。**Before (main)**:

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

**迁移指南**:

```go
// Before: 读取从第 0 行开始（即第一行）
req := &ReadRequest{Offset: 0, Limit: 100}

// After: 读取从第 1 行开始（即第一行）
req := &ReadRequest{Offset: 1, Limit: 100}

// 如果原来使用 Offset: 10 表示从第 11 行开始
// 现在需要使用 Offset: 11
```

---

### 2.3 filesystem.FileInfo.Path 语义变更

**位置**: `adk/filesystem/backend.go` **变更描述**: `FileInfo.Path` 字段不再保证是绝对路径。**Before (main)**:

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

**影响**:

- 依赖 `Path` 为绝对路径的代码可能会出现问题
- 需要检查并处理相对路径的情况

---

### 2.4 filesystem.WriteRequest 行为变更

**位置**: `adk/filesystem/backend.go` **变更描述**: `WriteRequest` 的写入行为从"文件存在则报错"变更为"文件存在则覆盖"。**Before (main)**:

```go
// WriteRequest 注释说明:
// The file will be created if it does not exist, or error if file exists.
```

**After (alpha/08)**:

```go
// WriteRequest 注释说明:
// Creates the file if it does not exist, overwrites if it exists.
```

**影响**:

- 原来依赖"文件存在报错"行为的代码将不再报错，而是直接覆盖
- 可能导致意外的数据丢失**迁移指南**:
- 如果需要保留原有行为，在写入前先检查文件是否存在

---

### 2.5 GrepRequest.Pattern 语义变更

**位置**: `adk/filesystem/backend.go` **变更描述**: `GrepRequest.Pattern` 从字面量匹配变更为正则表达式匹配。**Before (main)**:

```go
// Pattern is the literal string to search for. This is not a regular expression.
// The search performs an exact substring match within the file's content.
```

**After (alpha/08)**:

```go
// Pattern is the search pattern, supports full regular expression syntax.
// Uses ripgrep syntax (not grep).
```

**影响**:

- 包含正则表达式特殊字符的搜索模式行为将发生变化
- 例如，搜索 `interface{}` 现在需要转义为 `interface\{\}` **迁移指南**:

```go
// Before: 字面量搜索
req := &GrepRequest{Pattern: "interface{}"}

// After: 正则表达式搜索，需要转义特殊字符
req := &GrepRequest{Pattern: "interface\\{\\}"}

// 或者如果要搜索包含 . * + ? 等的字面量，也需要转义
// Before
req := &GrepRequest{Pattern: "config.json"}
// After
req := &GrepRequest{Pattern: "config\\.json"}
```

---

## 迁移建议

1. **优先处理编译错误**: 类型变更（如 Shell 接口重命名）会导致编译失败，需要首先修复
2. **关注语义变更**: `ReadRequest.Offset` 从 0-based 改为 1-based，`Pattern` 从字面量改为正则表达式，这些不会导致编译错误但会改变运行时行为
3. **检查文件操作**: `WriteRequest` 的覆盖行为变更可能导致数据丢失，需要额外检查
4. **迁移 Decorator/Wrapper**: 如有自定义的 ChatModel/Tool Decorator/Wrapper，改为实现 `ChatModelAgentMiddleware`
5. **测试验证**: 迁移后进行全面的测试，特别是涉及文件操作和搜索功能的代码
