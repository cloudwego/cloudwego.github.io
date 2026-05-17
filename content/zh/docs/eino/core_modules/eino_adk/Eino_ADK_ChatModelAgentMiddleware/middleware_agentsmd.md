---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: AgentsMD
weight: 9
---

## 概述

`agentsmd` 是 Eino ADK 的中间件，在每次模型调用时**自动将 Agents.md 文件内容注入到消息序列中**。注入的消息会被框架持久化到 agent 内部状态，但通过**幂等性检查**（`Extra["__agentsmd_content__"]` 标记）确保不会重复注入。由于注入内容在首次出现时即固定，**不会随后续摘要/压缩而变化**。**核心价值**：通过 Agents.md 文件为 Agent 定义系统级行为指令与上下文（类似 Claude Code 的 CLAUDE.md），无需手动管理 system prompt 拼接。**包路径**：`github.com/cloudwego/eino/adk/middlewares/agentsmd`

## 快速开始

```go
ctx := context.Background()

// 1. 创建 agentsmd 中间件
mw, err := agentsmd.New(ctx, &agentsmd.Config{
    Backend:       myBackend, // 实现 agentsmd.Backend 接口
    AgentsMDFiles: []string{"/project/agents.md"},
})
if err != nil {
    panic(err)
}

// 2. 配置到 Agent
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    chatModel,
    Handlers: []adk.ChatModelAgentMiddleware{mw},
})
```

---

## 配置详解

### Config 结构体

```go
type Config struct {
    Backend             Backend
    AgentsMDFiles       []string
    AllAgentsMDMaxBytes int
    OnLoadWarning       func(filePath string, err error)
}
```

### 参数说明

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>默认值</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>是</td><td>—</td><td>文件读取后端，负责实际的文件 I/O</td></tr>
<tr><td><pre>AgentsMDFiles</pre></td><td><pre>[]string</pre></td><td>是</td><td>—</td><td>要加载的 Agents.md 文件路径列表（至少一个），按顺序加载和注入</td></tr>
<tr><td><pre>AllAgentsMDMaxBytes</pre></td><td><pre>int</pre></td><td>否</td><td><pre>0</pre>（无限制）</td><td>所有文件的总字节数上限；超过后跳过后续文件，但每个文件始终完整加载</td></tr>
<tr><td><pre>OnLoadWarning</pre></td><td><pre>func(string, error)</pre></td><td>否</td><td><pre>log.Printf</pre></td><td>非致命错误的回调函数（文件缺失、循环 @import、深度超限等）</td></tr>
</table>

### 校验规则

`New` / `NewTyped` 在创建时会校验 Config：

- `Config` 不能为 nil
- `Backend` 不能为 nil
- `AgentsMDFiles` 至少包含一个路径
- `AllAgentsMDMaxBytes` 不能为负数

---

## 构造函数

### New — 标准构造

```go
func New(ctx context.Context, cfg *Config) (adk.ChatModelAgentMiddleware, error)
```

返回 `ChatModelAgentMiddleware`（即 `TypedChatModelAgentMiddleware[*schema.Message]`），适用于标准 `ChatModelAgent`。

### NewTyped — 泛型构造

```go
func NewTyped[M adk.MessageType](_ context.Context, cfg *Config) (adk.TypedChatModelAgentMiddleware[M], error)
```

泛型版本，支持 `*schema.Message` 和 `*schema.AgenticMessage` 两种消息类型。`New` 内部调用 `NewTyped[*schema.Message]`。

## Backend 接口

### 接口定义

```go
type Backend interface {
    Read(ctx context.Context, req *ReadRequest) (*FileContent, error)
}
```

### 类型定义

`ReadRequest` 和 `FileContent` 是 `github.com/cloudwego/eino/adk/filesystem` 包中同名类型的别名：

```go
type ReadRequest = filesystem.ReadRequest
type FileContent = filesystem.FileContent
```

