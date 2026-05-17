---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: FAQ
weight: 11
---

# Q: cannot use openapi3.TypeObject (untyped string constant "object") as *openapi3.Types value in struct literal，cannot use types (variable of type string) as *openapi3.Types value in struct literal

检查 github.com/getkin/kin-openapi 依赖版本不能超过 v0.118.0。eino V0.6.0 之后的版本不再依赖 kin-openapi 库。

# Q: Agent 流式调用时不会进入 ToolsNode 节点。或流式效果丢失，表现为非流式。

- 先更新 eino 版本到最新不同的模型在流式模式下输出工具调用的方式可能不同: 某些模型(如 OpenAI) 会直接输出工具调用；某些模型 (如 Claude) 会先输出文本，然后再输出工具调用。因此需要使用不同的方法来判断，这个字段用来指定判断模型流式输出中是否包含工具调用的函数。ReAct Agent 的 Config 中有一个 StreamToolCallChecker 字段，如未填写，Agent 会使用“非空包”是否包含工具调用判断：

```go
func firstChunkStreamToolCallChecker(_ context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()

    for {
       msg, err := sr.Recv()
       if err == io.EOF {
          return false, nil
       }
       if err != nil {
          return false, err
       }

       if len(msg.ToolCalls) > 0 {
          return true, nil
       }

       if len(msg.Content) == 0 { // skip empty chunks at the front
          continue
       }

       return false, nil
    }
}
```

上述默认实现适用于：模型输出的 Tool Call Message 中只有 Tool Call。默认实现不适用的情况：在输出 Tool Call 前，有非空的 content chunk。此时，需要自定义 tool Call checker 如下：

```go
toolCallChecker := func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    defer sr.Close()
    for {
       msg, err := sr.Recv()
       if err != nil {
          if errors.Is(err, io.EOF) {
             // finish
             break
          }

          return false, err
       }

       if len(msg.ToolCalls) > 0 {
          return true, nil
       }
    }
    return false, nil
}
```

上面这个自定义 StreamToolCallChecker，在模型常规输出 answer 时，需要判断**所有包**是否包含 ToolCall，从而导致“流式判断”的效果丢失。如果希望尽可能保留“流式判断”效果，解决这一问题的建议是：

> 💡
> 尝试添加 prompt 来约束模型在工具调用时不额外输出文本，例如：“如果需要调用 tool，直接输出 tool，不要输出文本”。不同模型受 prompt 影响可能不同，实际使用时需要自行调整 prompt 并验证效果。

# Q: [github.com/bytedance/sonic/loader](http://github.com/bytedance/sonic/loader): invalid reference to runtime.lastmoduledatap

老版本 sonic 不兼容 go1.24，更新版本大于 v1.13.2 即可

# Q: Tool Input 反序列化失败：failed to invoke tool call {tool_call_id}: unmarshal input fail

目前模型一般不会产生非法 json 输出，可以先确认下反序列化失败原因是什么，大概率是模型输出超长截断导致。

# Q: Eino 如何实现批处理节点？ 类似 Coze 中的批处理节点

Eino 目前不支持批处理，可选方法有两种

