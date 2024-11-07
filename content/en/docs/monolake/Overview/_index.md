---
title: "Overview"
linkTitle: "Overview"
weight: 1
keywords: ["Proxy", "Rust", "io-uring"]
description: "This doc provides an overview of Monolake, a high-performance network service framework."
---

## Monolake

Monolake is an open-source framework for developing high-performance network services like proxies and gateways. It is built from the ground up as a blank slate design, starting with a custom async runtime called [Monoio](https://docs.rs/crate/monoio/latest) that has first-class support for the io_uring Linux kernel feature.

While the most widely used Rust async runtime is [Tokio](https://docs.rs/tokio/latest/tokio/), which is an excellent and high-performance epoll/kqueue-based runtime, Monolake takes a different approach. The monoio runtime developed by Bytedance is designed with a thread-per-core model in mind, allowing Monolake to extract maximum performance from io_uring's highly efficient asynchronous I/O operations.

By building Monolake on this novel runtime foundation, the team was able to incorporate new first-class support for io_uring throughout the ecosystem. This includes io_uring-specific IO traits and a unique service architecture that differs from the popular Tower implementation. Monolake also includes io_uring-optimized implementations for protocols like Thrift and HTTP.

The Monolake team has used this framework to build a variety of high-performance network components, including:
- HTTP and Thrift proxies
- Application gateways (HTTP-to-Thrift)
- gRPC proxies

By focusing on cutting-edge Rust and io_uring, Monolake aims to provide developers with a powerful toolkit for building the next generation of high-performance network services.

## Monolake Proxy

[Monolake Proxy](https://github.com/cloudwego/monolake/tree/main/monolake) is a reference implementation that leverages the various components within the Monolake framework to build a high-performance HTTP and Thrift proxy. This project serves as a showcase for the unique features and capabilities of the Monolake ecosystem. By utilizing the efficient networking capabilities of the monoio-transports crate, the modular service composition of service-async, and the type-safe context management provided by certain-map, Monolake Proxy demonstrates the practical application of the Monolake framework. Additionally, this reference implementation allows for the collection of benchmarks, enabling comparisons against other popular proxy solutions like Nginx and Envoy.

## Performance

HAR TODO: Move performance section from benchmarks to here 

### Test environment

### Concurrency performance

HAR TODO: Update with latest benchmarks

| QPS                                                |                        TP99                         |                        TP999                         |
| :------------------------------------------------- | :-------------------------------------------------: | :--------------------------------------------------: |
| ![image](/img/docs/performance_concurrent_qps.png) | ![image](/img/docs/performance_concurrent_tp99.png) | ![image](/img/docs/performance_concurrent_tp999.png) |

### Throughput performance

Change packet size with a fixed concurrency of 100.

| QPS                                              |                       TP99                        |                       TP999                        |
| :----------------------------------------------- | :-----------------------------------------------: | :------------------------------------------------: |
| ![image](/img/docs/performance_bodysize_qps.png) | ![image](/img/docs/performance_bodysize_tp99.png) | ![image](/img/docs/performance_bodysize_tp999.png) |

## Related Projects

- [Monoio](https://github.com/bytedance/monoio): A high-performance thread-per-core io_uring based async runtime

## Related Crates

<img src="/img/docs/monolake_crates.png" width="500" height="300">

| Crate | Description |
|-------|-------------|
| [monoio-transports](https://github.com/monoio-rs/monoio-transports) | A foundational crate that provides high-performance, modular networking capabilities, including connectors and utilities for efficient network communications |
| [service-async](https://github.com/ihciah/service-async) | A foundational crate that introduces a refined Service trait with efficient borrowing and zero-cost abstractions, as well as utilities for service composition and state management |
| [certain-map](https://github.com/ihciah/certain-map) | A foundational crate that provides a typed map data structure, ensuring the existence of specific items at compile-time, useful for managing data dependencies between services |
| [monoio-thrift](https://github.com/monoio-rs/monoio-thrift) | Monoio native, io_uring compatible thrift implementation |
| [monoio-http](https://github.com/monoio-rs/monoio-http) | Monoio native, io_uring compatible HTTP/1.1 and HTTP/2 implementation |
| [monoio-nativetls](https://github.com/monoio-rs/monoio-tls) | The native-tls implementation compatible with monoio |
| [monoio-rustls](https://github.com/monoio-rs/monoio-tls) | The rustls implementation compatible with monoio |

## Blogs

- [Monolake: How ByteDance Developed Its Own Rust Proxy to Save Hundreds of Thousands of CPU Cores](TODO)
- [Monolake open source summit](TODO)