> 💡
> **Backend 实现要求**
>
> - 文件不存在时**必须**返回包裹 `os.ErrNotExist` 的错误（使 `errors.Is(err, os.ErrNotExist)` 为 `true`），loader 据此区分"文件缺失"和"真正的 I/O 错误"
> - 其他错误（权限被拒、I/O 错误）会**中止整个加载过程**，不视为警告
> - `Read` 方法应当是并发安全的

---

## @import 语法

Agents.md 文件支持 `@路径` 语法递归引入其他文件。

### 语法格式

```markdown
# 项目指令

你是一个代码助手。

请参考以下规范：
@rules/code-style.md
@rules/api-conventions.md
```

### 匹配规则

loader 使用正则 `@([a-zA-Z0-9_.~/][a-zA-Z0-9_.~/\-]*)` 扫描文件内容，并结合以下过滤逻辑：

- **含 / 的路径**：直接视为 @import（如 `@rules/style.md`）
- **不含 / 的路径**：仅当扩展名在允许列表内时视为 @import，否则忽略**允许的扩展名**：`.md`、`.txt`、`.mdx`、`.yaml`、`.yml`、`.json`、`.toml` 这一设计避免将 `@someone`、`@example.com` 等误识为导入目标。

### 解析行为

<table>
<tr><td>规则</td><td>说明</td></tr>
<tr><td>路径解析</td><td>相对路径基于当前文件所在目录解析；绝对路径直接使用</td></tr>
<tr><td>最大递归深度</td><td><strong>5 层</strong>（超过后跳过并触发 <pre>OnLoadWarning</pre>）</td></tr>
<tr><td>循环引用检测</td><td>当前祖先链中已存在的路径会被跳过（触发 <pre>OnLoadWarning</pre>）</td></tr>
<tr><td>全局去重</td><td>整次加载中同一文件路径只会被读取和注入一次</td></tr>
<tr><td>原文保留</td><td>@import 引用的文件作为独立段落追加，原文中的 <pre>@path</pre> 文本<strong>不被移除</strong></td></tr>
<tr><td>字节预算</td><td>累计字节数超过 <pre>AllAgentsMDMaxBytes</pre> 后，跳过后续 import</td></tr>
</table>

### 目录结构示例

```
project/
├── Agents.md               # 主入口文件
├── rules/
│   ├── code-style.md       # @rules/code-style.md
│   ├── api-conventions.md  # @rules/api-conventions.md
│   └── testing.md
└── context/
    └── architecture.md
```

---

## 工作原理

### 实现钩子

中间件实现 `TypedChatModelAgentMiddleware` 接口的 `BeforeModelRewriteState` 方法（**非** WrapModel）。此钩子在每次模型调用前、对 state 进行改写时触发。

### 注入流程

### 注入后的消息序列

```
[System]     系统提示词
[User]       ← Agents.md 内容（带 Extra 标记）
[User]       用户历史消息 1
[Assistant]  助手回复 1
[User]       用户当前消息
```

### 关键机制

**1. 持久化注入 + 幂等性保证**框架会将 `BeforeModelRewriteState` 返回的 state 持久化到 agent 内部状态（`st.Messages = state.Messages`）。注入的消息通过 `Extra["__agentsmd_content__"]` 标记，每次进入钩子时先扫描——若已存在该标记则直接返回原 state，避免重复注入。因此效果上：内容在首次 model call 时被注入并持久化，后续迭代不再重复插入。**2. Run 级别缓存**同一次 `Run()` 中，首次加载的内容通过 `adk.SetRunLocalValue` 缓存到 RunLocal 存储。后续模型调用（如多轮工具调用）通过 `adk.GetRunLocalValue` 直接复用缓存。每次新的 `Run()` 会重新加载，因此文件修改会在下次 Run 时生效。**4. 插入位置**内容作为 `User` 角色消息插入在**第一条 User 消息之前**。如果消息序列中没有 User 消息，则追加到末尾。**5. 内容格式化**加载的文件内容经过格式化处理：

