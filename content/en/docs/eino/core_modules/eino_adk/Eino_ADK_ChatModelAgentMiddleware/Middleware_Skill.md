---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Skill
weight: 3
---

Skill Middleware provides Skill support for the Eino ADK Agent, enabling the Agent to dynamically discover and use predefined skills to complete tasks.

# What is a Skill

A Skill is a folder containing instructions, scripts, and resources. Agents can discover and use these Skills on demand to extend their capabilities. The core is the `SKILL.md` file, which includes metadata (at least name and description) and instructions to guide the Agent in executing tasks.

```
my-skill/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
├── references/       # Optional: reference docs
└── assets/           # Optional: templates, resources
```

Skills use **Progressive Disclosure** to efficiently manage context:

<a href="/img/eino/X9I4wGCprhpho7bXk6icMHmwnRb.png" target="_blank"><img src="/img/eino/X9I4wGCprhpho7bXk6icMHmwnRb.png" width="100%" /></a>

1. **Discovery**: The Agent only loads each available Skill's name and description — enough to determine when the Skill might be needed
2. **Activation**: When a task matches a Skill, the Agent loads the full `SKILL.md` content into context
3. **Execution**: The Agent follows the instructions to execute the task, loading other files or executing bundled code as needed

> 💡
> Ref: [https://agentskills.io/home](https://agentskills.io/home)

# Interface Reference

## FrontMatter

Skill metadata structure, parsed from the YAML frontmatter of SKILL.md. Used for quickly displaying Skill information during the discovery phase:

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
<tr><td>Field</td><td>Type</td><td>Description</td></tr>
<tr><td><pre>Name</pre></td><td><pre>string</pre></td><td>Unique identifier for the Skill. Short, meaningful names are recommended (e.g., <pre>pdf-processing</pre>, <pre>web-research</pre>)</td></tr>
<tr><td><pre>Description</pre></td><td><pre>string</pre></td><td>Functional description of the Skill. The key basis for the Agent to decide whether to use the Skill; should clearly describe applicable scenarios and capabilities</td></tr>
<tr><td><pre>Context</pre></td><td><pre>ContextMode</pre></td><td>Context mode. Optional values: <pre>fork</pre> (isolated context), <pre>fork_with_context</pre> (copy history messages). Empty means inline mode</td></tr>
<tr><td><pre>Agent</pre></td><td><pre>string</pre></td><td>Specifies the Agent name to use, used with <pre>Context</pre>, resolved via <pre>AgentHub</pre>. Empty uses the default Agent</td></tr>
<tr><td><pre>Model</pre></td><td><pre>string</pre></td><td>Specifies the model name to use, resolved via <pre>ModelHub</pre> to obtain the model instance</td></tr>
</table>

### ContextMode

```go
const (
    ContextModeFork            ContextMode = "fork"              // Isolated context
    ContextModeForkWithContext ContextMode = "fork_with_context" // Copy history messages
)
```

<table>
<tr><td>Mode</td><td>Description</td></tr>
<tr><td>Inline (default)</td><td>Skill content is returned directly as the tool result, and the current Agent continues processing</td></tr>
<tr><td><pre>fork_with_context</pre></td><td>Creates a new Agent, copies the current conversation history, independently executes the Skill task, then returns the result</td></tr>
<tr><td><pre>fork</pre></td><td>Creates a new Agent with isolated context (containing only the Skill content), independently executes, then returns the result</td></tr>
</table>

## Skill

The complete Skill structure, including metadata and instruction content:

```go
type Skill struct {
    FrontMatter
    Content       string
    BaseDirectory string
}
```

<table>
<tr><td>Field</td><td>Type</td><td>Description</td></tr>
<tr><td><pre>FrontMatter</pre></td><td><pre>FrontMatter</pre></td><td>Embedded metadata structure</td></tr>
<tr><td><pre>Content</pre></td><td><pre>string</pre></td><td>The body content after frontmatter in SKILL.md, including detailed instructions, workflows, examples, etc.</td></tr>
<tr><td><pre>BaseDirectory</pre></td><td><pre>string</pre></td><td>Absolute path to the Skill directory; the Agent can use this path to access other resource files in the directory</td></tr>
</table>

## Backend

The Skill backend interface, decoupling skill storage from usage:

```go
type Backend interface {
    List(ctx context.Context) ([]FrontMatter, error)
    Get(ctx context.Context, name string) (Skill, error)
}
```

<table>
<tr><td>Method</td><td>Description</td></tr>
<tr><td><pre>List</pre></td><td>Lists metadata of all available skills. Called when the Agent starts to build the skill tool description</td></tr>
<tr><td><pre>Get</pre></td><td>Gets the full skill content by name. Called when the Agent decides to use a skill</td></tr>
</table>

### NewBackendFromFilesystem

A backend implementation based on the `filesystem.Backend` interface that scans first-level subdirectories under the specified directory to read skills:

```go
type BackendFromFilesystemConfig struct {
    Backend filesystem.Backend
    BaseDir string
}

func NewBackendFromFilesystem(ctx context.Context, config *BackendFromFilesystemConfig) (Backend, error)
```

<table>
<tr><td>Field</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>filesystem.Backend</pre></td><td>Yes</td><td>Filesystem backend implementation used for file operations</td></tr>
<tr><td><pre>BaseDir</pre></td><td><pre>string</pre></td><td>Yes</td><td>Skill root directory path. Scans first-level subdirectories under this directory to find directories containing <pre>SKILL.md</pre> files</td></tr>
</table>

How it works:

- Scans first-level subdirectories under `BaseDir`
- Looks for `SKILL.md` files in each subdirectory
- Parses YAML frontmatter to obtain metadata
- Deeply nested `SKILL.md` files are ignored

`filesystem.Backend` has two available implementations — see the FileSystem Backend documentation for details.

## AgentHub and ModelHub

When Skills use context mode (fork / fork\_with\_context), AgentHub and ModelHub are needed to provide Agent instances and model instances.

> 💡
> The following shows non-generic alias types (i.e., `*schema.Message` specializations). Generic versions `TypedAgentHub[M]` and `TypedModelHub[M]` are available for `*schema.AgenticMessage` scenarios with identical interface signatures, differing only in the message type parameter.

```go
// AgentHubOptions passed to AgentHub.Get
type AgentHubOptions = TypedAgentHubOptions[*schema.Message]

type TypedAgentHubOptions[M adk.MessageType] struct {
    // Model is the model instance specified in the skill's frontmatter (resolved via ModelHub).
    // nil means the skill did not specify a model override; implementations should use the default model.
    Model model.BaseModel[M]
}

// AgentHub provides Agent instances for context mode
type AgentHub = TypedAgentHub[*schema.Message]

type TypedAgentHub[M adk.MessageType] interface {
    // Get returns an Agent by name. Should return the default Agent when name is empty.
    Get(ctx context.Context, name string, opts *TypedAgentHubOptions[M]) (adk.TypedAgent[M], error)
}

// ModelHub resolves model instances by name
type ModelHub = TypedModelHub[*schema.Message]

type TypedModelHub[M adk.MessageType] interface {
    Get(ctx context.Context, name string) (model.BaseModel[M], error)
}
```

> 💡
> Note: The return type of `AgentHubOptions.Model` and `ModelHub.Get` is `model.BaseModel[M]`, not the `model.ToolCallingChatModel` from older documentation.

## SubAgentInput and SubAgentOutput

These two structs are used when customizing fork mode behavior:

```go
type SubAgentInput = TypedSubAgentInput[*schema.Message]

type TypedSubAgentInput[M adk.MessageType] struct {
    Skill        Skill
    Mode         ContextMode
    RawArguments string   // Raw JSON arguments
    SkillContent string   // Constructed Skill content
    History      []M      // Conversation history (fork_with_context mode only)
    ToolCallID   string   // Tool call ID (fork_with_context mode only)
}

type SubAgentOutput = TypedSubAgentOutput[*schema.Message]

type TypedSubAgentOutput[M adk.MessageType] struct {
    Skill        Skill
    Mode         ContextMode
    RawArguments string
    Messages     []M      // All messages produced by the sub-Agent
    Results      []string // Extracted assistant message text content
}
```

# Initialization

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
<tr><td>Field</td><td>Type</td><td>Required</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>Yes</td><td>-</td><td>Skill backend implementation responsible for skill storage and retrieval</td></tr>
<tr><td><pre>SkillToolName</pre></td><td><pre>*string</pre></td><td>No</td><td><pre>"skill"</pre></td><td>Skill tool name. Can be customized to avoid conflicts if a tool with the same name already exists</td></tr>
<tr><td><pre>AgentHub</pre></td><td><pre>TypedAgentHub[M]</pre></td><td>No</td><td>-</td><td>Provides Agent instances. Required when using <pre>context: fork</pre> or <pre>fork_with_context</pre></td></tr>
<tr><td><pre>ModelHub</pre></td><td><pre>TypedModelHub[M]</pre></td><td>No</td><td>-</td><td>Provides model instances. In context mode, passed to AgentHub; in inline mode, switches the model used by subsequent ChatModel calls via WrapModel</td></tr>
<tr><td><pre>CustomSystemPrompt</pre></td><td><pre>SystemPromptFunc</pre></td><td>No</td><td>Built-in prompt</td><td>Custom system prompt. Signature: <pre>func(ctx, toolName) string</pre></td></tr>
<tr><td><pre>CustomToolDescription</pre></td><td><pre>ToolDescriptionFunc</pre></td><td>No</td><td>Built-in description</td><td>Custom tool description. Signature: <pre>func(ctx, skills []FrontMatter) string</pre></td></tr>
<tr><td><pre>CustomToolParams</pre></td><td><pre>func</pre></td><td>No</td><td>Only the <pre>skill</pre> parameter</td><td>Custom tool parameter schema. Receives default parameters, returns custom parameters; <pre>skill</pre> is always kept as required</td></tr>
<tr><td><pre>BuildContent</pre></td><td><pre>func</pre></td><td>No</td><td>Default formatting</td><td>Custom Skill content generation; can inject additional context into the content</td></tr>
<tr><td><pre>BuildForkMessages</pre></td><td><pre>func</pre></td><td>No</td><td>See below</td><td>Custom initial messages passed to the sub-Agent in fork mode. Default: <pre>fork</pre> → <pre>[UserMessage(content)]</pre>, <pre>fork_with_context</pre> → <pre>[history..., ToolMessage(content, callID)]</pre></td></tr>
<tr><td><pre>FormatForkResult</pre></td><td><pre>func</pre></td><td>No</td><td>Concatenated content</td><td>Custom sub-Agent result formatting. By default, assistant message content is concatenated and returned</td></tr>
</table>

## NewMiddleware

```go
func NewMiddleware(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

Creates the Skill Middleware, returning `adk.ChatModelAgentMiddleware` for use in `ChatModelAgentConfig.Handlers`.

> 💡
> The generic version `NewTyped[M](ctx, config)` returns `adk.TypedChatModelAgentMiddleware[M]`, which can be used with `*schema.AgenticMessage` type Agents.

## Usage Example

```go
// 1. Create Backend
backend, err := skill.NewBackendFromFilesystem(ctx, &skill.BackendFromFilesystemConfig{
    Backend: fsBackend,
    BaseDir: "/path/to/skills",
})
if err != nil {
    return err
}

// 2. Create Middleware
handler, err := skill.NewMiddleware(ctx, &skill.Config{
    Backend:  backend,
    AgentHub: myAgentHub, // Optional, only needed for fork mode
    ModelHub: myModelHub, // Optional, only needed when using the model field
})
if err != nil {
    return err
}

// 3. Pass to Agent's Handlers
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    // ... other configuration
    Handlers: []adk.ChatModelAgentMiddleware{handler},
})
```
