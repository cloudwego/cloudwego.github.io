---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: FAQ
weight: 11
---

# Q: cannot use openapi3.TypeObject (untyped string constant "object") as *openapi3.Types value in struct literal, cannot use types (variable of type string) as *openapi3.Types value in struct literal

Check that the github.com/getkin/kin-openapi dependency version does not exceed v0.118.0. Versions after Eino V0.6.0 no longer depend on the kin-openapi library.

# Q: Agent streaming calls do not enter the ToolsNode node. Or streaming effect is lost, behaving as non-streaming.

- First update Eino to the latest version

Different models may output tool calls differently in streaming mode: some models (like OpenAI) output tool calls directly; some models (like Claude) output text first, then output tool calls. Therefore, different methods need to be used for judgment. This field is used to specify the function that determines whether the model's streaming output contains tool calls.

The Config of ReAct Agent has a StreamToolCallChecker field. If not filled, the Agent will use "non-empty packet" to determine whether it contains tool calls:

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

The above default implementation is suitable for: Tool Call Messages output by the model only contain Tool Calls.

Cases where the default implementation is not applicable: there are non-empty content chunks before outputting Tool Calls. In this case, a custom tool call checker is needed:

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

The above custom StreamToolCallChecker needs to check **all packets** for ToolCall when the model normally outputs an answer, which causes the "streaming judgment" effect to be lost. To preserve the "streaming judgment" effect as much as possible, the suggestion is:

> 💡
> Try adding prompts to constrain the model not to output extra text when calling tools, for example: "If you need to call a tool, output the tool directly without outputting text."
>
> Different models may be affected differently by prompts. In actual use, you need to adjust the prompts yourself and verify the effect.

# Q: [github.com/bytedance/sonic/loader](http://github.com/bytedance/sonic/loader): invalid reference to runtime.lastmoduledatap

Old versions of sonic are incompatible with go1.24. Update to version greater than v1.13.2.

# Q: Tool Input deserialization failed: failed to invoke tool call {tool_call_id}: unmarshal input fail

Currently, models generally do not produce illegal JSON output. First confirm what the deserialization failure reason is. It's most likely caused by model output being truncated due to excessive length.

# Q: How does Eino implement batch processing nodes? Similar to batch processing nodes in Coze

Eino currently does not support batch processing. There are two optional methods:

1. Dynamically build the graph on demand for each request, with low additional cost. Note that Chain Parallel requires more than one parallel node.
2. Custom batch processing node, where the node handles batch processing tasks internally

