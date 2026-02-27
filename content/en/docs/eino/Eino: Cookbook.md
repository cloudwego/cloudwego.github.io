---
Description: ""
date: "2026-01-30"
lastmod: ""
tags: []
title: 'Eino: Cookbook'
weight: 3
---

This document serves as an example index for the eino-examples project, helping developers quickly find the sample code they need.

**GitHub Repository**: [https://github.com/cloudwego/eino-examples](https://github.com/cloudwego/eino-examples)

---

## 📦 ADK (Agent Development Kit)

### Hello World

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/helloworld">adk/helloworld</a></td><td>Hello World Agent</td><td>The simplest Agent example, demonstrating how to create a basic conversational Agent</td></tr>
</table>

### Intro Examples

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/chatmodel">adk/intro/chatmodel</a></td><td>ChatModel Agent</td><td>Demonstrates how to use ChatModelAgent with Interrupt mechanism</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/custom">adk/intro/custom</a></td><td>Custom Agent</td><td>Demonstrates how to implement a custom Agent conforming to ADK definition</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/loop">adk/intro/workflow/loop</a></td><td>Loop Agent</td><td>Demonstrates how to use LoopAgent to implement loop reflection pattern</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/parallel">adk/intro/workflow/parallel</a></td><td>Parallel Agent</td><td>Demonstrates how to use ParallelAgent for parallel execution</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/workflow/sequential">adk/intro/workflow/sequential</a></td><td>Sequential Agent</td><td>Demonstrates how to use SequentialAgent for sequential execution</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/session">adk/intro/session</a></td><td>Session Management</td><td>Demonstrates how to pass data and state between multiple Agents through Session</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/transfer">adk/intro/transfer</a></td><td>Agent Transfer</td><td>Demonstrates ChatModelAgent's Transfer capability for task transfer between Agents</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/agent_with_summarization">adk/intro/agent_with_summarization</a></td><td>Agent with Summarization</td><td>Demonstrates how to add conversation summarization functionality to an Agent</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/intro/http-sse-service">adk/intro/http-sse-service</a></td><td>HTTP SSE Service</td><td>Demonstrates how to expose ADK Runner as an HTTP service supporting Server-Sent Events</td></tr>
</table>

### Human-in-the-Loop

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/1_approval">adk/human-in-the-loop/1_approval</a></td><td>Approval Mode</td><td>Demonstrates human approval mechanism before sensitive operations, requiring user confirmation before Agent execution</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/2_review-and-edit">adk/human-in-the-loop/2_review-and-edit</a></td><td>Review and Edit Mode</td><td>Demonstrates human review and editing of tool call parameters, supporting modification, approval, or rejection</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/3_feedback-loop">adk/human-in-the-loop/3_feedback-loop</a></td><td>Feedback Loop Mode</td><td>Multi-Agent collaboration where Writer generates content, Reviewer collects human feedback, supporting iterative optimization</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/4_follow-up">adk/human-in-the-loop/4_follow-up</a></td><td>Follow-up Mode</td><td>Intelligently identifies missing information, collects user requirements through multiple rounds of follow-up questions, completes complex task planning</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/5_supervisor">adk/human-in-the-loop/5_supervisor</a></td><td>Supervisor + Approval</td><td>Supervisor multi-Agent mode combined with approval mechanism, sensitive operations require human confirmation</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/6_plan-execute-replan">adk/human-in-the-loop/6_plan-execute-replan</a></td><td>Plan-Execute-Replan + Review Edit</td><td>Plan-Execute-Replan mode combined with parameter review and editing, supporting reservation parameter modification</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/7_deep-agents">adk/human-in-the-loop/7_deep-agents</a></td><td>Deep Agents + Follow-up</td><td>Deep Agents mode combined with follow-up mechanism, proactively collecting user preferences before analysis</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/human-in-the-loop/8_supervisor-plan-execute">adk/human-in-the-loop/8_supervisor-plan-execute</a></td><td>Nested Multi-Agent + Approval</td><td>Supervisor nested with Plan-Execute-Replan sub-Agent, supporting deep nested interrupts</td></tr>
</table>

### Multi-Agent

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/supervisor">adk/multiagent/supervisor</a></td><td>Supervisor Agent</td><td>Basic Supervisor multi-Agent mode, coordinating multiple sub-Agents to complete tasks</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/layered-supervisor">adk/multiagent/layered-supervisor</a></td><td>Layered Supervisor</td><td>Multi-layer Supervisor nesting, one Supervisor as sub-Agent of another</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/plan-execute-replan">adk/multiagent/plan-execute-replan</a></td><td>Plan-Execute-Replan</td><td>Plan-Execute-Replan mode, supporting dynamic adjustment of execution plans</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-project-manager">adk/multiagent/integration-project-manager</a></td><td>Project Manager</td><td>Project management example using Supervisor mode, including Coder, Researcher, Reviewer</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/deep">adk/multiagent/deep</a></td><td>Deep Agents (Excel Agent)</td><td>Intelligent Excel assistant, step-by-step understanding and processing Excel files, supporting Python code execution</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/multiagent/integration-excel-agent">adk/multiagent/integration-excel-agent</a></td><td>Excel Agent (ADK Integration)</td><td>ADK integrated Excel Agent, including Planner, Executor, Replanner, Reporter</td></tr>
</table>

### GraphTool

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool">adk/common/tool/graphtool</a></td><td>GraphTool Package</td><td>Toolkit for wrapping Graph/Chain/Workflow as Agent tools</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/1_chain_summarize">adk/common/tool/graphtool/examples/1_chain_summarize</a></td><td>Chain Document Summary</td><td>Document summarization tool using compose.Chain</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/2_graph_research">adk/common/tool/graphtool/examples/2_graph_research</a></td><td>Graph Multi-source Research</td><td>Parallel multi-source search and streaming output using compose.Graph</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/3_workflow_order">adk/common/tool/graphtool/examples/3_workflow_order</a></td><td>Workflow Order Processing</td><td>Order processing using compose.Workflow, combined with approval mechanism</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/adk/common/tool/graphtool/examples/4_nested_interrupt">adk/common/tool/graphtool/examples/4_nested_interrupt</a></td><td>Nested Interrupt</td><td>Demonstrates dual-layer interrupt mechanism with outer approval and inner risk control</td></tr>
</table>

---

## 🔗 Compose (Orchestration)

### Chain

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/chain">compose/chain</a></td><td>Chain Basic Example</td><td>Demonstrates how to use compose.Chain for sequential orchestration, including Prompt + ChatModel</td></tr>
</table>

### Graph

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/simple">compose/graph/simple</a></td><td>Simple Graph</td><td>Basic Graph usage example</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/state">compose/graph/state</a></td><td>State Graph</td><td>Graph example with state</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/tool_call_agent">compose/graph/tool_call_agent</a></td><td>Tool Call Agent</td><td>Building a tool-calling Agent using Graph</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/tool_call_once">compose/graph/tool_call_once</a></td><td>Single Tool Call</td><td>Demonstrates single tool call Graph implementation</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/two_model_chat">compose/graph/two_model_chat</a></td><td>Two Model Chat</td><td>Graph example of two models chatting with each other</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/async_node">compose/graph/async_node</a></td><td>Async Node</td><td>Demonstrates async Lambda nodes, including report generation and real-time transcription scenarios</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/graph/react_with_interrupt">compose/graph/react_with_interrupt</a></td><td>ReAct + Interrupt</td><td>Ticket booking scenario, demonstrating Interrupt and Checkpoint practices</td></tr>
</table>

### Workflow

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/1_simple">compose/workflow/1_simple</a></td><td>Simple Workflow</td><td>Simplest Workflow example, equivalent to Graph</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/2_field_mapping">compose/workflow/2_field_mapping</a></td><td>Field Mapping</td><td>Demonstrates Workflow field mapping functionality</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/3_data_only">compose/workflow/3_data_only</a></td><td>Data Only Flow</td><td>Data-only Workflow example</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/4_control_only_branch">compose/workflow/4_control_only_branch</a></td><td>Control Flow Branch</td><td>Control-only branch example</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/5_static_values">compose/workflow/5_static_values</a></td><td>Static Values</td><td>Demonstrates how to use static values in Workflow</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/workflow/6_stream_field_map">compose/workflow/6_stream_field_map</a></td><td>Stream Field Mapping</td><td>Field mapping in streaming scenarios</td></tr>
</table>

### Batch

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/compose/batch">compose/batch</a></td><td>BatchNode</td><td>Batch processing component, supporting concurrency control and interrupt recovery, suitable for document batch review scenarios</td></tr>
</table>

---

## 🌊 Flow

### ReAct Agent

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react">flow/agent/react</a></td><td>ReAct Agent</td><td>Basic ReAct Agent example, restaurant recommendation scenario</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react/memory_example">flow/agent/react/memory_example</a></td><td>Short-term Memory</td><td>Short-term memory implementation for ReAct Agent, supporting memory and Redis storage</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react/dynamic_option_example">flow/agent/react/dynamic_option_example</a></td><td>Dynamic Options</td><td>Dynamically modify Model Option at runtime, controlling thinking mode and tool selection</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/react/unknown_tool_handler_example">flow/agent/react/unknown_tool_handler_example</a></td><td>Unknown Tool Handler</td><td>Handling unknown tool calls generated by model hallucination, improving Agent robustness</td></tr>
</table>

### Multi-Agent

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/host/journal">flow/agent/multiagent/host/journal</a></td><td>Journal Assistant</td><td>Host Multi-Agent example, supporting writing journals, reading journals, answering questions based on journals</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/multiagent/plan_execute">flow/agent/multiagent/plan_execute</a></td><td>Plan-Execute</td><td>Plan-Execute mode Multi-Agent example</td></tr>
</table>

### Complete Application Examples

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/manus">flow/agent/manus</a></td><td>Manus Agent</td><td>Manus Agent implemented based on Eino, referencing OpenManus project</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/flow/agent/deer-go">flow/agent/deer-go</a></td><td>Deer-Go</td><td>Go language implementation referencing deer-flow, supporting research team collaboration state graph transitions</td></tr>
</table>

---

## 🧩 Components

### Model

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/model/abtest">components/model/abtest</a></td><td>A/B Test Routing</td><td>Dynamic routing ChatModel, supporting A/B testing and model switching</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/model/httptransport">components/model/httptransport</a></td><td>HTTP Transport Logging</td><td>cURL-style HTTP request logging, supporting streaming responses and sensitive information masking</td></tr>
</table>

### Retriever

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/retriever/multiquery">components/retriever/multiquery</a></td><td>Multi-query Retrieval</td><td>Using LLM to generate multiple query variants, improving retrieval recall</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/retriever/router">components/retriever/router</a></td><td>Router Retrieval</td><td>Dynamically routing to different retrievers based on query content</td></tr>
</table>

### Tool

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/jsonschema">components/tool/jsonschema</a></td><td>JSON Schema Tool</td><td>Demonstrates how to define tool parameters using JSON Schema</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/mcptool/callresulthandler">components/tool/mcptool/callresulthandler</a></td><td>MCP Tool Result Handler</td><td>Demonstrates custom handling of MCP tool call results</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/errorremover">components/tool/middlewares/errorremover</a></td><td>Error Remover Middleware</td><td>Tool call error handling middleware, converting errors to friendly prompts</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/tool/middlewares/jsonfix">components/tool/middlewares/jsonfix</a></td><td>JSON Fix Middleware</td><td>Fixing malformed JSON parameters generated by LLM</td></tr>
</table>

### Document

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/document/parser/customparser">components/document/parser/customparser</a></td><td>Custom Parser</td><td>Demonstrates how to implement a custom document parser</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/document/parser/extparser">components/document/parser/extparser</a></td><td>Extension Parser</td><td>Using extension parser to handle HTML and other formats</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/document/parser/textparser">components/document/parser/textparser</a></td><td>Text Parser</td><td>Basic text document parser example</td></tr>
</table>

### Prompt

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/prompt/chat_prompt">components/prompt/chat_prompt</a></td><td>Chat Prompt</td><td>Demonstrates how to use Chat Prompt templates</td></tr>
</table>

### Lambda

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/components/lambda">components/lambda</a></td><td>Lambda Component</td><td>Lambda function component usage example</td></tr>
</table>

---

## 🚀 QuickStart

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/chat">quickstart/chat</a></td><td>Chat QuickStart</td><td>Most basic LLM conversation example, including templates, generation, streaming output</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/eino_assistant">quickstart/eino_assistant</a></td><td>Eino Assistant</td><td>Complete RAG application example, including knowledge indexing, Agent service, Web interface</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/quickstart/todoagent">quickstart/todoagent</a></td><td>Todo Agent</td><td>Simple Todo management Agent example</td></tr>
</table>

---

## 🛠️ DevOps

<table>
<tr><td>Directory</td><td>Name</td><td>Description</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/devops/debug">devops/debug</a></td><td>Debug Tools</td><td>Demonstrates how to use Eino's debugging features, supporting Chain and Graph debugging</td></tr>
<tr><td><a href="https://github.com/cloudwego/eino-examples/tree/main/devops/visualize">devops/visualize</a></td><td>Visualization Tools</td><td>Rendering Graph/Chain/Workflow as Mermaid diagrams</td></tr>
</table>

---

## 📚 Related Resources

- **Eino Framework**: [https://github.com/cloudwego/eino](https://github.com/cloudwego/eino)
- **Eino Extension Components**: [https://github.com/cloudwego/eino-ext](https://github.com/cloudwego/eino-ext)
- **Official Documentation**: [https://www.cloudwego.io/docs/eino/](https://www.cloudwego.io/docs/eino/)
