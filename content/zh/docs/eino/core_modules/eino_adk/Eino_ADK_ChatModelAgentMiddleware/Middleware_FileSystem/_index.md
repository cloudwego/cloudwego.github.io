---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: FileSystem
weight: 1
---

> 💡
> Package: [https://github.com/cloudwego/eino/tree/main/adk/middlewares/filesystem](https://github.com/cloudwego/eino/tree/main/adk/middlewares/filesystem)

# 概述

FileSystem Middleware 为 Agent 提供文件系统访问与大体积工具结果卸载能力。
它定义了一套统一的文件系统 Backend 接口，用户可直接使用默认的内存实现，或根据自身需求扩展自定义后端。

核心功能包括：

- 访问虚拟文件系统（ls/read/write/edit/glob/grep）
- 将超大工具结果自动卸载到文件系统，并在 Agent 上下文中保留摘要，按需加载内容

# Backend 接口

FileSystem Middleware 通过 `github.com/cloudwego/eino/adk/filesystem` 中的 Backend 接口操作文件系统：

```go
type Backend interface {
    // 列出指定路径下的文件（结构化信息）
    LsInfo(path string) ([]FileInfo, error)
    // 按 offset 和 limit 读取文件内容（返回适合 LLM 的文本）
    Read(ctx context.Context, filePath string, offset, limit int) (string, error)
    // 在指定路径中 grep pattern，返回匹配列表
    GrepRaw(ctx context.Context, pattern string, path, glob *string) ([]GrepMatch, error)
    // 根据 pattern 和 path 进行 glob 匹配
    GlobInfo(ctx context.Context, pattern, path string) ([]FileInfo, error)
    // 写入或更新文件
    Write(ctx context.Context, filePath, content string) error
    // 替换文件中的字符串
    Edit(ctx context.Context, filePath, oldString, newString string, replaceAll bool) error
}
```

### **扩展接口**

```go
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

`InMemoryBackend` 是 `Backend` 接口的内存实现，将文件存储在 map 中，支持并发安全访问。

```go
import "github.com/cloudwego/eino/adk/filesystem"

ctx := context.Background()
backend := filesystem.NewInMemoryBackend()

// 写入文件
err := backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/example/test.txt",
    Content:  "Hello, World!\nLine 2\nLine 3",
})

// 读取文件
content, err := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/example/test.txt",
    Offset:   1,
    Limit:    10,
})

// 列出目录
files, err := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/example",
})

// 搜索内容
matches, err := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Pattern: "Hello",
    Path:    "/example",
})

// 编辑文件
err = backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/example/test.txt",
    OldString:  "Hello",
    NewString:  "Hi",
    ReplaceAll: false,
})
```

其他 Backend 实现：

# Filesystem Middleware

Middleware 会自动向 Agent 注入一组工具及对应的 system prompt，使其能够直接操作文件系统。

### **创建中间件**

推荐使用 `New` 函数创建中间件（返回 `ChatModelAgentMiddleware`）：

```go
import "github.com/cloudwego/eino/adk/middlewares/filesystem"

middleware, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend: myBackend,
    // 如果需要 shell 命令执行能力，设置 Shell 或 StreamingShell
    Shell: myShell,
})
if err != nil {
    // handle error
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

### **Config 配置项**

```go
type MiddlewareConfig struct {
    // Backend 提供文件系统操作，必填
    Backend filesystem.Backend

    // Shell 提供 shell 命令执行能力
    // 如果设置，会注册 execute 工具
    // 可选，与 StreamingShell 互斥
    Shell filesystem.Shell
    
    // StreamingShell 提供流式 shell 命令执行能力
    // 如果设置，会注册流式 execute 工具
    // 可选，与 Shell 互斥
    StreamingShell filesystem.StreamingShell

    // CustomSystemPrompt 覆盖默认的系统提示词
    // 可选，默认 ToolsSystemPrompt
    CustomSystemPrompt *string

    // 以下为各工具的自定义名称，均为可选
    CustomLsToolName        *string  // 默认 "ls"
    CustomReadFileToolName  *string  // 默认 "read_file"
    CustomWriteFileToolName *string  // 默认 "write_file"
    CustomEditFileToolName  *string  // 默认 "edit_file"
    CustomGlobToolName      *string  // 默认 "glob"
    CustomGrepToolName      *string  // 默认 "grep"
    CustomExecuteToolName   *string  // 默认 "execute"

    // 以下为各工具的自定义描述，均为可选
    CustomLsToolDesc        *string
    CustomReadFileToolDesc  *string
    CustomGrepToolDesc      *string
    CustomGlobToolDesc      *string
    CustomWriteFileToolDesc *string
    CustomEditToolDesc      *string
    CustomExecuteToolDesc   *string
}
```

> 💡
> `New` 函数返回 `ChatModelAgentMiddleware`，提供更好的上下文传播能力。对于需要大型工具结果卸载的场景，请使用 `NewMiddleware` 函数或配合 ToolReduction middleware 使用。

注入的工具：

这些工具均附带默认的英文描述（description）与内置提示词（system prompt）。如需切换为中文，可通过 `adk.SetLanguage()` 设置：

```
import "github.com/cloudwego/eino/adk"

adk.SetLanguage(adk.LanguageChinese)  // 切换为中文
adk.SetLanguage(adk.LanguageEnglish)  // 切换为英文（默认）
```

你也可以通过 `Config` 自定义说明文本和工具名称：

```go
type MiddlewareConfig struct {
    // 覆盖默认 System Prompt（可选）
    CustomSystemPrompt *string

    // 覆盖各工具名称（可选）
    CustomLsToolName        *string
    CustomReadFileToolName  *string
    // ... 

    // 覆盖各工具 description（可选）
    CustomLsToolDesc        *string
    CustomReadFileToolDesc  *string
    // ...
}
```

# [deprecated]工具结果卸载

> 💡
> 该功能即将在 0.8.0 中 deprecate。迁移到 [Middleware: ToolReduction](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_toolreduction)

当工具调用结果过大（例如读取大文件、grep 命中大量内容），如果继续将完整结果放入对话上下文，会导致：

- token 急剧增加
- Agent 历史上下文污染
- 推理效率变差

为此，Middleware 提供了 自动卸载机制：

- 当结果大小超过阈值（默认 20,000 tokens）时
  → 不直接返回全部内容给 LLM
- 实际结果会保存到文件系统
- 上下文中仅包含：
  - 摘要
  - 文件路径（agent 可再次调用工具读取）

<a href="/img/eino/HcwAb6W1JofCzhx2JQ8cniHlnpc.png" target="_blank"><img src="/img/eino/HcwAb6W1JofCzhx2JQ8cniHlnpc.png" width="100%" /></a>

该功能默认启用，可通过配置调整行为：

```go
type Config struct {
    // other config...
    
    // 关闭自动卸载
    WithoutLargeToolResultOffloading bool

    // 自定义触发阈值（默认 20000 tokens）
    LargeToolResultOffloadingTokenLimit int

    // 自定义卸载文件生成路径
    // 默认路径格式: /large_tool_result/{ToolCallID}
    LargeToolResultOffloadingPathGen func(ctx context.Context, input *compose.ToolInput) (string, error)
}
```
