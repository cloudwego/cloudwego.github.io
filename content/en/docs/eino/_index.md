---
Description: Eino is an AI application development framework based on Golang
date: "2025-02-21"
lastmod: ""
linktitle: Eino
menu:
    main:
        parent: Documentation
        weight: 6
tags: []
title: 'Eino: User Manual'
weight: 6
---

> Eino pronunciation: US / 'aino /, approximate sound: i know, with the hope that the application can achieve the vision of "i know"

## What is Eino

> 💡
> Eino：An AI  Application Development Framework Built with Go

Eino aims to provide an AI  application development framework built with Go. Eino refers to many excellent AI application development frameworks in the open-source community, such as LangChain, LangGraph, LlamaIndex, etc., and provides an AI application development framework that is more in line with the programming habits of Golang.

Eino provides rich capabilities such as **atomic components**, **integrated components**, **component orchestration**, and **aspect extension** that assist in AI application development, which can help developers more simply and conveniently develop AI applications with a clear architecture, easy maintenance, and high availability.

Take ReactAgent as an example:

- It provides common components such as ChatModel, ToolNode, and PromptTemplate, and the business can be customized and extended.
- Flexible orchestration can be performed based on existing components to generate integrated components for use in business services.

<a href="/img/eino/en_eino_graph_2.png" target="_blank"><img src="/img/eino/en_eino_graph_2.png" width="100%" /></a>

## Eino Components

> One of Eino's goals is: to collect and improve the component system in the context of AI applications, so that the business can easily find some common AI components, facilitating the iteration of the business.
>
> Eino will provide components with a relatively good abstraction around the scenarios of AI applications, and provide some common implementations around this abstraction.

- The abstract definition of Eino components is in: [eino/components](https://github.com/cloudwego/eino/tree/main/components)
- The implementation of Eino components is in: [eino-ext/components](https://github.com/cloudwego/eino-ext/tree/main/components)

## Eino application scenarios

Thanks to the lightweight and in-field affinity properties of Eino, users can introduce powerful large model capabilities to their existing microservices with just a few lines of code, allowing traditional microservices to evolve with AI genes.

When people hear the term "Graph Orchestration", their first reaction might be to segment and layer the implementation logic of the entire application interface, and convert it into an orchestratable Node. The biggest problem encountered in this process is the issue of **long-distance context passing (variable passing across Node nodes)**, whether using the State of Graph/Chain or using Options for transparent passing, the entire orchestration process is extremely complex, far from being as simple as directly making function calls.

Based on the current Graph orchestration capabilities, the scenarios suitable for orchestration have the following characteristics:

- The overall focus is on the semantic processing-related capabilities of the model. Here, semantics are not limited to modalities.
- In orchestration output, there are very few nodes related to Session. Overall, the vast majority of nodes do not have processing logic at the granularity of unenumerable business entities such as users/devices.
  - Whether through the State of Graph/Chain or through CallOptions, the methods for reading, writing, or transparently passing user/device granularity information are not convenient.
- Require common aspect capabilities, and build horizontal governance capabilities such as observation, rate limiting, and evaluation based on this.

What is the significance of orchestration: To aggregate, control, and present the context of long-distance orchestration elements in a fixed paradigm.

- Context of long-distance orchestration elements: Generally, orchestration elements are scattered throughout the system of the entire orchestration product, making it difficult for people to have a macroscopic and overall cognition. The role of orchestration is to gather and present this macroscopic information.
- Aggregation control and presentation: It is to easily organize and control the relationship between orchestration elements, facilitating adjustment and display.

Overall, the scenarios where "Graph Orchestration" is applicable are: business-customized AI integration components. That is, to flexibly orchestrate AI-related atomic capabilities and provide simple and easy-to-use scenario-based AI components. Moreover, in this AI component, there is a unified and complete horizontal governance capability.

- When generating the corresponding AI component, the core is to provide common cross-cutting capabilities.
- The logic inside a service interface: Generally speaking, the responsibilities are relatively single, the distribution is relatively concentrated, and the context is relatively cohesive. It does not match the applicable scenarios of "orchestration". The AI integration component can be used as an SDK in the business interface.
- Recommended usage methods

<a href="/img/eino/en_eino_recommend_using_graph.png" target="_blank"><img src="/img/eino/en_eino_recommend_using_graph.png" width="100%" /></a>

- A more challenging approach -- 【Node orchestration of the entire business process】
- Biz Handler typically focuses on business logic and has a relatively light focus on data flow, and is more suitable for development in a function stack call manner.
  - If the logical division and combination are carried out in a graph orchestration manner, it will increase the difficulty of business logic development.

<a href="/img/eino/en_eino_not_recommend_of_biz.png" target="_blank"><img src="/img/eino/en_eino_not_recommend_of_biz.png" width="100%" /></a>
