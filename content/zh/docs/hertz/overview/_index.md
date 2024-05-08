---
title: "概览"
linkTitle: "概览"
weight: 1
keywords: ["HTTP", "Hertz", "架构设计", "框架特点", "框架性能"]
description: "Hertz 架构设计、框架特点、框架性能。"
---

## CloudWeGo-Hertz

Hertz[həːts] 是一个 Golang 微服务 HTTP 框架，在设计之初参考了其他开源框架 [fasthttp](https://github.com/valyala/fasthttp)、[gin](https://github.com/gin-gonic/gin)、[echo](https://github.com/labstack/echo) 的优势，
并结合字节跳动内部的需求，使其具有高易用性、高性能、高扩展性等特点，目前在字节跳动内部已广泛使用。
如今越来越多的微服务选择使用 Golang，如果对微服务性能有要求，又希望框架能够充分满足内部的可定制化需求，Hertz 会是一个不错的选择。

## 架构设计

![HERTZ](/img/docs/hertz.png)

## 框架特点

- 高易用性

  在开发过程中，快速写出来正确的代码往往是更重要的。因此，在 Hertz 在迭代过程中，积极听取用户意见，持续打磨框架，希望为用户提供一个更好的使用体验，帮助用户更快的写出正确的代码。

- 高性能

  Hertz 默认使用自研的高性能网络库 Netpoll，在一些特殊场景相较于 go net，Hertz 在 QPS、时延上均具有一定优势。关于性能数据，可参考下图 Echo 数据。

  四个框架的对比:

  ![Performance](/img/docs/hertz-performance-4.png)

  三个框架的对比:

  ![Performance](/img/docs/hertz-performance-3.png)

  关于详细的性能数据，可参考 https://github.com/cloudwego/hertz-benchmark。

- 高扩展性

  Hertz 采用了分层设计，提供了较多的接口以及默认的扩展实现，用户也可以自行扩展。同时得益于框架的分层设计，框架的扩展性也会大很多。目前仅将稳定的能力开源给社区，更多的规划参考 [RoadMap](https://github.com/cloudwego/hertz/blob/main/ROADMAP.md)。

- 多协议支持

  Hertz 框架原生提供 HTTP1.1、ALPN 协议支持。除此之外，由于分层设计，Hertz 甚至支持自定义构建协议解析逻辑，以满足协议层扩展的任意需求。

- 网络层切换能力

  Hertz 实现了 Netpoll 和 Golang 原生网络库 间按需切换能力，用户可以针对不同的场景选择合适的网络库，同时也支持以插件的方式为 Hertz 扩展网络库实现。

## 框架性能

性能测试只能提供相对参考，工业场景下，有诸多因素可以影响实际的性能表现。

我们提供了 [hertz-benchmark](https://github.com/cloudwego/hertz-benchmark) 项目用来长期追踪和比较 Hertz 与其他框架在不同情况下的性能数据以供参考。

## 相关项目

- [Netpoll](https://github.com/cloudwego/netpoll): 自研高性能网络库，Hertz 默认集成
- [Hertz-Contrib](https://github.com/hertz-contrib): Hertz 扩展仓库，提供中间件、tracer 等能力
- [Example](https://github.com/cloudwego/hertz-examples): Hertz 使用例子

## 相关文章

- [Hertz 支持 QUIC & HTTP/3](/zh/blog/2023/08/02/hertz-支持-quic-http/3/)
- [HTTP 框架 Hertz 实践入门：性能测试指南](/zh/blog/2023/02/24/http-框架-hertz-实践入门性能测试指南/)
- [助力字节降本增效，大规模企业级 HTTP 框架 Hertz 设计实践](/zh/blog/2022/09/27/助力字节降本增效大规模企业级-http-框架-hertz-设计实践/)
- [字节跳动在 Go 网络库上的实践](/zh/blog/2020/05/24/字节跳动在-go-网络库上的实践/)
