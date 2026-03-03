---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.8.*-adk middlewares'
weight: 8
---

本文档介绍 Eino ADK v0.8.* 版本的主要新功能和改进。

> 💡
> 目前尚处于 v0.8.0.Beta 版本阶段：[https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1](https://github.com/cloudwego/eino/releases/tag/v0.8.0-beta.1)

## 版本亮点

v0.8 是一个重要的功能增强版本，引入了全新的中间件接口架构，新增多个实用中间件，并提供了增强的可观测性支持。

<table><tbody><tr>
<td>
<strong>🔧 灵活的中间件架构</strong>
全新 ChatModelAgentMiddleware 接口</td><td>
<strong>📊 增强的可观测性</strong>
Agent 级别 Callback 支持</td></tr></tbody></table>

---

## 1. ChatModelAgentMiddleware 接口

> 💡
> **核心更新**: 全新的中间件接口，提供更灵活的 Agent 扩展机制

`ChatModelAgentMiddleware` 是 v0.8 最重要的架构更新，为 `ChatModelAgent` 及基于它构建的 Agent（如 `DeepAgent`）提供统一的扩展点。

**相比 AgentMiddleware 的优势**:

<table>
<tr><td>特性</td><td>AgentMiddleware</td><td>ChatModelAgentMiddleware</td></tr>
<tr><td>扩展性</td><td>封闭</td><td>开放，可实现自定义 handler</td></tr>
<tr><td>Context 传播</td><td>回调只返回 error</td><td>所有方法返回 (ctx, ..., error)</td></tr>
<tr><td>配置管理</td><td>分散在闭包中</td><td>集中在结构体字段中</td></tr>
</table>

**接口方法**:

- `BeforeAgent` - Agent 运行前修改配置
- `BeforeModelRewriteState` - 模型调用前处理状态
- `AfterModelRewriteState` - 模型调用后处理状态
- `WrapInvokableToolCall` - 包装同步工具调用
- `WrapStreamableToolCall` - 包装流式工具调用
- `WrapModel` - 包装模型调用

**使用方式**:

```go
agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    model,
    Handlers: []adk.ChatModelAgentMiddleware{mw1, mw2, mw3},
})
```

详见 [Eino ADK: ChatModelAgentMiddleware](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware)

---

### 1.1 Summarization 中间件

> 💡
> **功能**: 自动对话历史摘要，防止超出模型上下文窗口限制

📚 **详细文档**: [Middleware: Summarization](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_summarization)

当对话历史的 Token 数量超过阈值时，自动调用 LLM 生成摘要，压缩上下文。

**核心能力**:

- 可配置的触发条件（Token 阈值）
- 支持保留最近的用户消息
- 支持记录完整对话历史到文件
- 提供前后处理钩子

**快速开始**:

```go
mw, err := summarization.New(ctx, &summarization.Config{
    Model: chatModel,
    Trigger: &summarization.TriggerCondition{
        ContextTokens: 100000,
    },
})
```

### 1.2 ToolReduction 中间件

> 💡
> **功能**: 工具结果压缩，优化上下文使用效率

📚 **详细文档**: [Middleware: ToolReduction](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_toolreduction)

提供两阶段的工具输出管理：

<table>
<tr><td>阶段</td><td>触发时机</td><td>作用</td></tr>
<tr><td>截断 (Truncation)</td><td>工具返回后</td><td>截断超长输出，保存到文件</td></tr>
<tr><td>清理 (Clear)</td><td>模型调用前</td><td>清理历史工具结果，释放 Token</td></tr>
</table>

**快速开始**:

```go
mw, err := reduction.New(ctx, &reduction.Config{
    Backend:           fsBackend,
    MaxLengthForTrunc: 30000,
    MaxTokensForClear: 50000,
})
```

### 1.3 Filesystem 中间件

> 💡
> **功能**: 文件系统操作工具集

📚 **详细文档**: [Middleware: FileSystem](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_filesystem)

**新增能力**:

- **Grep 功能增强**: 支持完整正则表达式语法
- **新增选项**: `CaseInsensitive`、`EnableMultiline`、`FileType` 过滤
- **自定义工具名**: 所有 filesystem 工具支持自定义名称

### 1.4 Skill 中间件

> 💡
> **功能**: 动态加载和执行 Skill

📚 **详细文档**: [Middleware: Skill](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_skill)

**新增能力**:

- **Context 模式**: 支持 `fork` 和 `isolate` 两种上下文模式
- **自定义配置**: 支持自定义系统提示和工具描述
- **FrontMatter 扩展**: 支持通过 FrontMatter 指定 agent 和 model

### 1.5 PlanTask 中间件

> 💡
> **功能**: 任务规划和执行工具

📚 **详细文档**: [Middleware: PlanTask](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_plantask)

支持 Agent 创建和管理任务计划，适用于需要分步执行的复杂任务场景。

### 1.6 ToolSearch 中间件

> 💡
> **功能**: 工具搜索，支持从大量工具中动态检索

📚 **详细文档**: [Middleware: ToolSearch](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_toolsearch)

当工具数量较多时，通过语义搜索动态选择最相关的工具，避免上下文过载。

### 1.7 PatchToolCalls 中间件

> 💡
> **功能**: 修补悬空的工具调用，确保消息历史完整性

📚 **详细文档**: [Middleware: PatchToolCalls](/zh/docs/eino/core_modules/eino_adk/eino_adk_chatmodelagentmiddleware/middleware_patchtoolcalls)

扫描消息历史，为缺少响应的工具调用插入占位符消息。适用于工具调用被中断或取消的场景。

**快速开始**:

```go
mw, err := patchtoolcalls.New(ctx, nil)
```

## 2. Agent Callback 支持

> 💡
> **功能**: Agent 级别的回调机制，用于观测和追踪

支持在 Agent 执行的全生命周期中注册回调，实现日志记录、追踪、监控等功能。

**核心类型**:

- `AgentCallbackInput` - 回调输入，包含 Agent 输入或恢复信息
- `AgentCallbackOutput` - 回调输出，包含 Agent 事件流

**使用方式**:

```go
agent.Run(ctx, input, adk.WithCallbacks(
    callbacks.NewHandler(
        callbacks.WithOnStart(func(ctx context.Context, info *callbacks.RunInfo, input callbacks.CallbackInput) context.Context {
            agentInput := adk.ConvAgentCallbackInput(input)
            // 处理 Agent 启动事件
            return ctx
        }),
        callbacks.WithOnEnd(func(ctx context.Context, info *callbacks.RunInfo, output callbacks.CallbackOutput) context.Context {
            agentOutput := adk.ConvAgentCallbackOutput(output)
            // 处理 Agent 完成事件
            return ctx
        }),
    ),
))
```

详见 [Eino ADK: Agent Callback](/zh/docs/eino/core_modules/eino_adk/adk_agent_callback)

---

## 3. Language Setting

> 💡
> **功能**: 全局语言设置

支持全局设置 ADK 的语言偏好，影响内置提示词和消息的语言。

**使用方式**:

```go
adk.SetLanguage(adk.LanguageChinese)  // 设置为中文
adk.SetLanguage(adk.LanguageEnglish)  // 设置为英文（默认）
```

---

## 中间件使用建议

> 💡
> **推荐组合**: 以下中间件可组合使用，覆盖大部分长对话场景

```go
handlers := []adk.ChatModelAgentMiddleware{
    patchMW,          // 1. 修补悬空工具调用
    reductionMW,      // 2. 压缩工具输出
    summarizationMW,  // 3. 摘要对话历史
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    model,
    Handlers: handlers,
})
```

---

## Breaking Changes

> 💡
> 升级到 v0.8 前，请查阅 Breaking Changes 文档了解所有不兼容变更

📚 **完整文档**: [Eino v0.8 不兼容更新](/zh/docs/eino/release_notes_and_migration/eino_v0.8._-adk_middlewares/eino_v0.8_不兼容更新)

**变更概览**:

<table>
<tr><td>类型</td><td>变更项</td></tr>
<tr><td>API 变更</td><td><pre>ShellBackend</pre> → <pre>Shell</pre> 接口重命名</td></tr>
<tr><td>行为变更</td><td><pre>AgentEvent</pre> 发送机制改为 Middleware</td></tr>
<tr><td>行为变更</td><td><pre>ReadRequest.Offset</pre> 从 0-based 改为 1-based</td></tr>
<tr><td>行为变更</td><td><pre>FileInfo.Path</pre> 不再保证为绝对路径</td></tr>
<tr><td>行为变更</td><td><pre>WriteRequest</pre> 文件存在时从报错改为覆盖</td></tr>
<tr><td>行为变更</td><td><pre>GrepRequest.Pattern</pre> 从字面量改为正则表达式</td></tr>
</table>

## 升级指南

详细的迁移步骤和代码示例请参考：[Eino v0.8 不兼容更新](/zh/docs/eino/release_notes_and_migration/eino_v0.8._-adk_middlewares/eino_v0.8_不兼容更新)

**快速检查清单**:

1. 检查是否使用了 `ShellBackend` / `StreamingShellBackend` 接口（需重命名）
2. 检查 `ReadRequest.Offset` 使用（0-based → 1-based）
3. 检查 `GrepRequest.Pattern` 使用（字面量 → 正则表达式，特殊字符需转义）
4. 检查是否依赖 `WriteRequest` 的"文件存在报错"行为
5. 检查是否依赖 `FileInfo.Path` 为绝对路径
6. 如有自定义 ChatModel/Tool Decorator/Wrapper，考虑迁移到 `ChatModelAgentMiddleware`
7. 运行测试验证功能正常
