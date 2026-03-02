---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Backend: Ark Agentkit Sandbox'
weight: 1
---

## Agentkit Sandbox Backend

Package: `github.com/cloudwego/eino-ext/adk/backend/agentkit`

注意：如果 eino 版本是 v0.8.0 及以上，需要使用 ark agentkit backend 的 [v0.2.0-alpha](https://github.com/cloudwego/eino-ext/releases/tag/adk%2Fbackend%2Fagentkit%2Fv0.2.0-alpha.1) 版本。

### 概述

Agentkit Sandbox Backend 是 EINO ADK FileSystem 的远程沙箱实现，通过火山引擎 Agentkit 服务在隔离的云端环境中执行文件系统操作。

#### 核心特性

- 安全隔离 - 所有操作在远程沙箱环境中执行
- 会话管理 - 支持会话隔离与可配置的 TTL
- 请求签名 - 自动使用 AK/SK 进行火山引擎 API 认证

### 安装

```bash
go get github.com/cloudwego/eino-ext/adk/backend/agentkit
```

### 配置

#### 环境变量

```bash
export VOLC_ACCESS_KEY_ID="your_access_key"
export VOLC_SECRET_ACCESS_KEY="your_secret_key"
export VOLC_TOOL_ID="your_tool_id"
```

#### Config 结构

```go
type Config struct {
    // 必填
    AccessKeyID     string  // 访问密钥 ID
    SecretAccessKey string  // 访问密钥 Secret
    ToolID          string  // 沙箱工具 ID

    // 可选
    UserSessionID    string        // 用户会话 ID，用于隔离
    Region           Region        // 区域，默认 cn-beijing
    SessionTTL       int           // 会话 TTL（60-86400 秒）
    ExecutionTimeout int           // 命令执行超时
    HTTPClient       *http.Client  // 自定义 HTTP 客户端
}
```

### 快速开始

#### 基本用法

```go
import (
    "context"
    "os"
    "time"

    "github.com/cloudwego/eino-ext/adk/backend/agentkit"
    "github.com/cloudwego/eino/adk/filesystem"
)

func main() {
    ctx := context.Background()

    backend, err := agentkit.NewSandboxToolBackend(&agentkit.Config{
        AccessKeyID:     os.Getenv("VOLC_ACCESS_KEY_ID"),
        SecretAccessKey: os.Getenv("VOLC_SECRET_ACCESS_KEY"),
        ToolID:          os.Getenv("VOLC_TOOL_ID"),
        UserSessionID:   "session-" + time.Now().Format("20060102-150405"),
        Region:          agentkit.RegionOfBeijing,
    })
    if err != nil {
        panic(err)
    }

    // 写入文件
    err = backend.Write(ctx, &filesystem.WriteRequest{
        FilePath: "/home/gem/hello.txt",
        Content:  "Hello, Sandbox!",
    })

    // 读取文件
    content, err := backend.Read(ctx, &filesystem.ReadRequest{
        FilePath: "/home/gem/hello.txt",
    })
}
```

#### 与 Agent 集成

```go
import (
    "github.com/cloudwego/eino/adk"
    fsMiddleware "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

// 创建 Backend
backend, _ := agentkit.NewSandboxToolBackend(config)

// 创建 Middleware
middleware, _ := fsMiddleware.New(ctx, &fsMiddleware.Config{
    Backend: backend,
    Shell: backend,
})

// 创建 Agent
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "SandboxAgent",
    Description: "具有安全文件系统访问能力的 AI Agent",
    Model:       chatModel,
    Handlers:    []adk.ChatModelAgentMiddleware{middleware},
})
```

### API 参考

<table>
<tr><td>方法</td><td>描述</td></tr>
<tr><td>LsInfo</td><td>列出目录内容</td></tr>
<tr><td>Read</td><td>读取文件内容（支持分页）</td></tr>
<tr><td>Write</td><td>创建新文件（已存在则报错）</td></tr>
<tr><td>Edit</td><td>替换文件内容</td></tr>
<tr><td>GrepRaw</td><td>搜索文件内容</td></tr>
<tr><td>GlobInfo</td><td>按模式查找文件</td></tr>
<tr><td>Execute</td><td>执行 shell 命令</td></tr>
</table>

#### 示例

```go
// 列出目录
files, _ := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/home/gem",
})

// 读取文件（分页）
content, _ := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/home/gem/file.txt",
    Offset:   0,
    Limit:    100,
})

// 搜索内容
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Path:    "/home/gem",
    Pattern: "keyword",
    Glob:    "*.txt",
})

// 查找文件
files, _ := backend.GlobInfo(ctx, &filesystem.GlobInfoRequest{
    Path:    "/home/gem",
    Pattern: "**/*.txt",
})

// 编辑文件
backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/home/gem/file.txt",
    OldString:  "old",
    NewString:  "new",
    ReplaceAll: true,
})

// 执行命令
result, _ := backend.Execute(ctx, &filesystem.ExecuteRequest{
    Command: "ls -la /home/gem",
})
```

### 与 Local Backend 对比

<table>
<tr><td>特性</td><td>Agentkit</td><td>Local</td></tr>
<tr><td>执行模型</td><td>远程沙箱</td><td>本地直接</td></tr>
<tr><td>网络依赖</td><td>需要</td><td>不需要</td></tr>
<tr><td>配置复杂度</td><td>需要凭证</td><td>零配置</td></tr>
<tr><td>安全模型</td><td>隔离沙箱</td><td>OS 权限</td></tr>
<tr><td>适用场景</td><td>多租户/生产环境</td><td>开发/本地环境</td></tr>
</table>

### 常见问题

**Q: Write 返回 "file already exists" 错误**

这是安全特性，使用不同文件名或用 Edit 修改现有文件。

**Q: 认证失败**

检查环境变量、AK/SK 是否匹配、账户是否有 Ark Sandbox 权限。

**Q: 请求超时**

增加 ExecutionTimeout 或 HTTPClient.Timeout 配置。
