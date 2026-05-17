---
Description: ""
date: "2026-05-17"
lastmod: ""
tags: []
title: FAQ
weight: 11
---

# Q: cannot use openapi3.TypeObject (untyped string constant "object") as *openapi3.Types value in struct literal, cannot use types (variable of type string) as *openapi3.Types value in struct literal

Check that the github.com/getkin/kin-openapi dependency version does not exceed v0.118.0. Versions after Eino V0.6.0 no longer depend on the kin-openapi library.

# Q: Agent streaming calls do not enter the ToolsNode node. Or streaming effect is lost, behaving as non-streaming.

- First update Eino to the latest version. Different models may output tool calls differently in streaming mode: some models (like OpenAI) output tool calls directly; some models (like Claude) output text first, then output tool calls. Therefore, different methods need to be used for judgment. This field is used to specify the function that determines whether the model's streaming output contains tool calls. The Config of ReAct Agent has a StreamToolCallChecker field. If not filled, the Agent will use "non-empty packet" to determine whether it contains tool calls:

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

The above default implementation is suitable for: Tool Call Messages output by the model only contain Tool Calls. Cases where the default implementation is not applicable: there are non-empty content chunks before outputting Tool Calls. In this case, a custom tool call checker is needed:

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
> Try adding prompts to constrain the model not to output extra text when calling tools, for example: "If you need to call a tool, output the tool directly without outputting text." Different models may be affected differently by prompts. In actual use, you need to adjust the prompts yourself and verify the effect.

# Q: [github.com/bytedance/sonic/loader](http://github.com/bytedance/sonic/loader): invalid reference to runtime.lastmoduledatap

Old versions of sonic are incompatible with go1.24. Update to version greater than v1.13.2.

# Q: Tool Input deserialization failed: failed to invoke tool call {tool_call_id}: unmarshal input fail

Currently, models generally do not produce illegal JSON output. First confirm what the deserialization failure reason is. It's most likely caused by model output being truncated due to excessive length.

# Q: How does Eino implement batch processing nodes? Similar to batch processing nodes in Coze

Eino currently does not support batch processing. There are two optional methods:

