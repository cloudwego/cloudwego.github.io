---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >
  
---

# CloudWeGo-Kitex

Kitex [kaɪt'eks] is a Golang-based, scalable and performant RPC framework that can help developers build microservices. As more and more organizations are now choosing Golang, if you have requirements for microservice performance and want to do some customization, Kitex will be a good choice.

## Basic Features

- **High performance**

Kitex supports [Netpoll](https://github.com/cloudwego/netpoll), a self-developed high-performance network library, which has significant performance advantages over go net.

- **Scalability**

Kitex provides more extension interfaces and default extension implementations. Developers can also customize extensions according to their own needs (please refer to the framework extension section below).

- **Multi-message protocol**

Kitex is designed to be extensible to support multiple RPC messaging protocols. The initial release contains support for **Thrift**, **Kitex Protobuf** and **gRPC**, in which Kitex Protobuf is a Kitex custom Protobuf messaging protocol with a protocol format similar to Thrift. Kitex also supports developers extending their own messaging protocols.

- **Multi-transport protocol**

For service governance, Kitex supports **TTHeader** and **HTTP2**. TTHeader can be used in conjunction with Thrift and Kitex Protobuf; HTTP2 is currently mainly used with the gRPC protocol, and it will support Thrift in the future.

- *Multi-interaction*

Kitex supports **PingPong**, **one-way**, and **two-way Streaming**. Among them, One-way currently only supports Thrift protocol, two-way Streaming only supports gRPC, and Kitex will support Thrift's two-way Streaming in the future.

- **Service Governance**

Kitex integrates service governance modules such as service registry, service discovery, load balancing, fusing, current limiting, retry, monitoring, link tracking, logging, diagnostics, etc. Most of these have been provided with default extensions, and users can choose to integrate.

- **Code generation**

Kitex has built-in code generation tools that support generating **Thrift**, **Protobuf**, and scaffold code.

