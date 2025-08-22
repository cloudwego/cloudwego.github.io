---
Description: ""
date: "2025-08-07"
lastmod: ""
tags: []
title: 'Eino: Workflow Orchestration Framework'
weight: 7
---

## What is Eino Workflow?

is a set of orchestrated APIs that are at the same architectural level as the Graph API:

<a href="/img/eino/workflow_api_layer_en.png" target="_blank"><img src="/img/eino/workflow_api_layer_en.png" width="100%" /></a>

The essential characteristics are:

- has the same level of capabilities as Graph API, and both are suitable framework tools for orchestrating the "information flow around large models".
    - Remains consistent in aspects such as node type, stream processing, callback, option, state, interrupt & checkpoint.
    - Implementing the AnyGraph interface allows it to be added as a subgraph to the parent Graph/Chain/Workflow when AddGraphNode is called.
    - can also add other Graph/Chain/Workflow as its own subgraph.
- Field-level mapping capability: The input of a node can be composed of any combination of output fields from any predecessor nodes.
    - Natively supports struct, map, and mutual mapping between structs and maps at any nested level.
- Separation of control flow and data flow: The Edge in a Graph determines both the execution order and data transfer. In a Workflow, they can be transferred together or separately.
- Loops (i.e., loops similar to react agent's chatmodel->toolsNode->chatmodel) are not supported. NodeTriggerMode is fixed to AllPredecessor.

## Why use Workflow

### Flexible input and output types

For example, if you need to arrange two lambda nodes, each containing two "existing business functions f1, f2", the input and output types are specific Structs that conform to the business scenario and are different from each other:

<a href="/img/eino/workflow_existing_biz_func_en.png" target="_blank"><img src="/img/eino/workflow_existing_biz_func_en.png" width="100%" /></a>

When orchestrating the workflow, directly map the output field F1 of f1 to the input field F3 of f2, while retaining the original function signatures of f1 and f2. The achieved effect is:**Each node is "determined by business scenarios for input and output", without the need to consider "who provides my input and who uses my output"**.

When graph is being orchestrated, due to the requirement of "type alignment", if f1 -> f2, then the output type of f1 and the input type of f2 need to be aligned, and one of the following two options must be chosen:

- Define a new common struct, and change both the output type of f1 and the input type of f2 to this common struct. This has costs and may intrude into business logic.
- Both the output type of f1 and the input type of f2 have been changed to map. The feature of strong type alignment has been lost.

### Separation of control flow and data flow

Look at the following scenario:

<a href="/img/eino/workflow_data_control_separate_en.png" target="_blank"><img src="/img/eino/workflow_data_control_separate_en.png" width="100%" /></a>

Node D simultaneously references certain output fields of A, B, and C. Among them, the dotted line from A to D is simply a "data flow" that does not transmit "control" information, i.e., whether A has completed execution or not does not determine whether D starts execution.

The thick arrow between nodes D and E represents that node E does not reference any output from node D and is simply a "control flow" that does not transfer "data". That is, whether D has completed execution determines whether E starts execution, but the output of D does not affect the input of E.

The other lines in the figure represent the combination of control flow and data flow.

It should be noted that the prerequisite for data flow to be transferred is that there must be a control flow. For example, the data flow from A to D depends on the existence of the control flow A->branch->B->D or A->branch->C->D. That is, data flow can only reference the output of predecessor nodes.

For example, this scenario of "cross-node" passing specific data:

<a href="/img/eino/workflow_cross_node_data_passing_en.png" target="_blank"><img src="/img/eino/workflow_cross_node_data_passing_en.png" width="100%" /></a>

In the above figure, the input of the chat template node can be very clear:

`map[string]any{"prompt": "prompt from START", "context": "retrieved context"}`

Conversely, if you use the Graph or Chain API, you need to choose one of the two:

- Use OutputKey to convert the output type of the node (the START node cannot be added, so an additional passthrough node must be added), and the input of the ChatTemplate node will include the full output of START and retriever (instead of just the few fields that are actually needed).
- The prompt of the START node is placed inside the state, and ChatTemplate reads from the state. An additional state has been introduced.

## How to Use Workflow

### The simplest workflow

START -> node -> END

<a href="/img/eino/workflow_simple_en.png" target="_blank"><img src="/img/eino/workflow_simple_en.png" width="100%" /></a>

```go
// creates and invokes a simple workflow with only a Lambda node.
// Since all field mappings are ALL to ALL mappings
// (by using AddInput without field mappings),
// this simple workflow is equivalent to a Graph: START -> lambda -> END.
func main() {
    // create a Workflow, just like creating a Graph
    wf := compose.NewWorkflow[int, string]()

    // add a lambda node to the Workflow, just like adding the lambda to a Graph
    wf.AddLambdaNode("lambda", compose.InvokableLambda(
       func(ctx context.Context, in int) (string, error) {
          return strconv.Itoa(in), nil
       })).
       // add an input to this lambda node from START.
       // this means mapping all output of START to the input of the lambda.
       // the effect of AddInput is to set both a control dependency
       // and a data dependency.
       AddInput(compose.START)

    // obtain the compose.END of the workflow for method chaining
    wf.End().
       // add an input to compose.END,
       // which means 'using ALL output of lambda node as output of END'.
       AddInput("lambda")

    // compile the Workflow, just like compiling a Graph
    run, err := wf.Compile(context.Background())
    if err != nil {
       logs.Errorf("workflow compile error: %v", err)
       return
    }

    // invoke the Workflow, just like invoking a Graph
    result, err := run.Invoke(context.Background(), 1)
    if err != nil {
       logs.Errorf("workflow run err: %v", err)
       return
    }

    logs.Infof("%v", result)
}
```

[Eino example link](https://github.com/cloudwego/eino-examples/blob/main/compose/workflow/1_simple/main.go)

Several core APIs:

- `func NewWorkflow[I, O any](opts ...NewGraphOption) *Workflow[I, O]`
    - Build a new Workflow.
    - is exactly the same as `NewGraph` signature.
- `func (wf *Workflow[I, O]) AddChatModelNode(key string, chatModel model.BaseChatModel, opts ...GraphAddNodeOpt) *WorkflowNode `
    - Add a new node to the Workflow.
    - The types of nodes that can be added are exactly the same as those in Graph.
    - The difference from Graph's AddXXXNode is that Workflow does not immediately return an error, but instead processes and returns errors uniformly during the final Compile.
    - AddXXXNode retrieves a WorkflowNode, and subsequent operations such as adding data field mapping to the Node are directly performed using Method Chaining
- `func (n *WorkflowNode) AddInput(fromNodeKey string, inputs ...*FieldMapping) *WorkflowNode`
    - Add input data field mapping to a WorkflowNode
    - Returns WorkflowNode, allowing for continued method chaining.
- `(wf *Workflow[I, O]) Compile(ctx context.Context, opts ...GraphCompileOption) (Runnable[I, O], error)`
    - Compile a Workflow.
    - is completely consistent with the signature of Compile Graph.

### Data Field Mapping

START (input struct) -> [parallel lambda1, lambda2] -> END (output map)

Let's take an example of "counting the occurrences of characters in a string". The overall workflow takes an eino Message and a sub string as input, assigns Message.Content to a counter c1, assigns Message.ReasoningContent to another counter c2, calculates the occurrences of the sub string in parallel respectively, and then maps them to END:

<a href="/img/eino/workflow_char_counter_en.png" target="_blank"><img src="/img/eino/workflow_char_counter_en.png" width="100%" /></a>

In the above figure, the overall input of the workflow is the message Struct, the inputs of both c1 and c2 lambdas are the counter Struct, the outputs are both int, and the overall output of the workflow is map[string]any. The code is as follows:

```go
// demonstrates the field mapping ability of eino workflow.
func main() {
    type counter struct {
       FullStr string // exported because we will do field mapping for this field
       SubStr  string // exported because we will do field mapping for this field
    }

    // wordCounter is a lambda function that count occurrences of SubStr within FullStr
    wordCounter := func(ctx context.Context, c counter) (int, error) {
       return strings.Count(c.FullStr, c.SubStr), nil
    }

    type message struct {
       *schema.Message        // exported because we will do field mapping for this field
       SubStr          string // exported because we will do field mapping for this field
    }

    // create a workflow just like a Graph
    wf := compose.NewWorkflow[message, map[string]any]()

    // add lambda c1 just like in Graph
    wf.AddLambdaNode("c1", compose.InvokableLambda(wordCounter)).
       AddInput(compose.START, // add an input from START, specifying 2 field mappings
          // map START's SubStr field to lambda c1's SubStr field
          compose.MapFields("SubStr", "SubStr"),
          // map START's Message's Content field to lambda c1's FullStr field
          compose.MapFieldPaths([]string{"Message", "Content"}, []string{"FullStr"}))

    // add lambda c2 just like in Graph
    wf.AddLambdaNode("c2", compose.InvokableLambda(wordCounter)).
       AddInput(compose.START, // add an input from START, specifying 2 field mappings
          // map START's SubStr field to lambda c1's SubStr field
          compose.MapFields("SubStr", "SubStr"),
          // map START's Message's ReasoningContent field to lambda c1's FullStr field
          compose.MapFieldPaths([]string{"Message", "ReasoningContent"}, []string{"FullStr"}))

    wf.End(). // Obtain the compose.END for method chaining
       // add an input from c1,
       // mapping full output of c1 to the map key 'content_count'
       AddInput("c1", compose.ToField("content_count")).
       // also add an input from c2,
       // mapping full output of c2 to the map key 'reasoning_content_count'
       AddInput("c2", compose.ToField("reasoning_content_count"))

    // compile the workflow just like compiling a Graph
    run, err := wf.Compile(context.Background())
    if err != nil {
       logs.Errorf("workflow compile error: %v", err)
       return
    }

    // invoke the workflow just like invoking a Graph
    result, err := run.Invoke(context.Background(), message{
       Message: &schema.Message{
          Role:             schema.Assistant,
          Content:          "Hello world!",
          ReasoningContent: "I need to say something meaningful",
       },
       SubStr: "o", // would like to count the occurrences of 'o'
    })
    if err != nil {
       logs.Errorf("workflow run err: %v", err)
       return
    }

    logs.Infof("%v", result)
}
```

[Eino example code link](https://github.com/cloudwego/eino-examples/blob/main/compose/workflow/2_field_mapping/main.go)

The main message of this example is that `the AddInput` method can pass 0-n data field mapping rules, and can be called multiple times `AddInput`. This means:

- A node can reference any number of fields from the output of a predecessor node.
- A node can reference fields from any number of predecessor nodes.
- A mapping can be "whole to field", "field to whole", "whole to whole", or a mapping between nested fields.
- Different types above have different APIs to express this mapping:
    - Top-level field to top-level field: `MapFields(string, string)`
    - All outputs to top-level field: `ToField(string)`
    - Top-level field to all inputs: `FromField(string)`
    - Nested field to nested field: `MapFieldPaths(FieldPath, FieldPath)`, which is required when either the upstream or downstream is nested.
    - All outputs to nested field: `ToFieldPath(FieldPath)`
    - Nested field to all inputs: `FromFieldPath(FieldPath)`
    - All outputs to all inputs: Directly use `AddInput` without passing `FieldMapping`.

## Advanced Features

### Only data flow, no control flow

Imagine a simple scenario: START -> Addition Node -> Multiplication Node -> END. Here, the "Multiplication Node" multiplies a field from START by the result of the Addition Node:

<a href="/img/eino/workflow_calculator_en.png" target="_blank"><img src="/img/eino/workflow_calculator_en.png" width="100%" /></a>

In the above figure, the multiplication node is executed after the addition node, i.e., the "multiplication node" is controlled by the "addition node". However, the START node does not directly control the "multiplication node", but merely passes the data. In the code, pure data flow is specified through `AddInputWithOptions(fromNode, fieldMappings, WithNoDirectDependency)`:

```go
func main() {
    type calculator struct {
       Add      []int
       Multiply int
    }

    adder := func(ctx context.Context, in []int) (out int, err error) {
       for _, i := range in {
          out += i
       }
       return out, nil
    }

    type mul struct {
       A int
       B int
    }

    multiplier := func(ctx context.Context, m mul) (int, error) {
       return m.A * m.B, nil
    }

    wf := compose.NewWorkflow[calculator, int]()

    wf.AddLambdaNode("adder", compose.InvokableLambda(adder)).
       AddInput(compose.START, compose.FromField("Add"))

    wf.AddLambdaNode("mul", compose.InvokableLambda(multiplier)).
       AddInput("adder", compose.ToField("A")).
       AddInputWithOptions(compose.START, []*compose.FieldMapping{compose.MapFields("Multiply", "B")},
          // use WithNoDirectDependency to declare a 'data-only' dependency,
          // in this case, START node's execution status will not determine whether 'mul' node can execute.
          // START node only passes one field of its output to 'mul' node.
          compose.WithNoDirectDependency())

    wf.End().AddInput("mul")

    runner, err := wf.Compile(context.Background())
    if err != nil {
       logs.Errorf("workflow compile error: %v", err)
       return
    }

    result, err := runner.Invoke(context.Background(), calculator{
       Add:      []int{2, 5},
       Multiply: 3,
    })
    if err != nil {
       logs.Errorf("workflow run err: %v", err)
       return
    }

    logs.Infof("%d", result)
}
```

[Eino examples Code Link](https://github.com/cloudwego/eino-examples/blob/main/compose/workflow/3_data_only/main.go)

Newly introduced APIs in this example:

```go
func (n *WorkflowNode) AddInputWithOptions(fromNodeKey string, inputs []*FieldMapping, opts ...WorkflowAddInputOpt) *WorkflowNode {
    return n.addDependencyRelation(fromNodeKey, inputs, getAddInputOpts(opts))
}
```

and new Option:

```go
func WithNoDirectDependency() WorkflowAddInputOpt {
    return func(opt *workflowAddInputOpts) {
       opt.noDirectDependency = true
    }
}
```

Combined, it can add pure "data dependencies" to nodes.

### Only control flow, no data flow

Imagine a scenario of "sequential bidding with confidential quotes": START -> Bidder 1 -> Qualification Check -> Bidder 2 -> END:

<a href="/img/eino/workflow_auction_en.png" target="_blank"><img src="/img/eino/workflow_auction_en.png" width="100%" /></a>

In the above figure, the normal connection is "control + data", the dashed line is "data only", and the bold line is "control only". The logic is: input an initial price, bidder 1 gives bid 1, a branch determines whether it is high enough; if it is high enough, it ends directly; otherwise, the initial price is given to bidder 2, who gives bid 2, and finally bids 1 and 2 are aggregated and output.

The two bold lines branching out are both "control only" because neither bidder2 nor END depends on the data provided by the branch. In the code, the pure control flow is specified through `AddDependency(fromNode)`:

```go
func main() {
    bidder1 := func(ctx context.Context, in float64) (float64, error) {
       return in + 1.0, nil
    }

    bidder2 := func(ctx context.Context, in float64) (float64, error) {
       return in + 2.0, nil
    }

    wf := compose.NewWorkflow[float64, map[string]float64]()

    wf.AddLambdaNode("b1", compose.InvokableLambda(bidder1)).
       AddInput(compose.START)

    // add a branch just like adding branch in Graph.
    wf.AddBranch("b1", compose.NewGraphBranch(func(ctx context.Context, in float64) (string, error) {
       if in > 5.0 {
          return compose.END, nil
       }
       return "b2", nil
    }, map[string]bool{compose.END: true, "b2": true}))

    wf.AddLambdaNode("b2", compose.InvokableLambda(bidder2)).
       // b2 executes strictly after b1, but does not rely on b1's output,
       // which means b2 depends on b1, but no data passing between them.
       AddDependency("b1").
       AddInputWithOptions(compose.START, nil, compose.WithNoDirectDependency())

    wf.End().AddInput("b1", compose.ToField("bidder1")).
       AddInput("b2", compose.ToField("bidder2"))

    runner, err := wf.Compile(context.Background())
    if err != nil {
       logs.Errorf("workflow compile error: %v", err)
       return
    }

    result, err := runner.Invoke(context.Background(), 3.0)
    if err != nil {
       logs.Errorf("workflow run err: %v", err)
       return
    }

    logs.Infof("%v", result)
}
```

[Eino examples Code Link](https://github.com/cloudwego/eino-examples/blob/main/compose/workflow/4_control_only_branch/main.go)

New APIs introduced in this example:

```go
func (n *WorkflowNode) AddDependency(fromNodeKey string) *WorkflowNode {
    return n.addDependencyRelation(fromNodeKey, nil, &workflowAddInputOpts{dependencyWithoutInput: true})
}
```

can specify a pure "control dependency" for a node via AddDependency.

### Branch

In the example above, we added a branch in almost exactly the same way as with the Graph API:

```go
    // add a branch just like adding branch in Graph.
    wf.AddBranch("b1", compose.NewGraphBranch(func(ctx context.Context, in float64) (string, error) {
       if in > 5.0 {
          return compose.END, nil
       }
       return "b2", nil
    }, map[string]bool{compose.END: true, "b2": true}))
```

The semantics of branch are the same as those of branch in the AllPredecessor mode of Graph:

- There is one and only one 'fromNode', meaning that a branch can have only one pre-control node.
- Single selection (NewGraphBranch) and multiple selection (NewGraphMultiBranch) are supported.
- The selected branch is executable, while the unselected branch is marked as skip.
- A node can only be executed when all incoming edges are completed (successfully or skipped) and at least one edge succeeds (e.g., END in the example above).
- If all incoming edges of a node are skip, then all outgoing edges of this node are automatically marked as skip.

Meanwhile, there is a core difference between the workflow branch and the graph branch:

- The graph branch is always "control and data integrated", and the input of the downstream node of the branch must be the output of the branch fromNode.
- The Workflow branch is always "control-only", and the inputs of the downstream nodes of the branch are specified by themselves through the AddInputWithOptions method.

New APIs involved:

```go
func (wf *Workflow[I, O]) AddBranch(fromNodeKey string, branch *GraphBranch) *WorkflowBranch {
    wb := &WorkflowBranch{
       fromNodeKey: fromNodeKey,
       GraphBranch: branch,
    }

    wf.workflowBranches = append(wf.workflowBranches, wb)
    return wb
}
```

is almost identical to Graph.AddBranch in signature and can add a branch to the workflow.

### Static Values

Let's modify the above "auction" example by assigning a static configuration of "budget" to bidder 1 and bidder 2 respectively:

<a href="/img/eino/workflow_auction_static_values.png" target="_blank"><img src="/img/eino/workflow_auction_static_values.png" width="100%" /></a>

budget1 and budget2 will be injected into the inputs of bidder1 and bidder2 respectively in the form of "static values". Use `SetStaticValue` method to configure static values for workflow nodes:

```go
func main() {
    type bidInput struct {
       Price  float64
       Budget float64
    }

    bidder := func(ctx context.Context, in bidInput) (float64, error) {
       if in.Price >= in.Budget {
          return in.Budget, nil
       }

       return in.Price + rand.Float64()*in.Budget, nil
    }

    wf := compose.NewWorkflow[float64, map[string]float64]()

    wf.AddLambdaNode("b1", compose.InvokableLambda(bidder)).
       AddInput(compose.START, compose.ToField("Price")).
       // set 'Budget' field to 3.0 for b1
       SetStaticValue([]string{"Budget"}, 3.0)

    // add a branch just like adding branch in Graph.
    wf.AddBranch("b1", compose.NewGraphBranch(func(ctx context.Context, in float64) (string, error) {
       if in > 5.0 {
          return compose.END, nil
       }
       return "b2", nil
    }, map[string]bool{compose.END: true, "b2": true}))

    wf.AddLambdaNode("b2", compose.InvokableLambda(bidder)).
       // b2 executes strictly after b1, but does not rely on b1's output,
       // which means b2 depends on b1, but no data passing between them.
       AddDependency("b1").
       AddInputWithOptions(compose.START, []*compose.FieldMapping{compose.ToField("Price")}, compose.WithNoDirectDependency()).
       // set 'Budget' field to 4.0 for b2
       SetStaticValue([]string{"Budget"}, 4.0)

    wf.End().AddInput("b1", compose.ToField("bidder1")).
       AddInput("b2", compose.ToField("bidder2"))

    runner, err := wf.Compile(context.Background())
    if err != nil {
       logs.Errorf("workflow compile error: %v", err)
       return
    }

    result, err := runner.Invoke(context.Background(), 3.0)
    if err != nil {
       logs.Errorf("workflow run err: %v", err)
       return
    }

    logs.Infof("%v", result)
}
```

[Eino examples Code Link](https://github.com/cloudwego/eino-examples/blob/main/compose/workflow/5_static_values/main.go)

New APIs involved here:

```go
func (n *WorkflowNode) SetStaticValue(path FieldPath, value any) *WorkflowNode {
    n.staticValues[path.join()] = value
    return n
}
```

Set a static value for the specified field of the Workflow node through this method.

### Streaming Effect

Returning to the previous "character count" example, if the input to our workflow is no longer a single message but a message stream, and our counting function can count each message chunk in the stream separately and return a "count stream":

<a href="/img/eino/workflow_stream_en.png" target="_blank"><img src="/img/eino/workflow_stream_en.png" width="100%" /></a>

We will make some modifications to the previous example:

- Change InvokableLambda to TransformableLambda so that it can consume streams and produce streams.
- Change SubStr in the input to a static value and inject it into c1 and c2.
- The overall input of the Workflow has been changed to *schema.Message.
- Invoke the workflow in Transform mode and pass in a stream containing 2 *schema.Message.

Completed code:

```go
// demonstrates the stream field mapping ability of eino workflow.
// It's modified from 2_field_mapping.
func main() {
    type counter struct {
       FullStr string // exported because we will do field mapping for this field
       SubStr  string // exported because we will do field mapping for this field
    }

    // wordCounter is a transformable lambda function that
    // count occurrences of SubStr within FullStr, for each trunk.
    wordCounter := func(ctx context.Context, c *schema.StreamReader[counter]) (
       *schema.StreamReader[int], error) {
       var subStr, cachedStr string
       return schema.StreamReaderWithConvert(c, func(co counter) (int, error) {
          if len(co.SubStr) > 0 {
             // static values will not always come in the first chunk,
             // so before the static value (SubStr) comes in,
             // we need to cache the full string
             subStr = co.SubStr
             fullStr := cachedStr + co.FullStr
             cachedStr = ""
             return strings.Count(fullStr, subStr), nil
          }

          if len(subStr) > 0 {
             return strings.Count(co.FullStr, subStr), nil
          }
          cachedStr += co.FullStr
          return 0, schema.ErrNoValue
       }), nil
    }

    // create a workflow just like a Graph
    wf := compose.NewWorkflow[*schema.Message, map[string]int]()

    // add lambda c1 just like in Graph
    wf.AddLambdaNode("c1", compose.TransformableLambda(wordCounter)).
       AddInput(compose.START, // add an input from START, specifying 2 field mappings
          // map START's Message's Content field to lambda c1's FullStr field
          compose.MapFields("Content", "FullStr")).
       // we can set static values even if the input will be stream
       SetStaticValue([]string{"SubStr"}, "o")

    // add lambda c2 just like in Graph
    wf.AddLambdaNode("c2", compose.TransformableLambda(wordCounter)).
       AddInput(compose.START, // add an input from START, specifying 2 field mappings
          // map START's Message's ReasoningContent field to lambda c1's FullStr field
          compose.MapFields("ReasoningContent", "FullStr")).
       SetStaticValue([]string{"SubStr"}, "o")

    wf.End(). // Obtain the compose.END for method chaining
       // add an input from c1,
       // mapping full output of c1 to the map key 'content_count'
       AddInput("c1", compose.ToField("content_count")).
       // also add an input from c2,
       // mapping full output of c2 to the map key 'reasoning_content_count'
       AddInput("c2", compose.ToField("reasoning_content_count"))

    // compile the workflow just like compiling a Graph
    run, err := wf.Compile(context.Background())
    if err != nil {
       logs.Errorf("workflow compile error: %v", err)
       return
    }

    // call the workflow using Transform just like calling a Graph with Transform
    result, err := run.Transform(context.Background(),
       schema.StreamReaderFromArray([]*schema.Message{
          {
             Role:             schema.Assistant,
             ReasoningContent: "I need to say something meaningful",
          },
          {
             Role:    schema.Assistant,
             Content: "Hello world!",
          },
       }))
    if err != nil {
       logs.Errorf("workflow run err: %v", err)
       return
    }

    var contentCount, reasoningCount int
    for {
       chunk, err := result.Recv()
       if err != nil {
          if err == io.EOF {
             result.Close()
             break
          }

          logs.Errorf("workflow receive err: %v", err)
          return
       }

       logs.Infof("%v", chunk)

       contentCount += chunk["content_count"]
       reasoningCount += chunk["reasoning_content_count"]
    }

    logs.Infof("content count: %d", contentCount)
    logs.Infof("reasoning count: %d", reasoningCount)
}
```

[Eino examples Code Link](https://github.com/cloudwego/eino-examples/blob/main/compose/workflow/6_stream_field_map/main.go)

Based on the above example, we have summarized some characteristics of the workflow streaming:

- remains 100% Eino stream: four paradigms (invoke, stream, collect, transform), automatically converted, copied, spliced, and merged by the Eino framework.
- The configuration of data field mapping does not require special handling of streams: regardless of whether the actual input and output are streams, the writing method of AddInput remains the same, and the Eino framework is responsible for handling stream-based mapping.
- Static value, no special handling of the stream is required: Even if the actual input is a stream, SetStaticValue can be used in the same way. The Eino framework will place the static value in the input stream, but it is not necessarily the first chunk to be read.

### Scenarios of data field mapping

#### Type Alignment

Workflow follows the same set of type alignment rules as Graph, except that the alignment granularity has changed from complete input-output alignment to type alignment between mapped paired fields. Specifically:

- The types are exactly the same, and they will pass the validation during Compile, ensuring alignment.
- Although the types are different, the upstream can be assigned to the downstream (for example, the specific type of the upstream and Any type of the downstream), and the validation will pass during compilation, ensuring alignment.
- Upstream cannot be assigned to downstream (e.g., upstream int, downstream string), and an error will occur during compilation.
- The upstream may be assignable to the downstream (e.g., upstream Any, downstream int), which cannot be determined at compile time and will be postponed until execution, when the actual type of the upstream is retrieved and then judged. At this time, if it is judged that the upstream cannot be assigned to the downstream, an error will be thrown.

#### Scenarios of Merge

Merge refers to the situation where the input of a node is mapped from multiple `data field mapping`.

- maps to multiple different fields: Supported
- Mapping to the same field: Not supported
- is mapped to the whole, and also mapped to the data field: conflict, not supported

#### nested map[string]any

For example, this data field mapping:`ToFieldPath([]string{"a","b"})`, the input type of the target node is `map[string]any`, and the order during mapping is:

1. Level 1 "a", the result at this time is `map[string]any{"a": nil}`
2. Level 2 "b", where the result is `map[string]any{"a": map[string]any{"b": x}}`

It can be seen that at the second level, the Eino framework automatically replaced any with the actual `map[string]any`

#### CustomExtractor

In some scenarios, the semantics of standard data field mapping cannot support, for example, when the upstream is []int and we want to extract the first element and map it to the downstream, in this case we use `WithCustomExtractor`:

```go
t.Run("custom extract from array element", func(t *testing.T) {
    wf := NewWorkflow[[]int, map[string]int]()
    wf.End().AddInput(START, ToField("a", WithCustomExtractor(func(input any) (any, error) {
       return input.([]int)[0], nil
    })))
    r, err := wf.Compile(context.Background())
    assert.NoError(t, err)
    result, err := r.Invoke(context.Background(), []int{1, 2})
    assert.NoError(t, err)
    assert.Equal(t, map[string]int{"a": 1}, result)
})
```

When using WithCustomExtractor, all type alignment validations during Compile time cannot be performed and can only be postponed to runtime validation.

### Some constraints

- Restrictions on Map Key: Only string or string alias (types that can be converted to string) are supported.
- Unsupported CompileOption:
    - `WithNodeTriggerMode`, because it is fixed to `AllPredecessor`.
    - `WithMaxRunSteps`, because there will be no loops.
- If the mapping source is Map Key, the Map must contain this key. However, if the mapping source is Stream, Einos cannot determine whether this key appears at least once in all frames of the stream, so verification cannot be performed for Stream.
- If the source or target field of the mapping belongs to a struct, these fields must be exported because reflection is used internally.
- Mapping source is nil: Generally supported, only reports an error when the mapping target cannot be nil, such as when the target is a basic type (int, etc.).

## Practical Application

### Coze-Studio Workflow

[Coze-Studio](https://github.com/coze-dev/coze-studio) The workflow engine of the open-source version is based on the Eino Workflow orchestration framework. See: [11. New Workflow Node Type (Backend)](https://github.com/coze-dev/coze-studio/wiki/11.-%E6%96%B0%E5%A2%9E%E5%B7%A5%E4%BD%9C%E6%B5%81%E8%8A%82%E7%82%B9%E7%B1%BB%E5%9E%8B%EF%BC%88%E5%90%8E%E7%AB%AF%EF%BC%89)
