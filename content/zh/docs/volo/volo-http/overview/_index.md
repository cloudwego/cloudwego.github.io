---
title: "概览"
linkTitle: "概览"
weight: 1
keywords: ["HTTP", "volo", "架构设计", "框架特点", "框架性能"]
description: "Volo 架构设计、框架特点、框架性能。"
---

## CloudWeGo-Volo

**volo-http** 是 **Rust** 语言的 **HTTP** 微服务框架，在设计之初参考了其他开源框架如 [Axum](https://github.com/tokio-rs/axum) 的优势，
使用了基于 **AFIT** 和 **RPITIT** 实现的 [Motore](https://github.com/cloudwego/motore) 作为中间件抽象层，并结合字节跳动内部的需求，
使其具有高易用性、高性能、高扩展性的特点，使用 **volo-http**，可以快速开发一个基于 **HTTP** 协议的微服务。

## 架构设计

TODO: 

## 框架特点

- **使用 AFIT 和 RPITIT 特性**

  Volo 使用 Motore 作为其中间件抽象层, Motore 基于 AFIT 和 RPITIT 设计。

  通过 RPITIT，我们可以避免很多不必要的 Box 内存分配，以及提升易用性，给用户提供更友好的编程接口和更符合人体工程学的编程范式。

- 高性能
  
  关于详细的性能数据，可参考 [volo-benchmark](https://github.com/cloudwego/volo-benchmark/grpc)

- 高扩展性
  
  TODO: 
    
## 相关项目

- [motore](https://github.com/cloudwego/motore): 

## 相关文章

- [选择 Go 还是 Rust？CloudWeGo-Volo 基于 Rust 语言的探索实践](https://www.cloudwego.io/zh/blog/2022/09/06/%E9%80%89%E6%8B%A9-go-%E8%BF%98%E6%98%AF-rustcloudwego-volo-%E5%9F%BA%E4%BA%8E-rust-%E8%AF%AD%E8%A8%80%E7%9A%84%E6%8E%A2%E7%B4%A2%E5%AE%9E%E8%B7%B5/)
- [字节开源 Monoio ：基于 io-uring 的高性能 Rust Runtime](https://www.cloudwego.io/zh/blog/2023/04/17/%E5%AD%97%E8%8A%82%E5%BC%80%E6%BA%90-monoio-%E5%9F%BA%E4%BA%8E-io-uring-%E7%9A%84%E9%AB%98%E6%80%A7%E8%83%BD-rust-runtime/)