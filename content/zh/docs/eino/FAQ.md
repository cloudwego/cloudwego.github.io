---
Description: ""
date: "2025-12-01"
lastmod: ""
tags: []
title: FAQ
weight: 0
---

# Q: cannot use openapi3.TypeObject (untyped string constant "object") as *openapi3.Types value in struct literal，cannot use types (variable of type string) as *openapi3.Types value in struct literal

检查 github.com/getkin/kin-openapi 依赖版本不能超过 v0.118.0

# Q: Agent 流式调用时不会进入 ToolsNode 节点。或流式效果丢失，表现为非流式。

- 先更新 eino 版本到最新

不同的模型在流式模式下输出工具调用的方式可能不同: 某些模型(如 OpenAI) 会直接输出工具调用；某些模型 (如 Claude) 会先输出文本，然后再输出工具调用。因此需要使用不同的方法来判断，这个字段用来指定判断模型流式输出中是否包含工具调用的函数。

ReAct Agent 的 Config 中有一个 StreamToolCallChecker 字段，如未填写，Agent 会使用“非空包”是否包含工具调用判断：

```go
**func **firstChunkStreamToolCallChecker(_ context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {
    **defer **sr.Close()

    **for **{
       msg, err := sr.Recv()
       **if **err == io.EOF {
          **return **false, nil
       }
       **if **err != nil {
          **return **false, err
       }

       **if **len(msg.ToolCalls) > 0 {
          **return **true, nil
       }

       **if **len(msg.Content) == 0 { // skip empty chunks at the front
          **continue**
**       **}

       **return **false, nil
    }
}
```

上述默认实现适用于：模型输出的 Tool Call Message 中只有 Tool Call。

默认实现不适用的情况：在输出 Tool Call 前，有非空的 content chunk。此时，需要自定义 tool Call checker 如下：

```
_toolCallChecker := func(ctx context.Context, sr *schema.StreamReader[*schema.Message]) (bool, error) {_
_    defer sr.Close()_
_    for {_
_       msg, err := sr.Recv()_
_       if err != nil {_
_          if errors.Is(err, io.EOF) {_
_             // finish_
_             break_
_          }_

_          return false, err_
_       }_

_       if len(msg.ToolCalls) > 0 {_
_          return true, nil_
_       }_
_    }_
_    return false, nil_
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

# Q: fornax sdk 中发生 panic / panic 栈中存在 fornax sdk

先把 Fornax sdk 和 eino 版本升级到最新试下

# Q: eino 支持把模型结构化输出吗

分两步，第一步要求模型输出结构化数据，有三个方法：

1. 部分模型支持直接配置（比如 openai 的 response format），可以看下模型配置里有没有。
2. 通过 tool call 功能获得
3. 写 prompt 要求模型

得到模型结构化输出后，可以用 schema.NewMessageJSONParser 把 message 转换成你需要的 struct

# Q：图片识别场景中报错：One or more parameters specified in the request are not valid

检查模型是否支持图片输入（doubao 系列只有带 vision 的模型才支持）

# Q: 如何获取模型(chat model)输出的 Reasoning Content/推理/深度思考 内容：

如果模型封装支持输出 Reasoning Content/推理/深度思考 内容，这些内容会储存到模型输出的 Message 的 Extra 字段，在封装目录下会提供类似 GetReasoningContent/GetThinking 函数，用这些方法可以从 message 中获取到。

# Q：报错中包含"context deadline exceeded" "timeout" "context canceled"

超时或者 ctx 被框架服务框架或人为取消，调整超时或者排查代码即可。  如果觉得模型等组件返回时间过长不符合预期，可以直接去找服务提供方，eino 只做透传，不需要提 eino oncall

# Q：想要在子图中获取父图的 State 怎么做

如果父图和子图存在 state ，子图的 state 会覆盖父图的 state 。因此，需要自定义 context key ，在调用子图前，调用 compose.ProcessState() 方法先获取父图的 state ，将父图 state 传入到自定义的 context key 中。

# Q:  eino-ext 支持的 Model 模型的如何适配多模特的输入输出 ？

eino-ext 支持的多模态输入输出场景，可以查阅 [https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model](https://www.cloudwego.io/zh/docs/eino/ecosystem_integration/chat_model) 对应模型的 Examples 示例;

# Q: 使用最新的多模态支持字段 UserInputMultiContent 输入多模态数据，但模型侧好像没有我传入的多模态数据或者多模态输入时，读不到 multicontent 的内容

最新版本的 Eino 引入 UserInputMultiContent 与  AssistantGenMultiContent 分别表达用户侧输入的多模态数据与模型侧返回的多模态数据，其中 eino-ext 中的 chatmodel 实现都已经做了适配，如果发现模型侧没有收到多模态信息，可以尝试升级下我们使用的模型的包。go get 到最新版本再次尝试运行看是否问题得到解决。

# Q: 升级到 0.6.x 版本后，有不兼容问题

根据先前社区公告规划 [Migration from OpenAPI 3.0 Schema Object to JSONSchema in Eino · cloudwego/eino · Discussion #397](https://github.com/cloudwego/eino/discussions/397)，已发布 eino V0.6.1 版本。重要更新内容为移除了 getkin/kin-openapi 依赖以及所有 OpenAPI 3.0 相关代码。

eino-ext 部分 module 报错 undefined: schema.NewParamsOneOfByOpenAPIV3 等问题，升级报错的 eino-ext module 到最新版本即可。

如果 schema 改造比较复杂，可以使用 [JSONSchema 转换方法](https://bytedance.larkoffice.com/wiki/ZMaawoQC4iIjNykzahwc6YOknXf)文档中的工具方法辅助转换。

# Q: context canceled / context deadline exceeded

调用 eino 时传入的 ctx 被取消/超时了，与框架无关。