- 外层包裹 `<system-reminder>` 标签
- 含 i18n 的 header（提示模型遵循指令）和 footer（提示上下文可能不相关）
- 每个文件以 `文件内容：{路径}（指令）：` 为前缀独立展示
- 语言（中/英文）通过 `adk.SetLanguage` 全局控制

---

## 注意事项

### 中间件顺序

> 💡
> **推荐将 agentsmd 中间件放在 summarization/compression 中间件之后。** 这样 Agents.md 内容不会被摘要压缩，每次模型调用都能获得完整指令。

```go
Handlers: []adk.ChatModelAgentMiddleware{
    summarizationMiddleware, // 先摘要
    agentsMDMiddleware,      // 后注入 Agents.md
}
```

### 错误处理

<table>
<tr><td>场景</td><td>行为</td></tr>
<tr><td>文件不存在（<pre>os.ErrNotExist</pre>）</td><td>跳过该文件，触发 <pre>OnLoadWarning</pre></td></tr>
<tr><td>循环 @import</td><td>跳过循环文件，触发 <pre>OnLoadWarning</pre></td></tr>
<tr><td>@import 深度超过 5 层</td><td>跳过，触发 <pre>OnLoadWarning</pre></td></tr>
<tr><td>累计大小超过 <pre>AllAgentsMDMaxBytes</pre></td><td>跳过后续文件，触发 <pre>OnLoadWarning</pre>（第一个文件始终完整加载）</td></tr>
<tr><td>权限被拒 / I/O 错误</td><td><strong>中止加载，返回 error</strong></td></tr>
<tr><td>所有文件内容为空</td><td>不注入，原样传递消息</td></tr>
</table>

### 性能考虑

- 合理设置 `AllAgentsMDMaxBytes`，避免注入过多内容占用上下文窗口
- Agents.md 内容在每次 `Run()` 中只加载一次（Run 级别缓存），但**每次新 Run() 都会重新加载**
- 避免 @import 过多文件，递归深度上限为 5 层

### Agents.md 编写建议

- 保持内容精炼，只包含对模型行为真正有影响的指令
- 使用 @import 按关注点拆分（代码规范、API 规范、架构说明等）
- 避免包含大量代码示例或数据，以免浪费上下文窗口
- 文件内容会被包裹在 `<system-reminder>` 标签中传递给模型

---

## FAQ

**Q: Agents.md 的内容会被保存到对话历史中吗？**

A: 会。`BeforeModelRewriteState` 返回的 state 会被框架持久化。但由于幂等性检查（`Extra["__agentsmd_content__"]` 标记），内容只在首次 model call 时注入一次，后续迭代直接跳过。建议将 agentsmd 放在 summarization 之后，避免注入内容被摘要压缩。

**Q: 如果某个 Agents.md 文件不存在会怎样？**

A: 该文件被跳过，触发 `OnLoadWarning` 回调（默认 `log.Printf`），不影响其他文件的加载。

**Q: @import 的路径是相对于什么目录？**

A: 相对于当前文件所在目录。例如 `/project/Agents.md` 中的 `@rules/style.md` 解析为 `/project/rules/style.md`。

**Q: 多个文件中 @import 了同一个文件会重复加载吗？**

A: 不会。loader 维护全局去重 map（`seen`），同一路径只会被读取和注入一次。

**Q: 原文中的 @path 引用会被替换掉吗？**

A: 不会。@import 的文件作为独立段落追加在原文之后，原文内容保持不变。

**Q: New 和 NewTyped 有什么区别？**

A: `New` 返回 `ChatModelAgentMiddleware`（即 `TypedChatModelAgentMiddleware[*schema.Message]`），适用于标准 Agent。`NewTyped` 是泛型版本，额外支持 `*schema.AgenticMessage` 类型，用于 Agentic Model 场景。
