---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino ADK: Supervisor Agent'
weight: 3
---

## Supervisor Agent Overview

### Import Path

`import github.com/cloudwego/eino/adk/prebuilt/supervisor`

### What is Supervisor Agent?

Supervisor Agent is a centralized multi-agent collaboration pattern consisting of one Supervisor Agent and multiple SubAgents. The Supervisor is responsible for task allocation, monitoring the execution process of sub-agents, and summarizing results and making decisions after sub-agents complete; sub-agents focus on executing specific tasks and automatically transfer task control back to the Supervisor via WithDeterministicTransferTo after completion.

<a href="/img/eino/eino_adk_supervisor_definition.png" target="_blank"><img src="/img/eino/eino_adk_supervisor_definition.png" width="100%" /></a>

This pattern is suitable for scenarios that require dynamic coordination of multiple specialized agents to complete complex tasks, such as:

- Research project management (Supervisor assigns research, experiment, report writing tasks to different sub-agents).
- Customer service processes (Supervisor assigns tasks to technical support, after-sales, sales sub-agents based on user question types).

### Supervisor Agent Structure

The core structure of Supervisor pattern is as follows:

- **Supervisor Agent**: As the collaboration core, has task allocation logic (such as rule-based or LLM decision), can include sub-agents under management via `SetSubAgents`.
- **SubAgents**: Each sub-agent is enhanced with WithDeterministicTransferTo, with `ToAgentNames` preset to the Supervisor name, ensuring automatic transfer back to Supervisor after task completion.

### Supervisor Agent Features

1. **Deterministic Callback**: After sub-agent execution completes (not interrupted), WithDeterministicTransferTo automatically triggers Transfer event, transferring task control back to Supervisor, avoiding collaboration flow interruption.
2. **Centralized Control**: Supervisor uniformly manages sub-agents, can dynamically adjust task allocation based on sub-agent execution results (such as assigning to other sub-agents or directly generating final results).
3. **Loosely Coupled Extension**: Sub-agents can be independently developed, tested, and replaced; just ensure they implement the Agent interface and bind to Supervisor to join the collaboration flow.
4. **Support for Interrupt and Resume**: If sub-agent or Supervisor supports `ResumableAgent` interface, collaboration flow can resume after interruption, maintaining task context continuity.

### Supervisor Agent Execution Flow

The typical collaboration flow of Supervisor pattern is as follows:

1. **Task Start**: Runner triggers Supervisor to run, inputs initial task (e.g., "Complete a report on LLM development history").
2. **Task Allocation**: Supervisor transfers task to designated sub-agent (e.g., "Research Agent") via Transfer event based on task requirements.
3. **Sub-Agent Execution**: Sub-agent executes specific task (e.g., researches LLM key milestones) and generates execution result events.
4. **Automatic Callback**: After sub-agent completes, WithDeterministicTransferTo triggers Transfer event, transferring task back to Supervisor.
5. **Result Processing**: Supervisor receives sub-agent results, decides next step (e.g., assign to "Report Writing Agent" to continue processing, or directly output final result).

## Supervisor Agent Usage Example

### Scenario Description

Create a research report generation system:

- **Supervisor**: Based on user input research topic, assigns tasks to "Research Agent" and "Writer Agent", and summarizes final report.
- **Research Agent**: Responsible for generating research plan (e.g., key stages of LLM development).
- **Writer Agent**: Responsible for writing complete report based on research plan.

### Code Implementation

#### Step 1: Implement Sub-Agents

First create two sub-agents, responsible for research and writing tasks respectively:

```go
// Research Agent: Generates research plan
func NewResearchAgent(model model.ToolCallingChatModel) adk.Agent {
    agent, _ := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "ResearchAgent",
       Description: "Generates a detailed research plan for a given topic.",
       Instruction: `
You are a research planner. Given a topic, output a step-by-step research plan with key stages and milestones.
Output ONLY the plan, no extra text.`,
       Model: model,
    })
    return agent
}

// Writer Agent: Writes report based on research plan
func NewWriterAgent(model model.ToolCallingChatModel) adk.Agent {
    agent, _ := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
       Name:        "WriterAgent",
       Description: "Writes a report based on a research plan.",
       Instruction: `
You are an academic writer. Given a research plan, expand it into a structured report with details and analysis.
Output ONLY the report, no extra text.`,
       Model: model,
    })
    return agent
}
```

#### Step 2: Implement Supervisor Agent

Create Supervisor Agent, define task allocation logic (simplified here as rule-based: first assign to Research Agent, then assign to Writer Agent):

```go
// Supervisor Agent: Coordinates research and writing tasks
func NewReportSupervisor(model model.ToolCallingChatModel) adk.Agent {
    agent, _ := adk.NewChatModelAgent(context.Background(), &adk.ChatModelAgentConfig{
        Name:        "ReportSupervisor",
        Description: "Coordinates research and writing to generate a report.",
        Instruction: `
You are a project supervisor. Your task is to coordinate two sub-agents:
- ResearchAgent: generates a research plan.
- WriterAgent: writes a report based on the plan.

