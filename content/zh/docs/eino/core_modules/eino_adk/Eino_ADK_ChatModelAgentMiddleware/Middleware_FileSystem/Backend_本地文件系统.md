---
Description: ""
date: "2026-03-10"
lastmod: ""
tags: []
title: 本地文件系统
weight: 2
---

## Local Backend

Package: `github.com/cloudwego/eino-ext/adk/backend/local`

注意：如果 eino 版本是 v0.8.0 及以上，需要使用 local backend 的 [adk/backend/local/v0.2.1](https://github.com/cloudwego/eino-ext/releases/tag/adk%2Fbackend%2Flocal%2Fv0.2.1) 版本。

### 概述

Local Backend 是 EINO ADK FileSystem 的本地文件系统实现，直接操作本机文件系统，提供原生性能和零配置体验。

#### 核心特性

- 零配置 - 开箱即用
- 原生性能 - 直接文件系统访问，无网络开销
- 路径安全 - 强制使用绝对路径
- 流式执行 - 支持命令输出实时流
- 命令验证 - 可选的安全验证钩子

### 安装

```bash
go get github.com/cloudwego/eino-ext/adk/backend/local
```

### 配置

```go
type Config struct {
    // 可选: 命令验证函数，用于 Execute() 安全控制
    ValidateCommand func(string) error
}
```

### 快速开始

#### 基本用法

```go
import (
    "context"

    "github.com/cloudwego/eino-ext/adk/backend/local"
    "github.com/cloudwego/eino/adk/filesystem"
)

func main() {
    ctx := context.Background()

    backend, err := local.NewBackend(ctx, &local.Config{})
    if err != nil {
        panic(err)
    }

    // 写入文件（必须是绝对路径）
    err = backend.Write(ctx, &filesystem.WriteRequest{
        FilePath: "/tmp/hello.txt",
        Content:  "Hello, Local Backend!",
    })

    // 读取文件
    fcontent, err := backend.Read(ctx, &filesystem.ReadRequest{
        FilePath: "/tmp/hello.txt",
    })
    fmt.Println(fcontent.Content)
}
```

#### 带命令验证

```go
func validateCommand(cmd string) error {
    allowed := map[string]bool{"ls": true, "cat": true, "grep": true}
    parts := strings.Fields(cmd)
    if len(parts) == 0 || !allowed[parts[0]] {
        return fmt.Errorf("command not allowed: %s", parts[0])
    }
    return nil
}

backend, _ := local.NewBackend(ctx, &local.Config{
    ValidateCommand: validateCommand,
})
```

#### 与 Agent 集成

```go
import (
    "github.com/cloudwego/eino/adk"
    fsMiddleware "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

// 创建 Backend
backend, _ := local.NewBackend(ctx, &local.Config{})

// 创建 Middleware
middleware, _ := fsMiddleware.New(ctx, &fsMiddleware.Config{
    Backend: backend,
    StreamingShell: backend,
})

// 创建 Agent
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "LocalFileAgent",
    Description: "具有本地文件系统访问能力的 AI Agent",
    Model:       chatModel,
    Handlers:    []adk.ChatModelAgentMiddleware{middleware},
})
```

### API 参考

<table>
<tr><td>方法</td><td>描述</td></tr>
<tr><td>LsInfo</td><td>列出目录内容</td></tr>
<tr><td>Read</td><td>读取文件内容（支持分页，默认 200 行）</td></tr>
<tr><td>Write</td><td>创建新文件（已存在则报错）</td></tr>
<tr><td>Edit</td><td>替换文件内容</td></tr>
<tr><td>GrepRaw</td><td>搜索文件内容（字面量匹配）</td></tr>
<tr><td>GlobInfo</td><td>按模式查找文件</td></tr>
<tr><td>Execute</td><td>执行 shell 命令</td></tr>
<tr><td>ExecuteStreaming</td><td>流式执行命令</td></tr>
</table>

#### 示例

```go
// 列出目录
files, _ := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/home/user",
})

// 读取文件（分页）
fcontent, _ := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/path/to/file.txt",
    Offset:   0,
    Limit:    50,
})

// 搜索内容（字面量匹配，非正则）
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Path:    "/home/user/project",
    Pattern: "TODO",
    Glob:    "*.go",
})

// 查找文件
files, _ := backend.GlobInfo(ctx, &filesystem.GlobInfoRequest{
    Path:    "/home/user",
    Pattern: "**/*.go",
})

// 编辑文件
backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/tmp/file.txt",
    OldString:  "old",
    NewString:  "new",
    ReplaceAll: true,
})

// 执行命令
result, _ := backend.Execute(ctx, &filesystem.ExecuteRequest{
    Command: "ls -la /tmp",
})

// 流式执行
reader, _ := backend.ExecuteStreaming(ctx, &filesystem.ExecuteRequest{
    Command: "tail -f /var/log/app.log",
})
for {
    resp, err := reader.Recv()
    if err == io.EOF {
        break
    }
    fmt.Print(resp.Stdout)
}
```

### 路径要求

所有路径必须是绝对路径（以 `/` 开头）：

```go
// 正确
backend.Read(ctx, &filesystem.ReadRequest{FilePath: "/home/user/file.txt"})

// 错误
backend.Read(ctx, &filesystem.ReadRequest{FilePath: "./file.txt"})
```

转换相对路径：

```go
absPath, _ := filepath.Abs("./relative/path")
```

### 与 Agentkit Backend 对比

<table>
<tr><td>特性</td><td>Local</td><td>Agentkit</td></tr>
<tr><td>执行模型</td><td>本地直接</td><td>远程沙箱</td></tr>
<tr><td>网络依赖</td><td>无</td><td>需要</td></tr>
<tr><td>配置复杂度</td><td>零配置</td><td>需要凭证</td></tr>
<tr><td>安全模型</td><td>OS 权限</td><td>隔离沙箱</td></tr>
<tr><td>流式输出</td><td>支持</td><td>不支持</td></tr>
<tr><td>平台支持</td><td>Unix/Linux/macOS</td><td>任意</td></tr>
<tr><td>适用场景</td><td>开发/本地环境</td><td>多租户/生产环境</td></tr>
</table>

### 常见问题

**Q: GrepRaw 支持正则吗？**

支持正则匹配，GrepRaw 底层使用的是 ripgrep 命令做的 Grep 操作

**Q: Windows 支持吗？**

不支持，依赖 `/bin/sh`。
