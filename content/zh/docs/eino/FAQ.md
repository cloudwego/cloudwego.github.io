---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: FAQ
weight: 7
---

# Q: cannot use openapi3.TypeObject (untyped string constant "object") as *openapi3.Types value in struct literal，cannot use types (variable of type string) as *openapi3.Types value in struct literal

检查 github.com/getkin/kin-openapi 依赖版本不能超过 v0.118.0。eino V0.6.0 之后的版本不再依赖 kin-openapi 库。

# Q: Agent 流式调用时不会进入 ToolsNode 节点。或流式效果丢失，表现为非流式。

- 先更新 eino 版本到最新

不同的模型在流式模式下输出工具调用的方式可能不同: 某些模型(如 OpenAI) 会直接输出工具调用；某些模型 (如 Claude) 会先输出文本，然后再输出工具调用。因此需要使用不同的方法来判断，这个字段用来指定判断模型流式输出中是否包含工具调用的函数。

ReAct Agent 的 Config 中有一个 StreamToolCallChecker 字段，如未填写，Agent 会使用“非空包”是否包含工具调用判断：

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

上述默认实现适用于：模型输出的 Tool Call Message 中只有 Tool Call。

默认实现不适用的情况：在输出 Tool Call 前，有非空的 content chunk。此时，需要自定义 tool Call checker 如下：

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
> 尝试添加 prompt 来约束模型在工具调用时不额外输出文本，例如：“如果需要调用 tool，直接输出 tool，不要输出文本”。
>
> 不同模型受 prompt 影响可能不同，实际使用时需要自行调整 prompt 并验证效果。

# Q: [github.com/bytedance/sonic/loader](http://github.com/bytedance/sonic/loader): invalid reference to runtime.lastmoduledatap

老版本 sonic 不兼容 go1.24，更新版本大于 v1.13.2 即可

# Q: Tool Input 反序列化失败：failed to invoke tool call {tool_call_id}: unmarshal input fail

目前模型一般不会产生非法 json 输出，可以先确认下反序列化失败原因是什么，大概率是模型输出超长截断导致。

# Q: Eino 如何实现批处理节点？ 类似 Coze 中的批处理节点

Eino 目前不支持批处理，可选方法有两种

1. 每次请求按需动态构建 graph，额外成本不高。 这种方法需要注意 Chain Parallel 要求其中并行节点数量大于一，
2. 自定义批处理节点，节点内自行批处理任务

