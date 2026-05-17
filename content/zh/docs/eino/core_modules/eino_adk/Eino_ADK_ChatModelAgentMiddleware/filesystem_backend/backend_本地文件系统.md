---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: 本地文件系统
weight: 2
---

## Local Backend

**Package**: `github.com/cloudwego/eino-ext/adk/backend/local`

> 💡
> eino v0.8.0+ 需使用 local backend v0.2.1 及以上版本。

Local Backend 是 Eino ADK FileSystem 的本地实现，直接操作本机文件系统。实现了 `filesystem.Backend`（文件操作）和 `filesystem.StreamingShell`（流式命令执行）两个接口。

**核心特性**：零配置、原生性能、强制绝对路径、流式命令执行、可选命令验证。

---

## 安装

```bash
go get github.com/cloudwego/eino-ext/adk/backend/local
```

## 配置

```go
type Config struct {
    // 可选：命令验证函数，用于 ExecuteStreaming 的安全控制。
    // 返回 non-nil error 时拒绝执行。
    ValidateCommand func(string) error
}
```

## 快速开始

```go
backend, err := local.NewBackend(ctx, &local.Config{})

// 写入文件（必须绝对路径；文件已存在则覆盖）
err = backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/tmp/hello.txt",
    Content:  "Hello, Local Backend!",
})

// 读取文件（支持行级分页）
fc, err := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/tmp/hello.txt",
    Offset:   1,   // 起始行号（1-based）
    Limit:    50,  // 最大行数，0 表示全部
})
```

### 与 Agent 集成

```go
import (
    "github.com/cloudwego/eino/adk"
    fsMiddleware "github.com/cloudwego/eino/adk/middlewares/filesystem"
    "github.com/cloudwego/eino-ext/adk/backend/local"
)

backend, _ := local.NewBackend(ctx, &local.Config{})

middleware, _ := fsMiddleware.New(ctx, &fsMiddleware.Config{
    Backend:        backend, // 必填：注册 ls/read/write/edit/glob/grep 工具
    StreamingShell: backend, // 可选：注册流式 execute 工具
})

agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    chatModel,
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

> 💡
> 中间件 Config 中 `Shell` 与 `StreamingShell` 互斥。Local Backend 仅实现 `StreamingShell`（流式命令执行），不实现非流式 `Shell`。

---

## 实现的接口与方法

### filesystem.Backend

<table>
<tr><td>方法</td><td>签名</td><td>说明</td></tr>
<tr><td><pre>LsInfo</pre></td><td><pre>(ctx, *LsInfoRequest) ([]FileInfo, error)</pre></td><td>列出目录内容</td></tr>
<tr><td><pre>Read</pre></td><td><pre>(ctx, *ReadRequest) (*FileContent, error)</pre></td><td>读取文件，支持行级分页（Offset 1-based，Limit 0=全部）</td></tr>
<tr><td><pre>Write</pre></td><td><pre>(ctx, *WriteRequest) error</pre></td><td>写入文件；自动创建父目录；<strong>文件已存在则覆盖</strong></td></tr>
<tr><td><pre>Edit</pre></td><td><pre>(ctx, *EditRequest) error</pre></td><td>字符串替换；支持 <pre>ReplaceAll</pre>；<pre>OldString</pre> 不唯一时报错（非 ReplaceAll 模式）</td></tr>
<tr><td><pre>GrepRaw</pre></td><td><pre>(ctx, *GrepRequest) ([]GrepMatch, error)</pre></td><td>基于 ripgrep 搜索，<strong>支持完整正则语法</strong>；支持大小写不敏感、多行匹配、上下文行</td></tr>
<tr><td><pre>GlobInfo</pre></td><td><pre>(ctx, *GlobInfoRequest) ([]FileInfo, error)</pre></td><td>Glob 模式匹配文件，支持 <pre>*</pre>/<pre>**</pre>/<pre>?</pre>/<pre>[abc]</pre></td></tr>
</table>

### filesystem.StreamingShell

<table>
<tr><td>方法</td><td>签名</td><td>说明</td></tr>
<tr><td><pre>ExecuteStreaming</pre></td><td><pre>(ctx, *ExecuteRequest) (*StreamReader[*ExecuteResponse], error)</pre></td><td>流式执行 shell 命令，实时输出；支持后台运行（<pre>RunInBackendGround</pre>）</td></tr>
</table>

---

## 使用示例

### 搜索内容（正则）

```go
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Path:    "/home/user/project",
    Pattern: "TODO|FIXME",       // ripgrep 正则语法
    Glob:    "*.go",
    CaseInsensitive: true,
})
```

### 编辑文件

```go
backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/tmp/file.txt",
    OldString:  "old text",
    NewString:  "new text",
    ReplaceAll: true,
})
```

### 流式执行命令

```go
reader, _ := backend.ExecuteStreaming(ctx, &filesystem.ExecuteRequest{
    Command: "tail -f /var/log/app.log",
})
for {
    resp, err := reader.Recv()
    if err == io.EOF {
        break
    }
    fmt.Print(resp.Output)
}
```

### 带命令验证

```go
backend, _ := local.NewBackend(ctx, &local.Config{
    ValidateCommand: func(cmd string) error {
        allowed := map[string]bool{"ls": true, "cat": true, "grep": true}
        parts := strings.Fields(cmd)
        if len(parts) == 0 || !allowed[parts[0]] {
            return fmt.Errorf("command not allowed: %s", parts[0])
        }
        return nil
    },
})
```

---

## 路径要求

所有文件路径必须为绝对路径（以 `/` 开头）。相对路径可通过 `filepath.Abs()` 转换。

---

## 与 Agentkit Backend 对比

<table>
<tr><td>特性</td><td>Local</td><td>Agentkit</td></tr>
<tr><td>执行模型</td><td>本地直接</td><td>远程沙箱</td></tr>
<tr><td>网络依赖</td><td>无</td><td>需要</td></tr>
<tr><td>配置复杂度</td><td>零配置</td><td>需要凭证</td></tr>
<tr><td>安全模型</td><td>OS 权限 + ValidateCommand</td><td>隔离沙箱</td></tr>
<tr><td>流式输出</td><td>支持（StreamingShell）</td><td>不支持</td></tr>
<tr><td>平台支持</td><td>Unix/Linux/macOS</td><td>任意</td></tr>
<tr><td>适用场景</td><td>开发/本地环境</td><td>多租户/生产环境</td></tr>
</table>

---

## FAQ

**Q: GrepRaw 支持正则吗？**

A: 支持。底层使用 ripgrep（`rg`），支持完整正则语法。系统需安装 ripgrep，否则报错 `ripgrep (rg) is not installed or not in PATH`。安装方式见 [https://github.com/BurntSushi/ripgrep#installation](https://github.com/BurntSushi/ripgrep#installation) 。

**Q: Write 是创建还是覆盖？**

A: 覆盖。`Write` 使用 `O_CREATE|O_TRUNC` 标志，文件已存在则覆盖内容，不存在则创建（含自动创建父目录）。

**Q: Windows 支持吗？**

A: 不支持。`ExecuteStreaming` 依赖 `/bin/sh`。文件操作本身可在任意平台运行，但命令执行仅限 Unix 系。

**Q: Local Backend 支持非流式 Execute 吗？**

A: 不支持。Local 仅实现 `StreamingShell`（`ExecuteStreaming`），未实现 `Shell`（`Execute`）。中间件 Config 中 `Shell` 与 `StreamingShell` 互斥，选其一即可。
