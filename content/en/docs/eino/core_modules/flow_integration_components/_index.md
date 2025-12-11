---
Description: ""
date: "2025-07-21"
lastmod: ""
tags: []
title: 'Eino: Flow Integration'
weight: 3
---

LLM applications have common patterns. Abstracting them yields templates that accelerate development. Eino’s Flow module provides these ready-to-use integrations.

Currently integrated: `ReAct Agent`, `Host Multi-Agent`, `MultiQueryRetriever`, `ParentIndexer`, and more.

- ReAct Agent: [Eino: ReAct Agent Manual](/docs/eino/core_modules/flow_integration_components/react_agent_manual)
- Multi Agent: [Eino Tutorial: Host Multi-Agent](/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)

## Using Flows in Orchestration

Flows are often backed by one or more graphs. You can embed them as nodes in other graphs in three ways:

1. If a flow implements a component interface, add it via the component’s `AddXXXNode` methods, e.g., `multiquery retriever`:

```go
// instantiate the flow: multiquery.NewRetriever

vk, err := newVikingDBRetriever(ctx, vikingDBHost, vikingDBRegion, vikingDBAK, vikingDBSK)
if err != nil {
    logs.Errorf("newVikingDBRetriever failed, err=%v", err)
    return
}

llm, err := newChatModel(ctx, openAIBaseURL, openAIAPIKey, openAIModelName)
if err != nil {
    logs.Errorf("newChatModel failed, err=%v", err)
    return
}

// rewrite query by llm
mqr, err := multiquery.NewRetriever(ctx, &multiquery.Config{
    RewriteLLM:      llm,
    RewriteTemplate: nil, // use default
    QueryVar:        "",  // use default
    LLMOutputParser: nil, // use default
    MaxQueriesNum:   3,
    OrigRetriever:   vk,
    FusionFunc:      nil, // use default fusion, just deduplicate by doc id
})
if err != nil {
    logs.Errorf("NewMultiQueryRetriever failed, err=%v", err)
    return
}

// add the flow to graph
graph := compose.NewGraph[string, *schema.Message]()
_ = graph.AddRetrieverNode("multi_query_retriever", mqr, compose.WithOutputKey("context"))
_ = graph.AddEdge(compose._START_, "multi_query_retriever")
_ = graph.AddChatTemplateNode("template", prompt.FromMessages(schema._FString_, schema.UserMessage("{context}")))

// ...
```

2. If a flow is internally a single graph and the flow’s behavior is fully equivalent to that graph (no extra custom logic), export the graph and add it via `AddGraphNode`, e.g., Host Multi‑Agent:

```go
// instantiate the host multi-agent
hostMA, err := NewMultiAgent(ctx, &MultiAgentConfig{
    Host: Host{
       ChatModel: mockHostLLM,
    },
    Specialists: []*Specialist{
       specialist1,
       specialist2,
    },
})
assert.Nil(t, err)

// export graph and []GraphAddNodeOption from host multi-agent
maGraph, opts := hostMA.ExportGraph()

// add to another graph 
fullGraph, err := compose.NewChain[map[string]any, *schema.Message]().
    AppendChatTemplate(prompt.FromMessages(schema._FString_, schema.UserMessage("what's the capital city of {country_name}"))).
    AppendGraph(maGraph, append(opts, compose.WithNodeKey("host_ma_node"))...).
    Compile(ctx)
assert.Nil(t, err)

// invoke the other graph
// convert the flow's own option to compose.Option if needed
// assign options to flow's nodes if needed
out, err := fullGraph.Invoke(ctx, map[string]any{"country_name": "China"}, 
    compose.WithCallbacks(ConvertCallbackHandlers(mockCallback)).
        DesignateNodeWithPath(compose.NewNodePath("host_ma_node", hostMA.HostNodeKey())))
```

3. All flows can be wrapped into Lambda and added via `AddLambdaNode`. Current flows can already be added via methods 1 or 2, so wrapping is not needed; if used:

```go
// instantiate the flow
a, err := NewAgent(ctx, &AgentConfig{
    Model: cm,
    ToolsConfig: compose.ToolsNodeConfig{
       Tools: []tool.BaseTool{fakeTool, &fakeStreamToolGreetForTest{}},
    },

    MaxStep: 40,
})
assert.Nil(t, err)

chain := compose.NewChain[[]*schema.Message, string]()

// convert the flow to Lambda
agentLambda, err := compose.AnyLambda(a.Generate, a.Stream, nil, nil)
assert.Nil(t, err)

// add lambda to another graph
chain.
    AppendLambda(agentLambda).
    AppendLambda(compose.InvokableLambda(func(ctx context.Context, input *schema.Message) (string, error) {
       t.Log("got agent response: ", input.Content)
       return input.Content, nil
    }))
r, err := chain.Compile(ctx)
assert.Nil(t, err)

// invoke the graph
res, err := r.Invoke(ctx, []*schema.Message{{Role: schema._User_, Content: "hello"}},
    compose.WithCallbacks(callbackForTest))
```

Comparison:

<table>
<tr><td>Mode</td><td>Scenario</td><td>Advantages</td></tr>
<tr><td>As Component</td><td>Implements the component’s interface</td><td>Simple and clear semantics</td></tr>
<tr><td>As Graph</td><td>Single graph composition; behavior fully within that graph</td><td>Inner nodes exposed to outer graph; unified runtime options; fewer conversions than Lambda; can obtain graph nesting via GraphCompileCallback</td></tr>
<tr><td>As Lambda</td><td>All</td><td>Universal</td></tr>
</table>
