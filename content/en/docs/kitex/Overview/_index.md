---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >

---

## CloudWeGo-Kitex

Kitex [kaɪt'eks] is a **high-performance** and **strong-extensibility** Golang RPC framework that helps developers build microservices. If the performance and extensibility are the main concerns when you develop microservices, Kitex can be a good choice.

### Basic Features

- **High Performance**

Kitex integrates [Netpoll](https://github.com/cloudwego/netpoll), a high-performance network library, which offers significant performance advantage over [go net](https://pkg.go.dev/net).

- **Extensibility**

Kitex provides many interfaces with default implementation for users to customize. You can extend or inject them into Kitex to fulfill your needs (please refer to the framework extension section below).

- **Multi-message Protocol**

Kitex is designed to be extensible to support multiple RPC messaging protocols. The initial release contains support for **Thrift**, **Kitex Protobuf** and **gRPC**, in which Kitex Protobuf is a Kitex custom Protobuf messaging protocol with a protocol format similar to Thrift. Kitex also supports developers extending their own messaging protocols.

- **Multi-transport Protocol**

For service governance, Kitex supports **TTHeader** and **HTTP2**. TTHeader can be used in conjunction with Thrift and Kitex Protobuf; HTTP2 is currently mainly used with the gRPC protocol, and it will support Thrift in the future.

- **Multi-message Type**

Kitex supports **PingPong**, **One-way**, and **Bidirectional Streaming**. Among them, One-way currently only supports Thrift protocol, two-way Streaming only supports gRPC, and Kitex will support Thrift's two-way Streaming in the future.

- **Service Governance**

Kitex integrates service governance modules such as service registry, service discovery, load balancing, circuit breaker, rate limiting, retry, monitoring, tracing, logging, diagnosis, etc. Most of these have been provided with default extensions, and users can choose to integrate.

- **Code Generation**

Kitex has built-in code generation tools that support generating **Thrift**, **Protobuf**, and scaffold code.

## Performance

We compared the performance of Kitex with some popular RPC frameworks ([test code](https://github.com/cloudwego/kitex-benchmark)), such as [gRPC](https://github.com/grpc/grpc) and [RPCX](https://github.com/smallnest/rpcx), both using Protobuf protocol. The test results show that [Kitex](https://github.com/cloudwego/kitex) performs better.

*Note: The performance benchmarks obtained from the experiment are for reference only, because there are many factors that can affect the actual performance in application scenarios.*

### Test environment

- CPU: Intel(R) Xeon(R) Gold 5118 CPU @ 2.30GHz, 4 cores
- Memory: 8GB
- OS: Debian 5.4.56.bsk.1-amd64 x86_64 GNU/Linux
- Go: 1.15.4

### Concurrency performance

Change the concurrency with a fixed packet size 1KB.

| QPS                                                  |                         TP99                          |                         TP999                          |
| :--------------------------------------------------- | :---------------------------------------------------: | :----------------------------------------------------: |
| ![image](/img/docs/performance_concurrent_qps.png) | ![image](/img/docs/performance_concurrent_tp99.png) | ![image](/img/docs/performance_concurrent_tp999.png) |

### Throughput performance

Change packet size with a fixed concurrency of 100.

| QPS                                                |                        TP99                         |                        TP999                         |
| :------------------------------------------------- | :-------------------------------------------------: | :--------------------------------------------------: |
| ![image](/img/docs/performance_bodysize_qps.png) | ![image](/img/docs/performance_bodysize_tp99.png) | ![image](/img/docs/performance_bodysize_tp999.png) |

## Related Projects

- [Netpoll](https://github.com/cloudwego/netpoll): A high-performance network library.
- [kitex-contrib](https://github.com/kitex-contrib): A partial extension library of Kitex, which users can integrate into Kitex through options according to their needs.
- [Example](https://github.com/cloudwego/kitex/blob/develop/TODO): Use examples of Kitex.

## Blogs

- [Performance Optimization Practice of Go RPC framework Kitex](https://mp.weixin.qq.com/s/Xoaoiotl7ZQoG2iXo9_DWg)
- [Practice of ByteDance on Go Network Library](https://mp.weixin.qq.com/s?__biz=MzI1MzYzMjE0MQ==&mid=2247485756&idx=1&sn=4d2712e4bfb9be27a790fa15159a7be1&chksm=e9d0c2dedea74bc8179af39888a5b2b99266587cad32744ad11092b91ec2e2babc74e69090e6&scene=21#wechat_redirect)
