---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: Summarization
weight: 4
---

> 💡
> 本中间件在 v0.8.0 版本引入。包路径：`github.com/cloudwego/eino/adk/middlewares/summarization`

## 概述

Summarization 中间件在对话 token 数超过阈值时自动调用摘要模型压缩对话历史，使长对话在模型上下文窗口内保持连贯。中间件挂载在 `BeforeModelRewriteState` 钩子上，每轮模型调用前检查触发条件，触发后执行：计数 → 摘要生成（含重试/降级）→ 后处理 → 替换 state。

## 泛型体系

本包全部核心类型和函数均提供 **Typed 泛型版本**（`M adk.MessageType`）与 **非泛型别名**（固定为 `*schema.Message`）。

<table>
<tr><td>泛型版本</td><td>非泛型别名（= Typed\[*schema.Message\]）</td></tr>
<tr><td><pre>TypedConfig[M]</pre></td><td><pre>Config</pre></td></tr>
<tr><td><pre>NewTyped[M](ctx, *TypedConfig[M])</pre></td><td><pre>New(ctx, *Config)</pre></td></tr>
<tr><td><pre>TypedTokenCounterFunc[M]</pre></td><td><pre>TokenCounterFunc</pre></td></tr>
<tr><td><pre>TypedGenModelInputFunc[M]</pre></td><td><pre>GenModelInputFunc</pre></td></tr>
<tr><td><pre>TypedGetFailoverModelFunc[M]</pre></td><td><pre>GetFailoverModelFunc</pre></td></tr>
<tr><td><pre>TypedFinalizeFunc[M]</pre></td><td><pre>FinalizeFunc</pre></td></tr>
<tr><td><pre>TypedCallbackFunc[M]</pre></td><td><pre>CallbackFunc</pre></td></tr>
<tr><td><pre>TypedUserMessageFilterFunc[M]</pre></td><td><pre>UserMessageFilterFunc</pre></td></tr>
<tr><td><pre>TypedPreserveUserMessages[M]</pre></td><td><pre>PreserveUserMessages</pre></td></tr>
<tr><td><pre>TypedRetryConfig[M]</pre></td><td><pre>RetryConfig</pre></td></tr>
<tr><td><pre>TypedFailoverConfig[M]</pre></td><td><pre>FailoverConfig</pre></td></tr>
<tr><td><pre>TypedFailoverContext[M]</pre></td><td><pre>FailoverContext</pre></td></tr>
<tr><td><pre>TypedFinalizerBuilder[M]</pre></td><td><pre>FinalizerBuilder</pre></td></tr>
</table>

以下文档中如无特别说明，类型签名使用泛型形式 `M`。使用非泛型别名时 `M` = `*schema.Message`。

### 构造函数

```go
// 泛型版本 — 支持 *schema.Message 和 *schema.AgenticMessage
func NewTyped[M adk.MessageType](ctx context.Context, cfg *TypedConfig[M]) (adk.TypedChatModelAgentMiddleware[M], error)

// 非泛型版本 — 等价于 NewTyped[*schema.Message]
func New(ctx context.Context, cfg *Config) (adk.ChatModelAgentMiddleware, error)
```

## TypedConfig[M] 配置项

