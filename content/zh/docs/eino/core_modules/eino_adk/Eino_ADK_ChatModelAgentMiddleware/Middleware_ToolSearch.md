---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Middleware: ToolSearch'
weight: 5
---

# ToolSearch 中间件

adk/middlewares/dynamictool/toolsearch

> 💡
> 本中间件在 [alpha/08](https://github.com/cloudwego/eino/releases/tag/v0.8.0-alpha.13) 版本引入。

## 概述

`toolsearch` 中间件实现动态工具选择。当工具库很大时，把所有工具都传给模型会撑爆上下文。这个中间件的做法是：

1. 添加一个 `tool_search` 元工具，接受正则表达式搜索工具名
2. 初始时隐藏所有动态工具
3. 模型调用 `tool_search` 后，匹配的工具才会出现在后续调用中

---

## 架构

```
Agent 初始化
                                │
                                ▼
┌───────────────────────────────────────────┐
│  BeforeAgent                                                          │
│    - 注入 tool_search 工具                                              │
│    - 把 DynamicTools 加到 Tools 列表                                    │
└───────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────┐
│  WrapModel                                                              │
│    每次 Model 调用前：                                                    │
│    1. 扫描消息历史，找到历史中所有 tool_search 的返回结果。                    │
│    2. 全量 Tools 减去未被选中的 DynamicTools，作为本次 Model 调用的工具列表。   │
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
}
```

---

## tool_search 工具

中间件注入的工具。

**参数：**

<table>
<tr><td>参数</td><td>类型</td><td>必填</td><td>说明</td></tr>
<tr><td><pre>regex_pattern</pre></td><td>string</td><td>是</td><td>匹配工具名的正则表达式</td></tr>
</table>

**返回：**

```json
{
  "selectedTools": ["tool_a", "tool_b"]
}
```

---

## 使用示例

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

---

## 工作原理

### BeforeAgent

1. 获取所有 DynamicTool
2. 使用 DynamicTools 创建 `tool_search` 工具
3. 把 `tool_search` 和所有 DynamicTools 加到 `runCtx.Tools`，此时 Agent 中的 Tools 为全量

### WrapModel

每次 Model 调用前：

1. 遍历消息历史，找所有 `tool_search` 的返回结果
2. 收集已选中的工具名
3. 从全量工具中过滤掉未选中的 DynamicTools
4. 用过滤后的工具列表调用 Model

### 工具选择流程

```
第一轮：
  Model 只能看到 tool_search
  Model 调用 tool_search(regex_pattern="weather.*")
  返回 {"selectedTools": ["weather_forecast", "weather_history"]}

第二轮：
  Model 能看到 tool_search + weather_forecast + weather_history
  Model 调用 weather_forecast(...)
```

---

## 注意事项

- DynamicTools 不能为空
- 正则匹配的是工具名，不是描述
- 选中的工具会一直保持可用，除非 tool_search 调用结果被删除或修改
- 可以多次调用 tool_search，结果会累加
