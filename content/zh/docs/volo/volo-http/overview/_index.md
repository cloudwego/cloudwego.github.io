---
title: "概览"
linkTitle: "概览"
weight: 1
keywords: ["HTTP", "volo", "架构设计", "框架特点", "框架性能"]
description: "Volo 架构设计、框架特点、框架性能。"
---

## CloudWeGo-Volo

**volo-http** 是 **Rust** 语言的 **HTTP** 微服务框架, 使用了基于 **AFIT** 和 **RPITIT** 实现的 [Motore](https://github.com/cloudwego/motore) 作为中间件抽象层，并结合字节跳动内部的需求，
使其具有高易用性、高性能、高扩展性的特点，使用 **volo-http**，可以快速开发一个基于 **HTTP** 协议的微服务。

## 架构设计

![Volo-HTTP](/img/docs/volo-http-architecture.svg)

## 框架特点

- **高性能**

  **Rust** 以**高性能**和**安全**著称，我们在设计和实现过程中也时刻**以高性能作为我们的目标**，尽可能降低每一处的开销，提升每一处实现的性能。

  从字节内部业务的火焰图来看，得益于 **Rust** 的静态分发和优秀的编译优化，**框架部分的开销基本可以忽略不计**（不包含 syscall 开销）。
  性能对比总是容易引战，因此我们希望尽可能弱化性能数据的对比，仅会公布我们自己极限 QPS 的数据，我们给出的数据仅能作为参考
  在和 **Herz** 相同的测试条件（限制 4C）下，**Volo-HTTP** 极限 QPS 为 **81W**；

- **易用性好**

  ~~Rust 以难学难用而闻名~~，我们希望尽可能降低用户使用 **Volo-HTTP** 框架以及使用 **Rust** 语言编写微服务的难度，
  提供最符合人体工程学和直觉的编码体验。因此，我们把易用性作为我们最重要的目标之一。

  比如，我们提供了 **volo** 命令行工具，用于初始化项目以及管理 idl； 

  我们还提供了 **Extractor** 机制，用户可在 **handler** 参数任意添加 实现了 `Extractor trait` 的类型来按需使用

  同时用户也可以将任意实现了 `IntoResponse` 的类型作为 handler 返回

  我们还提供了基于 **layer** 模型下的中间件机制，用户可调用 `route` 的 `layer` 方法轻松使用中间件。


- **扩展性强**

  **Volo-HTTP** 使用 `Motore` 作为其中间件抽象层, `Motore` 基于 **AFIT** 和 **RPITIT** 设计。

  通过 **RPITIT**，我们可以避免很多不必要的 Box 内存分配，以及提升易用性，给用户提供更友好的编程接口和更符合人体工程学的编程范式。

  收益于 **Rust** 强大的表达和抽象能力，通过灵活的中间件 **Service** 抽象，开发者可以以非常统一的形式，**对 HTTP 请求和响应做处理**。

  比如，服务发现、负载均衡等服务治理功能，都可以以 **Service** 形式进行实现，而不需要独立实现 Trait。

  相关的扩展，我们会放在 [volo-rs](https://github.com/volo-rs) 组织下，也欢迎大家贡献自己的扩展到 `volo-rs`。
    
## 相关项目

- [`motore`](https://github.com/cloudwego/motore): 

## 相关文章

- [选择 Go 还是 Rust？CloudWeGo-Volo 基于 Rust 语言的探索实践](https://www.cloudwego.io/zh/blog/2022/09/06/%E9%80%89%E6%8B%A9-go-%E8%BF%98%E6%98%AF-rustcloudwego-volo-%E5%9F%BA%E4%BA%8E-rust-%E8%AF%AD%E8%A8%80%E7%9A%84%E6%8E%A2%E7%B4%A2%E5%AE%9E%E8%B7%B5/)
- [国内首个基于 Rust 语言的 RPC 框架 — Volo 正式开源！](https://www.cloudwego.io/zh/blog/2022/08/30/%E5%9B%BD%E5%86%85%E9%A6%96%E4%B8%AA%E5%9F%BA%E4%BA%8E-rust-%E8%AF%AD%E8%A8%80%E7%9A%84-rpc-%E6%A1%86%E6%9E%B6-volo-%E6%AD%A3%E5%BC%8F%E5%BC%80%E6%BA%90/)
- [字节开源 Monoio ：基于 io-uring 的高性能 Rust Runtime](https://www.cloudwego.io/zh/blog/2023/04/17/%E5%AD%97%E8%8A%82%E5%BC%80%E6%BA%90-monoio-%E5%9F%BA%E4%BA%8E-io-uring-%E7%9A%84%E9%AB%98%E6%80%A7%E8%83%BD-rust-runtime/)
