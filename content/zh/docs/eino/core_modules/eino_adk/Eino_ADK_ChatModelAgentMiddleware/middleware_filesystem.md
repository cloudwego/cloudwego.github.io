---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: FileSystem
weight: 2
---

FileSystem 中间件为 Agent 注入一组文件系统操作工具（ls、read\_file、write\_file、edit\_file、glob、grep）以及可选的命令执行工具（execute），使 Agent 具备与本地或远程文件系统交互的能力。

```
import "github.com/cloudwego/eino/adk/middlewares/filesystem"
```

---

## 快速开始

```go
import (
    "context"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

// 1. 创建 middleware
middleware, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend: myBackend, // 实现 filesystem.Backend 接口
})

// 2. 注入 Agent
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ...
    Middlewares: []adk.ChatModelAgentMiddleware{middleware},
})
```

---

## 构造函数

<table>
<tr><td>函数签名</td><td>说明</td></tr>
<tr><td><pre>New(ctx, *MiddlewareConfig) (ChatModelAgentMiddleware, error)</pre></td><td><strong>推荐</strong>。返回 <pre>ChatModelAgentMiddleware</pre>，支持通过 <pre>BeforeAgent</pre> 钩子动态修改 Instruction 和 Tools。</td></tr>
<tr><td><pre>NewTyped[M MessageType](ctx, *MiddlewareConfig) (TypedChatModelAgentMiddleware[M], error)</pre></td><td>泛型版本，类型参数 <pre>M</pre> 支持 <pre>*schema.Message</pre> 和 <pre>*schema.AgenticMessage</pre>。<pre>New</pre> 等价于 <pre>NewTyped[*schema.Message]</pre>。</td></tr>
</table>

> 💡
> **Deprecated**: `NewMiddleware(ctx, *Config) (AgentMiddleware, error)` 为旧版构造函数，新代码请使用 `New`。`NewMiddleware` 返回结构体 `AgentMiddleware`，缺少 `BeforeAgent` 钩子的灵活性；此外它默认启用「大结果卸载」功能（见下文），在 `New` 路径中该功能已被移除。

---

## MiddlewareConfig

`MiddlewareConfig` 是 `New` / `NewTyped` 使用的配置结构体。

### 核心字段

<table>
<tr><td>字段</td><td>类型</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>filesystem.Backend</pre></td><td><strong>必填</strong>。提供文件系统操作能力，驱动 ls、read\_file、write\_file、edit\_file、glob、grep 共 6 个工具。接口定义在 <pre>github.com/cloudwego/eino/adk/filesystem</pre> 包。</td></tr>
<tr><td><pre>Shell</pre></td><td><pre>filesystem.Shell</pre></td><td>可选。提供命令执行能力，设置后注册 <pre>execute</pre> 工具。与 <pre>StreamingShell</pre> <strong>互斥</strong>。</td></tr>
<tr><td><pre>StreamingShell</pre></td><td><pre>filesystem.StreamingShell</pre></td><td>可选。提供流式命令执行能力，设置后注册流式 <pre>execute</pre> 工具。与 <pre>Shell</pre> <strong>互斥</strong>。</td></tr>
<tr><td><pre>UseMultiModalRead</pre></td><td><pre>bool</pre></td><td>可选，默认 <pre>false</pre>。开启后 <pre>read_file</pre> 工具变为 <pre>EnhancedInvokableTool</pre>，支持返回图片/PDF 等多模态内容。<strong>要求 Backend 同时实现 filesystem.MultiModalReader 接口</strong>。</td></tr>
<tr><td><pre>CustomSystemPrompt</pre></td><td><pre>*string</pre></td><td>可选。覆盖追加到 Agent Instruction 的系统提示词。若为 <pre>nil</pre>，<strong>不追加任何系统提示词</strong>。</td></tr>
</table>

### 工具配置字段

每个工具均有对应的 `*ToolConfig` 字段，用于自定义工具名称、描述、替换实现或禁用：

<table>
<tr><td>字段</td><td>对应工具</td></tr>
<tr><td><pre>LsToolConfig</pre></td><td>ls</td></tr>
<tr><td><pre>ReadFileToolConfig</pre></td><td>read\_file</td></tr>
<tr><td><pre>WriteFileToolConfig</pre></td><td>write\_file</td></tr>
<tr><td><pre>EditFileToolConfig</pre></td><td>edit\_file</td></tr>
<tr><td><pre>GlobToolConfig</pre></td><td>glob</td></tr>
<tr><td><pre>GrepToolConfig</pre></td><td>grep</td></tr>
</table>

> `execute` 工具当前不支持通过 `ToolConfig` 自定义，其注册仅由 `Shell` / `StreamingShell` 是否设置来控制。

---

## ToolConfig

```go
type ToolConfig struct {
    Name       string         // 覆盖工具名称，空串使用默认值
    Desc       *string        // 覆盖工具描述，nil 使用默认值
    CustomTool tool.BaseTool  // 自定义工具实现，设置后替代 Backend 默认实现
    Disable    bool           // 设为 true 则不注册该工具
}
```

**优先级**：`Disable=true` > `CustomTool` > Backend 默认实现。

---

## 工具名称常量

