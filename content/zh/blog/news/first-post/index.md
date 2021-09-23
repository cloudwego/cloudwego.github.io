---
date: 2021-09-07
title: "字节跳动开源内部微服务中间件 CloudWeGo"
linkTitle: "字节跳动开源内部微服务中间件 CloudWeGo"
weight: 1
description: "CloudWeGo-Kitex 正式开源！"
author: 字节跳动基础架构团队
---



## 开源背景

[CloudWeGo](https://github.com/cloudwego)  是一套由字节跳动开源的、以 Go 语言为核心的、可快速构建企业级云原生架构的中间件集合，专注于微服务通信与治理，具备高性能、可扩展、高可靠的特点。

字节跳动内部使用 Golang 作为主要的业务开发语言，我们支持着数万个 Golang 微服务的可靠通信，经过数量众多的微服务和海量流量的验证，我们已经有了较为成熟的微服务最佳实践，于是考虑将内部的实践开源出去丰富社区生态。但微服务相关的项目较多，每个项目单独开源对外部用户并不友好，为了更好地让大家聚焦于微服务，我们以 CloudWeGo 作为项目名，逐步将内部微服务体系的项目开源，内外统一使用开源库，各项目以开源库为主进行迭代。

内外维护一套代码，统一迭代演进，是我们开源前明确的原则，但毕竟涉及到代码库的调整，我们要保证内部用户尽可能无感知的迁移到开源库，本着对内部和开源用户负责的态度，我们要先确认内部可以平滑过渡，所以开源时并未对外宣传。让我们欣慰的是，在未宣传的情况下，一个月内 Kitex 收获了 1.2k stars，Netpoll 收获了700+ stars。

CloudWeGo 不仅仅是一个对外的开源项目，也是一个真实的超大规模企业级实践项目。

我们希望通过 CloudWeGo 丰富云原生社区的 Golang 产品体系，助力其他企业快速构建云原生架构，也希望吸引外部开发者共建，促进面向多元场景支持的演进，丰富产品能力。

因为 CloudWeGo 下的项目会依赖很多内部的基础工具库，我们也推动将内部常用的 Golang 基础工具库开源出去，统一在 [bytedance/gopkg](https://github.com/bytedance/gopkg) 维护。

## CloudWeGo 开源项目

CloudWeGo 第一批以 Kitex RPC 框架和 Netpoll 网络库为主开源四个项目。Kitex 和 Netpoll 开源前我们发布过两篇文章 [字节跳动 Go RPC 框架 Kitex 性能优化实践](https://mp.weixin.qq.com/s/Xoaoiotl7ZQoG2iXo9_DWg) 和 [字节跳动在 Go 网络库上的实践](https://mp.weixin.qq.com/s?__biz=MzI1MzYzMjE0MQ==&mid=2247485756&idx=1&sn=4d2712e4bfb9be27a790fa15159a7be1&chksm=e9d0c2dedea74bc8179af39888a5b2b99266587cad32744ad11092b91ec2e2babc74e69090e6&scene=21#wechat_redirect) 分享我们的实践，文章发布后大家都在关注我们什么时候开源，因为我们希望将成熟的实践开源出去，所以没有过早的推动开源。

### Kitex

Kitex 是字节跳动内部的 Golang 微服务 RPC 框架，具有高性能、强可扩展的主要特点。在 Kitex 之前内部的 Golang 框架是 Kite，但 Kite 与 Thrift 深度耦合、生成代码逻辑重，很难从网络模型或编解码层面改造优化，继续支持新特性势必会造成代码越发臃肿迭代受阻问题，于是我们针对曾经的痛点设计了新的框架 Kitex。虽然 Kitex 是新框架，但已经在线上应用一年多，目前字节内部超过 50% 的 Golang 微服务使用 Kitex。

以下简述 Kitex 的一些特性：

- 高性能：网络传输模块 Kitex 默认集成了自研的网络库 Netpoll，性能相较使用 go net 有显著优势；除了网络库带来的性能收益，Kitex 对 Thrift 编解码也做了优化，详见 [优化实践](https://mp.weixin.qq.com/s/Xoaoiotl7ZQoG2iXo9_DWg)。关于性能数据可参考 [kitex-benchmark](https://github.com/cloudwego/kitex-benchmark)。

- 扩展性：Kitex 设计上做了模块划分，提供了较多的扩展接口以及默认的扩展实现，使用者也可以根据需要自行定制扩展，更多扩展能力参见 [文档](https://www.cloudwego.io/zh/docs/tutorials/framework-exten/)。Kitex 也并未耦合 Netpoll，开发者也可以选择其它网络库扩展使用。

- 消息协议：RPC 消息协议默认支持 Thrift、Kitex Protobuf、gRPC。Thrift 支持 Buffered 和 Framed 二进制协议；Kitex Protobuf 是 Kitex 自定义的 Protobuf 消息协议，协议格式类似 Thrift；gRPC 是对 gRPC 消息协议的支持，可以与 gRPC 互通。除此之外，使用者也可以扩展自己的消息协议。

- 传输协议：传输协议封装消息协议进行 RPC 互通，传输协议可以额外透传元信息，用于服务治理，Kitex 支持的传输协议有 TTHeader、HTTP2。TTHeader 可以和 Thrift、Kitex Protobuf 结合使用；HTTP2 目前主要是结合 gRPC 协议使用，后续也会支持 Thrift。

- 多消息类型：支持 PingPong、Oneway、双向 Streaming。其中 Oneway 目前只对 Thrift 协议支持，双向 Streaming 只对 gRPC 支持，后续会考虑支持 Thrift 的双向 Streaming。

- 服务治理：支持服务注册/发现、负载均衡、熔断、限流、重试、监控、链路跟踪、日志、诊断等服务治理模块，大部分均已提供默认扩展，使用者可选择集成。

- Kitex 内置代码生成工具，可支持生成 Thrift、Protobuf 以及脚手架代码。原生的 Thrift 代码由本次一起开源的 Thriftgo 生成，Kitex 对 Thrift 的优化由 Kitex Tool 作为插件支持。Protobuf 代码由 Kitex 作为官方 protoc 插件生成 ，目前暂未单独支持 Protobuf IDL 的解析和代码生成。

### Netpoll

Netpoll 是字节跳动内部的 Golang 高性能、I/O 非阻塞的网络库，专注于 RPC 场景。

RPC 通常有较重的处理逻辑（业务逻辑、编解码），耗时长，不能像 Redis 一样采用串行处理(必须异步)。而 Go 的标准库 net 设计了 BIO(Blocking I/O) 模式的 API，为了保证异步处理，RPC 框架设计上需要为每个连接都分配一个 goroutine，这在空闲连接较多时，产生大量的空闲 goroutine，增加调度开销。此外，[net.Conn](https://github.com/golang/go/blob/master/src/net/net.go) 没有提供检查连接活性的 API，很难设计出高效的连接池，池中的失效连接无法及时清理，复用低效。

开源社区目前缺少专注于 RPC 方案的 Go 网络库。类似的项目如：[evio](https://github.com/tidwall/evio) , [gnet](https://github.com/panjf2000/gnet) 等，均面向 Redis, Haproxy 这样的场景。

因此 Netpoll 应运而生，它借鉴了 evio 和 Netty 的优秀设计，具有出色的 [性能](https://github.com/cloudwego/netpoll/blob/main/README_CN.md#%e6%80%a7%e8%83%bd)，更适用于微服务架构。 同时，Netpoll 还提供了一些 [特性](https://github.com/cloudwego/netpoll/blob/main/README_CN.md#%e7%89%b9%e6%80%a7)，推荐在 RPC 框架中作为底层网络库。

### Thriftgo

Thriftgo 是 Go 语言实现的 Thrift IDL 解析和代码生成器，支持完善的 Thrift IDL 语法和语义检查，相较 Apache Thrift 官方的 Golang 生成代码，Thriftgo 做了一些问题修复且支持插件机制，用户可根据需求自定义生成代码。

Kitex 的代码生成工具就是 Thriftgo 的插件，CloudWeGo 近期也会开源另一个 Thriftgo 的插件 thrift-gen-validator，支持 IDL Validator，用于字段值校验，解决开发者需要自行实现代码校验逻辑的负担，弥补 Thrift 缺失的能力。

Thriftgo 目前虽然仅支持生成 Golang Thrift 代码，但其定位是可支持各语言的 Thrift 代码生成，未来如果有需求，我们也会考虑生成其他语言的代码，同时我们也将尝试将其回馈至 Apache Thrift 社区。


### Netpoll-http2

Netpoll-http2 是基于 Golang 标准库 golang.org/x/net/http2  的源码替换 go net 为 Netpoll，目前用于 Kitex 对 gRPC 协议的支持，对 HTTP2 有需求的外部开发者也可以使用此库。

## 内外版本维护

完整的微服务体系离不开基础的云生态，无论在公有云、私有云还是基于自己的基础设施开发微服务，都需要搭建额外的服务以很好的支持微服务的治理，比如治理平台、监控、链路跟踪、注册/发现、配置中心、服务网格等，而且还存在一些定制的规范。字节跳动自然也有完善的内部服务支持微服务体系，但这些服务短期还无法开源，那 CloudWeGo 如何内外维护一套代码，统一迭代呢？

CloudWeGo 下与内部生态没有耦合的项目，如 Netpoll，直接迁移到开源库，内部依赖调整为开源库。

而需要集成治理能力融入微服务体系的 Kitex 则基于其扩展性，将内外部的代码做了拆分，Kitex 的核心代码迁移到开源库，内部库封装一层壳保证内部用户无感知升级。集成内部治理特性的模块则作为 Kitex 的扩展保留在内部库，同时对于一些新的特性也会优先在内部库支持，稳定后迁移到开源库。

对于使用 Kitex 的开源用户，同样可以对 Kitex 进行扩展，将 Kitex 融入自己的微服务体系中，也希望开发者能贡献自己的扩展到 [kitex-contrib](https://github.com/kitex-contrib)，为更多用户提供便利。

## 未来展望

  - 继续开源其他内部项目

我们会继续开源其他内部项目，如 HTTP 框架 Hertz、基于共享内存的 IPC 通信库 ShmIPC 等，提供更多场景的微服务需求支持。

  - 逐步开源经验证的、稳定的特性

CloudWeGo 的主要项目均为字节内部微服务提供支持，新的特性通常会在内部验证，相对成熟后我们会逐步开源出去，比如对 ShmIPC 的集成、无序列化、无生成代码的支持等等。

  - 结合内外部用户需求，持续迭代

CloudWeGo 开源后除向内部提供支持外，我们也希望 CloudWeGo 能为外部用户提供良好的支持，帮助大家快速搭建自己的微服务体系，所以我们会面向内外部用户迭代。

就开源一个月的反馈看，大家对 Protobuf 的诉求较为强烈。坦诚来说 Kitex 虽然支持多协议，但字节内部 RPC 通信协议是 Thrift，对 Protobuf 无论是 Kitex Protobuf 还是兼容 gRPC 更多的是支持少部分内部用户的需求，所以暂时未开展性能优化，生成代码也是直接使用 Protobuf 官方的二进制（gogo/protobuf 是基于生成代码优化 Protobuf 序列化性能的优秀开源库，但很遗憾该库目前是停止维护状态，所以 Kitex 并未选择 gogo），但鉴于大家强烈的诉求，我们会计划开展 Kitex 对 Protobuf 支持的性能优化。

欢迎大家向 CloudWeGo 提交 issue 和 PR 共建 CloudWeGo，我们诚心期待更多的开发者加入，也期待 CloudWeGo 助力越来越多的企业快速构建云原生架构。如果企业客户想内部试用，我们可以排期提供专项技术支持和交流，欢迎入群咨询。


![!image](/img/blog/LarkGroup.png)
