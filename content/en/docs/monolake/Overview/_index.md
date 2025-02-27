---
title: "Overview"
linkTitle: "Overview"
weight: 1
keywords: ["Proxy", "Rust", "io-uring"]
---

## Monolake

Monolake is a framework for developing high-performance network services like proxies and gateways. It is built from the ground up as a blank slate design, starting with a custom async runtime called [Monoio](https://docs.rs/crate/monoio/latest) that has first-class support for the io_uring Linux kernel feature.

While the most widely used Rust async runtime is [Tokio](https://docs.rs/tokio/latest/tokio/), which is an excellent and high-performance epoll/kqueue-based runtime, Monolake takes a different approach. The monoio runtime developed by Bytedance is designed with a thread-per-core model in mind, allowing Monolake to extract maximum performance from io_uring's highly efficient asynchronous I/O operations.

By building Monolake on this novel runtime foundation, the team was able to incorporate new first-class support for io_uring throughout the ecosystem. This includes io_uring-specific IO traits and a unique service architecture that differs from the popular Tower implementation. Monolake also includes io_uring-optimized implementations for protocols like Thrift and HTTP.

The Monolake framework has been used to build various high-performance proxies and gateways, and it is actively deployed in production at ByteDance. Its use cases are wide-ranging and include:

- Application Gateways: For protocol conversion, such as HTTP to Thrift
- Security Gateways: Providing pseudonymization for gRPC and Thrift RPCs
- Service ingress controller: Serves as ingress controller for FaaS services

## Monolake Proxy

[Monolake Proxy](https://github.com/cloudwego/monolake/tree/main/monolake) is a reference implementation that leverages the various components within the Monolake framework to build a high-performance HTTP and Thrift proxy. This project serves as a showcase for the unique features and capabilities of the Monolake ecosystem. By utilizing the efficient networking capabilities of the monoio-transports crate, the modular service composition of service-async, and the type-safe context management provided by certain-map, Monolake Proxy demonstrates the practical application of the Monolake framework. Additionally, this reference implementation allows for the collection of benchmarks, enabling comparisons against other popular proxy solutions like Nginx and Envoy.

## Performance

### Test environment

- AWS instance: c6a.8xlarge
- CPU: AMD EPYC 7R13 Processo, 16 cores, 32 threads
- Memory: 64GB
- OS: 6.1.94-99.176.amzn2023.x86_64, Amazon Linux 2023.5.20240805
- Nginx:  nginx/1.24.0

#### Request Per Second (RPS) vs. Body Size 
|                         HTTPS                      |                        HTTP                        |
| :------------------------------------------------- | :-------------------------------------------------: |
| ![image](/img/docs/https_req_per_sec_vs_body_size.png) | ![image](/img/docs/http_req_per_sec_vs_body_size.png) |

### Concurrency performance
|                        HTTPS                        |                        HTTP                        |
| :------------------------------------------------- | :-------------------------------------------------: |
| ![image](/img/docs/https_req_per_sec_vs_worker_threads.png) | ![image](/img/docs/http_req_per_sec_vs_worker_threads.png) |

## Related Projects

- [Monoio](https://github.com/bytedance/monoio): A high-performance thread-per-core io_uring based async runtime

## Related Crates

<img src="/img/docs/monolake_crates.png" width="500" height="300">

| Crate | Description |
|-------|-------------|
| [monoio-transports](https://crates.io/crates/monoio-transports) | A foundational crate that provides high-performance, modular networking capabilities, including connectors and utilities for efficient network communications |
| [service-async](https://crates.io/crates/service-async) | A foundational crate that introduces a refined Service trait with efficient borrowing and zero-cost abstractions, as well as utilities for service composition and state management |
| [certain-map](https://crates.io/crates/certain-map) | A foundational crate that provides a typed map data structure, ensuring the existence of specific items at compile-time, useful for managing data dependencies between services |
| [monoio-thrift](https://crates.io/crates/monoio-thrift) | Monoio native, io_uring compatible thrift implementation |
| [monoio-http](https://crates.io/crates/monoio-http) | Monoio native, io_uring compatible HTTP/1.1 and HTTP/2 implementation |
| [monoio-nativetls](https://crates.io/crates/monoio-native-tls) | The native-tls implementation compatible with monoio |
| [monoio-rustls](https://crates.io/crates/monoio-rustls) | The rustls implementation compatible with monoio |