```go
const (
    ToolNameLs        = "ls"
    ToolNameReadFile  = "read_file"
    ToolNameWriteFile = "write_file"
    ToolNameEditFile  = "edit_file"
    ToolNameGlob      = "glob"
    ToolNameGrep      = "grep"
    ToolNameExecute   = "execute"
)
```

---

## 注入的工具

<table>
<tr><td>工具</td><td>默认名称</td><td>注册条件</td><td>功能说明</td></tr>
<tr><td>ls</td><td><pre>ls</pre></td><td>Backend ≠ nil</td><td>列出目录下的文件和子目录</td></tr>
<tr><td>read\_file</td><td><pre>read_file</pre></td><td>Backend ≠ nil</td><td>读取文件内容，支持 offset/limit 分页。开启 <pre>UseMultiModalRead</pre> 后可读取图片和 PDF</td></tr>
<tr><td>write\_file</td><td><pre>write_file</pre></td><td>Backend ≠ nil</td><td>创建或覆盖写入文件</td></tr>
<tr><td>edit\_file</td><td><pre>edit_file</pre></td><td>Backend ≠ nil</td><td>精确字符串替换编辑，支持 <pre>replace_all</pre></td></tr>
<tr><td>glob</td><td><pre>glob</pre></td><td>Backend ≠ nil</td><td>按 glob 模式匹配文件路径</td></tr>
<tr><td>grep</td><td><pre>grep</pre></td><td>Backend ≠ nil</td><td>正则搜索文件内容，支持多种输出模式和分页</td></tr>
<tr><td>execute</td><td><pre>execute</pre></td><td>Shell ≠ nil 或 StreamingShell ≠ nil</td><td>执行 Shell 命令</td></tr>
</table>

---

## Backend 接口

`Backend` 定义在 `github.com/cloudwego/eino/adk/filesystem` 包中。middleware 包通过类型别名重导出了请求/响应类型（如 `ReadRequest`、`FileContent` 等），但 **Backend 接口本身需要从 adk/filesystem 包引用**。

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

### Shell 与 StreamingShell

```go
type Shell interface {
    Execute(ctx context.Context, input *ExecuteRequest) (*ExecuteResponse, error)
}

type StreamingShell interface {
    ExecuteStreaming(ctx context.Context, input *ExecuteRequest) (*schema.StreamReader[*ExecuteResponse], error)
}
```

二者互斥，只能设置其中一个。`StreamingShell` 支持流式输出，适合长时间运行的命令。

---

## MultiModalReader 扩展接口

当 `UseMultiModalRead = true` 时，Backend 需要额外实现 `MultiModalReader` 接口：

```go
type MultiModalReader interface {
    MultiModalRead(ctx context.Context, req *MultiModalReadRequest) (*MultiFileContent, error)
}
```

**行为说明**：

- `read_file` 工具将从 `InvokableTool` 升级为 `EnhancedInvokableTool`，通过 `schema.ToolResult.Parts` 返回多模态结果
- 默认实现支持读取图片文件（PNG、JPG 等）和 PDF 文件（支持 `pages` 参数指定页面范围，每次最多 20 页）
- 工具描述会自动追加多模态能力后缀；若通过 `ReadFileToolConfig.Desc` 自定义了描述，则不会追加

> 💡
> 使用 `ChatModelAgentMiddleware` 时，需要实现 `WrapEnhancedInvokableToolCall` 方法，多模态 read\_file 工具才能生效。

```go
// MultiModalReadRequest 扩展了 ReadRequest
type MultiModalReadRequest struct {
    ReadRequest
    Pages string  // PDF 页面范围，如 "1-5"、"3"、"10-20"
}

// MultiFileContent 返回结果
type MultiFileContent struct {
    *FileContent            // 纯文本结果
    Parts []FileContentPart // 多模态结果（与 FileContent 互斥，Parts 非空时忽略 FileContent）
}

type FileContentPart struct {
    Type     FileContentPartType // "image" 或 "pdf"
    MIMEType string              // 如 "image/png"、"application/pdf"
    Data     []byte              // 原始二进制数据
}
```

---

## Deprecated: 旧版 Config 与大结果卸载

> 💡
> 以下内容仅适用于 `NewMiddleware` + `Config` 旧版路径。`New` / `NewTyped` 路径**不包含**大结果卸载功能。

旧版 `Config` 在 `MiddlewareConfig` 的基础上额外提供了「大工具结果卸载」(Large Tool Result Offloading) 机制：

<table>
<tr><td>字段</td><td>说明</td></tr>
<tr><td><pre>WithoutLargeToolResultOffloading bool</pre></td><td>设为 <pre>true</pre> 禁用卸载，默认 <pre>false</pre>（启用）</td></tr>
<tr><td><pre>LargeToolResultOffloadingTokenLimit int</pre></td><td>Token 阈值，默认 <pre>20000</pre></td></tr>
<tr><td><pre>LargeToolResultOffloadingPathGen func(ctx, *compose.ToolInput) (string, error)</pre></td><td>卸载路径生成函数，默认 <pre>/large_tool_result/{ToolCallID}</pre></td></tr>
</table>

**触发条件**：当工具返回结果的字符数 > `tokenLimit × 4` 时触发卸载。

**卸载行为**：将完整结果通过 `Backend.Write` 写入文件，并用摘要（前 10 行 + 文件路径提示）替换原始返回。Agent 可通过 `read_file` 分页读取完整结果。