1. 每次请求按需动态构建 graph，额外成本不高。 这种方法需要注意 Chain Parallel 要求其中并行节点数量大于一，
2. 自定义批处理节点，节点内自行批处理任务代码示例：[https://github.com/cloudwego/eino-examples/tree/main/compose/batch](https://github.com/cloudwego/eino-examples/tree/main/compose/batch)

# Q: eino 支持把模型结构化输出吗

分两步，第一步要求模型输出结构化数据，有三个方法：

1. 部分模型支持直接配置（比如 openai 的 response format），可以看下模型配置里有没有。
2. 通过 tool call 功能获得
3. 写 prompt 要求模型得到模型结构化输出后，可以用 schema.NewMessageJSONParser 把 message 转换成你需要的 struct

# Q: 如何获取模型(chat model)输出的 Reasoning Content/推理/深度思考 内容：

如果模型封装支持输出 Reasoning Content/推理/深度思考 内容，这些内容会储存到模型输出的 Message 的 ReasoningContent 字段。

# Q：报错中包含"context deadline exceeded" "timeout" "context canceled"

分情况讨论：

1. context.canceled: 在执行 graph 或者 agent 时，用户侧传入了一个可以 cancel 的 context，并发起了取消。排查应用层代码的 context cancel 操作。此报错与 eino 框架无关。
2. Context deadline exceeded: 可能是两种情况：
3. 在执行 graph 或者 agent 时，用户侧传入了一个带 timeout 的 context，触发了超时。
4. 给 ChatModel 或者其他外部资源配置了 timeout 或带 timeout 的 httpclient，触发了超时。查看抛出的 error 中的 `node path: [node name x]`，如果 node name 不是 ChatModel 等带外部调用的节点，大概率是 2-a 这种情况，反之大概率是 2-b 这种情况。如果怀疑是 2-a 这种情况，自行排查下上游链路那个环节给 context 设置了 timeout，常见的可能性如 faas 平台等。如果怀疑是 2-b 这种情况，看下节点是否自行配置了超时，比如 Ark ChatModel 配置了 Timeout，或者 OpenAI ChatModel 配置了 HttpClient（内部配置了 Timeout）。如果都没有配置，但依然超时了，可能是模型侧 SDK 的默认超时。已知 Ark SDK 默认超时 10 分钟，Deepseek SDK 默认超时 5 分钟。

# Q：想要在子图中获取父图的 State 怎么做

如果子图和父图的 State 类型不同，则可以通过 `ProcessState[父图 state type]()` 来处理父图的 State。如果子图和父图的 State 类型相同，则想办法让 State 类型变成不同的，比如用类型别名：`type NewParentStateType StateType`。

# Q:  eino-ext 支持的 Model 模型的如何适配多模特的输入输出 ？

eino-ext 支持的多模态输入输出场景，可以查阅 [https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model](https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model) 对应模型的 Examples 示例;

# Q: 使用最新的多模态支持字段 UserInputMultiContent 输入多模态数据，但模型侧好像没有我传入的多模态数据或者多模态输入时，读不到 multicontent 的内容

最新版本的 Eino 引入 UserInputMultiContent 与  AssistantGenMultiContent 分别表达用户侧输入的多模态数据与模型侧返回的多模态数据，其中 eino-ext 中的 chatmodel 实现都已经做了适配，如果发现模型侧没有收到多模态信息，可以尝试升级下我们使用的模型的包。go get 到最新版本再次尝试运行看是否问题得到解决。

# Q: 升级到 0.6.x 版本后，有不兼容问题

根据先前社区公告规划 [Migration from OpenAPI 3.0 Schema Object to JSONSchema in Eino · cloudwego/eino · Discussion #397](https://github.com/cloudwego/eino/discussions/397)，已发布 eino V0.6.1 版本。重要更新内容为移除了 getkin/kin-openapi 依赖以及所有 OpenAPI 3.0 相关代码。eino-ext 部分 module 报错 undefined: schema.NewParamsOneOfByOpenAPIV3 等问题，升级报错的 eino-ext module 到最新版本即可。如果 schema 改造比较复杂，可以使用 [JSONSchema 转换方法](https://bytedance.larkoffice.com/wiki/ZMaawoQC4iIjNykzahwc6YOknXf)文档中的工具方法辅助转换。

# Q: 我创建模型之后，尝试模型调用报错 : 400 Bad Reqvest,message: code: missing_required_parameter; message: Missing reqvired parameter：'input 。

- 遇到这个报错请确认咱们生成 chat model 是填写的 base url 是 chat completion 的 URL 还是 ResponseAPI 的 URL，绝大多数场景是错误传递了 Response API 的 Base URL

# Q: 如何排查 ChatModel 调用报错？比如[NodeRunError] failed to create chat completion: error, status code: 400, status: 400 Bad Request。

这类报错是模型 API（如 GPT、Ark、Gemini 等）的报错，通用的思路是检查实际调用模型 API 的 HTTP Request 是否有缺字段、字段值错误、BaseURL 错误等情况。建议将实际的 HTTP Request 通过日志打印出来，并通过 HTTP 直接请求的方式（如命令行发起 Curl 或使用 Postman 直接请求）来验证、修改该 HTTP Request。在定位问题后，再相应修改对应的 Eino 代码中的问题。如何通过日志打印出模型 API 的实际 HTTP Request，参考这个代码样例：[https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport](https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport)

# Q: 使用 eino-ext 仓库下 创建的 gemini chat model 不支持使用 Image URL 传递多模态？如何适配？

目前 Eino-ext 仓库下的 gemini Chat model 已经做了传递 URL 类型的支持，使用 go get github.com/cloudwego/eino-ext/components/model/gemini 更新到 [components/model/gemini/v0.1.22](https://github.com/cloudwego/eino-ext/releases/tag/components%2Fmodel%2Fgemini%2Fv0.1.22) 目前最新版本，传递 Image URL 测试是否满足业务需求

# Q: 模型产生的 Tool Call 有问题（参数非法 JSON、调用了不存在的工具、参数名称发生变化等），如何处理？

模型（LLM）产生的 Tool Call 可能存在多种问题，Eino 提供了多层防御机制来应对。以下按问题类型分别介绍：

## 1. Tool Call 参数不是合法 JSON（Unmarshal 失败）

**典型报错：** `failed to call mcp tool: failed to marshal request: json: error calling MarshalJSON for type json.RawMessage: unexpected end of JSON input` **根因：** ChatModel 产生的 Tool Call 中，Argument 字段是 string。Eino 在调用工具前会做 JSON Unmarshal，如果模型输出的 JSON 不合法（多余前缀/后缀、特殊字符转义、缺失大括号、超长截断等），则会报错。**方案 A：ToolArgumentsHandler（推荐）**在 `ToolsNodeConfig`（或 ADK 的 `ToolsConfig`）中配置 `ToolArgumentsHandler`，在工具执行前对参数进行预处理和修复：

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: tools,
            ToolArgumentsHandler: func(ctx context.Context, name, arguments string) (string, error) {
                // 在此修复常见 JSON 格式问题，如缺失大括号、多余前缀等
                return fixJSON(arguments), nil
            },
        },
    },
})
```

一个 JSON 修复的参考实现：[eino-examples/components/tool/middlewares/jsonfix](https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix)**执行顺序：** `ArgumentsAliases 别名替换 → ToolArgumentsHandler → 工具执行`

## 2. 模型调用了不存在的工具（Tool Name 幻觉）

**典型报错：** `tool xxx not found in toolsNode indexes` **根因：** 模型可能"幻觉"出不存在的工具名称。**方案：UnknownToolsHandler** 配置后，当模型调用不存在的工具时，不会直接报错，而是由 Handler 返回一段提示文本，让模型自行纠正：

```go
compose.ToolsNodeConfig{
    Tools: tools,
    UnknownToolsHandler: func(ctx context.Context, name, input string) (string, error) {
        return fmt.Sprintf("Tool '%s' does not exist. Available tools: %s. Please retry.", name, availableToolNames), nil
    },
}
```

## 3. 工具名称或参数名称发生变化（Schema 迁移导致的兼容性问题）

**场景：** 工具重命名（如 `search` → `web_search`），或参数字段重命名（如 `q` → `query`），但模型可能仍使用旧名称。这在使用 LLM Cache 或对话历史中记录了旧工具 Schema 时尤为常见。**方案：ToolAliases** 为工具配置名称别名和参数别名，框架在调度时自动解析：

```go
compose.ToolsNodeConfig{
    Tools: tools,
    ToolAliases: map[string]compose.ToolAliasConfig{
        "web_search": {
            NameAliases: []string{"search", "web-search"},       // 旧工具名 → 当前工具名
            ArgumentsAliases: map[string][]string{
                "query": {"q", "search_term"},                    // 旧参数名 → 当前参数名
            },
        },
    },
}
```

> 💡
> ToolAliases 的参数别名替换发生在 ToolArgumentsHandler 之前。完整的执行顺序为：Name Alias 解析 → Arguments Alias 替换 → ToolArgumentsHandler → 工具执行。

## 4. 工具执行失败后，让模型自行纠错（而非中断流程）

**场景：** Tool 执行报错（如文件不存在、权限不足、API 调用失败）时，默认会中断 Agent 流程。但通常更好的做法是将错误信息作为正常的 Tool Result 返回给模型，由模型自动纠错重试。**方案 A：ADK Middleware（WrapInvokableToolCall）**在 ADK Agent 中，通过 `ChatModelAgentMiddleware` 的 `WrapInvokableToolCall` 方法将错误转换为字符串结果：

```go
func (m *safeToolMiddleware) WrapInvokableToolCall(
    _ context.Context,
    endpoint adk.InvokableToolCallEndpoint,
    _ *adk.ToolContext,
) (adk.InvokableToolCallEndpoint, error) {
    return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
        result, err := endpoint(ctx, args, opts...)
        if err != nil {
            if _, ok := compose.IsInterruptRerunError(err); ok {
                return "", err // 中断错误不转换
            }
            return fmt.Sprintf("[tool error] %v", err), nil
        }
        return result, nil
    }, nil
}
```

参考：[quickstart/chatwitheino Ch05 Middleware](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go)**方案 B：compose 层 ToolCallMiddlewares** 在 compose 层直接使用 `ToolCallMiddlewares`，适用于直接使用 Graph/ToolsNode 的场景：

```go
compose.ToolsNodeConfig{
    Tools: tools,
    ToolCallMiddlewares: []compose.ToolMiddleware{
        {
            Invokable: func(next compose.InvokableToolEndpoint) compose.InvokableToolEndpoint {
                return func(ctx context.Context, in *compose.ToolInput) (*compose.ToolOutput, error) {
                    output, err := next(ctx, in)
                    if err != nil {
                        if _, ok := compose.IsInterruptRerunError(err); ok {
                            return nil, err
                        }
                        return &compose.ToolOutput{Result: fmt.Sprintf("[tool error] %v", err)}, nil
                    }
                    return output, nil
                }
            },
        },
    },
}
```

参考：[eino-examples/components/tool/middlewares/errorremover](https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/errorremover)

> 💡
> 注意：在转换错误时，必须先检查 `compose.IsInterruptRerunError`。InterruptRerun 错误是框架用于 Human-in-the-loop 等场景的控制流信号，不应被吞掉。

## 总结

<table>
<tr><td>问题</td><td>机制</td><td>配置位置</td></tr>
<tr><td>参数 JSON 不合法</td><td><pre>ToolArgumentsHandler</pre></td><td><pre>ToolsNodeConfig</pre> / <pre>ToolsConfig</pre></td></tr>
<tr><td>调用不存在的工具</td><td><pre>UnknownToolsHandler</pre></td><td><pre>ToolsNodeConfig</pre> / <pre>ToolsConfig</pre></td></tr>
<tr><td>工具名/参数名变化</td><td><pre>ToolAliases</pre></td><td><pre>ToolsNodeConfig</pre> / <pre>ToolsConfig</pre></td></tr>
<tr><td>工具执行报错需自动纠错</td><td>Middleware 错误转换</td><td>ADK <pre>Handlers</pre> 或 <pre>ToolCallMiddlewares</pre></td></tr>
</table>

# Q：如何可视化一个 graph/chain/workflow 的拓扑结构？

利用 `GraphCompileCallback` 机制在 `graph.Compile` 的过程中将拓扑结构导出。一个导出为 mermaid 图的代码样例：[https://github.com/cloudwego/eino-examples/tree/main/devops/visualize](https://github.com/cloudwego/eino-examples/tree/main/devops/visualize)

# Q: Eino 中使用 Flow/react Agent 场景下如何获取工具调用的 Tool Call Message 以及本次调用工具的 Tool Result 结果？

- Flow/React Agent 场景下获取中间结构参考文档 [Eino: ReAct Agent 使用手册](/zh/docs/eino/core_modules/flow_integration_components/react_agent_manual)
- 此外还可以将 Flow/React Agent 替换成 ADK 的 ChatModel Agent  具体可参考 [Eino ADK: 概述](/zh/docs/eino/core_modules/eino_adk/agent_preview)

# Q: 在使用 Eino 开发 Agent 时，定义了一个不需要任何参数的工具（Tool）。为什么在调用部分大模型时，会遇到类似 JSON Schema 校验失败（如 `unknown msg type` 或格式不支持）的报错？该如何规范解决？

**A: 问题根因：**在 Function Calling / 工具调用的生态中，许多大模型厂商对下发的 JSON Schema 都有着严格的格式校验逻辑。如果在定义无参工具时，开发者错误地传入了空的参数映射或空结构体（例如导致框架生成 `{"type": "object", "properties": {}}` 这样虽然语法合法但无实际意义的 Schema），部分模型的校验引擎会将其判定为不符合预期的异常格式，进而直接拒绝请求。**框架机制与代码行为：**

- 在 Eino 框架的核心定义（`eino/schema/tool.go`）中，`schema.ToolInfo` 结构体专门使用 `ParamsOneOf` 字段来描述参数。
- 框架设计上明确允许：对于不需要参数的工具，`ParamsOneOf` 应当为 `nil`。
- 当 `ParamsOneOf` 为 `nil` 时，Eino 的底层组件在向各类模型 Provider 构建请求时，会直接省略工具的 `parameters` 字段，从而从根本上避免触发模型的强校验规则。**最佳实践：**在 Eino 中构造无参工具时，**切勿使用空结构体或空 Map 去初始化参数描述**，应直接让 `ParamsOneOf` 保持默认的 `nil` 状态。

```go
tool := &schema.ToolInfo{
    Name: "fetch_current_time",
    Desc: "获取当前系统时间，无需任何参数",
    // 最佳实践：明确置为 nil，或直接不声明该字段
    ParamsOneOf: nil, 
}
```

**(注：如果使用的是 **utils.InferTool** 等反射推导工具，且入参为空结构体时，需注意确保使用的 Eino 扩展版本已正确处理了空属性的过滤，或考虑根据需要手动覆盖其参数定义。)**

# Q: 如何在 Agent 外部获取 Session Values（如 deep agent 的 TODOs）？

在 ADK 中，`adk.GetSessionValues(ctx)` 和 `adk.AddSessionValue(ctx, key, value)` 依赖 Agent 运行期间注入到 context 中的 `runSession`。这意味着它们**只能在 Agent 的执行上下文内使用**——例如在 Middleware、Handler 或 Tool 回调函数中。当用户通过 Runner 的 `Run` 方法获取到 `AsyncIterator` 并在外部消费 `AgentEvent` 时，此时已经不在 Agent 的执行上下文中，因此无法通过 `adk.GetSessionValues` 获取到 Session Values。如果需要在 Agent 运行过程中实时获取 Session Values（例如在消费流式事件的同时），可以考虑使用 Middleware/Callback Handler 的回调将所需数据通过其他渠道（如 channel）传递出来。

# Q: 多个同名 SubAgent 并发执行时，如何区分它们发出的 AgentEvent？

**场景：** 使用 DeepAgent 时，多个同名 SubAgent（如 `general-purpose`）可能并发执行。在通过 Runner 消费 `AsyncIterator[*AgentEvent]` 时，不同实例发出的事件难以区分。**方案：包装 Agent，通过 CustomizedOutput 注入标识符** `AgentOutput` 提供了 `CustomizedOutput any` 字段，可以用于承载自定义数据。通过包装 Agent 的 `Run` 方法，在每个发出的事件上注入唯一标识：

```go
type wrappedAgent struct {
    adk.Agent
    identifier int
}