Workflow:
1. When receiving a topic, first transfer the task to ResearchAgent.
2. After ResearchAgent finishes, transfer the task to WriterAgent with the plan as input.
3. After WriterAgent finishes, output the final report.`,
        Model: model,
    })
    return agent
}
```

#### Step 3: Combine Supervisor and Sub-Agents

Use `NewSupervisor` to combine Supervisor and sub-agents:

```go
import (
    "context"

    "github.com/cloudwego/eino-ext/components/model/openai"
    "github.com/cloudwego/eino/adk"
    "github.com/cloudwego/eino/adk/prebuilt/supervisor"
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/schema"
)

func main() {
    ctx := context.Background()

    // 1. Create LLM model (e.g., GPT-4o)
    model, _ := openai.NewChatModel(ctx, &openai.ChatModelConfig{
       APIKey: "YOUR_API_KEY",
       Model:  "gpt-4o",
    })

    // 2. Create sub-agents and Supervisor
    researchAgent := NewResearchAgent(model)
    writerAgent := NewWriterAgent(model)
    reportSupervisor := NewReportSupervisor(model)

    // 3. Combine Supervisor and sub-agents
    supervisorAgent, _ := supervisor.New(ctx, &supervisor.Config{
       Supervisor: reportSupervisor,
       SubAgents:  []adk.Agent{researchAgent, writerAgent},
    })

    // 4. Run Supervisor pattern
    iter := supervisorAgent.Run(ctx, &adk.AgentInput{
       Messages: []adk.Message{
          schema.UserMessage("Write a report on the history of Large Language Models."),
       },
       EnableStreaming: true,
    })

    // 5. Consume event stream (print results)
    for {
       event, ok := iter.Next()
       if !ok {
          break
       }
       if event.Output != nil && event.Output.MessageOutput != nil {
          msg, _ := event.Output.MessageOutput.GetMessage()
          println("Agent[" + event.AgentName + "]:\n" + msg.Content + "\n===========")
       }
    }
}
```

### Execution Results

```markdown
Agent[ReportSupervisor]:

===========
Agent[ReportSupervisor]:
successfully transferred to agent [ResearchAgent]
===========
Agent[ResearchAgent]:
1. **Scope Definition & Background Research**  
   - Task: Define "Large Language Model" (LLM) for the report (e.g., size thresholds, key characteristics: transformer-based, large-scale pretraining, general-purpose).  
   - Task: Identify foundational NLP/AI concepts pre-LLMs (statistical models, early neural networks, word embeddings) to contextualize origins.  
   - Milestone: 3-day literature review of academic definitions, industry reports, and AI historiographies to finalize scope.  

2. **Chronological Periodization**  
   - Task: Divide LLM history into distinct eras (e.g., Pre-2017: Pre-transformer foundations; 2017-2020: Transformer revolution & early LLMs; 2020-Present: Scaling & mainstream adoption).  
   ...

Agent[ResearchAgent]:
successfully transferred to agent [ReportSupervisor]
===========
Agent[ReportSupervisor]:
successfully transferred to agent [WriterAgent]
===========
Agent[WriterAgent]:
# The History of Large Language Models: From Foundations to Mainstream Revolution  

## Abstract  
Large Language Models (LLMs) represent one of the most transformative technological innovations of the 21st century...

## 1. Introduction: Defining Large Language Models  
A **Large Language Model (LLM)** is a type of machine learning model designed to process and generate human language...

...

## 7. Conclusion: A Revolution in Five Years  
The history of LLMs is a story of exponential progress: from the transformer's 2017 invention to ChatGPT's 2022 viral explosion...

## References  
- Devlin, J., et al. (2018). *BERT: Pre-training of deep bidirectional transformers for language understanding*. NAACL.  
...
===========
Agent[WriterAgent]:
successfully transferred to agent [ReportSupervisor]
===========
```

## WithDeterministicTransferTo

### What is WithDeterministicTransferTo?

`WithDeterministicTransferTo` is an Agent enhancement tool provided by Eino ADK, used to inject task transfer capability into Agents. It allows developers to preset fixed task transfer paths for target Agents. When the Agent completes its task (not interrupted), it automatically generates a Transfer event to transfer the task flow to the preset target Agent.

This capability is the foundation for building the Supervisor Agent collaboration pattern, ensuring sub-agents can reliably transfer task control back to the Supervisor after execution, forming a "allocate-execute-feedback" closed-loop collaboration flow.

### WithDeterministicTransferTo Core Implementation

#### Configuration Structure

Define core task transfer parameters through `DeterministicTransferConfig`:

```go
// Wrapper method
func AgentWithDeterministicTransferTo(_ context.Context, config *DeterministicTransferConfig) Agent

// Configuration details
type DeterministicTransferConfig struct {
    Agent        Agent          // Target Agent to be enhanced
    ToAgentNames []string       // List of target Agent names to transfer to after task completion
}
```

- `Agent`: The original Agent that needs transfer capability added.
- `ToAgentNames`: When `Agent` completes task and is not interrupted, automatically transfers task to target Agent name list (transfers in order).