1. Dynamically build the graph on demand for each request, with low additional cost. Note that Chain Parallel requires more than one parallel node.
2. Custom batch processing node, where the node handles batch processing tasks internally. Code example: [https://github.com/cloudwego/eino-examples/tree/main/compose/batch](https://github.com/cloudwego/eino-examples/tree/main/compose/batch)

# Q: Does Eino support structured model output?

Two steps. First, require the model to output structured data, with three methods:

1. Some models support direct configuration (like OpenAI's response format). Check if there's such configuration in the model settings.
2. Obtain through tool call functionality.
3. Write prompts requiring the model to output structured data. After getting structured output from the model, you can use schema.NewMessageJSONParser to convert the message to the struct you need.

# Q: How to get the Reasoning Content/reasoning/deep thinking content output by the model (chat model):

If the model wrapper supports outputting Reasoning Content/reasoning/deep thinking content, this content will be stored in the ReasoningContent field of the Message output by the model.

# Q: Error contains "context deadline exceeded" "timeout" "context canceled"

Discussion by case:

1. context.canceled: When executing a graph or agent, the user passed in a cancelable context and initiated a cancellation. Check the context cancel operation in the application layer code. This error is unrelated to the Eino framework.
2. Context deadline exceeded: Could be two situations:
3. When executing a graph or agent, the user passed in a context with timeout, triggering a timeout.
4. Timeout or httpclient with timeout was configured for ChatModel or other external resources, triggering a timeout. Check `node path: [node name x]` in the thrown error. If the node name is not a node with external calls like ChatModel, it's most likely situation 2-a; otherwise, it's most likely situation 2-b. If you suspect it's situation 2-a, check which link in the upstream chain set the timeout on context. Common possibilities include FaaS platforms, etc. If you suspect it's situation 2-b, check whether the node has its own timeout configuration, such as Ark ChatModel configured with Timeout, or OpenAI ChatModel configured with HttpClient (with internal Timeout configuration). If neither is configured but still timing out, it may be the model SDK's default timeout. Known default timeouts: Ark SDK 10 minutes, Deepseek SDK 5 minutes.

# Q: How to get the parent graph's State in a subgraph

If the subgraph and parent graph have different State types, you can use `ProcessState[parent graph state type]()` to process the parent graph's State. If the subgraph and parent graph have the same State type, make the State types different, for example, using a type alias: `type NewParentStateType StateType`.

# Q: How to adapt multimodal input/output for Models supported by eino-ext?

For multimodal input/output scenarios supported by eino-ext, refer to the Examples in [https://www.cloudwego.io/docs/eino/ecosystem_integration/chat_model](https://www.cloudwego.io/docs/eino/ecosystem_integration/chat_model) for the corresponding model.

# Q: Using the latest multimodal support field UserInputMultiContent to input multimodal data, but the model side doesn't seem to have my multimodal data, or can't read multicontent content during multimodal input

The latest version of Eino introduces UserInputMultiContent and AssistantGenMultiContent to represent user-side input multimodal data and model-side returned multimodal data respectively. The chatmodel implementations in eino-ext have all been adapted. If you find that the model side has not received multimodal information, try upgrading the model package you're using. Use go get to update to the latest version and try running again to see if the problem is resolved.

# Q: After upgrading to version 0.6.x, there are incompatibility issues

According to the previous community announcement plan [Migration from OpenAPI 3.0 Schema Object to JSONSchema in Eino · cloudwego/eino · Discussion #397](https://github.com/cloudwego/eino/discussions/397), Eino V0.6.1 has been released. Important update content includes removing the getkin/kin-openapi dependency and all OpenAPI 3.0 related code. For errors like undefined: schema.NewParamsOneOfByOpenAPIV3 in some eino-ext modules, upgrade the error-reporting eino-ext module to the latest version. If schema transformation is complex, you can use the [JSONSchema conversion methods](https://bytedance.larkoffice.com/wiki/ZMaawoQC4iIjNykzahwc6YOknXf) document's tool methods to assist with conversion.

# Q: After creating a model, attempting to call it results in error: 400 Bad Request, message: code: missing_required_parameter; message: Missing required parameter: 'input'.

- If you encounter this error, confirm whether the base URL you used to create the chat model is the Chat Completions URL or the Responses API URL. In most cases, an incorrect Responses API base URL was passed.

# Q: How to troubleshoot ChatModel call errors? For example, [NodeRunError] failed to create chat completion: error, status code: 400, status: 400 Bad Request.

This type of error is an error from the model API (such as GPT, Ark, Gemini, etc.). The general approach is to check whether the actual HTTP Request calling the model API has missing fields, incorrect field values, wrong BaseURL, etc. It's recommended to print out the actual HTTP Request through logs and verify/modify the HTTP Request through direct HTTP request methods (such as sending Curl from command line or using Postman for direct requests). After locating the problem, modify the corresponding issues in the Eino code accordingly. For how to print out the actual HTTP Request of the model API through logs, refer to this code example: [https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport](https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport)

# Q: The gemini chat model created under the eino-ext repository doesn't support using Image URL to pass multimodal data? How to adapt?

Currently, the gemini Chat model under the Eino-ext repository has already added support for passing URL types. Use go get github.com/cloudwego/eino-ext/components/model/gemini to update to [components/model/gemini/v0.1.22](https://github.com/cloudwego/eino-ext/releases/tag/components%2Fmodel%2Fgemini%2Fv0.1.22), the current latest version. Test passing Image URL to see if it meets business requirements.

# Q: Tool Calls generated by the model have issues (invalid JSON arguments, calling non-existent tools, parameter name changes, etc.), how to handle?

Tool Calls generated by the model (LLM) may have various issues. Eino provides multi-layer defense mechanisms to address them. The following is organized by issue type:

## 1. Tool Call arguments are not valid JSON (Unmarshal failure)

**Typical error:** `failed to call mcp tool: failed to marshal request: json: error calling MarshalJSON for type json.RawMessage: unexpected end of JSON input` **Root cause:** In Tool Calls generated by ChatModel, the Argument field is a string. Eino performs JSON Unmarshal before calling the tool. If the JSON output by the model is invalid (extra prefix/suffix, special character escaping, missing braces, truncation due to excessive length, etc.), an error will be thrown. **Solution A: ToolArgumentsHandler (recommended)** Configure `ToolArgumentsHandler` in `ToolsNodeConfig` (or ADK's `ToolsConfig`) to preprocess and fix arguments before tool execution:

```go
agent, _ := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
    ToolsConfig: adk.ToolsConfig{
        ToolsNodeConfig: compose.ToolsNodeConfig{
            Tools: tools,
            ToolArgumentsHandler: func(ctx context.Context, name, arguments string) (string, error) {
                // Fix common JSON format issues here, such as missing braces, extra prefixes, etc.
                return fixJSON(arguments), nil
            },
        },
    },
})
```

A reference implementation for JSON fixing: [eino-examples/components/tool/middlewares/jsonfix](https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix) **Execution order:** `ArgumentsAliases alias replacement → ToolArgumentsHandler → Tool execution`

## 2. Model calls a non-existent tool (Tool Name hallucination)

**Typical error:** `tool xxx not found in toolsNode indexes` **Root cause:** The model may "hallucinate" non-existent tool names. **Solution: UnknownToolsHandler** When configured, instead of throwing an error directly when the model calls a non-existent tool, the Handler returns a prompt text to let the model self-correct:

```go
compose.ToolsNodeConfig{
    Tools: tools,
    UnknownToolsHandler: func(ctx context.Context, name, input string) (string, error) {
        return fmt.Sprintf("Tool '%s' does not exist. Available tools: %s. Please retry.", name, availableToolNames), nil
    },
}
```

## 3. Tool name or parameter name changes (compatibility issues caused by schema migration)

**Scenario:** Tool renamed (e.g., `search` → `web_search`), or parameter field renamed (e.g., `q` → `query`), but the model may still use old names. This is especially common when using LLM Cache or when conversation history records old tool schemas. **Solution: ToolAliases** Configure name aliases and parameter aliases for tools, and the framework automatically resolves them during dispatch:

```go
compose.ToolsNodeConfig{
    Tools: tools,
    ToolAliases: map[string]compose.ToolAliasConfig{
        "web_search": {
            NameAliases: []string{"search", "web-search"},       // old tool name → current tool name
            ArgumentsAliases: map[string][]string{
                "query": {"q", "search_term"},                    // old parameter name → current parameter name
            },
        },
    },
}
```

> 💡
> The parameter alias replacement in ToolAliases occurs before ToolArgumentsHandler. The complete execution order is: Name Alias resolution → Arguments Alias replacement → ToolArgumentsHandler → Tool execution.

## 4. Let the model self-correct after tool execution failure (instead of interrupting the flow)

**Scenario:** When Tool execution fails (e.g., file not found, insufficient permissions, API call failure), the default behavior interrupts the Agent flow. But usually a better approach is to return the error information as a normal Tool Result to the model, letting the model automatically correct and retry. **Solution A: ADK Middleware (WrapInvokableToolCall)** In ADK Agent, use `ChatModelAgentMiddleware`'s `WrapInvokableToolCall` method to convert errors to string results:

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
                return "", err // Don't convert interrupt errors
            }
            return fmt.Sprintf("[tool error] %v", err), nil
        }
        return result, nil
    }, nil
}
```

Reference: [quickstart/chatwitheino Ch05 Middleware](https://github.com/cloudwego/eino-examples/blob/main/quickstart/chatwitheino/cmd/ch05/main.go) **Solution B: compose layer ToolCallMiddlewares** Use `ToolCallMiddlewares` directly at the compose layer, suitable for scenarios using Graph/ToolsNode directly:

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

Reference: [eino-examples/components/tool/middlewares/errorremover](https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/errorremover)

> 💡
> Note: When converting errors, you must first check `compose.IsInterruptRerunError`. InterruptRerun errors are control flow signals used by the framework for Human-in-the-loop and similar scenarios, and should not be swallowed.

## Summary

<table>
<tr><td>Issue</td><td>Mechanism</td><td>Configuration Location</td></tr>
<tr><td>Invalid JSON arguments</td><td><pre>ToolArgumentsHandler</pre></td><td><pre>ToolsNodeConfig</pre> / <pre>ToolsConfig</pre></td></tr>
<tr><td>Calling non-existent tools</td><td><pre>UnknownToolsHandler</pre></td><td><pre>ToolsNodeConfig</pre> / <pre>ToolsConfig</pre></td></tr>
<tr><td>Tool name/parameter name changes</td><td><pre>ToolAliases</pre></td><td><pre>ToolsNodeConfig</pre> / <pre>ToolsConfig</pre></td></tr>
<tr><td>Tool execution errors need auto-correction</td><td>Middleware error conversion</td><td>ADK <pre>Handlers</pre> or <pre>ToolCallMiddlewares</pre></td></tr>
</table>

# Q: How to visualize the topology structure of a graph/chain/workflow?

Use the `GraphCompileCallback` mechanism to export the topology structure during `graph.Compile`. A code example for exporting as a mermaid diagram: [https://github.com/cloudwego/eino-examples/tree/main/devops/visualize](https://github.com/cloudwego/eino-examples/tree/main/devops/visualize)

# Q: How to get Tool Call Message and Tool Result in Eino when using Flow/React Agent?

- For obtaining intermediate structures in Flow/React Agent scenarios, refer to the document [Eino: ReAct Agent Manual](/docs/eino/core_modules/flow_integration_components/react_agent_manual)
- Additionally, you can replace Flow/React Agent with ADK's ChatModel Agent. For details, refer to [Eino ADK: Overview](/docs/eino/core_modules/eino_adk/agent_preview)

# Q: When developing an Agent with Eino, I defined a tool (Tool) that doesn't require any parameters. Why do I get JSON Schema validation errors (such as `unknown msg type` or unsupported format) when calling certain large models? How to properly solve this?

**A: Root cause:** In the Function Calling / tool call ecosystem, many large model vendors have strict validation logic for the JSON Schema they receive. If when defining a parameterless tool, the developer incorrectly passes an empty parameter map or empty struct (e.g., causing the framework to generate `{"type": "object", "properties": {}}` which is syntactically valid but semantically meaningless Schema), some model validation engines will reject the request as an unexpected abnormal format. **Framework mechanism and code behavior:**

- In Eino framework's core definition (`eino/schema/tool.go`), the `schema.ToolInfo` struct specifically uses the `ParamsOneOf` field to describe parameters.
- The framework design explicitly allows: for tools that don't require parameters, `ParamsOneOf` should be `nil`.
- When `ParamsOneOf` is `nil`, Eino's underlying components will simply omit the tool's `parameters` field when building requests to various model Providers, fundamentally avoiding triggering the model's strict validation rules. **Best practice:** When constructing parameterless tools in Eino, **do not use empty structs or empty Maps to initialize parameter descriptions**. Instead, let `ParamsOneOf` remain at its default `nil` state.

```go
tool := &schema.ToolInfo{
    Name: "fetch_current_time",
    Desc: "Get the current system time, no parameters needed",
    // Best practice: explicitly set to nil, or simply don't declare this field
    ParamsOneOf: nil, 
}
```

**(Note: If using **utils.InferTool** or similar reflection-based inference tools with an empty struct as input, ensure that the Eino extension version you're using correctly handles empty property filtering, or consider manually overriding its parameter definition as needed.)**

# Q: How to get Session Values outside the Agent (e.g., deep agent's TODOs)?

In ADK, `adk.GetSessionValues(ctx)` and `adk.AddSessionValue(ctx, key, value)` depend on the `runSession` injected into the context during Agent runtime. This means they **can only be used within the Agent's execution context** — for example, in Middleware, Handler, or Tool callback functions. When a user obtains an `AsyncIterator` through the Runner's `Run` method and consumes `AgentEvent` externally, they are no longer within the Agent's execution context, so they cannot get Session Values through `adk.GetSessionValues`. If you need to get Session Values in real-time during Agent execution (e.g., while consuming streaming events), consider using Middleware/Callback Handler callbacks to pass the needed data through other channels (such as channels).

# Q: How to distinguish AgentEvents from multiple concurrent SubAgents with the same name?

**Scenario:** When using DeepAgent, multiple SubAgents with the same name (e.g., `general-purpose`) may execute concurrently. When consuming `AsyncIterator[*AgentEvent]` through the Runner, events from different instances are hard to distinguish. **Solution: Wrap Agent, inject identifier through CustomizedOutput** `AgentOutput` provides a `CustomizedOutput any` field that can carry custom data. By wrapping the Agent's `Run` method, inject a unique identifier on each emitted event:

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
            // Note: event.Output may be nil (e.g., error events, action-only events)
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

**Usage:**

```go
agent1 := &wrappedAgent{Agent: generalAgent, identifier: 1}
agent2 := &wrappedAgent{Agent: generalAgent, identifier: 2}
// Pass agent1, agent2 as SubAgents to DeepAgent
```

**Consumer-side distinction:**

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
> Notes:
>
> 1. event.Output may be nil. You must do a nil check before setting CustomizedOutput.
> 2. This wrapper only covers the Run method. If the Agent implements the ResumableAgent interface (like Agents created by DeepAgent), the Resume method is called directly through the embedded Agent, and its events will not have the identifier injected. For complete coverage, you need to also wrap the Resume method.
> 3. This solution is a workaround, suitable for quickly solving the distinction problem. CustomizedOutput will not be persisted to Checkpoint.

# Q: How to load the corresponding ToolInfo only when a Skill is triggered? / How to use Skill to force the model to call a specific tool?

The root of both questions lies in confusion between the Skill and Tool concepts. **The essence of Skill is Prompt.** When the Skill middleware is triggered, it inserts a new UserMessage into the conversation whose content is the Skill's Prompt text. You can write in the Skill Prompt "please call tool xxx with parameter yyy", but this is still just a prompt — whether the model follows it depends on the quality of Prompt Engineering and the model's inherent randomness. **The essence of Tool (ToolInfo) is a request parameter.** The ToolInfo list is sent to the model as the `tools` parameter in the ChatModel request, telling the model "which tools you can call". Unless using ToolSearch for dynamic loading (supported by Claude, GPT 5.4+, etc.), ToolInfo must be passed along with the request. **Regarding "dynamically loading ToolInfo when Skill is triggered":** To achieve this effect means that when a Skill Prompt is inserted into the conversation, the corresponding tool definitions needed by that Skill are also appended to the current request's `[]ToolInfo`. This is entirely a user-side custom behavior — you need to: 1) identify whether the current turn triggered a Skill; 2) determine which Tools that Skill needs; 3) append the corresponding ToolInfo to `[]ToolInfo` before constructing the ChatModel request. Note that `[]ToolInfo` is at the front of the Prompt Cache, and dynamically appending new tools will most likely break Prompt Cache, leading to decreased cache hit rates and increased latency. If you care about cache efficiency, pass all potentially needed tools at initialization time. **Regarding "using Skill to force the model to call a specific tool":** Skill only sends a text prompt to the model. Whether the model strictly follows it depends on the clarity of the Prompt, the model's instruction-following capability, and context interference. This is fundamentally a Prompt Engineering problem with inherent uncertainty. If the business requires 100% certainty of calling a specific tool, you can specify ToolChoice in the LLM request to force the model to select that tool, or call the tool directly in application layer code rather than relying on model decisions.

> 💡
> Recommended approaches: When a Skill is triggered and you want the model to "most likely" call a certain tool → explicitly write the tool name, parameter format, and call instructions in the Skill Prompt; Need to dynamically control the available tool set → use ToolSearch or dynamically modify `[]ToolInfo` in ChatModel middleware based on context; Must 100% call a certain tool → call it directly in application layer code, don't rely on model decisions; Concerned about Prompt Cache invalidation → pass all potentially needed ToolInfo at initialization, avoid dynamic addition/removal.

# Q: Supervisor sub-Agent errors when transferring back to main Agent / Content received by sub-Agent changes after transfer_to_agent forwarding

These issues are all related to ADK's AgentTransfer mechanism. Supervisor is a multi-Agent collaboration mode based on AgentTransfer. The AgentTransfer mechanism has the following known limitations:

- **Full context sharing**: Supervisor and SubAgents, as well as between SubAgents, forcibly share complete context, resulting in high token overhead and latency.
- **Attention dilution**: Fully shared context is often redundant for sub-Agents, diluting the sub-Agent's focus on its actual task and reducing execution quality.
- **Context pollution**: Messages like "Successfully transferred to xxx" generated during forwarding remain in the context, potentially misleading subsequent Agent Tool Call decisions (forming incorrect few-shot examples).
- **Forced tool injection**: The mechanism requires injecting Transfer Tool (and possibly Exit Tool), increasing the complexity of the ToolInfo list.

> 💡
> Based on the above reasons, the AgentTransfer / Supervisor mode in ADK is currently marked as "not recommended".

**Recommended alternative:** Use DeepAgent or ChatModelAgent + AgentTool combination. In this mode:

- Each AgentTool has independently encapsulated context that won't pollute each other — faster, lower cost, and usually better results.
- No "Successfully transferred to xxx" interference messages are generated, avoiding misleading model decisions.

# Q: DeepSeek V4 model has issues with reason content return in tool call scenarios, how to solve?

DeepSeek V4 model has known issues with reason content return in tool call scenarios, reported by multiple users.

**Solution:** Upgrade the corresponding eino-ext deepseek module to the latest version to fix it.

```shell
go get github.com/cloudwego/eino-ext/components/model/deepseek@latest
```

After upgrading, re-run to confirm whether reason content return has returned to normal.
