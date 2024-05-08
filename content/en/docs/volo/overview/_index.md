---
title: "Overview"
linkTitle: "Overview"
weight: 1
keywords: ["RPC", "Rust", "Volo", "AFIT", "RPITIT"]
description: "The architecture design, framework features, and related ecology of Volo."
---

## Volo

Volo is a **high-performance** and **strong-extensibility** Rust RPC framework that helps developers build microservices.

Volo uses [Motore](https://github.com/cloudwego/motore) as its middleware abstraction, which is powered by AFIT and RPITIT.

## Architecture

![Volo](/img/docs/volo.png)

## Features

### Powered by AFIT and RPITIT

Volo uses Motore as its middleware abstraction, which is powered by AFIT and RPITIT.

Through AFIT and RPITIT, we can avoid many unnecessary Box memory allocations, improve ease of use,
and provide users with a more friendly programming interface and a more ergonomic programming paradigm.

### High Performance

Rust is known for its high performance and safety. We always take high performance as our goal in the design and implementation process, reduce the overhead of each place as much as possible, and improve the performance of each implementation.

First of all, **it is very unfair to compare the performance with the Go framework**, so we will not focus on comparing the performance of Volo and Kitex, and the data we give can only be used as a reference, I hope everyone can view it objectively; at the same time, due to the open source community has not found another mature Rust async version Thrift RPC framework, and performance comparison is always easy to lead to war, so we hope to weaken the comparison of performance data as much as possible, and we'll only publish our own QPS data.

Under the same test conditions as Kitex (limited to 4C), the Volo QPS is 35W; at the same time, we are internally verifying the version based on [Monoio](https://github.com/bytedance/monoio) (CloudWeGo's open source Rust async runtime), and the QPS can reach 44W.

From the flame graph of our online business, thanks to Rust's static distribution and excellent compilation optimization, the overhead of the framework part is basically negligible (excluding syscall overhead).

### Easy to Use

Rust is known for ~~being hard to learn and hard to use~~, and we want to make it as easy as possible for users to use the Volo framework and write microservices in the Rust language, providing the most ergonomic and intuitive coding experience possible. Therefore, we make ease of use one of our most important goals.

For example, we provide the volo command line tool for bootstrapping projects and managing idl files; at the same time, we split thrift and gRPC into two independent(but share some components) frameworks to provide programming paradigms that best conform to different protocol semantics and interface.

We also provide the `#[service]` macro (which can be understood as the async_trait that does not require `Box`) to enable users to write `service` middleware using async rust without psychological burden.

### Strong Extensibility

Benefiting from Rust's powerful expression and abstraction capabilities, through the flexible middleware `Service` abstraction, developers can process RPC meta-information, requests and responses in a very unified form.

For example, service governance functions such as service discovery and load balancing can be implemented in the form of services without the need to implement Trait independently.

We have also created an organization [Volo-rs](http://github.com/volo-rs), any contributions are welcome.

## Related Projects

1. [Volo-rs](http://github.com/volo-rs)：The volo ecosystem which contains a lot of useful components.
2. [Pilota](https://github.com/cloudwego/pilota)：A thrift and protobuf implementation in pure rust with high performance and extensibility.
3. [Motore](https://github.com/cloudwego/motore)：Middleware abstraction layer powered by AFIT and RPITIT.
4. [Metainfo](https://github.com/cloudwego/metainfo)：Transmissing metainfo across components.