<table>
<tr><td>字段</td><td>类型</td><td>必填</td><td>默认值</td><td>说明</td></tr>
<tr><td>Model</td><td><pre>model.BaseModel[M]</pre></td><td>是</td><td>—</td><td>用于生成摘要的模型</td></tr>
<tr><td>ModelOptions</td><td><pre>[]model.Option</pre></td><td>否</td><td>—</td><td>传递给摘要模型的选项</td></tr>
<tr><td>TokenCounter</td><td><pre>TypedTokenCounterFunc[M]</pre></td><td>否</td><td>基于最近 assistant 消息的 total\_tokens 作为基线，增量消息按 ~4 字符/token 估算</td><td>自定义 token 计数函数</td></tr>
<tr><td>Trigger</td><td><pre>*TriggerCondition</pre></td><td>否</td><td>ContextTokens=160,000</td><td>触发摘要的条件</td></tr>
<tr><td>UserInstruction</td><td><pre>string</pre></td><td>否</td><td>内置 prompt</td><td>自定义用户级摘要指令，覆盖默认指令</td></tr>
<tr><td>TranscriptFilePath</td><td><pre>string</pre></td><td>否</td><td>—</td><td>完整对话记录文件路径，附加到摘要中提醒模型原始上下文位置。<strong>仅在未设置 Finalize 时生效</strong></td></tr>
<tr><td>GenModelInput</td><td><pre>TypedGenModelInputFunc[M]</pre></td><td>否</td><td>sysInstruction → contextMsgs → userInstruction</td><td>完全控制摘要模型输入的构建</td></tr>
<tr><td>Finalize</td><td><pre>TypedFinalizeFunc[M]</pre></td><td>否</td><td>内置后处理</td><td>自定义摘要后处理。设置后中间件不再执行任何默认后处理</td></tr>
<tr><td>Callback</td><td><pre>TypedCallbackFunc[M]</pre></td><td>否</td><td>—</td><td>在 Finalize 后调用，参数为 <pre>before, after adk.TypedChatModelAgentState[M]</pre>（值类型），只读</td></tr>
<tr><td>EmitInternalEvents</td><td><pre>bool</pre></td><td>否</td><td>false</td><td>是否在关键节点发送内部事件</td></tr>
<tr><td>PreserveUserMessages</td><td><pre>*TypedPreserveUserMessages[M]</pre></td><td>否</td><td>Enabled: true</td><td>在摘要中保留原始用户消息。<strong>仅在未设置 Finalize 时生效</strong></td></tr>
<tr><td>Retry</td><td><pre>*TypedRetryConfig[M]</pre></td><td>否</td><td>nil（不重试）</td><td>主模型摘要生成的重试策略</td></tr>
<tr><td>Failover</td><td><pre>*TypedFailoverConfig[M]</pre></td><td>否</td><td>nil</td><td>主模型失败后的降级策略</td></tr>
</table>

> 💡
> **Finalize 覆盖语义**：一旦设置了自定义 `Finalize`，中间件将**跳过所有默认后处理**——`PreserveUserMessages` 和 `TranscriptFilePath` 均不再生效。如需在自定义 Finalize 中复用默认后处理逻辑，请使用 `DefaultFinalizer` 函数。

## 子配置结构体

### TriggerCondition

满足**任一**条件即触发摘要。

```go
type TriggerCondition struct {
    ContextTokens   int // token 数超过此阈值时触发
    ContextMessages int // 消息数超过此阈值时触发
}
```

### TypedPreserveUserMessages\[M\]

启用后，将摘要中 `<all_user_messages>...</all_user_messages>` 区段替换为最近的原始用户消息。

```go
type TypedPreserveUserMessages[M adk.MessageType] struct {
    Enabled   bool
    MaxTokens int                        // 保留用户消息的最大 token 数；默认为 TriggerCondition.ContextTokens / 3
    Filter    TypedUserMessageFilterFunc[M] // 过滤函数，返回 false 则不保留该消息
}
```

### TypedRetryConfig[M]

```go
type TypedRetryConfig[M adk.MessageType] struct {
    MaxRetries  *int                                                            // 默认 3
    ShouldRetry func(ctx context.Context, resp M, err error) bool              // 默认 err != nil 时重试
    BackoffFunc func(ctx context.Context, attempt int, resp M, err error) time.Duration // 默认指数退避 + 抖动
}
```

### TypedFailoverConfig[M]

```go
type TypedFailoverConfig[M adk.MessageType] struct {
    MaxRetries     *int                                                            // 默认 3
    ShouldFailover func(ctx context.Context, resp M, err error) bool              // 默认 err != nil 时降级
    BackoffFunc    func(ctx context.Context, attempt int, resp M, err error) time.Duration
    GetFailoverModel TypedGetFailoverModelFunc[M] // 返回 (failoverModel model.BaseModel[M], failoverModelInputMsgs []M, failoverErr error)
}
```

### TypedFailoverContext[M]

传递给 `GetFailoverModel` 回调的上下文。

```go
type TypedFailoverContext[M adk.MessageType] struct {
    Attempt           int  // 当前降级尝试次数，从 1 开始
    SystemInstruction M    // 系统指令（中间件内部设置，不可配置）
    UserInstruction   M    // 用户指令
    OriginalMessages  []M  // 原始完整对话
    LastModelResponse M    // 上次尝试的模型响应
    LastErr           error
}
```

### TypedTokenCounterInput[M]

```go
type TypedTokenCounterInput[M adk.MessageType] struct {
    Messages []M
    Tools    []*schema.ToolInfo
}
```

## 函数类型签名速查

```go
type TypedTokenCounterFunc[M]      func(ctx context.Context, input *TypedTokenCounterInput[M]) (int, error)
type TypedGenModelInputFunc[M]     func(ctx context.Context, sysInstruction, userInstruction M, originalMsgs []M) ([]M, error)
type TypedGetFailoverModelFunc[M]  func(ctx context.Context, failoverCtx *TypedFailoverContext[M]) (model.BaseModel[M], []M, error)
type TypedFinalizeFunc[M]          func(ctx context.Context, originalMessages []M, summary M) ([]M, error)
type TypedCallbackFunc[M]          func(ctx context.Context, before, after adk.TypedChatModelAgentState[M]) error
type TypedUserMessageFilterFunc[M] func(ctx context.Context, msg M) (bool, error)
```

