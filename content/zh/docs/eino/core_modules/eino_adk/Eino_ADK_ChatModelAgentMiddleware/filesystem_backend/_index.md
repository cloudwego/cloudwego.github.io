---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: FileSystem Backend
weight: 1
---

> 💡Package: [github.com/cloudwego/eino/adk/filesystem](https://github.com/cloudwego/eino/tree/main/adk/filesystem)

## 背景与目的

AI Agent 需要与文件系统交互（读取、搜索、编辑、执行命令），但不同运行环境的访问方式差异很大：本地磁盘、远程沙箱、内存模拟、对象存储等。若每种环境单独实现文件操作逻辑，会导致 Middleware/Agent 代码与底层存储耦合。

`filesystem.Backend` 接口解决这一问题——作为**统一文件系统操作协议**：

1. **解耦存储与业务** — Middleware 只依赖接口，不关心底层实现
2. **可插拔替换** — 切换 Backend 即可在不同环境运行，无需修改业务代码
3. **易于测试** — 内置 `InMemoryBackend`，无需真实磁盘 I/O
4. **向前兼容** — 所有方法使用结构体参数，新增字段不破坏已有实现

## Backend 接口

```go
type Backend interface {
    LsInfo(ctx context.Context, req *LsInfoRequest) ([]FileInfo, error)
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
    GrepRaw(ctx context.Context, req *GrepRequest) ([]GrepMatch, error)
    GlobInfo(ctx context.Context, req *GlobInfoRequest) ([]FileInfo, error)
    Write(ctx context.Context, req *WriteRequest) error
    Edit(ctx context.Context, req *EditRequest) error
}
```

<table>
<tr><td>方法</td><td>功能</td><td>返回</td></tr>
<tr><td><pre>LsInfo</pre></td><td>列出指定路径下的文件和目录信息</td><td><pre>[]FileInfo</pre></td></tr>
<tr><td><pre>Read</pre></td><td>读取文件内容，支持按行分页（offset + limit）</td><td><pre>*FileContent</pre></td></tr>
<tr><td><pre>GrepRaw</pre></td><td>在文件中搜索匹配 pattern 的内容</td><td><pre>[]GrepMatch</pre></td></tr>
<tr><td><pre>GlobInfo</pre></td><td>根据 glob pattern 查找匹配文件</td><td><pre>[]FileInfo</pre></td></tr>
<tr><td><pre>Write</pre></td><td>写入或创建文件</td><td><pre>error</pre></td></tr>
<tr><td><pre>Edit</pre></td><td>替换文件中的字符串内容</td><td><pre>error</pre></td></tr>
</table>

## 扩展接口

### Shell / StreamingShell

Backend 可选择性实现命令执行能力。当 Backend 同时实现 `Shell` 或 `StreamingShell` 时，Filesystem Middleware 会额外注册 `execute` 工具。两者**互斥**，不可同时配置。

```go
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (result *ExecuteResponse, err error)
}

type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (result *schema.StreamReader[*ExecuteResponse], err error)
}
```

### MultiModalReader

可选扩展接口，支持多模态文件读取（图片、PDF 等），返回结构化的 `MultiFileContent`。

```go
type MultiModalReader interface {
    MultiModalRead(ctx context.Context, req *MultiModalReadRequest) (*MultiFileContent, error)
}
```

当 Backend 实现此接口且 Middleware 配置 `UseMultiModalRead = true` 时，`read_file` 工具将使用多模态读取。

## 核心数据类型

### 请求类型

<table>
<tr><td>类型</td><td>字段</td><td>说明</td></tr>
<tr><td><pre>LsInfoRequest</pre></td><td><pre>Path string</pre></td><td>要列出的目录路径</td></tr>
<tr><td><pre>ReadRequest</pre></td><td><pre>FilePath string</pre><pre>Offset int</pre><pre>Limit int</pre></td><td>文件路径；起始行号（1-based，<1 视为 1）；最大读取行数（0=全部）</td></tr>
<tr><td><pre>MultiModalReadRequest</pre></td><td>嵌入 <pre>ReadRequest</pre><pre>Pages string</pre></td><td>继承 ReadRequest 所有字段；Pages 指定 PDF 页码范围（如 "1-5"、"3"）</td></tr>
<tr><td><pre>GrepRequest</pre></td><td><pre>Pattern string</pre><pre>Path string</pre><pre>Glob string</pre><pre>FileType string</pre><pre>CaseInsensitive bool</pre><pre>EnableMultiline bool</pre><pre>AfterLines int</pre><pre>BeforeLines int</pre></td><td>正则搜索模式（ripgrep 语法）；搜索目录；glob 文件过滤；文件类型过滤（如 "go"、"py"）；忽略大小写；启用多行匹配；匹配后显示 N 行；匹配前显示 N 行</td></tr>
<tr><td><pre>GlobInfoRequest</pre></td><td><pre>Pattern string</pre><pre>Path string</pre></td><td>glob 表达式（支持 <pre>*</pre>、<pre>**</pre>、<pre>?</pre>、<pre>[abc]</pre>）；搜索起始目录</td></tr>
<tr><td><pre>WriteRequest</pre></td><td><pre>FilePath string</pre><pre>Content string</pre></td><td>目标文件路径；写入内容</td></tr>
<tr><td><pre>EditRequest</pre></td><td><pre>FilePath string</pre><pre>OldString string</pre><pre>NewString string</pre><pre>ReplaceAll bool</pre></td><td>文件路径；被替换的精确字符串（非空）；替换后的字符串；false 时要求 OldString 在文件中仅出现一次</td></tr>
<tr><td><pre>ExecuteRequest</pre></td><td><pre>Command string</pre><pre>RunInBackendGround bool</pre></td><td>要执行的命令字符串；是否后台运行</td></tr>
</table>

### 响应类型

<table>
<tr><td>类型</td><td>字段</td><td>说明</td></tr>
<tr><td><pre>FileInfo</pre></td><td><pre>Path string</pre><pre>IsDir bool</pre><pre>Size int64</pre><pre>ModifiedAt string</pre></td><td>文件/目录路径；是否为目录；文件大小（字节）；最后修改时间（ISO 8601 格式）</td></tr>
<tr><td><pre>FileContent</pre></td><td><pre>Content string</pre></td><td>文件的纯文本内容</td></tr>
<tr><td><pre>MultiFileContent</pre></td><td><pre>*FileContent</pre><pre>Parts []FileContentPart</pre></td><td>嵌入 FileContent；多模态输出部分。Parts 与 FileContent 互斥：Parts 非空时 FileContent 被忽略</td></tr>
<tr><td><pre>FileContentPart</pre></td><td><pre>Type FileContentPartType</pre><pre>MIMEType string</pre><pre>Data []byte</pre></td><td>内容类型（<pre>"image"</pre> 或 <pre>"pdf"</pre>）；MIME 类型（如 "image/png"）；原始二进制数据</td></tr>
<tr><td><pre>GrepMatch</pre></td><td><pre>Content string</pre><pre>Path string</pre><pre>Line int</pre></td><td>匹配的行内容；文件路径；1-based 行号</td></tr>
<tr><td><pre>ExecuteResponse</pre></td><td><pre>Output string</pre><pre>ExitCode *int</pre><pre>Truncated bool</pre></td><td>命令输出内容；退出码（指针，可能为 nil）；输出是否被截断</td></tr>
</table>

### 常量

```go
type FileContentPartType string

const (
    FileContentPartTypeImage FileContentPartType = "image"
    FileContentPartTypePDF   FileContentPartType = "pdf"
)
```

## 内置实现：InMemoryBackend

`InMemoryBackend` 将文件存储在内存 map 中，主要用于：

- **单元测试** — 无需真实文件系统即可测试 Agent/Middleware 的文件操作逻辑
- **轻量场景** — 不需要持久化的临时文件操作
- **工具结果卸载** — Filesystem Middleware 的大型工具结果卸载功能默认使用 InMemoryBackend

### 构造函数

```go
func NewInMemoryBackend() *InMemoryBackend
```

零参数构造，返回空的内存文件系统。

### 使用示例

```go
backend := filesystem.NewInMemoryBackend()
ctx := context.Background()

// 写入
_ = backend.Write(ctx, &filesystem.WriteRequest{
    FilePath: "/example/test.txt",
    Content:  "Hello, World!\nLine 2\nLine 3",
})

// 读取（分页）
content, _ := backend.Read(ctx, &filesystem.ReadRequest{
    FilePath: "/example/test.txt",
    Offset:   1,
    Limit:    10,
})

// 列目录
files, _ := backend.LsInfo(ctx, &filesystem.LsInfoRequest{Path: "/example"})

// 搜索（正则）
matches, _ := backend.GrepRaw(ctx, &filesystem.GrepRequest{
    Pattern:         "Hello",
    Path:            "/example",
    CaseInsensitive: true,
})

// 编辑
_ = backend.Edit(ctx, &filesystem.EditRequest{
    FilePath:   "/example/test.txt",
    OldString:  "Hello",
    NewString:  "Hi",
    ReplaceAll: false,
})
```

### 实现特性

- **线程安全** — 基于 `sync.RWMutex`，读操作使用读锁，写操作使用写锁
- **GrepRaw 并行处理** — 多文件搜索时最多启动 10 个 worker 并行匹配
- **正则支持** — 支持完整正则、大小写不敏感 (`(?i)` 前缀)、多行模式
- **上下文行** — GrepRaw 支持 BeforeLines/AfterLines 显示匹配行前后的上下文
- **Glob 匹配** — 使用 `doublestar` 库支持 `**` 递归匹配
- **FileType 映射** — 内置 70+ 种文件类型到扩展名的映射表（go、py、ts、rust 等）
- **不实现 Shell** — InMemoryBackend 不实现 Shell/StreamingShell 接口

## 外部实现

以下 Backend 实现位于 [eino-ext](https://github.com/cloudwego/eino-ext) 仓库：

- **Local Backend** (`github.com/cloudwego/eino-ext/adk/backend/local`) — 本地文件系统实现，直接操作本机磁盘
- **Ark Agentkit Sandbox** (`github.com/cloudwego/eino-ext/adk/backend/agentkit`) — 火山引擎 Agentkit 远程沙箱实现

### 实现对比

<table>
<tr><td>特性</td><td>InMemory</td><td>Local</td><td>Agentkit Sandbox</td></tr>
<tr><td>执行模型</td><td>内存</td><td>本地直接</td><td>远程沙箱</td></tr>
<tr><td>网络依赖</td><td>无</td><td>无</td><td>需要</td></tr>
<tr><td>配置复杂度</td><td>零配置</td><td>零配置</td><td>需要凭证</td></tr>
<tr><td>持久化</td><td>否</td><td>是</td><td>是</td></tr>
<tr><td>Shell 支持</td><td>否</td><td>Shell + StreamingShell</td><td>Shell</td></tr>
<tr><td>MultiModalReader</td><td>否</td><td>视实现而定</td><td>视实现而定</td></tr>
<tr><td>适用场景</td><td>测试 / 临时存储</td><td>开发 / 本地环境</td><td>多租户 / 生产环境</td></tr>
</table>

## 自定义实现

实现 `Backend` 接口即可对接自定义存储。如需命令执行，额外实现 `Shell` 或 `StreamingShell`；如需多模态读取，实现 `MultiModalReader`。

```go
type MyBackend struct { /* ... */ }

func (b *MyBackend) LsInfo(ctx context.Context, req *filesystem.LsInfoRequest) ([]filesystem.FileInfo, error) {
    // 自定义实现
}

func (b *MyBackend) Read(ctx context.Context, req *filesystem.ReadRequest) (*filesystem.FileContent, error) {
    // 自定义实现
}

func (b *MyBackend) GrepRaw(ctx context.Context, req *filesystem.GrepRequest) ([]filesystem.GrepMatch, error) {
    // 自定义实现
}

func (b *MyBackend) GlobInfo(ctx context.Context, req *filesystem.GlobInfoRequest) ([]filesystem.FileInfo, error) {
    // 自定义实现
}

func (b *MyBackend) Write(ctx context.Context, req *filesystem.WriteRequest) error {
    // 自定义实现
}

func (b *MyBackend) Edit(ctx context.Context, req *filesystem.EditRequest) error {
    // 自定义实现
}

// 可选：实现 Shell
func (b *MyBackend) Execute(ctx context.Context, input *filesystem.ExecuteRequest) (*filesystem.ExecuteResponse, error) {
    // 自定义实现
}

// 可选：实现 MultiModalReader
func (b *MyBackend) MultiModalRead(ctx context.Context, req *filesystem.MultiModalReadRequest) (*filesystem.MultiFileContent, error) {
    // 自定义实现
}
```
