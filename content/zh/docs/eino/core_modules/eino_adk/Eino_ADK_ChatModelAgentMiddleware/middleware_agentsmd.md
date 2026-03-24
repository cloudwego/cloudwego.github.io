---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: AgentsMD
weight: 9
---

## 概述

`agentsmd` 是 Eino ADK 提供的一个中间件，用于在每次模型调用时**自动将 Agents.md 文件内容注入到模型输入消息中**。注入是瞬态的——内容在模型调用时动态添加，不会持久化到会话状态中，因此**不会被摘要/压缩中间件处理**。

**核心价值**：通过 Agents.md 文件为 Agent 定义系统级的行为指令和上下文信息（类似 Claude Code 的 CLAUDE.md），无需手动管理 system prompt 的拼接。

**包路径**：`github.com/cloudwego/eino/adk/middlewares/agentsmd`

---

## 快速开始

### 最小化示例

```go
package main

import (
        "context"
        "fmt"

        "github.com/cloudwego/eino/adk"
        "github.com/cloudwego/eino/adk/middlewares/agentsmd"
)

func main() {
        ctx := context.Background()

        // 1. 准备 Backend（文件读取后端）
        backend := NewLocalFileBackend("/path/to/project")

        // 2. 创建 agentsmd 中间件
        mw, err := agentsmd.New(ctx, &agentsmd.Config{
                Backend:       backend,
                AgentsMDFiles: []string{"/home/user/project/agents.md"},
        })
        if err != nil {
                panic(err)
        }

        // 3. 将中间件配置到 Agent
        // agent := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
        //     Middlewares: []adk.ChatModelAgentMiddleware{mw},
        // })
        _ = mw
        fmt.Println("agentsmd middleware created successfully")
}
```

---

## 配置详解

### Config 结构体

```go
type Config struct {
    // Backend 提供文件访问能力，用于加载 Agents.md 文件。
    // 可以使用本地文件系统、远程存储或任何其他后端实现。
    // 必填。
    Backend Backend

    // AgentsMDFiles 指定要加载的 Agents.md 文件路径的有序列表。
    // 文件按照给定顺序加载和注入。
    // 文件内部支持 @import 语法进行递归引入（最大深度 5）。
    AgentsMDFiles []string

    // AllAgentsMDMaxBytes 限制所有加载的 Agents.md 内容的总字节大小。
    // 文件按顺序加载；一旦累计大小超过此限制，剩余文件将被跳过。
    // 每个单独的文件始终完整加载。
    // 0 表示无限制。
    AllAgentsMDMaxBytes int

    // OnLoadWarning 是一个可选的回调函数，在加载过程中发生非致命错误时调用
    // （如文件未找到、循环 @import、深度超限等）。
    // 如果为 nil，警告通过 log.Printf 输出。
    //
    // 注意：Backend.Read 的非 os.ErrNotExist 错误（如权限被拒、I/O 错误）
    // 不会被视为警告，而是会中止加载过程。
    OnLoadWarning func(filePath string, err error)
}
```

### 配置参数说明

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>默认值</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>是</td><td>-</td><td>文件读取后端，负责实际的文件 I/O</td></tr>
<tr><td><pre>AgentsMDFiles</pre></td><td><pre>[]string</pre></td><td>是</td><td>-</td><td>要加载的 Agents.md 文件路径列表（至少一个）</td></tr>
<tr><td><pre>AllAgentsMDMaxBytes</pre></td><td><pre>int</pre></td><td>否</td><td><pre>0</pre>（无限制）</td><td>所有文件的总字节数上限</td></tr>
<tr><td><pre>OnLoadWarning</pre></td><td><pre>func(string, error)</pre></td><td>否</td><td><pre>log.Printf</pre></td><td>非致命错误的回调函数</td></tr>
</table>

---

## Backend 接口

### 接口定义

```go
type Backend interface {
    // Read 读取文件内容。
    // 如果文件不存在，实现应返回包装了 os.ErrNotExist 的 error
    // （以便 errors.Is(err, os.ErrNotExist) 返回 true）。
    // 这样 loader 可以静默跳过缺失文件并通过 OnLoadWarning 通知。
    // 其他错误（如权限被拒、I/O 错误）会中止加载过程。
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
}
```

### 类型定义

```go
// ReadRequest 定义读取文件的请求参数
type ReadRequest struct {
    FilePath string // 文件路径
    Offset   int    // 起始行号（1-based）
}

// FileContent 定义文件内容的返回结构
type FileContent struct {
    Content string // 文件的文本内容
}
```

---

## @import 语法

Agents.md 文件支持 `@import` 语法，可以递归引入其他文件。

### 语法格式

在 Agents.md 文件中，使用 `@路径/文件名` 引用其他文件：

```markdown
# 项目指令

你是一个代码助手。

请参考以下规范：
@rules/code-style.md
@rules/api-conventions.md
```

### 规则

1. **路径解析**：相对路径基于当前文件所在目录解析，绝对路径直接使用
2. **最大递归深度**：5 层（超过后跳过并触发 `OnLoadWarning`）
3. **循环引用检测**：自动检测并跳过循环引用（触发 `OnLoadWarning`）
4. **全局去重**：同一文件不会被重复加载
5. **支持的文件扩展名**（路径中不含 `/` 时）：`.md`, `.txt`, `.mdx`, `.yaml`, `.yml`, `.json`, `.toml`
6. **误报过滤**：不含 `/` 且扩展名不在允许列表中的 `@引用` 会被忽略（避免将 `@someone` 或 `@example.com` 识别为导入）

