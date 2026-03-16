---
Description: ""
date: "2026-03-16"
lastmod: ""
tags: []
title: Skill
weight: 2
---

Skill Middleware 为 Eino ADK Agent 提供了 Skill 支持，使 Agent 能够动态发现和使用预定义的技能来更准确、高效地完成任务。

# 什么是 Skill

Skill 是包含指令、脚本和资源的文件夹，Agent 可以按需发现和使用这些 Skill 来扩展自身能力。 Skill 的核心是一个 `SKILL.md` 文件，包含元数据（至少需要 name 和 description）和指导 Agent 执行特定任务的说明。

```
my-skill/
├── SKILL.md          # 必需：指令 + 元数据
├── scripts/          # 可选：可执行代码
├── references/       # 可选：参考文档
└── assets/           # 可选：模板、资源
```

Skill 使用**渐进式展示（Progressive Disclosure）**来高效管理上下文：

1. **发现（Discovery）**：启动时，Agent 仅加载每个可用 Skill 的名称和描述，足以判断何时可能需要使用该 Skill
2. **激活****（Activation）**：当任务匹配某个 Skill 的描述时，Agent 将完整的 `SKILL.md` 内容读入上下文
3. **执行（Execution）**：Agent 遵循指令执行任务，也可以根据需要加载其他文件或执行捆绑的代码这种方式让 Agent 保持快速响应，同时能够按需访问更多上下文。

