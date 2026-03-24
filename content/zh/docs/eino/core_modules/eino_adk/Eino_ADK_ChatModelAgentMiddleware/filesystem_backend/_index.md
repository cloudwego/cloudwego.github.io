---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: FileSystem Backend
weight: 1
---

> 💡
> Package: [github.com/cloudwego/eino/adk/filesystem](https://github.com/cloudwego/eino/tree/main/adk/filesystem)

## 背景与目的

在 AI Agent 场景中，Agent 往往需要与文件系统交互——读取文件内容、搜索代码、编辑配置、执行命令等。然而，不同的运行环境对文件系统的访问方式差异很大：

- **本地开发环境**：直接操作本机文件系统，零配置即可使用
- **云端沙箱环境**：通过远程 API 操作隔离的沙箱文件系统，需要认证和网络通信
- **测试环境**：需要内存级别的模拟文件系统，无需真实磁盘 I/O
- **自定义存储**：可能需要对接 OSS、数据库等非传统文件系统

如果每种环境都各自实现一套文件操作逻辑，会导致 Middleware 和 Agent 代码与底层存储实现耦合，难以复用和测试。

为了解决这一问题，Eino ADK 抽象出 `filesystem.Backend` 接口，作为**统一的文件系统操作协议**。它的设计目标是：

1. **解耦存储与业务**：Middleware 只依赖 Backend 接口，不关心底层是本地磁盘、远程沙箱还是内存模拟
2. **可插拔替换**：通过切换 Backend 实现，同一个 Agent 可以在不同环境中运行，无需修改任何业务代码
3. **易于测试**：内置 `InMemoryBackend` 实现，方便在单元测试中模拟文件系统行为
4. **可扩展性**：所有方法使用结构体参数，未来新增字段不会破坏已有实现的兼容性

## Backend 接口

```go
type Backend interface {
    // 列出指定路径下的文件和目录信息
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    // 读取文件内容，支持按行分页（offset + limit）
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    // 在指定路径中搜索匹配 pattern 的内容，返回匹配列表
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    // 根据 glob pattern 和路径查找匹配的文件
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    // 写入或创建文件
    Write(ctx context.Context, req *WriteRequest) error
    // 替换文件中的字符串内容
    Edit(ctx context.Context, req *EditRequest) error
}
```

### 扩展接口

除核心文件操作外，Backend 还可以选择性地实现 Shell 命令执行能力：

```go
// Shell 提供同步命令执行能力
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

// StreamingShell 提供流式命令执行能力，适用于长时间运行的命令
type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

当 Backend 同时实现了 `Shell` 或 `StreamingShell` 接口时，Filesystem Middleware 会额外注册 `execute` 工具，允许 Agent 执行 shell 命令。

### 核心数据类型

<table>
<tr><td>类型</td><td>描述</td></tr>
<tr><td><pre>FileInfo</pre></td><td>文件/目录信息：路径、是否目录、大小、修改时间</td></tr>
<tr><td><pre>FileContent</pre></td><td>文件内容 + 行号信息</td></tr>
<tr><td><pre>GrepMatch</pre></td><td>搜索匹配结果：内容、路径、行号</td></tr>
<tr><td><pre>ReadRequest</pre></td><td>读取请求：路径、offset（从第几行开始，1-based）、limit（读取行数）</td></tr>
<tr><td><pre>GrepRequest</pre></td><td>搜索请求：pattern（支持正则）、路径、glob 过滤、文件类型过滤等</td></tr>
<tr><td><pre>WriteRequest</pre></td><td>写入请求：路径、内容</td></tr>
<tr><td><pre>EditRequest</pre></td><td>编辑请求：路径、旧字符串、新字符串、是否全部替换</td></tr>
<tr><td><pre>ExecuteRequest</pre></td><td>命令执行请求：命令字符串、是否后台运行</td></tr>
<tr><td><pre>ExecuteResponse</pre></td><td>命令执行结果：输出内容、退出码、是否被截断</td></tr>
</table>

## 内置实现：InMemoryBackend

`InMemoryBackend` 是框架内置的 Backend 实现，将文件存储在内存 map 中，主要用于：

- **单元测试**：无需真实文件系统即可测试 Agent 和 Middleware 的文件操作逻辑
- **轻量场景**：不需要持久化的临时文件操作
- **工具结果卸载**：Filesystem Middleware 的大型工具结果卸载功能默认使用 InMemoryBackend 存储

```go
import "github.com/cloudwego/eino/adk/filesystem"

ctx := context.Background()
backend := filesystem.NewInMemoryBackend()

// 写入文件
err := backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/example/test.txt",
    Content:  "Hello, World!\nLine 2\nLine 3",
})

// 读取文件（支持分页）
content, err := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/example/test.txt",
    Offset:   1,
    Limit:    10,
})

// 列出目录
files, err := backend.LsInfo(ctx, &filesystem.LsInfoRequest{
    Path: "/example",
})

// 搜索内容（支持正则）
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

特性：

- 线程安全（基于 `sync.RWMutex`）
- GrepRaw 支持正则匹配、大小写不敏感、上下文行数等高级选项
- GrepRaw 内部采用并行处理（最多 10 个 worker）

## 外部实现

以下 Backend 实现位于 [eino-ext](https://github.com/cloudwego/eino-ext) 仓库：

- **Local Backend** — 本地文件系统实现，直接操作本机磁盘，零配置开箱即用
- **Ark Agentkit Sandbox Backend** — 火山引擎 Agentkit 远程沙箱实现，在隔离的云端环境中执行文件操作

### 实现对比

<table>
<tr><td>特性</td><td>InMemory</td><td>Local</td><td>Agentkit Sandbox</td></tr>
<tr><td>执行模型</td><td>内存</td><td>本地直接</td><td>远程沙箱</td></tr>
<tr><td>网络依赖</td><td>无</td><td>无</td><td>需要</td></tr>
<tr><td>配置复杂度</td><td>零配置</td><td>零配置</td><td>需要凭证</td></tr>
<tr><td>持久化</td><td>否</td><td>是</td><td>是</td></tr>
<tr><td>Shell 支持</td><td>否</td><td>支持（含流式）</td><td>支持</td></tr>
<tr><td>适用场景</td><td>测试/临时</td><td>开发/本地环境</td><td>多租户/生产环境</td></tr>
</table>

## 自定义实现

如需对接自定义存储（如 OSS、数据库等），只需实现 `Backend` 接口即可：

```go
type MyBackend struct {
    // ...
}

func (b *MyBackend) LsInfo(ctx context.Context, req *filesystem.LsInfoRequest) ([]filesystem.FileInfo, error) {
    // 自定义实现
}

func (b *MyBackend) Read(ctx context.Context, req *filesystem.ReadRequest) (*filesystem.FileContent, error) {
    // 自定义实现
}

// ... 实现其余方法
```

如果需要支持命令执行，还可以额外实现 `Shell` 或 `StreamingShell` 接口。
