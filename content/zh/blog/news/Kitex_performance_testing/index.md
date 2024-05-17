---
date: 2021-11-24
title: "RPC 框架 Kitex 实践入门：性能测试指南"
projects: ["Kitex"]
linkTitle: "RPC 框架 Kitex 实践入门：性能测试指南"
keywords: ["Kitex", "性能测试", "压测", "RPC"]
description: "本文介绍了如何使用 Kitex 进行性能测试，以及如何分析测试结果，有助于用户更好地结合真实 RPC 场景对 Kitex 进行调优，使之更贴合业务需要、发挥最佳性能。"
author: <a href="https://github.com/joway" target="_blank">Joway</a>
---

日前，字节跳动服务框架团队正式开源 CloudWeGo ，在抖音、今日头条均有深度应用的 Golang 微服务 RPC 框架 [Kitex][Kitex] 也包含在其中。

本文旨在分享开发者在压测 [Kitex][Kitex] 时需要了解的场景和技术问题。这些建议有助于用户更好地结合真实 RPC 场景对 [Kitex][Kitex] 进行调优，使之更贴合业务需要、发挥最佳性能。用户也可以参考官方提供的压测项目 [kitex-benchmark](https://github.com/cloudwego/kitex-benchmark) 了解更多细节。

## 微服务场景的特点

[Kitex][Kitex] 诞生于字节跳动大规模微服务架构实践，面向的场景自然是微服务场景，因此下面会先介绍微服务的特点，方便开发者深入理解 [Kitex][Kitex] 在其中的设计思考。

- RPC 通信模型

  微服务间的通信通常以 PingPong 模型为主，所以除了常规的吞吐性能指标外，每次 RPC 的平均时延也是开发者需要考虑的点。

- 复杂的调用链路

  一次 RPC 调用往往需要多个微服务协作完成，而下游服务又会有其自身依赖，所以整个调用链路会是一个复杂的网状结构。
  在这种复杂调用关系中，某个中间节点出现的延迟波动可能会传导到整个链路上，导致整体超时。当链路上的节点足够多时，即便每个节点的波动概率很低，最终汇聚到链路上的超时概率也会被放大。
  所以单一服务的延迟波动 —— 即 P99 延迟指标，也是一个会对线上服务产生重大影响的关键指标。

- 包体积大小

  虽然一个服务通信包的大小取决于实际业务场景，但在字节跳动的内部统计中，我们发现线上请求大多以小包（<2KB）为主，所以在兼顾大包场景的同时，也重点优化了小包场景下的性能。

## 针对微服务场景进行压测

### 确定压测对象

衡量一个 RPC 框架的性能需要从两个视角分别去思考：Client 视角与 Server 视角。在大规模的业务架构中，上游 Client 不见得使用的也是下游的框架，而开发者调用的下游服务也同样如此，如果再考虑到 Service Mesh 的情况就更复杂了。

一些压测项目通常会把 Client 和 Server 进程混部进行压测，然后得出**整个框架**的性能数据，这其实和线上实际运行情况很可能是不符的。

如果要压测 Server，应该给 Client 尽可能多的资源，把 Server 压到极限，反之亦然。如果 Client 和 Server 都只给了 4 核 CPU 进行压测，会导致开发者无法判断最终得出来的性能数据是哪个视角下的，更无法给线上服务做实际的参考。

### 对齐连接模型

常规 RPC 的连接模型主要有三种：

- **短连接**：每次请求都创建新连接，得到返回后立即关闭连接
- **长连接池**：单个连接同时只能处理一次完整请求与返回
- **连接多路复用**：单个连接可以同时异步处理多个请求与返回

每类连接模型没有绝对好坏，取决于实际使用场景。连接多路复用虽然一般来说性能相对最好，但应用上必须依赖协议能够支持包序列号，且一些老框架服务可能也并不支持多路复用的方式调用。

[Kitex][Kitex] 最早为保证最大程度的兼容性，在 Client 端默认使用了短连接，而其他主流开源框架默认使用连接多路复用，这导致一些用户在使用默认配置压测时，出现了比较大的性能数据偏差。

后来为了契合开源用户的常规使用场景，[Kitex][Kitex] 在 v0.0.2 中也加入了[默认使用长连接](https://github.com/cloudwego/kitex/pull/40/files)的设置。

### 对齐序列化方式

对于 RPC 框架来说，不考虑服务治理的话，计算开销主要都集中在序列化与反序列化中。

[Kitex][Kitex] 对于 Protobuf 的序列化使用的是官方的 [Protobuf](https://github.com/golang/protobuf) 库，对于 Thrift 的序列化，则专门进行了性能优化，这方面的内容在[官网博客](/zh/blog/2021/09/23/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8-go-rpc-%E6%A1%86%E6%9E%B6-kitex-%E6%80%A7%E8%83%BD%E4%BC%98%E5%8C%96%E5%AE%9E%E8%B7%B5/#thrift-%E5%BA%8F%E5%88%97%E5%8C%96%E5%8F%8D%E5%BA%8F%E5%88%97%E5%8C%96%E4%BC%98%E5%8C%96)中有介绍。

当前开源框架大多优先支持 Protobuf，而部分框架内置使用的 Protobuf 其实是做了许多性能优化的 [gogo/protobuf](https://github.com/gogo/protobuf) 版本，但由于 gogo/protobuf 当前有[失去维护的风险](https://github.com/gogo/protobuf/issues/691)，所以出于可维护性角度考虑，我们依然决定只使用官方的 Protobuf 库，当然后续我们也会计划对 Protobuf 进行优化。

### 使用独占 CPU

虽然线上应用通常是多个进程共享 CPU，但在压测场景下，Client 与 Server 进程都处于极端繁忙的状况，如果同时还共享 CPU 会导致大量上下文切换，从而使得数据缺乏可参考性，且容易产生前后很大波动。

所以我们建议是将 Client 与 Server 进程隔离在不同 CPU 或者不同独占机器上进行。如果还想要进一步避免其他进程产生影响，可以再加上 nice -n -20 命令调高压测进程的调度优先级。

另外如果条件允许，相比云平台虚拟机，使用真实物理机会使得测试结果更加严谨与具备可复现性。

## 性能数据参考

在满足上述要求的前提下，我们对多个框架使用 Protobuf 进行了压测对比，压测代码在 kitex-benchmark 仓库。在充分压满 Server 的目标下，[Kitex][Kitex] 在连接池模式下的 P99 Latency 在所有框架中最低。而在多路复用模式下，Kitex 在各指标上也都具有更加明显的优势。

**配置：**

- Client 16 CPUs，Server 4 CPUs
- 1KB 请求大小，Echo 场景

**参考数据：**

- KITEX：连接池模式（默认模式）
- KITEX-MUX：多路复用模式
- 其他框架均使用多路复用模式

![image](/img/blog/kitex_performance_testing/qps.png)
![image](/img/blog/kitex_performance_testing/tp99.png)

## 结语

在当前主流的 Golang 开源 RPC 框架中，每个框架其实在设计目标上都各有侧重：有些框架侧重于通用性，有些侧重于类似 Redis 这种轻业务逻辑的场景，有些侧重于吞吐性能，而有些则更侧重 P99 时延。

字节跳动的业务在日常迭代中，常常会出现因某个 feature 导致一个指标上升，另一个指标下降的情况，因此 [Kitex][Kitex] 在设计之初就更倾向于解决大规模微服务场景下各种问题。

[Kitex][Kitex] 发布后，我们接到了大量来自用户的自测数据，感谢社区对我们的关注和支持，也欢迎广大开发者基于本文提供的测试指南，针对自己的实际场景选择合适的工具。更多问题，请在 GitHub 上提 Issue 交流。

## 相关链接

- Kitex: https://github.com/cloudwego/kitex

- Netpoll: https://github.com/cloudwego/netpoll

- kitex-benchmark: https://github.com/cloudwego/kitex-benchmark

- netpoll-benchmark: https://github.com/cloudwego/netpoll-benchmark

- 官方 Protobuf 库: https://github.com/golang/protobuf

- Thriftgo: https://github.com/cloudwego/thriftgo

[Kitex]: https://github.com/cloudwego/kitex
