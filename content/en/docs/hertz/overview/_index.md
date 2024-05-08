---
title: "Overview"
linkTitle: "Overview"
weight: 1
keywords: ["HTTP", "Hertz", "Architecture", "Features", "Performance"]
description: "This doc covers architecture design, features and performance of Hertz."
---

## CloudWeGo-Hertz

Hertz [həːts] is a high-performance, high-usability, extensible HTTP framework for Go. It's designed to make it easy for developers to build microservices.

Inspired by other open source frameworks such as [fasthttp](https://github.com/valyala/fasthttp), [gin](https://github.com/gin-gonic/gin), and [echo](https://github.com/labstack/echo),
combined with the unique challenges faced by ByteDance, Hertz has become production-ready and has powered ByteDance's internal services over the years.

Today, as Go gains popularity in microservice development, Hertz is the right choice if you are looking for a customisable, high-performance framework to support a variety of use cases.

## Architecture

![HERTZ](/img/docs/hertz.png)

## Features

### High usability

In modern software engineering, it is agreed that the delivery of high-quality code in a short period of time has become increasingly important in a highly competitive environment.
With this in mind, we actively listen to user feedback during the initial interactions with Hertz and strive to refine the framework to improve the user experience and help developers get the job done quickly and correctly.

### High performance

Hertz uses Netpoll by default, a high performance network library built from scratch. Compared to the go.net implementation, the benchmark shows that in some scenarios Hertz's performance is better in terms of both QPS and time delay.

The following graphs show how Hertz compares to other popular frameworks for echo requests in terms of performance.

Comparison of four frameworks:

![Performance](/img/docs/hertz-performance-4.png)

Comparison of three frameworks:

![Performance](/img/docs/hertz-performance-3.png)

Please refer to https://github.com/cloudwego/hertz-benchmark for more details about benchmarking.

### High extensibility

Hertz uses a layered architecture to deliver a "batteries included" experience. Because of its layered design, the framework is highly extensible, while its core functionality remains robust.
Hertz comes with default implementations for many modules, but also allows users to extend them to suit their own needs. At present, only stable features have been released to the open source community.
For further planning, please refer to the [RoadMap](https://github.com/cloudwego/hertz/blob/main/ROADMAP.md).

### Multi-protocol support

Hertz framework provides out-of-box support for HTTP 1.1 and ALPN protocol. In addition, due to its layered design, Hertz supports the custom implementation of the protocol layer to adapt to different use cases.

### Switching Network layer on demand

Hertz has the ability to switch between network layer implementations ( Netpoll and go.net ) as required. Users can choose the network library that best suits their needs. Hertz also supports network layer extension in the form of plug-ins.

## Performance

Performance testing can only provide a relative reference. In production, there are many factors that can affect actual performance.

We provide the [hertz-benchmark](https://github.com/cloudwego/hertz-benchmark) project to track and compare the performance of Hertz and other frameworks in different situations for reference.

## Related Projects

- [Netpoll](https://github.com/cloudwego/netpoll): A high-performance network library. Hertz uses it by default.
- [Hertz-Contrib](https://github.com/hertz-contrib): A collection of Hertz extensions.
- [Example](https://github.com/cloudwego/hertz-examples): A repository to host examples for Hertz.

## Blogs

- [Getting Started with Hertz: Performance Testing Guide](/blog/2023/02/24/getting-started-with-hertz-performance-testing-guide/)
- [Hertz, an Ultra Large Scale Enterprise-Level Microservice HTTP Framework, is Now Officially Open Source!](/blog/2022/06/21/hertz-an-ultra-large-scale-enterprise-level-microservice-http-framework-is-now-officially-open-source/)
- [ByteDance Practice on Go Network Library](/blog/2020/05/24/bytedance-practices-on-go-network-library/)
