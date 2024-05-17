---
title: "概览"
linkTitle: "概览"
weight: 1
keywords: ["RPC", "Rust", "Volo", "AFIT", "RPITIT"]
description: "Volo 架构设计、框架特性、相关生态简介。"
---

## Volo

Volo 是字节跳动服务框架团队研发的轻量级、高性能、可扩展性强、易用性好的 Rust RPC 框架，使用了 Rust 最新的 AFIT 和 RPITIT 特性。

Volo 使用 [Motore](https://github.com/cloudwego/motore) 作为中间件抽象层，Motore 基于 AFIT 和 RPITIT 设计。

## 架构图

![Volo](/img/docs/volo.png)

## 特性

### 基于 AFIT 和 RPITIT 设计

我们热爱并追随最新的技术，Volo 的核心抽象使用了 Rust 最新的 AFIT 和 RPITIT 特性，在这个过程中我们也借鉴了 [Tower](https://github.com/tower-rs/tower) 的设计。
Tower 是一个非常优秀的抽象层设计，适用于目前的 stable rust 的情况下，非常感谢 Tower 团队。

通过 AFIT 和 RPITIT，我们可以避免很多不必要的 `Box` 内存分配，以及提升易用性，给用户提供更友好的编程接口和更符合人体工程学的编程范式。

### 高性能

Rust 以高性能和安全著称，我们在设计和实现过程中也时刻以高性能作为我们的目标，尽可能降低每一处的开销，提升每一处实现的性能。

首先要说明，**和 Go 的框架对比性能是极不公平的**，因此我们不会着重比较 Volo 和 Kitex 的性能，并且我们给出的数据仅能作为参考，希望大家能够客观看待；
同时，由于在开源社区并没有找到另一款成熟的 Rust 语言的 Async 版本 Thrift RPC 框架，而且性能对比总是容易引战，因此我们希望尽可能弱化性能数据的对比，仅会公布我们自己极限 QPS 的数据。

在和 Kitex 相同的测试条件（限制 4C）下，Volo 极限 QPS 为 35W；同时，我们内部正在验证基于 [Monoio](https://github.com/bytedance/monoio)（CloudWeGo 开源的 Rust Async Runtime）的版本，极限 QPS 可以达到 44W。

从我们线上业务的火焰图来看，得益于 Rust 的静态分发和优秀的编译优化，框架部分的开销基本可以忽略不计（不包含 syscall 开销）。

### 易用性好

Rust 以~~难学难用~~而闻名，我们希望尽可能降低用户使用 Volo 框架以及使用 Rust 语言编写微服务的难度，提供最符合人体工程学和直觉的编码体验。因此，我们把易用性作为我们重要的目标之一。

比如，我们提供了 volo 命令行工具，用于初始化项目以及管理 idl；同时，我们将 thrift 及 gRPC 拆分为两个独立（但共用一些组件）的框架，以提供最符合不同协议语义的编程范式及接口。

我们还提供了`#[service]`宏（可以理解为不需要 `Box` 的 `async_trait`）来使得用户可以无心理负担地使用异步来编写 `Service` 中间件。

### 扩展性强

收益于 Rust 强大的表达和抽象能力，通过灵活的中间件 Service 抽象，开发者可以以非常统一的形式，对 RPC 元信息、请求和响应做处理。

比如，服务发现、负载均衡等服务治理功能，都可以以 Service 形式进行实现，而不需要独立实现 Trait。

相关的扩展，我们会放在 [volo-rs](http://github.com/volo-rs) 组织下，也欢迎大家贡献自己的扩展到 volo-rs～

## 相关生态

1. [Volo-rs](http://github.com/volo-rs)：Volo 的相关生态
2. [Pilota](https://github.com/cloudwego/pilota)：Volo 使用的 Thrift 与 Protobuf 编译器及编解码的纯 Rust 实现（不依赖 protoc）
3. [Motore](https://github.com/cloudwego/motore)：Volo 参考 Tower 设计的，使用了 AFIT 和 RPITIT 的 middleware 抽象层
4. [Metainfo](https://github.com/cloudwego/metainfo)：Volo 用于进行元信息透传的组件，期望定义一套元信息透传的标准
