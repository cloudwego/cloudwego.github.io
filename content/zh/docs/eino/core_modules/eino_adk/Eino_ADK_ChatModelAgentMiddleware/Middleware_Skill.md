---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Skill
weight: 3
---

Skill Middleware 为 Eino ADK Agent 提供 Skill 支持，使 Agent 能够动态发现和使用预定义的技能来完成任务。

# 什么是 Skill

Skill 是包含指令、脚本和资源的文件夹，Agent 可以按需发现和使用这些 Skill 来扩展自身能力。核心是 `SKILL.md` 文件，包含元数据（至少需要 name 和 description）和指导 Agent 执行任务的说明。

```
my-skill/
├── SKILL.md          # 必需：指令 + 元数据
├── scripts/          # 可选：可执行代码
├── references/       # 可选：参考文档
└── assets/           # 可选：模板、资源
```

Skill 使用**渐进式展示（Progressive Disclosure）**来高效管理上下文：

<a href="/img/eino/X9I4wGCprhpho7bXk6icMHmwnRb.png" target="_blank"><img src="/img/eino/X9I4wGCprhpho7bXk6icMHmwnRb.png" width="100%" /></a>

1. **发现（Discovery）**：Agent 仅加载每个可用 Skill 的 name 和 description，足以判断何时可能需要使用该 Skill
2. **激活（Activation）**：当任务匹配某个 Skill 时，Agent 将完整的 `SKILL.md` 内容读入上下文
3. **执行（Execution）**：Agent 遵循指令执行任务，按需加载其他文件或执行捆绑代码