> 💡
> Ref: [https://agentskills.io/home](https://agentskills.io/home)

# 接口介绍

## FrontMatter

Skill 的元数据结构，用于在发现阶段快速展示 Skill 信息，避免加载完整内容：

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
<tr><td><pre>Name</pre></td><td><pre>string</pre></td><td>Skill 的唯一标识符。Agent 通过此名称调用 Skill ，建议使用简短、有意义的名称（如 <pre>pdf-processing</pre>、<pre>web-research</pre>）。对应 SKILL.md 中 frontmatter 的 <pre>name</pre> 字段</td></tr>
<tr><td><pre>Description</pre></td><td><pre>string</pre></td><td>Skill 的功能描述。这是 Agent 判断是否使用该 Skill 的关键依据，应清晰说明技 Skill 能适用的场景和能力。对应 SKILL.md 中 frontmatter 的 <pre>description</pre> 字段</td></tr>
<tr><td><pre>Context</pre></td><td><pre>ContextMode</pre></td><td>上下文模式。可选值：<pre>fork_with_context</pre>（复制历史消息创建新 Agent 执行）、<pre>fork</pre>（隔离上下文创建新 Agent 执行）。留空表示内联模式（直接返回 Skill 内容）</td></tr>
<tr><td><pre>Agent</pre></td><td><pre>string</pre></td><td>指定使用的 Agent 名称。配合 <pre>Context</pre> 字段使用，通过 <pre>AgentHub</pre> 获取对应的 Agent 工厂函数。留空时使用默认 Agent</td></tr>
<tr><td><pre>Model</pre></td><td><pre>string</pre></td><td>指定使用的模型名称。通过 <pre>ModelHub</pre> 获取对应的模型实例。在 Context 模式下传递给 Agent 工厂；在内联模式下切换后续 ChatModel 调用使用的模型</td></tr>
</table>

### ContextMode 上下文模式

```go
const (
    ContextModeFork            ContextMode = "fork"    // 复制历史消息
    ContextModeForkWithContext ContextMode = "fork_with_context" // 隔离上下文
)
```

<table>
<tr><td>模式</td><td>说明</td></tr>
<tr><td>内联（默认）</td><td>Skill 内容直接作为工具结果返回，由当前 Agent 继续处理</td></tr>
<tr><td>ForkWithContext</td><td>创建新 Agent，复制当前对话历史，独立执行 Skill 任务后返回结果</td></tr>
<tr><td>Fork</td><td>创建新 Agent，使用隔离的上下文（仅包含 Skill 内容），独立执行后返回结果</td></tr>
</table>

## Skill

完整的 Skill 结构，包含元数据和实际指令内容：

```go
type Skill struct {
    FrontMatter
    Content       string
    BaseDirectory string
}
```

<table>
<tr><td>字段</td><td>类型</td><td>说明</td></tr>
<tr><td><pre>FrontMatter</pre></td><td><pre>FrontMatter</pre></td><td>嵌入的元数据结构，包含 <pre>Name</pre>、<pre>Description</pre>、<pre>Context</pre>、<pre>Agent</pre>、<pre>Model</pre></td></tr>
<tr><td><pre>Content</pre></td><td><pre>string</pre></td><td>SKILL.md 文件中 frontmatter 之后的正文内容。包含 Skill 的详细指令、工作流程、示例等，Agent 激活 Skill 后会读取此内容</td></tr>
<tr><td><pre>BaseDirectory</pre></td><td><pre>string</pre></td><td>Skill 目录的绝对路径。Agent 可以使用此路径访问 Skill 目录中的其他资源文件（如脚本、模板、参考文档等）</td></tr>
</table>

## Backend

Skill 后端接口，定义了技能的检索方式。Backend 接口将技能的存储与使用解耦，提供以下优势：

- **灵活的存储方式**：技能可以存储在本地文件系统、数据库、远程服务、云存储等任意位置
- **可扩展性**：团队可以根据需求实现自定义 Backend，如从 Git 仓库动态加载、从配置中心获取等
- **测试友好**：可以轻松创建 Mock Backend 进行单元测试

```go
type Backend interface {
    List(ctx context.Context) ([]FrontMatter, error)
    Get(ctx context.Context, name string) (Skill, error)
}
```

<table>
<tr><td>方法</td><td>说明</td></tr>
<tr><td><pre>List</pre></td><td>列出所有可用技能的元数据。在 Agent 启动时调用，用于构建技能工具的描述信息，让 Agent 知道有哪些技能可用</td></tr>
<tr><td><pre>Get</pre></td><td>根据名称获取完整的技能内容。当 Agent 决定使用某个技能时调用，返回包含详细指令的完整 Skill 结构</td></tr>
</table>

## AgentHub 和 ModelHub

当 Skill 使用 Context 模式（fork/isolate）时，需要配置 AgentHub 和 ModelHub：

```go
// AgentFactory 用于创建 Agent 实例
type AgentFactory func(ctx context.Context, m model.ToolCallingChatModel) (adk.Agent, error)

// AgentHub 提供 Agent 工厂函数
type AgentHub interface {
    Get(ctx context.Context, name string) (AgentFactory, error)
}

// ModelHub 提供模型实例
type ModelHub interface {
    Get(ctx context.Context, name string) (model.ToolCallingChatModel, error)
}
```

### **NewBackendFromFilesystem**

基于 `filesystem.Backend` 接口的后端实现，在指定的目录下读取技能：

```go
type BackendFromFilesystemConfig struct {
    Backend filesystem.Backend
    BaseDir string
}

func NewBackendFromFilesystem(ctx context.Context, config *BackendFromFilesystemConfig) (Backend, error)
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>说明</td></tr>
<tr><td>Backend</td><td><pre>filesystem.Backend</pre></td><td>是</td><td>文件系统后端实现，用于文件操作</td></tr>
<tr><td>BaseDir</td><td><pre>string</pre></td><td>是</td><td>技能根目录的路径。会扫描此目录下的所有一级子目录，查找包含 <pre>SKILL.md</pre> 文件的目录作为技能</td></tr>
</table>

工作方式：

- 扫描 `BaseDir` 下的一级子目录
- 查找每个子目录中的 `SKILL.md` 文件
- 解析 YAML frontmatter 获取元数据
- 深层嵌套的 `SKILL.md` 文件会被忽略

### **filesystem.Backend 实现**

`filesystem.Backend` 接口有以下两种实现可供选择：

#### **Local Backend（本地文件系统）**

基于本地文件系统的实现，适用于 Unix/MacOS 环境：

```go
import "github.com/cloudwego/eino-ext/adk/backend/local"

type Config struct {
    ValidateCommand func(string) error // optional
}

func NewBackend(ctx context.Context, cfg *Config) (filesystem.Backend, error)
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>说明</td></tr>
<tr><td>ValidateCommand</td><td><pre>func(string) error</pre></td><td>否</td><td>命令验证函数，用于在执行命令前进行安全校验</td></tr>
</table>

> **注意**：仅支持 Unix/MacOS，不支持 Windows。

#### **Sandbox Backend（沙箱环境）**

基于火山引擎 AgentKit 沙箱工具的实现，适用于需要隔离执行环境的场景：

```go
import "github.com/cloudwego/eino-ext/adk/backend/agentkit"

type Config struct {
    AccessKeyID      string
    SecretAccessKey  string
    Region           Region  // 可选，默认 cn-beijing
    ToolID           string
    SessionID        string  // 与 UserSessionID 至少提供一个
    UserSessionID    string  // 与 SessionID 至少提供一个
    SessionTTL       int     // 可选，默认 1800 秒
    ExecutionTimeout int     // 可选
    HTTPClient       *http.Client // 可选
}

func NewSandboxToolBackend(config *Config) (filesystem.Backend, error)
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>说明</td></tr>
<tr><td>AccessKeyID</td><td><pre>string</pre></td><td>是</td><td>火山引擎 Access Key ID</td></tr>
<tr><td>SecretAccessKey</td><td><pre>string</pre></td><td>是</td><td>火山引擎 Secret Access Key</td></tr>
<tr><td>Region</td><td><pre>Region</pre></td><td>否</td><td>区域，支持 <pre>cn-beijing</pre>（默认）和 <pre>cn-shanghai</pre></td></tr>
<tr><td>ToolID</td><td><pre>string</pre></td><td>是</td><td>沙箱工具 ID</td></tr>
<tr><td>SessionID</td><td><pre>string</pre></td><td>否</td><td>会话 ID，与 UserSessionID 至少提供一个</td></tr>
<tr><td>UserSessionID</td><td><pre>string</pre></td><td>否</td><td>用户会话 ID，与 SessionID 至少提供一个</td></tr>
<tr><td>SessionTTL</td><td><pre>int</pre></td><td>否</td><td>会话存活时间（秒），范围 60-86400，默认 1800</td></tr>
<tr><td>ExecutionTimeout</td><td><pre>int</pre></td><td>否</td><td>代码执行超时时间（秒）</td></tr>
</table>

> 更多信息请参考：[火山引擎 AgentKit 文档](https://www.volcengine.com/docs/86681/1847934)

**LocalBackend** 内置的本地文件系统后端实现，在指定的目录下读取技能：

```go
type LocalBackendConfig struct {
    BaseDir string
}

func NewLocalBackend(config *LocalBackendConfig) (*LocalBackend, error)
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>说明</td></tr>
<tr><td><pre>BaseDir</pre></td><td><pre>string</pre></td><td>是</td><td>技能根目录的路径。LocalBackend 会扫描此目录下的所有子目录，查找包含 <pre>SKILL.md</pre> 文件的目录作为技能</td></tr>
</table>

工作方式：

- 扫描 `BaseDir` 下的一级子目录
- 查找每个子目录中的 `SKILL.md` 文件
- 解析 YAML frontmatter 获取元数据

## 初始化

创建 Skill Middleware（推荐使用 `NewMiddleware`）：

```go
func NewMiddleware(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

Config 中配置为：

```go
type Config struct {
    // Backend 技能后端实现，必填
    Backend Backend
    
    // SkillToolName 技能工具名称，默认 "skill"
    SkillToolName *string
    
    // AgentHub 提供 Agent 工厂函数，用于 Context 模式
    // 当 Skill 使用 "context: fork" 或 "context: isolate" 时必填
    AgentHub AgentHub
    
    // ModelHub 提供模型实例，用于 Skill 指定模型
    ModelHub ModelHub
    
    // CustomSystemPrompt 自定义系统提示词
    CustomSystemPrompt SystemPromptFunc
    
    // CustomToolDescription 自定义工具描述
    CustomToolDescription ToolDescriptionFunc
}
```

<table>
<tr><td>字段</td><td>类型</td><td>必需</td><td>默认值</td><td>说明</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>是</td><td><li></li></td><td>技能后端实现。负责技能的存储和检索，可使用内置的 <pre>LocalBackend</pre> 或自定义实现</td></tr>
<tr><td><pre>SkillToolName</pre></td><td><pre>*string</pre></td><td>否</td><td><pre>"skill"</pre></td><td>技能工具的名称。Agent 通过此名称调用技能工具。如果你的 Agent 已有同名工具，可以通过此字段自定义名称避免冲突</td></tr>
<tr><td><pre>AgentHub</pre></td><td><pre>AgentHub</pre></td><td>否</td><td><li></li></td><td>提供 Agent 工厂函数。当 Skill 使用 <pre>context: fork</pre> 或 <pre>context: isolate</pre> 时必填</td></tr>
<tr><td><pre>ModelHub</pre></td><td><pre>ModelHub</pre></td><td>否</td><td><li></li></td><td>提供模型实例。当 Skill 指定 <pre>model</pre> 字段时使用</td></tr>
<tr><td><pre>CustomSystemPrompt</pre></td><td><pre>SystemPromptFunc</pre></td><td>否</td><td>内置提示词</td><td>自定义系统提示词函数</td></tr>
<tr><td><pre>CustomToolDescription</pre></td><td><pre>ToolDescriptionFunc</pre></td><td>否</td><td>内置描述</td><td>自定义工具描述函数</td></tr>
</table>

# 快速开始

以从本地加载 pdf skill 为例， 完整代码见 [https://github.com/cloudwego/eino-examples/tree/main/adk/middlewares/skill](https://github.com/cloudwego/eino-examples/tree/main/adk/middlewares/skill)。

- 在工作目录中创建 skills 目录：

```go
workdir/
├── skills/
│   └── pdf/
│        ├── scripts
│        │   └── analyze.py
│        └── SKILL.md
└── other files
```

- 创建本地 filesystem backend，基于 backend 创建 Skill middleware：

```go
import (
    "github.com/cloudwego/eino/adk/middlewares/skill"
    "github.com/cloudwego/eino-ext/adk/backend/local"
)

ctx := context.Background() 

be, err := local.NewBackend(ctx, &local.Config{})
if err != nil {
    log.Fatal(err)
}

skillBackend, err := skill.NewBackendFromFilesystem(ctx, &skill.BackendFromFilesystemConfig{
    Backend: be,
    BaseDir: skillsDir,
})
if err != nil {
    log.Fatalf("Failed to create skill backend: %v", err)
}

sm, err := skill.NewMiddleware(ctx, &skill.Config{
    Backend: skillBackend,
})
```

- 基于 backend 创建本地 Filesystem Middleware，供 agent 读取 skill 其他文件以及执行脚本：

```go
import (
    "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

fsm, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend:        be,
    StreamingShell: be,
})
```

- 创建 Agent 并配置 middlewares

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "LogAnalysisAgent",
    Description: "An agent that can analyze logs",
    Instruction: "You are a helpful assistant.",
    Model:       cm,
    Handlers:    []adk.ChatModelAgentMiddleware{fsm, sm},
})
```