## DefaultFinalizer

`DefaultFinalizer` 是一个独立的工厂函数，返回与中间件默认后处理逻辑一致的 `TypedFinalizeFunc[M]`。当你需要在自定义 `Finalize` 中复用默认逻辑（保留用户消息、附加 transcript 路径等）时使用。

```go
func DefaultFinalizer[M adk.MessageType](cfg *DefaultFinalizerConfig[M]) (TypedFinalizeFunc[M], error)
```

### DefaultFinalizerConfig[M]

```go
type DefaultFinalizerConfig[M adk.MessageType] struct {
    PreserveUserMessages *TypedPreserveUserMessages[M] // 默认 Enabled=true，MaxTokens=30000
    TranscriptFilePath   string
}
```

**示例**：在自定义 Finalize 中先执行默认后处理，再添加系统消息：

```go
defaultFinalize, err := summarization.DefaultFinalizer[*schema.Message](&summarization.DefaultFinalizerConfig[*schema.Message]{
    TranscriptFilePath: "/path/to/transcript.txt",
})
if err != nil {
    // handle error
}

cfg := &summarization.Config{
    Model: yourModel,
    Finalize: func(ctx context.Context, originalMessages []*schema.Message, summary *schema.Message) ([]*schema.Message, error) {
        msgs, err := defaultFinalize(ctx, originalMessages, summary)
        if err != nil {
            return nil, err
        }
        // 在摘要前添加系统消息
        return append([]*schema.Message{schema.SystemMessage("your system prompt")}, msgs...), nil
    },
}
```

## FinalizerBuilder

`TypedFinalizerBuilder[M]` 提供链式 API 构建 `TypedFinalizeFunc[M]`，支持链接多个处理器（Handler）和一个可选的自定义终结器（Custom）。

```go
func NewTypedFinalizer[M adk.MessageType]() *TypedFinalizerBuilder[M]
func NewFinalizer() *FinalizerBuilder // = NewTypedFinalizer[*schema.Message]

func (b *TypedFinalizerBuilder[M]) PreserveSkills(config *PreserveSkillsConfig) *TypedFinalizerBuilder[M]
func (b *TypedFinalizerBuilder[M]) Custom(fn TypedFinalizeFunc[M]) *TypedFinalizerBuilder[M]
func (b *TypedFinalizerBuilder[M]) Build() (TypedFinalizeFunc[M], error)
```

执行顺序：Handler 按注册顺序依次对 summary 进行变换 → Custom 确定最终输出消息列表。若未设置 Custom，则返回 `[]M{summary}`。

### PreserveSkills

在摘要压缩后保留 Skill 中间件加载过的技能内容，确保 agent 在上下文窗口压缩后仍保留技能知识。

```go
type PreserveSkillsConfig struct {
    SkillToolName     string // 技能工具名，需与 Skill 中间件一致。默认 "skill"
    MaxSkills         *int   // 最多保留技能数。默认 5；0 表示禁用
    MaxTokensPerSkill *int   // 单个技能最大 token 数，超出截断。默认 5000
    SkillsTokenBudget *int   // 所有技能总 token 预算。默认 25000
}
```

**示例**：

```go
finalizer, err := summarization.NewFinalizer().
    PreserveSkills(&summarization.PreserveSkillsConfig{}).
    Custom(func(ctx context.Context, origMsgs []*schema.Message, summary *schema.Message) ([]*schema.Message, error) {
        return []*schema.Message{schema.SystemMessage("system prompt"), summary}, nil
    }).
    Build()

cfg := &summarization.Config{
    Model:    yourModel,
    Finalize: finalizer,
}
```

## Summarize 方法

`TypedMiddleware[M]` 暴露 `Summarize` 方法，可在中间件自动触发之外手动执行一次摘要：

```go
func (m *TypedMiddleware[M]) Summarize(ctx context.Context, state *adk.TypedChatModelAgentState[M]) ([]M, error)
```

该方法执行完整的摘要流程（生成 → 后处理 → Callback → 事件），但**不检查触发条件**。返回替换后的消息列表。

## 工作原理

<a href="/img/eino/DwTrwyD1eh2DqNbsGE8cfdTNnYb.png" target="_blank"><img src="/img/eino/DwTrwyD1eh2DqNbsGE8cfdTNnYb.png" width="100%" /></a>

