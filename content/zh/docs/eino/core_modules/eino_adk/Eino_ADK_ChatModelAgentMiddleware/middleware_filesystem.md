---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: FileSystem
weight: 2
---

> 💡 Package: [github.com/cloudwego/eino/adk/middlewares/filesystem](https://github.com/cloudwego/eino/tree/main/adk/middlewares/filesystem)

## 概述

FileSystem Middleware 为 Agent 提供文件系统访问能力。它通过 [FileSystem Backend](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/filesystem_backend) 接口操作文件系统，自动向 Agent 注入一组文件操作工具及对应的 system prompt，使 Agent 能够直接进行文件读写、搜索、编辑等操作。

核心功能：

- **文件系统工具注入** — 自动注册 ls、read_file、write_file、edit_file、glob、grep 等工具
- **Shell 命令执行** — 可选注入 execute 工具，支持同步和流式命令执行
- **工具级别配置** — 每个工具均可独立配置名称、描述、自定义实现或禁用
- **多语言提示词** — 工具描述和 system prompt 支持中英文切换

## 创建中间件

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

> 💡
> `New` 返回 `ChatModelAgentMiddleware`，提供更好的上下文传播能力（通过 `BeforeAgent` hook 在运行时修改 Agent 的 instruction 和 tools）。

## MiddlewareConfig 配置项

```go
type MiddlewareConfig struct {
    // Backend 提供文件系统操作
    // 必填
    Backend filesystem.Backend

    // Shell 提供 shell 命令执行能力
    // 如果设置，会注册 execute 工具
    // 可选，与 StreamingShell 互斥
    Shell filesystem.Shell

    // StreamingShell 提供流式 shell 命令执行能力
    // 如果设置，会注册流式 execute 工具（支持实时输出）
    // 可选，与 Shell 互斥
    StreamingShell filesystem.StreamingShell

    // 以下为各工具的独立配置，均为可选
    LsToolConfig        *ToolConfig  // ls 工具配置
    ReadFileToolConfig  *ToolConfig  // read_file 工具配置
    WriteFileToolConfig *ToolConfig  // write_file 工具配置
    EditFileToolConfig  *ToolConfig  // edit_file 工具配置
    GlobToolConfig      *ToolConfig  // glob 工具配置
    GrepToolConfig      *ToolConfig  // grep 工具配置

    // CustomSystemPrompt 覆盖默认的系统提示词
    // 可选，默认 ToolsSystemPrompt
    CustomSystemPrompt *string

    // 以下字段已 Deprecated，请使用对应的 *ToolConfig.Desc 替代
    // CustomLsToolDesc, CustomReadFileToolDesc, CustomGrepToolDesc,
    // CustomGlobToolDesc, CustomWriteFileToolDesc, CustomEditToolDesc
}
```

### ToolConfig

每个工具均可通过 `ToolConfig` 独立配置：

```go
type ToolConfig struct {
    // Name 覆盖工具名称
    // 可选，不设置则使用默认名称（如 "ls"、"read_file" 等）
    Name string

    // Desc 覆盖工具描述
    // 可选，不设置则使用默认描述
    Desc *string

    // CustomTool 提供自定义工具实现
    // 如果设置，将使用此自定义实现替代基于 Backend 的默认实现
    // 可选
    CustomTool tool.BaseTool

    // Disable 禁用此工具
    // 如果为 true，该工具将不会被注册
    // 可选，默认 false
    Disable bool
}
```

示例 — 自定义工具名称并禁用写入：

```go
middleware, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend: myBackend,
    ReadFileToolConfig: &filesystem.ToolConfig{
        Name: "cat_file",  // 自定义名称
    },
    WriteFileToolConfig: &filesystem.ToolConfig{
        Disable: true,  // 禁用写入工具
    },
})
```

## 注入的工具

<table>
<tr><td>工具</td><td>默认名称</td><td>描述</td><td>条件</td></tr>
<tr><td>列出目录</td><td><pre>ls</pre></td><td>列出指定路径下的文件和目录</td><td>Backend 不为 nil 时注入</td></tr>
<tr><td>读取文件</td><td><pre>read_file</pre></td><td>读取文件内容，支持按行分页（offset + limit）</td><td>Backend 不为 nil 时注入</td></tr>
<tr><td>写入文件</td><td><pre>write_file</pre></td><td>创建或覆盖文件</td><td>Backend 不为 nil 时注入</td></tr>
<tr><td>编辑文件</td><td><pre>edit_file</pre></td><td>替换文件中的字符串</td><td>Backend 不为 nil 时注入</td></tr>
<tr><td>Glob 查找</td><td><pre>glob</pre></td><td>按 glob pattern 查找文件</td><td>Backend 不为 nil 时注入</td></tr>
<tr><td>内容搜索</td><td><pre>grep</pre></td><td>按 pattern 搜索文件内容，支持多种输出模式</td><td>Backend 不为 nil 时注入</td></tr>
<tr><td>命令执行</td><td><pre>execute</pre></td><td>执行 shell 命令</td><td>需配置 Shell 或 StreamingShell</td></tr>
</table>

每个工具均可通过对应的 `*ToolConfig` 禁用（`Disable: true`）或提供自定义实现（`CustomTool`）。

## 多语言支持

工具描述和内置提示词默认为英文。如需切换为中文，可通过 `adk.SetLanguage()` 设置：

```go
import "github.com/cloudwego/eino/adk"

adk.SetLanguage(adk.LanguageChinese)  // 切换为中文
adk.SetLanguage(adk.LanguageEnglish)  // 切换为英文（默认）
```

也可以通过 `ToolConfig.Desc` 或 `CustomSystemPrompt` 自定义各工具的说明文本。

## [deprecated] 工具结果卸载

> 💡
> 该功能即将在 0.8.0 中 deprecate。请迁移到 Middleware: ToolReduction

> 注意：工具结果卸载仅在旧的 `Config` + `NewMiddleware` 函数中可用。推荐的 `MiddlewareConfig` + `New` 不包含此功能，如需要请配合 ToolReduction middleware 使用。

当工具调用结果过大（例如读取大文件、grep 命中大量内容），如果继续将完整结果放入对话上下文，会导致：

- token 急剧增加
- Agent 历史上下文污染
- 推理效率变差

为此，旧版 Middleware（`NewMiddleware`）提供了自动卸载机制：

- 当结果大小超过阈值（默认 20,000 tokens）时，不直接返回全部内容给 LLM
- 实际结果会保存到文件系统（Backend）
- 上下文中仅包含摘要和文件路径（Agent 可再次调用 `read_file` 工具按需读取）

该功能默认启用，可通过 `Config`（非 `MiddlewareConfig`）配置：

```go
type Config struct {
    // ... Backend, Shell, StreamingShell, ToolConfig 等字段同 MiddlewareConfig

    // 关闭自动卸载
    WithoutLargeToolResultOffloading bool

    // 自定义触发阈值（默认 20000 tokens）
    LargeToolResultOffloadingTokenLimit int

    // 自定义卸载文件生成路径
    // 默认路径格式: /large_tool_result/{ToolCallID}
    LargeToolResultOffloadingPathGen func(ctx context.Context, input *compose.ToolInput) (string, error)
}
```
