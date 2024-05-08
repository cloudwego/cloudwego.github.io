---
date: 2022-08-30
title: "国内首个基于 Rust 语言的 RPC 框架 — Volo 正式开源！"
projects: ["Volo"]
linkTitle: "国内首个基于 Rust 语言的 RPC 框架 — Volo 正式开源！"
keywords: ["rust", "rpc", "volo", "开源", "GAT"]
description: "本文介绍了字节跳动正式开源 Rust RPC 框架 — Volo，并着重介绍了项目的起源，主要特性以及相关生态。"
author: <a href="https://github.com/CloudWeGo" target="_blank">CloudWeGo</a>
---

[Volo][Volo] 是字节跳动服务框架团队研发的**轻量级**、**高性能**、 **可扩展性强**、**易用性好**的 Rust RPC 框架，使用了 Rust 最新的 GAT 和 TAIT 特性。

在字节内部，[Volo][Volo] 已经落地多个业务和基础组件，并且取得了超预期的性能收益（与 Go 版本对比，不那么公平）。

[Volo][Volo] 与其它 CloudWeGo 开源项目一样，坚持内外维护一套代码，为开源使用提供了强有力的保障。同时，我们观察到 Rust 开源社区在 RPC 框架这块还比较薄弱，
[Volo][Volo] 的开源希望能为社区的完善贡献一份力量，同时也能完善 CloudWeGo 生态矩阵，为追求性能、安全性和最新技术的开发者、企业以及 Rustaceans 开发 RPC 微服务、搭建云原生分布式系统提供强有力的支持。

本文会为大家简单介绍 [Volo][Volo] 及其相关生态，并为大家提供一个简单的 Rust 与 Go 的选型建议。

## 01 项目缘起

其实 [Volo][Volo] 的创始成员来自于 [Kitex][Kitex] 团队（CloudWeGo 开源的 Go RPC 框架），当时我们在 Go 上做了非常深度的性能优化，也因此深刻感受到了在 Go 上做性能优化所面临的阻碍。
因此，我们选择了 Rust，期望能够给需求极致性能、安全和指令级掌控能力的业务一个合适的选择。而 RPC 框架是分布式系统中重要的组成部分，[Volo][Volo] 就这么诞生了。

## 02 特性

### 高性能

Rust 以高性能和安全著称，我们在设计和实现过程中也时刻以高性能作为我们的目标，尽可能降低每一处的开销，提升每一处实现的性能。

首先要说明，**和 Go 的框架对比性能是极不公平的**，因此我们不会着重比较 [Volo][Volo] 和 [Kitex][Kitex] 的性能，并且我们给出的数据仅能作为参考，希望大家能够客观看待。
同时，由于在开源社区并没有找到另一款成熟的 Rust 语言的 Async 版本 Thrift RPC 框架，而且性能对比总是容易引战，因此我们希望尽可能弱化性能数据的对比，仅会公布我们自己极限 QPS 的数据。

在和 [Kitex][Kitex] 相同的测试条件（限制 4C）下，[Volo][Volo] 极限 QPS 为 35W。同时，我们内部正在验证基于 [Monoio][Monoio]（CloudWeGo 开源的 Rust Async Runtime）的版本，极限 QPS 可以达到 44W。

从我们线上业务的火焰图来看，得益于 Rust 的静态分发和优秀的编译优化，框架部分的开销基本可以忽略不计（不包含 syscall 开销）。

### 基于 GAT 设计

我们热爱并追随最新的技术，[Volo][Volo] 的核心抽象使用了 Rust 最新的 GAT 特性，在这个过程中我们也借鉴了 **Tower** 的设计。Tower 是一个非常优秀的抽象层设计，适用于非 GAT 的情况下。在此我们非常感谢 Tower 团队。

Tower：https://github.com/tower-rs/tower

通过 GAT，我们可以避免很多不必要的 Box 内存分配，以及提升易用性，给用户提供更友好的编程接口和更符合人体工程学的编程范式。