### @import 目录结构示例

```
project/
├── Agents.md               # 主入口文件
├── rules/
│   ├── code-style.md       # 代码风格规范
│   ├── api-conventions.md  # API 规范
│   └── testing.md          # 测试规范
└── context/
    └── architecture.md     # 架构说明
```

---

## 工作原理

### 注入流程

```
用户消息 + 历史消息
       │
       ▼
┌─────────────────────┐
│  agentsmd 中间件     │
│  (WrapModel)        │
│                     │
│  1. 加载 Agents.md  │
│  2. 缓存到 RunLocal │
│  3. 生成注入消息     │
└─────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  注入后的消息序列                    │
│                                     │
│  [System]  系统提示词               │
│  [User]    ← Agents.md 内容注入    │  ← 插入在第一条 User 消息之前
│  [User]    用户历史消息 1           │
│  [Assistant] 助手回复 1             │
│  [User]    用户当前消息             │
└─────────────────────────────────────┘
       │
       ▼
     模型调用 (Generate / Stream)
```

### 关键机制

1. **瞬态注入**：Agents.md 内容仅在模型调用时临时插入，不写入 `ChatModelAgentState`，因此不会被摘要/压缩中间件处理
2. **Run 级别缓存**：同一次 Agent `Run()` 中，Agents.md 内容加载后会缓存在 `RunLocalValue` 中，后续的模型调用（如多轮工具调用）直接复用缓存，避免重复读取
3. **插入位置**：内容作为 `User` 角色消息插入在第一条 User 消息之前；如果没有 User 消息，则追加到末尾
4. **国际化**：格式化输出自动适配中英文（根据系统语言环境）

---

## 注意事项

### 中间件顺序

**推荐将 ****agentsmd**** 中间件放在 summarization/compression 中间件之后。** 这样可以确保 Agents.md 内容：

- 不会被摘要中间件压缩掉
- 每次模型调用都能获得完整的指令内容

```go
Middlewares: []adk.ChatModelAgentMiddleware{
    summarizationMiddleware, // 先摘要
    agentsMDMiddleware,      // 后注入 Agents.md
}
```

### 错误处理

<table>
<tr><td>场景</td><td>行为</td></tr>
<tr><td>文件不存在 (<pre>os.ErrNotExist</pre>)</td><td>跳过该文件，触发 <pre>OnLoadWarning</pre></td></tr>
<tr><td>循环 <pre>@import</pre></td><td>跳过循环文件，触发 <pre>OnLoadWarning</pre></td></tr>
<tr><td><pre>@import</pre> 深度超过 5 层</td><td>跳过，触发 <pre>OnLoadWarning</pre></td></tr>
<tr><td>累计大小超过 <pre>AllAgentsMDMaxBytes</pre></td><td>跳过后续文件，触发 <pre>OnLoadWarning</pre>（第一个文件始终完整加载）</td></tr>
<tr><td>权限被拒 / I/O 错误</td><td><strong>中止加载，返回 error</strong></td></tr>
<tr><td>所有文件内容为空</td><td>不注入，原样传递输入消息</td></tr>
</table>

### Backend 实现要求

- 文件不存在时**必须**返回 `os.ErrNotExist` 包裹的错误（`fmt.Errorf("... : %w", os.ErrNotExist)`），否则 loader 无法区分"文件缺失"和"真正的 I/O 错误"
- `Read` 方法应当是并发安全的

### 性能考虑

- 合理设置 `AllAgentsMDMaxBytes`，避免注入过多内容占用模型上下文窗口
- Agents.md 内容在每次 `Run()` 中只加载一次（Run 级别缓存），但**每次新的 ****Run()**** 都会重新加载**，因此文件内容的修改会在下次 Run 时生效
- 避免在 Agents.md 中 `@import` 过多文件，递归深度上限为 5 层

### Agents.md 编写建议

- 保持内容精炼，只包含对模型行为真正有影响的指令
- 使用 `@import` 拆分关注点（代码规范、API 规范、架构说明等）
- 避免在 Agents.md 中包含大量代码示例或数据，以免浪费上下文窗口
- 文件内容会被包裹在 `<system-reminder>` 标签中传递给模型，模型会将其视为系统级指令

---

## FAQ

**Q: Agents.md 的内容会被保存到对话历史中吗？**
A: 不会。内容是在模型调用时动态注入的，不会写入 `ChatModelAgentState`，因此对话历史中不会出现 Agents.md 的内容。

**Q: 如果某个 Agents.md 文件不存在会怎样？**
A: 该文件会被跳过，触发 `OnLoadWarning` 回调（默认 `log.Printf`），不会导致整体加载失败。

**Q: @import 的路径是相对于什么目录？**
A: 相对于当前文件所在目录。例如 `/project/Agents.md` 中的 `@rules/style.md` 会解析为 `/project/rules/style.md`。

**Q: 多个文件中 @import 了同一个文件会重复加载吗？**
A: 不会。loader 维护了全局去重 map，同一个文件路径只会被读取和注入一次。
