---
date: 2022-08-30
title: "China's First Rust-based RPC Framework - Volo is Officially Open Source!"
projects: ["Volo"]
linkTitle: "China's first RPC framework based on Rust language - Volo is officially open source!"
keywords:
  [
    "CloudWeGo",
    "RPC framework",
    "Volo",
    "Rust",
    "ByteDance Open Source",
    "open source",
  ]
description: "This article introduces ByteDance's official open source Rust RPC framework — Volo, and focuses on the project's origin, main features and related ecosystem."
author: <a href="https://github.com/cloudwego" target="_blank">CloudWeGo Team</a>
---

[Volo](https://github.com/cloudwego/volo) is a lightweight, high-performance, scalable, and user-friendly Rust RPC framework developed by the ByteDance service framework team. It leverages the latest GAT and TAIT features of Rust to deliver exceptional performance and efficiency.
Within ByteDance, Volo has been extensively used, implementing multiple business and foundational components. It has exceeded performance expectations, showcasing its superiority compared to the Go version. As with other CloudWeGo open-source projects, Volo maintains a consistent codebase internally and externally, ensuring robustness and reliability for open-source users.
While observing the relatively weak Rust open-source community in terms of RPC frameworks, Volo's open-source release aims to contribute to community improvement. It also strengthens the CloudWeGo ecosystem, advancing performance, security, and the adoption of the latest technologies. Volo provides robust support for developers, enterprises, and Rustaceans in developing RPC microservices and building cloud-native distributed systems.
This article will provide a brief introduction to Volo and its related ecosystem, offering suggestions for choosing between Rust and Go.

## Origin of the project

The founding members of [Volo](https://github.com/cloudwego/volo) originally came from the [Kitex](https://github.com/cloudwego/kitex) team, the open-source Go RPC framework developed by CloudWeGo. Through deep performance optimizations in Go, they encountered challenges that motivated their exploration of Rust. Rust proved to be a suitable choice for businesses requiring exceptional performance, safety, and low-level control capabilities. The birth of Volo was driven by the need for a robust RPC framework as a vital component of distributed systems.

## Features

Key features of Volo include:

### High performance

Rust's reputation for high performance and safety guides the design and implementation of Volo. Every aspect of the framework is optimized to minimize overhead and maximize performance.
It is important to note that directly comparing the performance of Volo and Kitex would be unfair, and the performance data provided should be viewed as a reference. We aim to avoid unnecessary controversy, especially since there is no mature Async version of a Thrift RPC framework in the Rust open-source community. Instead, we focus on sharing our own limit QPS (queries per second) data.
Under the same test conditions as [Kitex](https://github.com/cloudwego/kitex) (limited to 4 cores), Volo achieves a limit QPS of 350,000 (35W). Furthermore, we are internally validating a version based on [Monoio](https://github.com/bytedance/monoio) (CloudWeGo's open-source Rust Async Runtime), which can achieve a limit QPS of 440,000 (44W).
Judging from the flame graph of our online business, thanks to Rust's static distribution and excellent compilation optimization, the overhead of the framework part is basically negligible (excluding syscall overhead).

### Based on GAT design

Volo embraces the latest technologies and utilizes Rust's GAT feature as the core abstraction. Additionally, we draw inspiration from Tower, a well-designed abstraction layer suitable for non-GAT scenarios. We extend our gratitude to the [Tower](https://github.com/tower-rs/tower) team for their contribution.

Through the use of GAT, Volo eliminates unnecessary Box memory allocations, enhances usability, and offers users a more intuitive programming interface and a more ergonomic programming paradigm.
Our core abstraction is as follows:

![image](/img/blog/opensource_volo/1.png)

Thanks to the use of Rust's GAT feature, they address the lifecycle challenges associated with returning asynchronous Futures. Additionally, if `impl_trait_in_assoc_type` is used , the effect will be better. For example, the following methods can be used to implement Timeout:
![image](/img/blog/opensource_volo/2.png)

### Easy to use

Rust is renowned for its learning curve and perceived difficulty. We recognize the importance of reducing the barriers for users to adopt the Volo framework and develop microservices in the Rust language. Our goal is to provide the most intuitive and simple coding experience possible.

To achieve this, we offer the Volo command-line tool, which facilitates project initialization and IDL management. Additionally, we have separated Thrift and gRPC into two independent frameworks (although they share some components) to cater to the specific programming paradigms and interfaces that align with each protocol's semantics.

We also provide the `#[service]` macro (which can be understood as the `async_trait` that does not require `Box`) to enable users to write service middleware using async rust without psychological burden.
This macro simplifies the implementation of Service middleware, as demonstrated below:

![image](/img/blog/opensource_volo/3.png)

### Strong scalability

Benefiting from Rust's powerful expression and abstraction capabilities, developers can process RPC meta-information, requests, and responses in a unified manner through flexible middleware 'Service' abstraction.
For example, service governance functions such as service discovery and load balancing can be implemented in the form of services without the need to implement Trait independently.
We encourage everyone to contribute their own extensions to volo-rs, which will be hosted under the [github.com/volo-rs](http://github.com/volo-rs) organization

## Ecosystem

Volo is the RPC framework at the core, accompanied by the following open-source projects:

1. [Volo-rs](https://github.com/volo-rs): The volo ecosystem which contains a lot of useful components.
2. [Pilota](https://github.com/cloudwego/pilota): A thrift and protobuf implementation in pure rust with high performance and extensibility.
3. [Motore](https://github.com/cloudwego/motore): Middleware abstraction layer designed by Tower, leveraging GAT and TAIT.
4. [Metainfo](https://github.com/cloudwego/metainfo): A Volo component for transparent transmission of meta information, aimed at defining a set of standards for such transmission.

## Choosing Between Rust and Go

The question of when to use Rust or Go is a classic one. From the perspective of the Volo team, Rust and Go are not opposing choices but rather complementary options that can learn from each other.

- For performance-insensitive, IO-heavy, and rapidly developing applications that prioritize stability, Go is recommended. Rust does not bring significant benefits in such scenarios.
- However, for applications requiring extreme performance, heavy calculations, and a need for stability, even if it comes at the expense of development speed, Rust is recommended. Rust's advantages in extreme performance optimization and security are valuable in these cases.
- Additionally, the team's existing technology stack and talent pool are crucial factors to consider.

## Summary

We hope this article has provided you with a basic understanding of [Volo](https://github.com/cloudwego/volo) and its related ecosystem. Volo is still in its early stages, and we welcome interested developers to join us in building the CloudWeGo and Rust open-source communities. We encourage you to submit [Issues](https://github.com/cloudwego/volo/issues) and [PRs](https://github.com/cloudwego/volo/pulls) to Volo, as we look forward to collective development. We sincerely hope to see more developers join us, and we aspire for Volo to assist more enterprises in swiftly building cloud-native architectures. If enterprise customers wish to explore Volo internally, we can schedule dedicated technical support and communication for their needs.

### References

- [Volo overview](https://github.com/cloudwego/volo)
- [Volo Tutorial](/docs/volo/)
- [Volo Documentation](https://docs.rs/volo)
- [Volo-rs organization](https://github.com/volo-rs)