我们的核心抽象如下：

![image](/img/blog/opensource_volo/1.png)

由于使用了 Rust 的 GAT 特性，因此我们可以解决返回异步 Future 带来的生命周期问题。同时，如果配合 `impl_trait_in_assoc_type` 使用，效果更佳，比如实现 Timeout 可以使用如下方式：

![image](/img/blog/opensource_volo/2.png)

### 易用性好

Rust 以难学难用而闻名，我们希望尽可能降低用户使用 [Volo][Volo] 框架以及使用 Rust 语言编写微服务的难度，提供最符合人体工程学和直觉的编码体验。因此，我们把易用性作为我们重要的目标之一。

比如，我们提供了 Volo 命令行工具，用于初始化项目以及管理 IDL。同时，我们将 Thrift 及 gRPC 拆分为两个独立（但共用一些组件）的框架，以提供最符合不同协议语义的编程范式及接口。

我们还提供了 `#[service]` 宏（可以理解为不需要 `Box` 的 `async_trait`）来使得用户可以无心理负担地使用异步来编写 `Service` 中间件。

通过这个宏，我们编写 `Service` 中间件可以简化到如下图：

![image](/img/blog/opensource_volo/3.png)

### 扩展性强

受益于 Rust 强大的表达和抽象能力，通过灵活的中间件 Service 抽象，开发者可以以非常统一的形式，对 RPC 元信息、请求和响应做处理。

比如，服务发现、负载均衡等服务治理功能，都可以以 Service 形式进行实现，而不需要独立实现 Trait。

相关的扩展，我们会放在 github.com/volo-rs 组织下，也欢迎大家贡献自己的扩展到 volo-rs。

## 03 生态系统

[Volo][Volo] 是 RPC 框架的名字，随着 [Volo][Volo] 一起开源的有以下几个项目：

1. Volo-rs：Volo 的相关生态。
2. Pilota：Volo 使用的 Thrift 与 Protobuf 编译器及编解码的纯 Rust 实现（不依赖 protoc）。
3. Motore：Volo 参考 Tower 设计的、使用了 GAT 和 TAIT 的 middleware 抽象层。
4. Metainfo：Volo 用于进行元信息透传的组件，期望定义一套元信息透传的标准。

## 04 选型建议

“什么情况下应该用 Rust、什么情况下应该用 Go？”这是一个非常经典的问题。在 Volo 团队看来，Rust 和 Go 并不是对立关系，而是合作关系，取长补短。

对于性能不敏感的应用、重 IO 的应用以及需要快速开发快速迭代胜过稳定性的应用，推荐使用 Go，这种应用使用 Rust 并不会带来明显的收益。

对于 **需要极致性能**，**重计算**的应用，以及**需要稳定性并能接受一定开发速度损失**的应用，推荐使用 Rust，Rust 在极致性能优化和安全性上的优势可以在这类应用中得以发挥。

当然，还有一个很重要的考虑因素，是团队现有的技术栈，即技术储备和人才储备。

## 05 总结

希望本文能让大家对于 [Volo][Volo] 及相关生态有一个基本的了解。同时，[Volo][Volo] 还处于早期阶段，欢迎各位感兴趣的同学一起加入，共同建设 CloudWeGo 及 Rust 开源社区，向 [Volo][Volo] 提交 Issue 和 PR 一起来共建。
我们诚心期待更多的开发者加入，也期待 [Volo][Volo] 助力越来越多的企业快速构建云原生架构。如果企业客户想内部试用，我们可以排期提供专项技术支持和交流。

### 参考资料

- [Volo 概览](https://github.com/cloudwego/volo)

- [Volo Tutorial](/zh/docs/volo/)

- [Volo 文档](https://docs.rs/volo)

- [Volo-rs 组织](https://github.com/volo-rs)

[Kitex]: https://github.com/cloudwego/kitex
[Volo]: https://github.com/cloudwego/volo
[Monoio]: https://github.com/bytedance/monoio