Code example: [https://github.com/cloudwego/eino-examples/tree/main/compose/batch](https://github.com/cloudwego/eino-examples/tree/main/compose/batch)

# Q: Does Eino support structured model output?

Two steps. First, require the model to output structured data, with three methods:

1. Some models support direct configuration (like OpenAI's response format). Check if there's such configuration in the model settings.
2. Obtain through tool call functionality
3. Write prompts requiring the model to output structured data

After getting structured output from the model, you can use schema.NewMessageJSONParser to convert the message to the struct you need.

# Q: How to get the Reasoning Content/reasoning/deep thinking content output by the model (chat model):

If the model wrapper supports outputting Reasoning Content/reasoning/deep thinking content, this content will be stored in the ReasoningContent field of the Message output by the model.

# Q: Error contains "context deadline exceeded" "timeout" "context canceled"

Discussion by case:

1. context.canceled: When executing a graph or agent, the user passed in a cancelable context and initiated a cancellation. Check the context cancel operation in the application layer code. This error is unrelated to the Eino framework.
2. Context deadline exceeded: Could be two situations:
   1. When executing a graph or agent, the user passed in a context with timeout, triggering a timeout.
   2. Timeout or httpclient with timeout was configured for ChatModel or other external resources, triggering a timeout.

Check `node path: [node name x]` in the thrown error. If the node name is not a node with external calls like ChatModel, it's most likely situation 2-a; otherwise, it's most likely situation 2-b.

If you suspect it's situation 2-a, check which link in the upstream chain set the timeout on context. Common possibilities include FaaS platforms, etc.

If you suspect it's situation 2-b, check whether the node has its own timeout configuration, such as Ark ChatModel configured with Timeout, or OpenAI ChatModel configured with HttpClient (with internal Timeout configuration). If neither is configured but still timing out, it may be the model SDK's default timeout. Known default timeouts: Ark SDK 10 minutes, Deepseek SDK 5 minutes.

# Q: How to get the parent graph's State in a subgraph

If the subgraph and parent graph have different State types, you can use `ProcessState[parent graph state type]()` to process the parent graph's State. If the subgraph and parent graph have the same State type, make the State types different, for example, using a type alias: `type NewParentStateType StateType`.

# Q: How to adapt multimodal input/output for Models supported by eino-ext?

For multimodal input/output scenarios supported by eino-ext, refer to the Examples in [https://www.cloudwego.io/docs/eino/ecosystem_integration/chat_model](https://www.cloudwego.io/docs/eino/ecosystem_integration/chat_model) for the corresponding model.

# Q: Using the latest multimodal support field UserInputMultiContent to input multimodal data, but the model side doesn't seem to have my multimodal data, or can't read multicontent content during multimodal input

The latest version of Eino introduces UserInputMultiContent and AssistantGenMultiContent to represent user-side input multimodal data and model-side returned multimodal data respectively. The chatmodel implementations in eino-ext have all been adapted. If you find that the model side has not received multimodal information, try upgrading the model package you're using. Use go get to update to the latest version and try running again to see if the problem is resolved.

# Q: After upgrading to version 0.6.x, there are incompatibility issues

According to the previous community announcement plan [Migration from OpenAPI 3.0 Schema Object to JSONSchema in Eino · cloudwego/eino · Discussion #397](https://github.com/cloudwego/eino/discussions/397), Eino V0.6.1 has been released. Important update content includes removing the getkin/kin-openapi dependency and all OpenAPI 3.0 related code.

For errors like undefined: schema.NewParamsOneOfByOpenAPIV3 in some eino-ext modules, upgrade the error-reporting eino-ext module to the latest version.

If schema transformation is complex, you can use existing OpenAPI 3.0 → JSONSchema conversion tools to assist with conversion.

# Q: Which models provided by Eino-ext ChatModel support Response API format calls?

- Currently in Eino-Ext, only ARK's Chat Model can create ResponsesAPI ChatModel through **NewResponsesAPIChatModel**. Other models currently do not support ResponsesAPI creation and usage.
  - If you encounter this error, confirm whether the base URL you used to create the chat model is the Chat Completions URL or the Responses API URL. In most cases, an incorrect Responses API base URL was passed.

# Q: How to troubleshoot ChatModel call errors? For example, [NodeRunError] failed to create chat completion: error, status code: 400, status: 400 Bad Request.

This type of error is an error from the model API (such as GPT, Ark, Gemini, etc.). The general approach is to check whether the actual HTTP Request calling the model API has missing fields, incorrect field values, wrong BaseURL, etc. It's recommended to print out the actual HTTP Request through logs and verify/modify the HTTP Request through direct HTTP request methods (such as sending Curl from command line or using Postman for direct requests). After locating the problem, modify the corresponding issues in the Eino code accordingly.

For how to print out the actual HTTP Request of the model API through logs, refer to this code example: [https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport](https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport)

# Q: The gemini chat model created under the eino-ext repository doesn't support using Image URL to pass multimodal data? How to adapt?

Currently, the gemini Chat model under the Eino-ext repository has already added support for passing URL types. Use go get github.com/cloudwego/eino-ext/components/model/gemini to update to [components/model/gemini/v0.1.22](https://github.com/cloudwego/eino-ext/releases/tag/components%2Fmodel%2Fgemini%2Fv0.1.22), the current latest version. Test passing Image URL to see if it meets business requirements.

# Q: Before calling tools (including MCP tool), getting JSON Unmarshal failure error, how to solve

The Argument field in Tool Call generated by ChatModel is a string. When the Eino framework calls tools based on this Argument string, it first does JSON Unmarshal. At this point, if the Argument string is not valid JSON, JSON Unmarshal will fail, throwing an error like: `failed to call mcp tool: failed to marshal request: json: error calling MarshalJSON for type json.RawMessage: unexpected end of JSON input`

The fundamental solution to this problem is to rely on the model to output valid Tool Call Arguments. Engineering-wise, we can try to fix some common JSON format issues, such as extra prefixes/suffixes, special character escaping issues, missing braces, etc., but cannot guarantee 100% correction. A similar fix implementation can be referenced in this code example: [https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix](https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix)

# Q: How to visualize the topology structure of a graph/chain/workflow?

Use the `GraphCompileCallback` mechanism to export the topology structure during `graph.Compile`. A code example for exporting as a mermaid diagram: [https://github.com/cloudwego/eino-examples/tree/main/devops/visualize](https://github.com/cloudwego/eino-examples/tree/main/devops/visualize)

- For obtaining intermediate structures in Flow/React Agent scenarios, refer to the document [Eino: ReAct Agent Manual](/docs/eino/core_modules/flow_integration_components/react_agent_manual)

# Q: Gemini model error missing a `thought_signature`