func (w *wrappedAgent) Run(ctx context.Context, input *adk.AgentInput, options ...adk.AgentRunOption) *adk.AsyncIterator[*adk.AgentEvent] {
    iter := w.Agent.Run(ctx, input, options...)
    newIter, newGen := adk.NewAsyncIteratorPair[*adk.AgentEvent]()
    go func() {
        defer newGen.Close()
        for {
            event, ok := iter.Next()
            if !ok {
                break
            }
            // 注意：event.Output 可能为 nil（如错误事件、action-only 事件）
            if event.Output == nil {
                event.Output = &adk.AgentOutput{}
            }
            event.Output.CustomizedOutput = w.identifier
            newGen.Send(event)
        }
    }()
    return newIter
}
```

**使用方式：**

```go
agent1 := &wrappedAgent{Agent: generalAgent, identifier: 1}
agent2 := &wrappedAgent{Agent: generalAgent, identifier: 2}
// 将 agent1、agent2 作为 SubAgent 传入 DeepAgent
```

**消费端区分：**

```go
for {
    event, ok := iter.Next()
    if !ok {
        break
    }
    if event.Output != nil && event.Output.CustomizedOutput != nil {
        id := event.Output.CustomizedOutput.(int)
        fmt.Printf("Event from agent instance %d\n", id)
    }
}
```

> 💡
> 注意事项：
>
> 1. event.Output 可能为 nil，设置 CustomizedOutput 前必须做 nil 检查。
> 2. 此包装仅覆盖 Run 方法。如果 Agent 实现了 ResumableAgent 接口（如 DeepAgent 创建的 Agent），Resume 方法通过嵌入的 Agent 直接调用，其事件不会被注入标识符。如需完整覆盖，需要同时包装 Resume 方法。
> 3. 此方案是 workaround，适合快速解决区分问题。CustomizedOutput 不会被持久化到 Checkpoint。

# Q: 如何在某个 Skill 被触发时才加载对应的 ToolInfo？/ 如何用 Skill 强制模型调用指定工具？

这两个问题的根源在于对 Skill 和 Tool 概念的混淆。**Skill 的本质是 Prompt。** Skill 中间件在触发时，会向对话中插入一条新的 UserMessage，其内容就是该 Skill 的 Prompt 文本。你可以在 Skill Prompt 中写明"请调用 xxx 工具，参数为 yyy"，但这仍然只是提示词——模型是否遵循，取决于 Prompt Engineering 的质量和模型本身的随机性。**Tool（ToolInfo）的本质是请求参数。** ToolInfo 列表作为 ChatModel 请求的 `tools` 参数发送给模型，告诉模型"你可以调用哪些工具"。除非使用 ToolSearch 动态加载（Claude、GPT 5.4+ 等支持），否则 ToolInfo 必须在请求时一并传递。**关于"Skill 触发时动态加载 ToolInfo"：** 要实现这个效果，意味着当 Skill Prompt 被插入对话时，同时往本次请求的 `[]ToolInfo` 中追加该 Skill 所需的工具定义。这完全是用户侧的自定义行为——你需要：1) 识别当前轮次是否触发了 Skill；2) 确定该 Skill 需要哪些 Tool；3) 在构造 ChatModel 请求前，将对应的 ToolInfo 追加到 `[]ToolInfo`。需要注意，`[]ToolInfo` 位于 Prompt Cache 的前部，动态追加新工具极大概率会破坏 Prompt Cache，导致缓存命中率下降和延迟增加。如果在意缓存效率，应在初始化时就把所有可能用到的工具一次性传入。**关于"用 Skill 强制模型调用指定工具"：** Skill 只是向模型发送了一段文字提示，模型是否严格遵循取决于 Prompt 的清晰度、模型自身的 instruction-following 能力以及上下文干扰。这本质上是 Prompt Engineering 问题，存在固有的不确定性。如果业务要求 100% 确定调用某个工具，可以在 LLM 请求中指定 ToolChoice 强制模型选择该工具，或在应用层代码中直接调用该工具而非依赖模型决策。

> 💡
> 推荐做法：Skill 触发时希望模型"大概率"调用某工具 → 在 Skill Prompt 中明确写出工具名称、参数格式和调用指令；需要动态控制可用工具集 → 使用 ToolSearch 或在 ChatModel 中间件中根据上下文动态修改 `[]ToolInfo`；必须 100% 调用某工具 → 在应用层代码中直接调用，不依赖模型决策；担心 Prompt Cache 失效 → 初始化时传入所有可能用到的 ToolInfo，避免动态增删。

# Q: Supervisor 子 Agent 转回主 Agent 报错 / transfer_to_agent 转发后子 Agent 收到的用户内容变更

这些问题均与 ADK 的 AgentTransfer 机制有关。Supervisor 是基于 AgentTransfer 实现的多 Agent 协作模式。AgentTransfer 机制存在以下已知局限：

- **上下文全量共享**：Supervisor 与 SubAgent 之间、SubAgent 之间强制共享完整上下文，导致 token 开销大、延迟高。
- **注意力稀释**：全量共享的上下文对子 Agent 而言往往冗余，稀释了子 Agent 对其真正任务的关注度，降低执行质量。
- **上下文污染**：转发过程中产生的 "Successfully transferred to xxx" 消息会残留在上下文中，可能误导后续 Agent 的 Tool Call 决策（形成错误的 few-shot 示例）。
- **强制注入工具**：机制要求注入 Transfer Tool（以及可能的 Exit Tool），增加了 ToolInfo 列表的复杂度。

> 💡
> 基于上述原因，ADK 中的 AgentTransfer / Supervisor 模式目前标记为「不推荐使用」。

**推荐替代方案：** 使用 DeepAgent 或 ChatModelAgent + AgentTool 组合。这种模式下：

- 每个 AgentTool 拥有独立封装的上下文，不会相互污染，速度更快、成本更低，通常效果更好。
- 不会产生 "Successfully transferred to xxx" 等干扰消息，避免对模型决策形成误导。

# Q: DeepSeek V4 模型 tool call 场景下 reason content 回传有问题，如何解决？

DeepSeek V4 模型在 tool call 场景下，reason content 的回传存在已知问题，多位业务同学反馈遇到此情况。

**解决方式：** 升级对应的 eino-ext deepseek 模块到最新版本即可修复。

```shell
go get github.com/cloudwego/eino-ext/components/model/deepseek@latest
```

升级后重新运行，确认 reason content 回传是否恢复正常。
