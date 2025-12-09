---
Description: ""
date: "2025-12-01"
lastmod: ""
tags: []
title: FAQ
weight: 6
---

# Q: cannot use openapi3.TypeObject (untyped string constant "object") as *openapi3.Types value in struct literal; cannot use types (variable of type string) as *openapi3.Types value in struct literal

Ensure the `github.com/getkin/kin-openapi` dependency version does not exceed `v0.118.0`.

# Q: During agent streaming, it never reaches ToolsNode, or streaming is lost and appears non-streaming.

- First, update Eino to the latest version.

Different models output tool calls differently in streaming mode. Some models (e.g., OpenAI) emit tool calls directly; others (e.g., Claude) might emit text first and then the tool call. You therefore need different logic to determine whether a tool call is present in a streamed message.

The ReAct Agent `Config` has a `StreamToolCallChecker`. If omitted, the agent uses a default checker that determines a tool call by inspecting whether any non-empty early chunk contains tool calls:

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

This default works when the Tool Call message contains only a tool call.

It does not fit cases where a non-empty content chunk appears before the tool call. In such cases, provide a custom checker like this:

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

Note: this custom `StreamToolCallChecker` checks all chunks for tool calls. When the model is outputting a normal answer, this may reduce “early streaming detection”, because it waits until all chunks are inspected. To preserve streaming responsiveness, try guiding the model with prompts:

> 💡
> Add prompt constraints such as: “If a tool is required, output only the tool call; do not output text.”
>
> Models vary in how much they adhere to such prompts. Tune and validate for your chosen model.

# Q: [github.com/bytedance/sonic/loader](http://github.com/bytedance/sonic/loader): invalid reference to runtime.lastmoduledatap

Older versions of `sonic` are incompatible with `go1.24`. Upgrade to `v1.13.2` or higher.

# Q: Tool input deserialization failed: `failed to invoke tool call {tool_call_id}: unmarshal input fail`

Models typically do not produce invalid JSON. Investigate the specific reason for deserialization failure; in most cases this is due to output truncation when the model’s response exceeds limits.

# Q: How can I implement batch processing nodes in Eino (like Coze’s batch nodes)?

Eino currently does not support batch processing. Two options:

1. Dynamically build the graph per request — the overhead is low. Note that `Chain Parallel` requires the number of parallel nodes to be greater than one.
2. Implement a custom batch node and handle batching inside the node.

# Q: Panic occurs in Fornax SDK or panic stack mentions Fornax SDK

Upgrade both the Fornax SDK and Eino to the latest versions and retry.

# Q: Does Eino support structured model outputs?

Yes, in two steps:

1. Ensure the model outputs structured data. Options:
   - Some models support configuration for structured output (e.g., OpenAI response format).
   - Use tool calls to obtain structured results.
   - Prompt the model explicitly to output structured data.
2. After obtaining a structured message, use `schema.NewMessageJSONParser` to parse the message into your target struct.

# Q: In image recognition scenarios, error: `One or more parameters specified in the request are not valid`

Check whether the model supports image input (for Doubao models, only variants with `vision` support it).

# Q: How to access Reasoning Content / “thinking” output from a chat model?

If a model implementation supports Reasoning Content (deep thinking), it is stored in the `Extra` field of the output `Message`. The provider package usually offers helpers like `GetReasoningContent`/`GetThinking` to extract it.

# Q: Errors include `context deadline exceeded`, `timeout`, or `context canceled`

This indicates a timeout or that the `ctx` was canceled by a service/framework or manually. Adjust timeouts or investigate your code. If model/component latency seems abnormally high, contact the provider directly. Eino only passes through.

# Q: How to access parent graph `State` within a subgraph?

If both parent and subgraph have `state`, the subgraph’s state overrides the parent’s. Define a custom context key. Before invoking the subgraph, call `compose.ProcessState()` to retrieve the parent state and pass it via your custom context key.

# Q: How does `eino-ext` adapt multimodal input/output for supported models?

For multimodal support, see [https://www.cloudwego.io/en/docs/eino/ecosystem_integration/chat_model](https://www.cloudwego.io/en/docs/eino/ecosystem_integration/chat_model) and the corresponding examples for each model.

# Q: Using `UserInputMultiContent` for multimodal input, but the model side seems to miss the data or cannot read `multicontent`

Recent versions of Eino introduce `UserInputMultiContent` and `AssistantGenMultiContent` for multimodal user input and model output respectively. All `eino-ext` chat model implementations have been adapted. If the model does not receive the multimodal payload, upgrade the provider package to the latest version and try again.

# Q: After upgrading to `0.6.x`, there are breaking changes

Per the migration plan [Migration from OpenAPI 3.0 Schema Object to JSONSchema in Eino · Discussion #397](https://github.com/cloudwego/eino/discussions/397), Eino `v0.6.1` removed the dependency on `getkin/kin-openapi` and all OpenAPI 3.0-related code.

If `eino-ext` modules error with `undefined: schema.NewParamsOneOfByOpenAPIV3`, upgrade those modules to the latest versions.

If schema migration is complex, use the helper tooling in the [JSONSchema conversion guide](https://bytedance.larkoffice.com/wiki/ZMaawoQC4iIjNykzahwc6YOknXf).

# Q: `context canceled` / `context deadline exceeded`

The `ctx` passed to Eino was canceled or timed out; this is unrelated to the framework itself.

