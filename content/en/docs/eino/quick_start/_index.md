---
Description: ""
date: "2025-02-11"
lastmod: ""
tags: []
title: 'Eino: Quick start'
weight: 2
---

## **Brief Description**

Eino offers various component abstractions for AI application development scenarios and provides multiple implementations, making it **very simple** to quickly develop an application using Eino. This directory provides several of the most common AI-built application examples to help you get started with Eino quickly.

These small applications are only for getting started quickly. For a more detailed introduction and examples of individual capabilities, please refer to specialized documents such as [Eino: Components](/docs/eino/core_modules/components) and [Eino: Chain & Graph Orchestration](/docs/eino/core_modules/chain_and_graph_orchestration).

> 💡
> Usage instructions for Fornax Trace (Fornax Observation):
>
> Eino's observation capability is implemented by default based on [Fornax Trace](https://fornax.bytedance.net/space) (the following examples do not include the code for enabling observation)
>
> - When using Chain/Graph orchestration, a global EinoCallback aspect can be registered to report the input and output related information of the node in the form of Trace. For details on the usage, please refer to: [Eino: Callback Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual).
> - When only using Eino components without using Eino orchestration, it is necessary to manually inject Callback Manager information through callbacks.InitCallbacks when calling the component to enable the Trace reporting capability of the component aspect (only for components that have implemented the component aspect). For details on the usage, please refer to: [Eino: Callback Manual](/docs/eino/core_modules/chain_and_graph_orchestration/callback_manual).

## **Quick Start Examples**

### **Example: Simplest LLM Application**

In AI applications, the most basic scenario is the prompt + chat model scenario, which is also the most important feature provided by various AI application platforms on the Internet. You can define a `System Prompt` to constrain LLM's response logic, such as "You are playing the role of XXX". In this example, you can use Eino's `PromptTemplate` component and `ChatModel` component to build a role-playing application.

- [Implement an easy LLM application](/docs/eino/quick_start/simple_llm_application)

### **Example: Create an Agent**

An LLM is the brain of AI, whose core is understanding natural language and responding to it. A (text) LLM itself can only receive a piece of text and then output a piece of text. When you want the LLM to use some tools to obtain the required information or perform some actions on its own, you need to use `Tool`. An LLM with Tool is like having hands and feet, which can interact with the existing IT infrastructure, such as "calling an HTTP interface to check the weather and then reminding you what clothes to wear based on the weather". This requires the LLM to call a "search tool" to query information.

We usually refer to the system that can call relevant tools based on the LLM's output as an "Agent".

In Eino, you can implement an Agent using ChatModel + ToolsNode alone, or you can use packaged `react agent` and `multi agent`.

In this example, we will use a react agent to build an agent that can interact with the real world.

- [Agent-Enable LLM to have hands](/docs/eino/quick_start/agent_llm_with_tools)

## **Next Steps**

- Understand the core modules and concepts of Eino: [Eino: Core Modules](/docs/eino/core_modules), which is crucial information for mastering the use of Eino for application development.
- Eino maintains an open ecosystem stance and provides a large number of ecosystem integration components: [Eino: ecosystem](/docs/eino/ecosystem). You can use these components to quickly build your own business applications.


If you find this project is good and helpful, please give [Eino](https://github.com/cloudwego/eino) a star! Your support will be our greatest encouragement!  
If you have any questions or suggestions, feel free to leave a message in [GitHub Issues](https://github.com/cloudwego/eino/issues).
