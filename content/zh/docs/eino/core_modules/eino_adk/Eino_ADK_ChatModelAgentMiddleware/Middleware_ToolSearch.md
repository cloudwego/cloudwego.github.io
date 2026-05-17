---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: ToolSearch
weight: 7
---

## 概述

`toolsearch` 中间件实现动态工具选择。当工具库很大时，把所有工具都传给模型会撑爆上下文。这个中间件的做法是：

1. 添加一个 `tool_search` 元工具，接受关键字查询或直接选择来搜索工具
2. 初始时隐藏所有动态工具
3. 模型调用 `tool_search` 后，匹配的工具才会出现在后续调用中支持三种运行模式（配置层面为两个值，但 `UseModelToolSearch=true` 存在两种端到端行为）：

- **默认模式**（`UseModelToolSearch=false`）：中间件自行管理工具可见性。在每次 Model 调用前通过 `BeforeModelRewriteState` 根据 `tool_search` 的调用结果过滤 `state.ToolInfos`，逐步将选中的动态工具加回模型可见列表
- **模型原生模式 — 纯服务端检索**（`UseModelToolSearch=true`，模型自行检索 DeferredTools）：中间件把动态工具移入 `state.DeferredToolInfos`，通过 `model.WithDeferredTools` 传递给模型。如果模型原生支持 server-side 工具检索（如 Claude 的 tool search），模型直接从 DeferredTools 中搜索和选择，**无需调用 tool_search tool**
- **模型原生模式 — 客户端代理检索**（`UseModelToolSearch=true`，模型通过调用 `tool_search` 发现工具）：与上一模式相同的中间件配置，但模型不具备自主检索 DeferredTools 的能力，而是通过调用 `tool_search` 工具（由 `model.WithToolSearchTool` 注册），客户端的 `modelToolSearchTool` 执行搜索并返回结构化的 `ToolSearchResult`（含匹配工具的完整 ToolInfo），模型据此选择工具

> 💡
> 包路径：github.com/cloudwego/eino/adk/middlewares/dynamictool/toolsearch

---

## 架构

```
Agent 初始化
                                │
                                ▼
┌───────────────────────────────────────────┐
│  BeforeAgent                              │
│    - 注入 tool_search 工具                │
│    - 把 DynamicTools 加到 Tools 列表      │
│    - 模型原生模式下设置                   │
│      runCtx.ToolSearchTool                │
└───────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────┐
│  BeforeModelRewriteState                   │
│  (每次 Model 调用前执行)                    │
│                                            │
│  1. 插入 <available-deferred-tools>        │
│     User 消息，列出所有可搜索的工具名       │
│                                            │
│  首次调用时（初始化）：                      │
│    默认模式：                               │
│      从 ToolInfos 中移除 DynamicTools       │
│    模型原生模式：                           │
│      DynamicTools → DeferredToolInfos      │
│      ToolInfos 中移除 DynamicTools          │
│      和 tool_search                        │
│                                            │
│  后续调用（默认模式-前向选择）：             │
│    扫描消息历史，收集 tool_search 返回的    │
│    matches，把匹配的 DynamicTools 加回      │
│    ToolInfos                               │
└────────────────────────────────────────────┘
                                │
                                ▼
                          Model 调用
```

---

## 配置

```go
type Config struct {
    // 可动态搜索和加载的工具列表
    DynamicTools []tool.BaseTool

    // 是否使用模型原生的工具搜索能力
    //
    // 为 true 时，中间件将工具搜索委托给模型的原生能力。
    //
    // 为 false 时（默认），中间件通过在每次 Model 调用前
    // 根据 tool_search 结果过滤工具列表来管理工具可见性。
    // 注意：这种方式可能会使模型的 KV-cache 失效
    // （因为工具列表在调用之间会变化）。
    UseModelToolSearch bool
}
```

---

## 构造函数

```go
// 标准构造函数，使用 *schema.Message
func New(ctx context.Context, config *Config) (adk.ChatModelAgentMiddleware, error)

// 泛型构造函数，支持 *schema.Message 和 *schema.AgenticMessage
func NewTyped[M adk.MessageType](ctx context.Context, config *Config) (adk.TypedChatModelAgentMiddleware[M], error)
```

## `New` 内部调用 `NewTyped[*schema.Message]`。如果你使用 `TypedChatModelAgent`（如 Agentic 模式），请直接使用 `NewTyped`。

## tool_search 工具

中间件注入的元工具。**参数：**

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>query</pre></td><td>string</td><td>是</td><td>查找工具的查询字符串。支持三种模式：关键字搜索、<pre>select:<tool_name></pre> 直接选择、<pre>+keyword</pre> 必须匹配</td></tr>
<tr><td><pre>max_results</pre></td><td>integer</td><td>否</td><td>返回的最大结果数（默认：5）。仅对关键字搜索模式生效，直接选择模式不受此限制</td></tr>
</table>

**查询模式：**

<table>
<tr><td>模式</td><td>语法</td><td>说明</td></tr>
<tr><td>关键字搜索</td><td><pre>"weather forecast"</pre></td><td>按关键字在工具名和描述中匹配，按相关性评分排序。支持 camelCase 和 <pre>_</pre> / <pre>__</pre>（MCP）分隔符拆分</td></tr>
<tr><td>直接选择</td><td><pre>"select:tool_a,tool_b"</pre></td><td>按精确名称选择一个或多个工具，逗号分隔。不受 <pre>max_results</pre> 限制</td></tr>
<tr><td>必须匹配</td><td><pre>"+slack send message"</pre></td><td><pre>+</pre> 前缀的关键字为必须匹配项，不含该关键字的工具会被过滤掉。其余关键字用于排序</td></tr>
</table>