#### Agent Wrapping

WithDeterministicTransferTo wraps the original Agent. Based on whether it implements the `ResumableAgent` interface (supports interrupt and resume), it returns `agentWithDeterministicTransferTo` or `resumableAgentWithDeterministicTransferTo` instance respectively, ensuring enhanced capability is compatible with Agent's original functions (such as `Resume` method).

The wrapped Agent overrides the `Run` method (for `ResumableAgent`, also overrides `Resume` method), appending Transfer events to the original Agent's event stream:

```go
// Wrapper for regular Agent
type agentWithDeterministicTransferTo struct {
    agent        Agent          // Original Agent
    toAgentNames []string       // Target Agent name list
}

// Run method: Executes original Agent task, appends Transfer event after task completion
func (a *agentWithDeterministicTransferTo) Run(ctx context.Context, input *AgentInput, options ...AgentRunOption) *AsyncIterator[*AgentEvent] {
    aIter := a.agent.Run(ctx, input, options...)
    
    iterator, generator := NewAsyncIteratorPair[*AgentEvent]()
    
    // Asynchronously process original event stream and append Transfer event
    go appendTransferAction(ctx, aIter, generator, a.toAgentNames)
    
    return iterator
}
```

For `ResumableAgent`, additionally implements `Resume` method, ensuring deterministic transfer still triggers after resume execution:

```go
type resumableAgentWithDeterministicTransferTo struct {
    agent        ResumableAgent // Original Agent supporting resume
    toAgentNames []string       // Target Agent name list
}

// Resume method: Resumes execution of original Agent task, appends Transfer event after completion
func (a *resumableAgentWithDeterministicTransferTo) Resume(ctx context.Context, info *ResumeInfo, opts ...AgentRunOption) *AsyncIterator[*AgentEvent] {
    aIter := a.agent.Resume(ctx, info, opts...)
    iterator, generator := NewAsyncIteratorPair[*AgentEvent]()
    go appendTransferAction(ctx, aIter, generator, a.toAgentNames)
    return iterator
}
```

#### Event Stream Append Transfer Event

`appendTransferAction` is the core logic implementing deterministic transfer. It consumes the original Agent's event stream and automatically generates and sends Transfer events to target Agents after the Agent task ends normally (not interrupted):

```go
func appendTransferAction(ctx context.Context, aIter *AsyncIterator[*AgentEvent], generator *AsyncGenerator[*AgentEvent], toAgentNames []string) {
    defer func() {
        // Exception handling: Capture panic and pass error via event
        if panicErr := recover(); panicErr != nil {
            generator.Send(&AgentEvent{Err: safe.NewPanicErr(panicErr, debug.Stack())})
        }
        generator.Close() // Event stream ends, close generator
    }()

    interrupted := false

    // 1. Forward all events from original Agent
    for {
        event, ok := aIter.Next()
        if !ok { // Original event stream ended
            break
        }
        generator.Send(event) // Forward event to caller

        // Check if interruption occurred (e.g., InterruptAction)
        if event.Action != nil && event.Action.Interrupted != nil {
            interrupted = true
        } else {
            interrupted = false
        }
    }

    // 2. If not interrupted and target Agent exists, generate Transfer event
    if !interrupted && len(toAgentNames) > 0 {
        for _, toAgentName := range toAgentNames {
            // Generate transfer message (system prompt + Transfer action)
            aMsg, tMsg := GenTransferMessages(ctx, toAgentName)
            // Send system prompt event (notify user of task transfer)
            aEvent := EventFromMessage(aMsg, nil, schema.Assistant, "")
            generator.Send(aEvent)
            // Send Transfer action event (trigger task transfer)
            tEvent := EventFromMessage(tMsg, nil, schema.Tool, tMsg.ToolName)
            tEvent.Action = &AgentAction{
                TransferToAgent: &TransferToAgentAction{
                    DestAgentName: toAgentName, // Target Agent name
                },
            }
            generator.Send(tEvent)
        }
    }
}
```

**Key Logic**:

- **Event Forwarding**: All events generated by the original Agent (such as thinking, tool calls, output results) are fully forwarded, ensuring business logic is unaffected.
- **Interruption Check**: If Agent is interrupted during execution (e.g., `InterruptAction`), Transfer is not triggered (interruption is considered task not completed normally).
- **Transfer Event Generation**: After task ends normally, two events are generated for each `ToAgentNames`:
  1. System prompt event (`schema.Assistant` role): Notifies user that task will be transferred to target Agent.
  2. Transfer action event (`schema.Tool` role): Carries `TransferToAgentAction`, triggers ADK runtime to transfer task to the Agent corresponding to `DestAgentName`.

## Summary

WithDeterministicTransferTo provides reliable task transfer capability for Agents, which is the core foundation for building Supervisor pattern; Supervisor pattern achieves efficient collaboration between multiple Agents through centralized coordination and deterministic callbacks, significantly reducing development and maintenance costs for complex tasks. By combining both, developers can quickly build flexible, scalable multi-Agent systems.