- 调用 Agent，观察结果

```go
runner := adk.NewRunner(ctx, adk.RunnerConfig{
    Agent: agent,
})

input := fmt.Sprintf("Analyze the %s file", filepath.Join(workDir, "test.log"))
log.Println("User: ", input)

iterator := runner.Query(ctx, input)
for {
    event, ok := iterator.Next()
    if !ok {
       break
    }
    if event.Err != nil {
       log.Printf("Error: %v\n", event.Err)
       break
    }

    prints.Event(event)
}
```

agent 输出：

```yaml
name: LogAnalysisAgent
path: [{LogAnalysisAgent}]
tool name: skill
arguments: {"skill":"log_analyzer"}

name: LogAnalysisAgent
path: [{LogAnalysisAgent}]
tool response: Launching skill: log_analyzer
Base directory for this skill: /Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/middlewares/skill/workdir/skills/log_analyzer
# SKILL.md content

name: LogAnalysisAgent
path: [{LogAnalysisAgent}]
tool name: execute
arguments:  {"command": "python3 /Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/middlewares/skill/workdir/skills/log_analyzer/scripts/analyze.py /Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/middlewares/skill/workdir/test.log"}

name: LogAnalysisAgent
path: [{LogAnalysisAgent}]
tool response: Analysis Result for /Users/bytedance/go/src/github.com/cloudwego/eino-examples/adk/middlewares/skill/workdir/test.log:
Total Errors: 2
Total Warnings: 1

Error Details:
Line 3: [2024-05-20 10:02:15] ERROR: Database connection failed.
Line 5: [2024-05-20 10:03:05] ERROR: Connection timed out.

Warning Details:
Line 2: [2024-05-20 10:01:23] WARNING: High memory usage detected.


name: LogAnalysisAgent
path: [{LogAnalysisAgent}]
answer: Here's the analysis result of the log file:

### Summary
- **Total Errors**: 2  
- **Total Warnings**: 1  

### Detailed Entries
#### Errors:
1. Line 3: [2024-05-20 10:02:15] ERROR: Database connection failed.  
2. Line5: [2024-05-2010:03:05] ERROR: Connection timed out.  

#### Warnings:
1. Line2: [2024-05-2010:01:23] WARNING: High memory usage detected.  

The log file contains critical issues related to database connectivity and a warning about memory usage. Let me know if you need further analysis!
```