代码示例：[https://github.com/cloudwego/eino-examples/tree/main/compose/batch](https://github.com/cloudwego/eino-examples/tree/main/compose/batch)

# Q: eino 支持把模型结构化输出吗

分两步，第一步要求模型输出结构化数据，有三个方法：

1. 部分模型支持直接配置（比如 openai 的 response format），可以看下模型配置里有没有。
2. 通过 tool call 功能获得
3. 写 prompt 要求模型

得到模型结构化输出后，可以用 schema.NewMessageJSONParser 把 message 转换成你需要的 struct

# Q: 如何获取模型(chat model)输出的 Reasoning Content/推理/深度思考 内容：

如果模型封装支持输出 Reasoning Content/推理/深度思考 内容，这些内容会储存到模型输出的 Message 的 ReasoningContent 字段。

# Q：报错中包含"context deadline exceeded" "timeout" "context canceled"

分情况讨论：

1. context.canceled: 在执行 graph 或者 agent 时，用户侧传入了一个可以 cancel 的 context，并发起了取消。排查应用层代码的 context cancel 操作。此报错与 eino 框架无关。
2. Context deadline exceeded: 可能是两种情况：
   1. 在执行 graph 或者 agent 时，用户侧传入了一个带 timeout 的 context，触发了超时。
   2. 给 ChatModel 或者其他外部资源配置了 timeout 或带 timeout 的 httpclient，触发了超时。

查看抛出的 error 中的 `node path: [node name x]`，如果 node name 不是 ChatModel 等带外部调用的节点，大概率是 2-a 这种情况，反之大概率是 2-b 这种情况。

如果怀疑是 2-a 这种情况，自行排查下上游链路那个环节给 context 设置了 timeout，常见的可能性如 faas 平台等。

如果怀疑是 2-b 这种情况，看下节点是否自行配置了超时，比如 Ark ChatModel 配置了 Timeout，或者 OpenAI ChatModel 配置了 HttpClient（内部配置了 Timeout）。如果都没有配置，但依然超时了，可能是模型侧 SDK 的默认超时。已知 Ark SDK 默认超时 10 分钟，Deepseek SDK 默认超时 5 分钟。

# Q：想要在子图中获取父图的 State 怎么做

如果子图和父图的 State 类型不同，则可以通过 `ProcessState[父图 state type]()` 来处理父图的 State。如果子图和父图的 State 类型相同，则想办法让 State 类型变成不同的，比如用类型别名：`type NewParentStateType StateType`。

# Q:  eino-ext 支持的 Model 模型的如何适配多模特的输入输出 ？

eino-ext 支持的多模态输入输出场景，可以查阅 [https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model](https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model) 对应模型的 Examples 示例;

# Q: 使用最新的多模态支持字段 UserInputMultiContent 输入多模态数据，但模型侧好像没有我传入的多模态数据或者多模态输入时，读不到 multicontent 的内容

最新版本的 Eino 引入 UserInputMultiContent 与  AssistantGenMultiContent 分别表达用户侧输入的多模态数据与模型侧返回的多模态数据，其中 eino-ext 中的 chatmodel 实现都已经做了适配，如果发现模型侧没有收到多模态信息，可以尝试升级下我们使用的模型的包。go get 到最新版本再次尝试运行看是否问题得到解决。

# Q: 升级到 0.6.x 版本后，有不兼容问题

根据先前社区公告规划 [Migration from OpenAPI 3.0 Schema Object to JSONSchema in Eino · cloudwego/eino · Discussion #397](https://github.com/cloudwego/eino/discussions/397)，已发布 eino V0.6.1 版本。重要更新内容为移除了 getkin/kin-openapi 依赖以及所有 OpenAPI 3.0 相关代码。

eino-ext 部分 module 报错 undefined: schema.NewParamsOneOfByOpenAPIV3 等问题，升级报错的 eino-ext module 到最新版本即可。

如果 schema 改造比较复杂，可以使用 [JSONSchema 转换方法](https://bytedance.larkoffice.com/wiki/ZMaawoQC4iIjNykzahwc6YOknXf)文档中的工具方法辅助转换。

# Q:  Eino-ext 提供的 ChatModel 有哪些模型是支持 Response API 形式调用嘛？

- Eino-Ext 中目前只有 ARK 的 Chat Model 可通过 **NewResponsesAPIChatModel **创建 ResponsesAPI ChatModel，其他模型目前不支持 ResponsesAPI 的创建与使用，
- Eino-byted-ext 中 只有 bytedgpt 支持创建 Response API 通过 **NewResponsesAPIChatModel 创建, **其他 chatmodel 没有实现 Response API Client
  - 版本 components/model/gemini/v0.1.16 已经支持 thought_signature 回传，检查 gemini 版本是否符合，如果使用的是 bytedgemini (code.byted.org/flow/eino-byted-ext/components/model/bytedgemini) 的 chatmodel 实现，请检查其依赖的 components/model/gemini 是否为最新版本，或者直接 go get 升级 gemini   - 将目前使用的 bytedgpt 的包换成使用  [code.byted.org/flow/eino-byted-ext/components/model/bytedgemini](http://code.byted.org/flow/eino-byted-ext/components/model/bytedgemini) 这个包的实现，并升级到最新版本，查看示例代码 确认 BaseURL 如何传递 。   - 遇到这个报错请确认咱们生成 chat model 是填写的 base url 是 chat completion 的 URL 还是 ResponseAPI 的 URL，绝大多数场景是错误传递了 Response API 的 Base URL

# Q: 如何排查 ChatModel 调用报错？比如[NodeRunError] failed to create chat completion: error, status code: 400, status: 400 Bad Request。

这类报错是模型 API（如 GPT、Ark、Gemini 等）的报错，通用的思路是检查实际调用模型 API 的 HTTP Request 是否有缺字段、字段值错误、BaseURL 错误等情况。建议将实际的 HTTP Request 通过日志打印出来，并通过 HTTP 直接请求的方式（如命令行发起 Curl 或使用 Postman 直接请求）来验证、修改该 HTTP Request。在定位问题后，再相应修改对应的 Eino 代码中的问题。

如何通过日志打印出模型 API 的实际 HTTP Request，参考这个代码样例：[https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport](https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport)

# Q: 使用 eino-ext 仓库下 创建的 gemini chat model 不支持使用 Image URL 传递多模态？如何适配？

目前 Eino-ext 仓库下的 gemini Chat model 已经做了传递 URL 类型的支持，使用 go get github.com/cloudwego/eino-ext/components/model/gemini 更新到 [components/model/gemini/v0.1.22](https://github.com/cloudwego/eino-ext/releases/tag/components%2Fmodel%2Fgemini%2Fv0.1.22) 目前最新版本，传递 Image URL 测试是否满足业务需求

# Q: 调用工具（包括 MCP tool）之前，报 JSON Unmarshal 失败的错误，如何解决

ChatModel 产生的 Tool Call 中，Argument 字段是 string。Eino 框架在根据这个 Argument string 调用工具时，会先做 JSON Unmarshal。这时，如果 Argument string 不是合法的 JSON，则 JSON Unmarshal 会失败，报出类似这样的错误：`failed to call mcp tool: failed to marshal request: json: error calling MarshalJSON for type json.RawMessage: unexpected end of JSON input`

解决这个问题的根本途径是依靠模型输出合法的 Tool Call Argument。在工程方面，我们可以尝试修复一些常见的 JSON 格式问题，如多余的前缀、后缀，特殊字符转义问题，缺失的大括号等，但无法保证 100% 的修正。一个类似的修复实现可以参考代码样例：[https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix](https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix)

# Q：如何可视化一个 graph/chain/workflow 的拓扑结构？

利用 `GraphCompileCallback` 机制在 `graph.Compile` 的过程中将拓扑结构导出。一个导出为 mermaid 图的代码样例：[https://github.com/cloudwego/eino-examples/tree/main/devops/visualize](https://github.com/cloudwego/eino-examples/tree/main/devops/visualize)

## Q: Eino 中使用 Flow/react Agent 场景下如何获取工具调用的 Tool Call Message 以及本次调用工具的 Tool Result 结果？

- Flow/React Agent 场景下获取中间结构参考文档 [Eino: ReAct Agent 使用手册](/zh/docs/eino/core_modules/flow_integration_components/react_agent_manual)   - 此外还可以将 Flow/React Agent 替换成 ADK 的 ChatModel Agent  具体可参考 [Eino ADK: 概述](/zh/docs/eino/core_modules/eino_adk/agent_preview)