> 💡
> Ref: [https://agentskills.io/home](https://agentskills.io/home)

# 接口介绍

## FrontMatter

Skill 的元数据结构，从 SKILL.md 的 YAML frontmatter 中解析。用于在发现阶段快速展示 Skill 信息：

```go
type FrontMatter struct {
    Name        string      `yaml:"name"`
    Description string      `yaml:"description"`
    Context     ContextMode `yaml:"context"`
    Agent       string      `yaml:"agent"`
    Model       string      `yaml:"model"`
}
```

<table>
<tr><td>字段</td><td>类型</td><td>说明</td></tr>
<tr><td><pre>Name</pre></td><td><pre>string</pre></td><td>Skill 的唯一标识符。建议使用简短、有意义的名称（如 <pre>pdf-processing</pre>、<pre>web-research</pre>）</td></tr>
<tr><td><pre>Description</pre></td><td><pre>string</pre></td><td>Skill 的功能描述。Agent 判断是否使用该 Skill 的关键依据，应清晰说明适用场景和能力</td></tr>
<tr><td><pre>Context</pre></td><td><pre>ContextMode</pre></td><td>上下文模式。可选值：<pre>fork</pre>（隔离上下文）、<pre>fork_with_context</pre>（复制历史消息）。留空表示内联模式</td></tr>
<tr><td><pre>Agent</pre></td><td><pre>string</pre></td><td>指定使用的 Agent 名称，配合 <pre>Context</pre> 使用，通过 <pre>AgentHub</pre> 获取对应 Agent。留空使用默认 Agent</td></tr>
<tr><td><pre>Model</pre></td><td><pre>string</pre></td><td>指定使用的模型名称，通过 <pre>ModelHub</pre> 获取对应模型实例</td></tr>
</table>

### ContextMode

```go
const (
    ContextModeFork            ContextMode = "fork"              // 隔离上下文
    ContextModeForkWithContext ContextMode = "fork_with_context" // 复制历史消息
)
```

<table>
<tr><td>模式</td><td>说明</td></tr>
<tr><td>内联（默认）</td><td>Skill 内容直接作为工具结果返回，由当前 Agent 继续处理</td></tr>
<tr><td><pre>fork_with_context</pre></td><td>创建新 Agent，复制当前对话历史，独立执行 Skill 任务后返回结果</td></tr>
<tr><td><pre>fork</pre></td><td>创建新 Agent，使用隔离上下文（仅包含 Skill 内容），独立执行后返回结果</td></tr>
</table>

## Skill

完整的 Skill 结构，包含元数据和指令内容：

```go
type Skill struct {
    FrontMatter
    Content       string
    BaseDirectory string
}
```

<table>
<tr><td>字段</td><td>类型</td><td>说明</td></tr>
<tr><td><pre>FrontMatter</pre></td><td><pre>FrontMatter</pre></td><td>嵌入的元数据结构</td></tr>
<tr><td><pre>Content</pre></td><td><pre>string</pre></td><td>SKILL.md 中 frontmatter 之后的正文内容，包含详细指令、工作流程、示例等</td></tr>
<tr><td><pre>BaseDirectory</pre></td><td><pre>string</pre></td><td>Skill 目录的绝对路径，Agent 可用此路径访问目录中的其他资源文件</td></tr>
</table>

## Backend

Skill 后端接口，将技能的存储与使用解耦：

```go
type Backend interface {
    List(ctx context.Context) ([]FrontMatter, error)
    Get(ctx context.Context, name string) (Skill, error)
}
```

<table>
<tr><td>方法</td><td>说明</td></tr>
<tr><td><pre>List</pre></td><td>列出所有可用技能的元数据。Agent 启动时调用，用于构建技能工具的描述</td></tr>
<tr><td><pre>Get</pre></td><td>根据名称获取完整的技能内容。Agent 决定使用某个技能时调用</td></tr>
</table>

### NewBackendFromFilesystem

基于 `filesystem.Backend` 接口的后端实现，扫描指定目录下的一级子目录读取技能：

```go
type BackendFromFilesystemConfig struct {
    Backend filesystem.Backend
    BaseDir string
}

func NewBackendFromFilesystem(ctx context.Context, config *BackendFromFilesystemConfig) (Backend, error)
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>filesystem.Backend</pre></td><td>是</td><td>文件系统后端实现，用于文件操作</td></tr>
<tr><td><pre>BaseDir</pre></td><td><pre>string</pre></td><td>是</td><td>技能根目录路径。扫描此目录下的一级子目录，查找包含 <pre>SKILL.md</pre> 文件的目录</td></tr>
</table>

工作方式：

- 扫描 `BaseDir` 下的一级子目录
- 查找每个子目录中的 `SKILL.md` 文件
- 解析 YAML frontmatter 获取元数据
- 深层嵌套的 `SKILL.md` 文件会被忽略

`filesystem.Backend` 接口有两种实现可供选择，详见 FileSystem Backend 文档。

## AgentHub 和 ModelHub

当 Skill 使用 Context 模式（fork / fork\_with\_context）时，需要通过 AgentHub 和 ModelHub 提供 Agent 实例和模型实例。

> 💡
> 以下展示非泛型别名类型（即 `*schema.Message` 特化）。泛型版本 `TypedAgentHub[M]`、`TypedModelHub[M]` 可用于 `*schema.AgenticMessage` 场景，接口签名一致，仅消息类型参数不同。

```go
// AgentHubOptions 传递给 AgentHub.Get 的选项
type AgentHubOptions = TypedAgentHubOptions[*schema.Message]

type TypedAgentHubOptions[M adk.MessageType] struct {
    // Model 为技能 frontmatter 中指定的模型实例（通过 ModelHub 解析）。
    // nil 表示技能未指定模型覆盖，实现方应使用默认模型。
    Model model.BaseModel[M]
}

// AgentHub 为 Context 模式提供 Agent 实例
type AgentHub = TypedAgentHub[*schema.Message]

type TypedAgentHub[M adk.MessageType] interface {
    // Get 根据名称返回 Agent。name 为空时应返回默认 Agent。
    Get(ctx context.Context, name string, opts *TypedAgentHubOptions[M]) (adk.TypedAgent[M], error)
}

// ModelHub 根据名称解析模型实例
type ModelHub = TypedModelHub[*schema.Message]

type TypedModelHub[M adk.MessageType] interface {
    Get(ctx context.Context, name string) (model.BaseModel[M], error)
}
```

> 💡
> 注意：`AgentHubOptions.Model` 和 `ModelHub.Get` 的返回类型为 `model.BaseModel[M]`，而非旧版文档中的 `model.ToolCallingChatModel`。

## SubAgentInput 和 SubAgentOutput

这两个结构体在自定义 fork 模式行为时使用：

```go
type SubAgentInput = TypedSubAgentInput[*schema.Message]

type TypedSubAgentInput[M adk.MessageType] struct {
    Skill        Skill
    Mode         ContextMode
    RawArguments string   // 原始 JSON 参数
    SkillContent string   // 构建好的 Skill 内容
    History      []M      // 对话历史（仅 fork_with_context 模式）
    ToolCallID   string   // 工具调用 ID（仅 fork_with_context 模式）
}

type SubAgentOutput = TypedSubAgentOutput[*schema.Message]

type TypedSubAgentOutput[M adk.MessageType] struct {
    Skill        Skill
    Mode         ContextMode
    RawArguments string
    Messages     []M      // 子 Agent 产生的所有消息
    Results      []string // 提取的 assistant 消息文本内容
}
```

# 初始化

## Config

```go
type Config = TypedConfig[*schema.Message]

type TypedConfig[M adk.MessageType] struct {
    Backend           Backend
    SkillToolName     *string
    AgentHub          TypedAgentHub[M]
    ModelHub          TypedModelHub[M]

    CustomSystemPrompt    SystemPromptFunc
    CustomToolDescription ToolDescriptionFunc
    CustomToolParams      func(ctx context.Context, defaults map[string]*schema.ParameterInfo) (map[string]*schema.ParameterInfo, error)
    BuildContent          func(ctx context.Context, skill Skill, rawArgs string) (string, error)
    BuildForkMessages     func(ctx context.Context, in TypedSubAgentInput[M]) ([]M, error)
    FormatForkResult      func(ctx context.Context, in TypedSubAgentOutput[M]) (string, error)
}
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>默认值</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>是</td><td>-</td><td>技能后端实现，负责技能的存储和检索</td></tr>
<tr><td><pre>SkillToolName</pre></td><td><pre>*string</pre></td><td>否</td><td><pre>"skill"</pre></td><td>技能工具名称。如已有同名工具，可自定义避免冲突</td></tr>
<tr><td><pre>AgentHub</pre></td><td><pre>TypedAgentHub[M]</pre></td><td>否</td><td>-</td><td>提供 Agent 实例。使用 <pre>context: fork</pre> 或 <pre>fork_with_context</pre> 时必填</td></tr>
<tr><td><pre>ModelHub</pre></td><td><pre>TypedModelHub[M]</pre></td><td>否</td><td>-</td><td>提供模型实例。Context 模式下传给 AgentHub；内联模式下通过 WrapModel 切换后续 ChatModel 调用的模型</td></tr>
<tr><td><pre>CustomSystemPrompt</pre></td><td><pre>SystemPromptFunc</pre></td><td>否</td><td>内置提示词</td><td>自定义系统提示词。签名：<pre>func(ctx, toolName) string</pre></td></tr>
<tr><td><pre>CustomToolDescription</pre></td><td><pre>ToolDescriptionFunc</pre></td><td>否</td><td>内置描述</td><td>自定义工具描述。签名：<pre>func(ctx, skills []FrontMatter) string</pre></td></tr>
<tr><td><pre>CustomToolParams</pre></td><td><pre>func</pre></td><td>否</td><td>仅 <pre>skill</pre> 参数</td><td>自定义工具参数 schema。接收默认参数，返回自定义参数，始终保留 <pre>skill</pre> 为必填</td></tr>
<tr><td><pre>BuildContent</pre></td><td><pre>func</pre></td><td>否</td><td>默认格式化</td><td>自定义 Skill 内容生成，可在内容中注入额外上下文</td></tr>
<tr><td><pre>BuildForkMessages</pre></td><td><pre>func</pre></td><td>否</td><td>见下文</td><td>自定义 fork 模式下传给子 Agent 的初始消息。默认：<pre>fork</pre> → <pre>[UserMessage(content)]</pre>，<pre>fork_with_context</pre> → <pre>[history..., ToolMessage(content, callID)]</pre></td></tr>
<tr><td><pre>FormatForkResult</pre></td><td><pre>func</pre></td><td>否</td><td>拼接内容</td><td>自定义子 Agent 结果格式化。默认将 assistant message 内容拼接后返回</td></tr>
</table>

## NewMiddleware

```go
func NewMiddleware(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

创建 Skill Middleware，返回 `adk.ChatModelAgentMiddleware`，传入 `ChatModelAgentConfig.Handlers` 使用。

> 💡
> 泛型版本 `NewTyped[M](ctx, config)` 返回 `adk.TypedChatModelAgentMiddleware[M]`，可用于 `*schema.AgenticMessage` 类型的 Agent。

## 使用示例

```go
// 1. 创建 Backend
backend, err := skill.NewBackendFromFilesystem(ctx, &skill.BackendFromFilesystemConfig{
    Backend: fsBackend,
    BaseDir: "/path/to/skills",
})
if err != nil {
    return err
}

// 2. 创建 Middleware
handler, err := skill.NewMiddleware(ctx, &skill.Config{
    Backend:  backend,
    AgentHub: myAgentHub, // 可选，仅 fork 模式需要
    ModelHub: myModelHub, // 可选，仅使用 model 字段时需要
})
if err != nil {
    return err
}

// 3. 传入 Agent 的 Handlers
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ... 其他配置
    Handlers: []adk.ChatModelAgentMiddleware{handler},
})
```
