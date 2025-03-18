---
Description: ""
date: "2025-03-12"
lastmod: ""
tags: []
title: 'Eino: Flow integration'
weight: 0
---

LLM applications have **common scenarios and patterns**. By abstracting these scenarios, templates can be provided to help developers quickly build LLM applications. Eino's Flow module is designed to do just this.

Currently, Eino has integrated two commonly used Agent patterns, `react agent` and `host multi agent`, as well as MultiQueryRetriever, ParentIndexer, and others.

- React Agent: [Eino: React Agent Manual](/docs/eino/core_modules/flow_integration_components/react_agent_manual)
- Multi Agent: [Eino Tutorial: Host Multi-Agent ](/docs/eino/core_modules/flow_integration_components/multi_agent_hosting)

## Orchestrate Flows

The Flow integration component itself is generally composed of one or more graphs. At the same time, these flows can also be used as nodes to participate in the orchestration of other graphs, and there are three ways to do this:

1. If a flow implements the interface of a certain component, methods such as AddXXXNode corresponding to that component can be used to add it to a graph. For example, for the multiquery retriever:

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

1. If a flow is internally orchestrated by a single graph and the function of the flow is completely equivalent to the operation of this graph (there is no customized logic that cannot be covered within the graph run), the graph of the flow can be exported and added to orchestration through methods such as AddGraphNode, like ReActAgent and Host Multi-Agent:

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

1. All flows can be encapsulable as Lambdas and added to orchestration through methods such as AddLambdaNode. Currently, all flows can be added to orchestration through method 1 or 2, so there is no need to downgrade to using Lambdas. We give an example just in case you need it:

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

The comparison of the three methods is as follows:

<table>
<tr><td>Method</td><td>Applicable Scenario</td><td>Advantage</td></tr>
<tr><td>As a Component</td><td>Need to implement the interface of the component</td><td>Simple and straightforward, with clear semantics</td></tr>
<tr><td>As a Graph</td><td>Orchestrated by a single graph, and the function does not exceed the scope of this graph</td><td>The nodes within the graph are exposed to the outer graph. Runtime options can be uniformly allocated. There is one less layer of conversion compared to using Lambda. The relationship between the upper and lower graphs can be obtained through GraphCompileCallback</td></tr>
<tr><td>As a Lambda</td><td>All scenarios</td><td>Universal</td></tr>
</table>
