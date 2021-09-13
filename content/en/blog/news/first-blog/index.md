---
date: 2021-09-13
title: "CloudWeGo Open Source Announcement"
linkTitle: "CloudWeGo Open Source Announcement"
description: "ByteDance now offers open source through CloudWeGo！"
author: ByteDance Architecture Team
---

## Background

ByteDance is proud to announce the launch of open source software [CloudWeGo](https://github.com/cloudwego).  Focusing on microservice communication and governance, it offers high performance, strong extensibility, and high reliability which enables quick construction of an enterprise-level cloud native architecture.

ByteDance uses Golang as its main development language, and supports the reliable communication of tens of thousands of Golang microservices. We are experienced in microservices after practicing under massive traffic, and so we decided to offer open source software in order to enrich the community's ecology. 

We have built the CloudWeGo project to gradually open source the internal microservices system and try to make the projects friendly to external users, and our internal projects will also use this open source project as a library for iterative development. CloudWeGo will follow a key principle of maintaining one set of code internally and externally, iterating them as a whole. As we needed to migrate our internal users to open source libraries transparently, we did not initially pursue any publicity. However, it has been gratifying to see Kitex gain 1.2k stars and Netpoll gain 700+ stars within one month organically.

CloudWeGo is not only an external open source project, but also a real ultra-large-scale enterprise-level practice project.

We look forward to enriching the Golang product system of the cloud native community through CloudWeGo and helping other companies to build cloud-native architectures in a rapid and convenient way. We also hope to attract developers in the open source community, to maintain and improve this project together, provide support for multiple scenarios, and enrich product capabilities.

Because the projects under CloudWeGo depend on many internal basic tool libraries, we also open source the basic Golang tool libraries used internally, and maintain them in [bytedance/gopkg](https://github.com/bytedance/gopkg).

## CloudWeGo

To begin with, the two main projects included within CloudWeGo are the [Kitex](https://github.com/cloudwego/kitex) RPC framework and the [Netpoll](https://github.com/cloudwego/netpoll) network library. We chose not to publicise these projects prematurely, to ensure our open source technologies were ready and had sufficient verification upon launch. 

### Kitex

Kitex [kaɪt'eks] is a **high-performance** and **strong-extensibility** Golang RPC framework used in Bytedance.  Before Kitex, the internal Golang framework was Kite, which was strongly coupled with Thrift - the code generation part of which covered intricate logic in the code.

Due to these factors, it was difficult to optimize the framework from the network model or codec level. 

Adding new features will inevitably lead to more bloated code and would have hindered the iteration process. Instead we designed a new framework, Kitex, to address these concerns. Although Kitex is a new framework, it has been applied online internally for more than a year. At present, more than 50% of Golang microservices in Bytedance use Kitex.

Features of Kitex include:

- High Performance

Kitex integrates Netpoll, a high-performance network library which offers significant performance advantage over [go net](https://pkg.go.dev/net). Kitex also makes some optimizations on the codec of Thrift, details of which can be found [here](https://mp.weixin.qq.com/s/Xoaoiotl7ZQoG2iXo9_DWg). Users can also refer to this [website](https://github.com/cloudwego/kitex-benchmark) for performance results.

- Extensibility

Kitex employs a modular design and provides many interfaces with default implementation for users to customize. Users can then extend or inject them into Kitex to fulfill their needs. Please refer to the official [doc](https://www.cloudwego.io/docs/tutorials/framework-exten/) for the extensibility of Kitex. For their network library, developers can freely choose other network libraries aside from netpoll.

- Multi-message Protocol

Regarding the RPC message protocol, Kitex supports **Thrift**, **Kitex Protobuf** and **gRPC** by default. For Thrift, it supports two binary protocols, Buffered and Framed. Kitex Protobuf is a Kitex custom Protobuf messaging protocol with a protocol format similar to Thrift. The gRPC message protocol enables Kitex to interact with gRPC. Additionally, Kitex allows developers to extend their own messaging protocols.

- Multi-transport Protocol

The transport protocol encapsulates the message protocol for RPC communication and is able to transparently transmit meta-information used for service governance. Kitex supports two transport protocols, **TTHeader** and **HTTP2**. TTHeader can be used in conjunction with Thrift and Kitex Protobuf. At present, HTTP2 is mainly used in combination with the gRPC protocol, and will support Thrift in the future.

- Multi-message Type

Kitex supports **PingPong**, **One-way**, and **Bidirectional Streaming**. Among them, One-way currently only supports Thrift protocol, two-way Streaming only supports gRPC, and Kitex will support Thrift's two-way Streaming in the future.

- Service Governance

Kitex integrates service governance modules such as service registry, service discovery, load balancing, circuit breaker, rate limiting, retry, monitoring, tracing, logging, diagnosis, etc. Most of these modules have been provided with default extensions, and users can make their choice of modules to integrate.

- Code Generation

Kitex has built-in code generation tools that support generating **Thrift**, **Protobuf**, and scaffold code. The original Thrift code is generated by Thriftgo, which is now open sourced. Kitex's optimization of Thrift is supported by Kitex Tool as a plugin. Protobuf code is generated by Kitex as an official protoc plugin. Currently, Protobuf IDL parsing and code generation are not separately supported.

### Netpoll

Netpoll is a high-performance, non-blocking I/O networking framework which focuses on RPC scenarios, developed by ByteDance.

RPC is usually heavy on processing logic, including business logic and codec, and therefore cannot handle I/O serially like Redis. However, Go's standard library [net](https://github.com/golang/go/tree/master/src/net) is designed for blocking I/O APIs, so that the RPC framework can only follow the One Conn One Goroutine design. It increases cost for context switching due to a large number of goroutines under high concurrency. Moreover, [net.Conn](https://github.com/golang/go/blob/master/src/net/net.go) has no API to check Alive, so it is difficult to make an efficient connection pool for the RPC framework, because there may be a large number of failed connections in the pool.

On the other hand, the open source community currently lacks Go network libraries that focus on RPC scenarios. Similar repositories such as evio and gnet are focused on scenarios like Redis and Haproxy.

Netpoll has been designed to solve these problems. It draws inspiration from the design of [evio](https://github.com/tidwall/evio) and [netty](https://github.com/netty/netty), achieves excellent [performance](https://github.com/cloudwego/netpoll#performance) and is more suitable for microservice architecture. Netpoll also provides a number of [Features](https://github.com/cloudwego/netpoll#features). Developers are recommended to use Netpoll as the network library of the RPC framework.

### Thriftgo

Thriftgo is an implementation of [thrift](https://thrift.apache.org/docs/idl) compiler in go language that supports complete syntax and semantic checking of Thrift IDL. 

Compared with the official Golang code generation by Apache Thrift, Thriftgo made some bug fixes and supports a plugin mechanism. Users can customize the generated code according to their needs.

Thriftgo is the code generation tool of Kitex. CloudWeGo will soon opensource **thrift-gen-validator**, a plugin of Thriftgo that supports IDL Validator and is used for field verification, which is not provide by Thrift. With the IDL Validator, developers do not need to implement code verification logic by themselves.

Although Thriftgo currently only supports the generation of Golang Thrift code, it is positioned to support Thrift code generation in various languages. If there is a need in future, we will also consider supporting code generation for other programming languages. At the same time, we will try to contribute Thriftgo to the Apache Thrift community.


## Maintenance 

A complete microservice system builds upon a basic cloud ecosystem. No matter how the microservices are developed; based on the public cloud, a private cloud or your own infrastructure, additional services (including service governance platform, monitoring, tracing, service registry and discovery, configuration and service mesh etc) and some customized standards are needed to provide better service governance. At Bytedance we have complete internal services to support the microservice system, but these services cannot be open source in the short term. So, how will CloudWeGo maintain a set of code internally and externally, and iterate them as a whole?

Projects in CloudWeGo are not coupled with the internal ecology. For example, Netpoll is directly migrated to open source libraries, and our internal dependencies are adjusted to open source libraries.

Kitex's code is split into two parts, including the core of Kitex which has been migrated to the open source library, and the encapsulated internal library which will provide transparent upgrades for internal users.

For open source users who use Kitex, they can also extend Kitex and integrate Kitex into their own microservice system. We hope, and expect, that more developers will contribute their own extensions to [kitex-contrib](https://github.com/kitex-contrib), providing help and convenience for more users.

## Future directions 

  - Open source other internal projects

We will continue to open source other internal projects, such as HTTP framework **Hertz**, shared memory-based IPC communication library **ShmIPC** and others, to provide more support for microservice scenarios.

  - Open source verified and stable features

The main projects of CloudWeGo provide support for internal microservices of Bytedance. New features are usually verified internally, and we will gradually open source them when they are relatively mature, such as the integration of **ShmIPC**, **no serialization**, and **no code generation**.

  - Combine internal and external needs and iterate

After launching open source software, in addition to supporting internal users we also hope that CloudWeGo can provide good support for external users and help everyone quickly build their own microservice system. As such, we will iterate based on the needs of both internal and external users.

Following initial feedback, users have shown a stronger demand for Protobuf. Although Kitex supports multiple protocols, the internal RPC communication protocol of Bytedance is Thrift. Protobuf, Kitex Protobuf or compatibility with gRPC is supported only to fulfill the needs of a small number of internal users, so performance [for Protobuf] has not been optimized yet. In terms of code generation, we have not made any optimizations, and currently utilize Protobuf's official binary directly. 

Gogo/protobuf is an excellent open source library that optimizes Protobuf serialization performance based on generated code, but unfortunately the library is currently out of maintenance, which is why Kitex did not choose gogo. 
In order to meet the growing needs of developers, we are planning to carry out Kitex's performance optimization for Protobuf support.

You are welcome to submit issues and PRs to build CloudWeGo together. We are excited for more developers to join, and also look forward to CloudWeGo helping more and more companies quickly build cloud-native architectures. If any corporate customers want to employ CloudWeGo in your internal projects, we can provide technical support. Feel free to raise an issue in [Github](https://github.com/cloudwego) if you have any questions. 