**触发条件检查**：先检查 `ContextMessages`（消息数），再通过 `TokenCounter` 计算 token 数与 `ContextTokens` 对比。满足任一即触发。

**默认后处理**（未设置 Finalize 时）：

1. 将摘要中 `<all_user_messages>...</all_user_messages>` 替换为最近的原始用户消息（受 `PreserveUserMessages` 控制）
2. 附加 `TranscriptFilePath` 提示
3. 添加摘要前言和继续指令

## 内部事件

当 `EmitInternalEvents = true` 时，中间件通过 `adk.TypedSendEvent` 发送事件：

<table>
<tr><td>事件类型</td><td>触发时机</td><td>携带数据</td></tr>
<tr><td><pre>ActionTypeBeforeSummarize</pre></td><td>触发条件满足后，调用模型前</td><td><pre>TypedBeforeSummarizeAction[M]{Messages}</pre>：原始消息列表</td></tr>
<tr><td><pre>ActionTypeGenerateSummary</pre></td><td>每次模型生成尝试后（含重试/降级）</td><td><pre>TypedGenerateSummaryAction[M]{Attempt, Phase, ModelResponse, GetError()}</pre></td></tr>
<tr><td><pre>ActionTypeAfterSummarize</pre></td><td>摘要完成、Finalize 之后</td><td><pre>TypedAfterSummarizeAction[M]{Messages}</pre>：最终消息列表</td></tr>
</table>

事件通过 `TypedCustomizedAction[M]` 包装，放在 `adk.AgentAction.CustomizedAction` 字段中。`GenerateSummaryPhase` 有两个值：`GenerateSummaryPhasePrimary`（主模型/重试）和 `GenerateSummaryPhaseFailover`（降级）。

## 使用示例

### 最小配置

```go
mw, err := summarization.New(ctx, &summarization.Config{
    Model: yourChatModel,
})

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:       yourChatModel,
    Middlewares: []adk.ChatModelAgentMiddleware{mw},
})
```

### 自定义触发条件 + 重试 + 降级

```go
mw, err := summarization.New(ctx, &summarization.Config{
    Model: yourChatModel,
    Trigger: &summarization.TriggerCondition{
        ContextTokens:   100000,
        ContextMessages: 80,
    },
    TranscriptFilePath: "/path/to/transcript.txt",
    Retry: &summarization.RetryConfig{
        MaxRetries: ptrOf(2),
    },
    Failover: &summarization.FailoverConfig{
        MaxRetries: ptrOf(3),
        GetFailoverModel: func(ctx context.Context, fctx *summarization.FailoverContext) (model.BaseModel[*schema.Message], []*schema.Message, error) {
            return backupModel, nil, nil // 返回 nil input 将复用默认输入
        },
    },
})
```

### FinalizerBuilder + PreserveSkills + DefaultFinalizer

```go
defaultFinalize, _ := summarization.DefaultFinalizer[*schema.Message](
    &summarization.DefaultFinalizerConfig[*schema.Message]{
        TranscriptFilePath: "/path/to/transcript.txt",
    },
)

finalizer, err := summarization.NewFinalizer().
    PreserveSkills(&summarization.PreserveSkillsConfig{
        MaxSkills: ptrOf(3),
    }).
    Custom(func(ctx context.Context, origMsgs []*schema.Message, summary *schema.Message) ([]*schema.Message, error) {
        msgs, err := defaultFinalize(ctx, origMsgs, summary)
        if err != nil {
            return nil, err
        }
        return append([]*schema.Message{schema.SystemMessage("system prompt")}, msgs...), nil
    }).
    Build()

cfg := &summarization.Config{
    Model:    yourModel,
    Finalize: finalizer,
}
```

## 注意事项

1. **设置 TranscriptFilePath**：强烈建议提供对话记录文件路径，摘要后模型可从原始记录中回溯细节。
2. **调整触发阈值**：`Trigger.ContextTokens` 建议设为模型上下文窗口的 80-90%。默认值 160,000 适用于 200k 窗口的模型。
3. **自定义 TokenCounter**：生产环境建议实现与模型 tokenizer 精确匹配的计数器。默认估算器以最近 assistant 消息的 `ResponseMeta.Usage.TotalTokens` 为基线，增量消息按 ~4 字符/token 估算。
4. **Finalize 覆盖**：设置 `Finalize` 后，`PreserveUserMessages` 和 `TranscriptFilePath` 不再自动生效。如需复用，使用 `DefaultFinalizer` 或 `FinalizerBuilder`。
5. **GetFailoverModel 约束**：回调必须返回非 nil 的 model 和非空的 input 消息列表。