# 原理

Skill middleware 向 Agent 增加 system prompt 与 skill tool，system prompt 内容如下，{tool_name} 为 skill 工具的工具名：

```python
# Skills System

**How to Use Skills (Progressive Disclosure):**

Skills follow a **progressive disclosure** pattern - you see their name and description above, but only read full instructions when needed:

1. **Recognize when a skill applies**: Check if the user's task matches a skill's description
2. **Read the skill's full instructions**: Use the '{tool_name}' tool to load skill
3. **Follow the skill's instructions**: tool result contains step-by-step workflows, best practices, and examples
4. **Access supporting files**: Skills may include helper scripts, configs, or reference docs - use absolute paths

**When to Use Skills:**
- User's request matches a skill's domain (e.g., "research X" -> web-research skill)
- You need specialized knowledge or structured workflows
- A skill provides proven patterns for complex tasks

**Executing Skill Scripts:**
Skills may contain Python scripts or other executable files. Always use absolute paths.

**Example Workflow:**

User: "Can you research the latest developments in quantum computing?"

1. Check available skills -> See "web-research" skill
2. Call '{tool_name}' tool to read the full skill instructions
3. Follow the skill's research workflow (search -> organize -> synthesize)
4. Use any helper scripts with absolute paths

Remember: Skills make you more capable and consistent. When in doubt, check if a skill exists for the task!
```