**返回值（默认模式）：**

```json
{"matches": ["tool_a", "tool_b"]}
```

**返回值（模型原生模式）：** 返回结构化的 `schema.ToolResult`，包含匹配工具的完整 `ToolInfo`，供模型原生处理。

## 关键字搜索评分机制

关键字搜索使用多层评分系统，对每个关键字分别计算最高得分后累加：

<table>
<tr><td>匹配规则</td><td>得分</td></tr>
<tr><td>工具名拆分后的部分完全匹配关键字</td><td>10</td></tr>
<tr><td>工具名拆分后的部分包含关键字（子串）</td><td>5</td></tr>
<tr><td>工具全名包含关键字</td><td>3</td></tr>
<tr><td>工具描述包含关键字</td><td>2</td></tr>
</table>

> 💡
> 每个关键字对每个规则取最高分（intMax），不会叠加同一工具内多个 part 的匹配分数。多个关键字的得分相加为总分。得分相同时按工具名字典序排列。

工具名会按 `_`（下划线）、`__`（MCP 服务器与工具分隔符）和 camelCase 边界拆分为多个部分进行匹配。例如 `mcp__slack__send_message` 会拆分为 `["mcp", "slack", "send", "message"]`，`NotebookEdit` 会拆分为 `["Notebook", "Edit"]`。匹配不区分大小写。

## 使用示例

### 默认模式（中间件管理工具可见性）

```go
middleware, err := toolsearch.New(ctx, &toolsearch.Config{
    DynamicTools: []tool.BaseTool{
        weatherTool,
        stockTool,
        currencyTool,
        // ... 很多工具
    },
})
if err != nil {
    return err
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    myModel,
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

### 模型原生模式

```go
middleware, err := toolsearch.New(ctx, &toolsearch.Config{
    DynamicTools: []tool.BaseTool{
        weatherTool,
        stockTool,
        currencyTool,
    },
    UseModelToolSearch: true,
})
if err != nil {
    return err
}

agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    Model:    myModel, // 需要模型支持原生 tool search
    Handlers: []adk.ChatModelAgentMiddleware{middleware},
})
```

配置完全相同，但端到端行为取决于模型适配器的实现：

- 如果模型原生支持 server-side 检索（如 Claude）：模型直接从 `DeferredToolInfos` 中搜索和选择工具，`tool_search` 工具不会被调用
- 如果模型通过客户端代理检索：模型发起 `tool_search` 调用 → 客户端 `modelToolSearchTool` 执行搜索 → 返回结构化 `ToolSearchResult`（含完整 ToolInfo）→ 模型据此选择工具

---

## 工作原理

### BeforeAgent

1. 获取所有 DynamicTool 的 ToolInfo，校验无重复工具名
2. 根据 `UseModelToolSearch` 创建对应类型的 `tool_search` 工具
3. 把 `tool_search` 和所有 DynamicTools 加到 `runCtx.Tools`（此时 Agent 中为全量工具）
4. 模型原生模式下，设置 `runCtx.ToolSearchTool`，框架会通过 `model.WithToolSearchTool` 传递给模型

### BeforeModelRewriteState（每次 Model 调用前）

**通用逻辑：**

- 确保消息列表中存在 `<available-deferred-tools>` 提醒（以 User 消息插入，列出所有可搜索的工具名）**首次调用 — 初始化（两种模式）：**

<table><tbody><tr>
<td>
<strong>默认模式</strong>从 <pre>state.ToolInfos</pre> 中移除所有 DynamicTools，使模型初始只能看到静态工具和 <pre>tool_search</pre></td><td>
<strong>模型原生模式</strong>1. 将 DynamicTools 从 <pre>state.ToolInfos</pre> 提取到 <pre>state.DeferredToolInfos</pre>2. 从 <pre>state.ToolInfos</pre> 中移除 <pre>tool_search</pre>（由模型原生处理）</td></tr></tbody></table>

**后续调用 — 前向选择（仅默认模式）：**

1. 遍历消息历史，找所有 `tool_search` 返回结果中 JSON `matches` 字段
2. 收集已选中的工具名
3. 把匹配的 DynamicTools 加回 `state.ToolInfos`（累加，不会移除已添加的工具）

### 工具选择流程（默认模式）

```
第一轮：
  Model 只能看到 tool_search + 静态工具
  Model 调用 tool_search(query="weather forecast")
  返回 {"matches": ["weather_forecast", "weather_history"]}

第二轮：
  Model 能看到 tool_search + 静态工具 + weather_forecast + weather_history
  Model 调用 weather_forecast(...)
```

---

## 注意事项

- `DynamicTools` 不能为空，且工具名不能重复
- 关键字搜索匹配工具名和描述，不区分大小写
- 在默认模式下，选中的工具会一直保持可用（基于消息历史中 `tool_search` 结果累加）
- 可以多次调用 `tool_search`，结果会累加
- 默认模式下，每次 Model 调用前工具列表可能变化，这可能导致模型 KV-cache 失效
- 模型原生模式需要 ChatModel 支持 `model.WithToolSearchTool` 和/或 `model.WithDeferredTools` 选项。具体走哪条路径（纯服务端检索 vs 客户端代理检索）取决于模型适配器的实现
- `<available-deferred-tools>` 提醒以 **User 消息**（而非 System 消息）插入到消息列表中，位于第一条非 System 消息之前
