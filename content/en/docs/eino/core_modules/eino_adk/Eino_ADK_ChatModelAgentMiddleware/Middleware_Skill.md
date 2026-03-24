---
Description: ""
date: "2026-03-24"
lastmod: ""
tags: []
title: Skill
weight: 3
---

Skill middleware adds Skill support to Eino ADK agents, enabling agents to dynamically discover and use predefined skills to complete tasks more accurately and efficiently.

# What is a Skill

A Skill is a folder that contains instructions, scripts, and resources. Agents can discover and use these skills on demand to extend their capabilities. The core of a Skill is a `SKILL.md` file, which includes metadata (at least `name` and `description`) and guidance for the agent to execute a specific type of task.

```
my-skill/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
├── references/       # Optional: reference docs
└── assets/           # Optional: templates/resources
```

Skills use **Progressive Disclosure** to manage context efficiently:

1. **Discovery**: on startup, the agent only loads each skill’s name and description — enough to decide when the skill might be useful
2. **Activation**: when a task matches a skill’s description, the agent loads the full `SKILL.md` content into context
3. **Execution**: the agent follows the instructions and can load other files or execute bundled code as needed. This keeps the agent responsive while still allowing on-demand access to additional context.

> 💡
> Ref: [https://agentskills.io/home](https://agentskills.io/home)

# Interfaces

## FrontMatter

Skill metadata used for quick display during discovery, avoiding loading full content:

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
<tr><td><pre>Name</pre></td><td><pre>string</pre></td><td>Unique identifier of a skill. The agent invokes the skill by name. Use short, meaningful names (e.g. <pre>pdf-processing</pre>, <pre>web-research</pre>). Corresponds to the <pre>name</pre> field in SKILL.md frontmatter.</td></tr>
<tr><td><pre>Description</pre></td><td><pre>string</pre></td><td>Description of what the skill does. This is the key basis for the agent to decide whether to use the skill, so it should clearly describe applicable scenarios and capabilities. Corresponds to the <pre>description</pre> field in SKILL.md frontmatter.</td></tr>
<tr><td><pre>Context</pre></td><td><pre>ContextMode</pre></td><td>Context mode. Supported values: <pre>fork_with_context</pre> (copy history messages to a new agent for execution), <pre>fork</pre> (create a new agent with isolated context for execution). Empty means inline mode (return skill content directly).</td></tr>
<tr><td><pre>Agent</pre></td><td><pre>string</pre></td><td>Agent name to use. Used with <pre>Context</pre>, resolved via <pre>AgentHub</pre>. Empty means using the default agent.</td></tr>
<tr><td><pre>Model</pre></td><td><pre>string</pre></td><td>Model name to use. Resolved via <pre>ModelHub</pre>. In context mode, passed to the agent factory; in inline mode, it switches the model used by subsequent ChatModel calls.</td></tr>
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
<tr><td>Inline (default)</td><td>Skill content is returned as the tool result and the current agent continues processing</td></tr>
<tr><td>ForkWithContext</td><td>Create a new agent, copy current conversation history, execute the skill independently, and return the result</td></tr>
<tr><td>Fork</td><td>Create a new agent with isolated context (only skill content), execute independently, and return the result</td></tr>
</table>

## Skill

Complete skill structure (metadata + instruction content):

```go
type Skill struct {
    FrontMatter
    Content       string
    BaseDirectory string
}
```

<table>
<tr><td>Field</td><td>Type</td><td>Description</td></tr>
<tr><td><pre>FrontMatter</pre></td><td><pre>FrontMatter</pre></td><td>Embedded metadata: <pre>Name</pre>, <pre>Description</pre>, <pre>Context</pre>, <pre>Agent</pre>, <pre>Model</pre></td></tr>
<tr><td><pre>Content</pre></td><td><pre>string</pre></td><td>The body of SKILL.md after frontmatter. Contains detailed instructions, workflows, examples, etc. The agent reads it after skill activation.</td></tr>
<tr><td><pre>BaseDirectory</pre></td><td><pre>string</pre></td><td>Absolute path of the skill directory. The agent can use this path to access other resources in the skill directory (scripts, templates, references, etc.).</td></tr>
</table>

## Backend

Skill backend interface defines how skills are retrieved. It decouples skill storage from usage:

- **Flexible storage**: store skills in local filesystem, databases, remote services, cloud storage, etc.
- **Extensible**: implement custom backends (e.g. load from Git repos, config centers)
- **Test-friendly**: easy to build mock backends for unit tests

```go
type Backend interface {
    List(ctx context.Context) ([]FrontMatter, error)
    Get(ctx context.Context, name string) (Skill, error)
}
```

<table>
<tr><td>Method</td><td>Description</td></tr>
<tr><td><pre>List</pre></td><td>List metadata of all available skills. Called when the agent starts to build the skill tool description, so the agent knows what skills exist.</td></tr>
<tr><td><pre>Get</pre></td><td>Get full skill content by name. Called when the agent decides to use a skill, returning the full Skill structure including detailed instructions.</td></tr>
</table>

### NewBackendFromFilesystem

A filesystem-backed backend implementation that reads skills from a directory via `filesystem.Backend`:

```go
type BackendFromFilesystemConfig struct {
    Backend filesystem.Backend
    BaseDir string
}

func NewBackendFromFilesystem(ctx context.Context, config *BackendFromFilesystemConfig) (Backend, error)
```

<table>
<tr><td>Field</td><td>Type</td><td>Required</td><td>Description</td></tr>
<tr><td>Backend</td><td><pre>filesystem.Backend</pre></td><td>Yes</td><td>Filesystem backend implementation used for file operations</td></tr>
<tr><td>BaseDir</td><td><pre>string</pre></td><td>Yes</td><td>Root directory for skills. It scans all first-level subdirectories and treats the ones containing <pre>SKILL.md</pre> as skills.</td></tr>
</table>

How it works:

- scan first-level subdirectories under `BaseDir`
- look for `SKILL.md` in each subdirectory
- parse YAML frontmatter to get metadata
- deeply nested `SKILL.md` files are ignored

### filesystem.Backend Implementations

There are two `filesystem.Backend` implementations to choose from. See [Middleware: FileSystem](/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_filesystem).

## AgentHub and ModelHub

When Skills use context mode (fork/isolate), you need to configure AgentHub and ModelHub:

```go
// AgentHubOptions contains options passed to AgentHub.Get when creating an agent for skill execution.
type AgentHubOptions struct {
    // Model is the resolved model instance when a skill specifies a "model" field in frontmatter.
    // nil means the skill did not specify a model override; implementations should use their default.
    Model model.ToolCallingChatModel
}

// AgentHub provides agent instances for context mode (fork/fork_with_context) execution.
type AgentHub interface {
    // Get returns an Agent by name. When name is empty, implementations should return a default agent.
    // The opts parameter carries skill-level overrides (e.g., model) resolved by the framework.
    Get(ctx context.Context, name string, opts *AgentHubOptions) (adk.Agent, error)
}

// ModelHub provides model instances.
type ModelHub interface {
    Get(ctx context.Context, name string) (model.ToolCallingChatModel, error)
}
```

##

## Initialization

Create the Skill middleware (recommended: `NewMiddleware`):

```go
func NewMiddleware(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)
```

Config:

```go
type Config struct {
    // Backend is required
    Backend Backend
    
    // SkillToolName defaults to "skill"
    SkillToolName *string
    
    // AgentHub provides agent factories for context mode
    // Required when skill uses "context: fork" or "context: isolate"
    AgentHub AgentHub
    
    // ModelHub provides model instances for skill-specified models
    ModelHub ModelHub
    
    // CustomSystemPrompt customizes system prompt
    CustomSystemPrompt SystemPromptFunc
    
    // CustomToolDescription customizes tool description
    CustomToolDescription ToolDescriptionFunc
}
```

<table>
<tr><td>Field</td><td>Type</td><td>Required</td><td>Default</td><td>Description</td></tr>
<tr><td><pre>Backend</pre></td><td><pre>Backend</pre></td><td>Yes</td><td><li></li></td><td>Skill backend implementation responsible for storage and retrieval. You can use the built-in <pre>LocalBackend</pre> or provide your own.</td></tr>
<tr><td><pre>SkillToolName</pre></td><td><pre>*string</pre></td><td>No</td><td><pre>"skill"</pre></td><td>Name of the skill tool. Agents invoke skills via this tool name. If your agent already has a tool with the same name, set this to avoid conflicts.</td></tr>
<tr><td><pre>AgentHub</pre></td><td><pre>AgentHub</pre></td><td>No</td><td><li></li></td><td>Provides agent factories. Required when a skill uses <pre>context: fork</pre> or <pre>context: isolate</pre>.</td></tr>
<tr><td><pre>ModelHub</pre></td><td><pre>ModelHub</pre></td><td>No</td><td><li></li></td><td>Provides model instances. Used when a skill specifies the <pre>model</pre> field.</td></tr>
<tr><td><pre>CustomSystemPrompt</pre></td><td><pre>SystemPromptFunc</pre></td><td>No</td><td>Built-in prompt</td><td>Custom system prompt function</td></tr>
<tr><td><pre>CustomToolDescription</pre></td><td><pre>ToolDescriptionFunc</pre></td><td>No</td><td>Built-in description</td><td>Custom tool description function</td></tr>
</table>

# Quick Start

Example: loading a pdf skill locally. Full code: [https://github.com/cloudwego/eino-examples/tree/main/adk/middlewares/skill](https://github.com/cloudwego/eino-examples/tree/main/adk/middlewares/skill).

- Create a skills directory under your working directory:

```go
workdir/
├── skills/
│   └── pdf/
│        ├── scripts
│        │   └── analyze.py
│        └── SKILL.md
└── other files
```

- Create a local filesystem backend and build the Skill middleware:

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

- Create a local FileSystem middleware so the agent can read other skill files and execute scripts:

```go
import (
    "github.com/cloudwego/eino/adk/middlewares/filesystem"
)

fsm, err := filesystem.New(ctx, &filesystem.MiddlewareConfig{
    Backend:        be,
    StreamingShell: be,
})
```

- Create an agent and configure middlewares:

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Name:        "LogAnalysisAgent",
    Description: "An agent that can analyze logs",
    Instruction: "You are a helpful assistant.",
    Model:       cm,
    Handlers:    []adk.ChatModelAgentMiddleware{fsm, sm},
})
```

- Run the agent and observe output:

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

Agent output:

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

# How It Works

The Skill middleware adds a system prompt and a skill tool to the agent. The system prompt is below, where `{tool_name}` is the tool name of the skill tool:

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

The skill tool takes a skill name to load and returns the full content of the corresponding SKILL.md. Its tool description lists all available skills with their names and descriptions:

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

Example:

<a href="/img/eino/GzIObeN6roy2SAxpEXBcMqrRnYb.png" target="_blank"><img src="/img/eino/GzIObeN6roy2SAxpEXBcMqrRnYb.png" width="100%" /></a>

> 💡
> Skill middleware only provides the ability to load SKILL.md as shown above. If a skill requires the agent to read files, execute scripts, etc., users need to configure those capabilities for the agent separately.