Skill 工具接收需要加载 skill name，返回对应 SKILL.md 中的完整内容，在工具描述中告知 agent 所有可使用的 skill 的 name 和 description：

```sql
Execute a skill within the main conversation

<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to invoke:
- Use this tool with the skill name only (no arguments)
- Examples:
  - `skill: pdf` - invoke the pdf skill
  - `skill: xlsx` - invoke the xlsx skill
  - `skill: ms-office-suite:pdf` - invoke using fully qualified name

Important:
- When a skill is relevant, you must invoke this tool IMMEDIATELY as your first action
- NEVER just announce or mention a skill in your text response without actually calling this tool
- This is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
</skills_instructions>

<available_skills>
{{- range .Matters }}
<skill>
<name>
{{ .Name }}
</name>
<description>
{{ .Description }}
</description>
</skill>
{{- end }}
</available_skills>
```

运行举例：

<a href="/img/eino/GzIObeN6roy2SAxpEXBcMqrRnYb.png" target="_blank"><img src="/img/eino/GzIObeN6roy2SAxpEXBcMqrRnYb.png" width="100%" /></a>

> 💡
> Skill Middleware 仅提供了如上图所示的加载 SKILL.md 能力，如果 Skill 需要 agent 具备读取文件、执行脚本等能力，需要用户另外为 agent 配置。
