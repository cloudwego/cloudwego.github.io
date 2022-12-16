---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >

---

## CloudWeGo-Hertz
Hertz [həːts] is a high-performance, high-usability, extensible HTTP framework for Go. It's designed to simplify building microservices for developers.

Hertz was inspired by other open-source frameworks like [fasthttp](https://github.com/valyala/fasthttp), [gin](https://github.com/gin-gonic/gin), and [echo](https://github.com/labstack/echo), in combination with unique challenges faced by ByteDance, Hertz has become production ready and powered ByteDance's internal services over the years.

Nowadays, as Go gain popularity in microservice development, Hertz will be the right choice if you are looking for a customizable, high-performance framework to support a variety of use case.

## Architecture
![HERTZ](/img/docs/hertz.png)

## Features
### High usability

In modern software engineering, it is agreed that the delivery of high-quality code in a short period of time has become more important in a highly competitive environment. With that in mind, in the initial interactions of Hertz, we actively listen to users' feedback and endeavour to polish the framework to improve user experience and help developers to get the job done quickly and correctly.

- High performance
Hertz uses Netpoll, a high-performance network library built from sketch, by default. In comparison to go net implementation, the benchmark indicates that in some scenarios, Hertz's performance is better in terms of both QPS and time delay.

The following diagrams show how Hertz performs in comparison with other popular frameworks for echo requests.

Comparison of four frameworks:

![Performance](/img/docs/hertz-performance-4.png)

Comparison of three frameworks:

![Performance](/img/docs/hertz-performance-3.png)

Please refer to https://github.com/cloudwego/hertz-benchmark for more details about benchmarking.

### High extensibility

Hertz adopts a layered architecture to deliver a "batteries included" experience. Due to its layered design, the framework is highly extensible while its core functionality remains robust. Hertz comes with default implementations for many modules but also enables users to extend them to fit their own needs. At present, only stable capabilities have been made available to the open source community. More planning refers to [RoadMap](https://github.com/cloudwego/hertz/blob/main/ROADMAP.md).

### Multi-protocol support

Hertz framework provides out-of-box support for HTTP 1.1 and ALPN protocol. In addition, due to the layered design, Hertz supports the custom implementation of the protocol layer to adapt to different use cases.

### Switching Network layer on demand

Hertz has the ability to switch between network layer implementation ( Netpoll and Go Net ) on demand. Users can choose the network library that best fits their needs. Hertz also supports network layer extension in the form of plug-ins.

## Performance
Performance testing can only provide a relative reference. In production, there are many factors that can affect actual performance.

We provide the [hertz-benchmark](https://github.com/cloudwego/hertz-benchmark) project to track and compare the performance of Hertz and other frameworks in different situations for reference.



## Related Projects
- [Netpoll](https://github.com/cloudwego/netpoll): A high-performance network library. Hertz uses it by default.
- [Hertz-Contrib](https://github.com/hertz-contrib): A collection of Hertz extensions.
- [Example](https://github.com/cloudwego/hertz-examples): A repository to host examples for Hertz.

## Blogs
- [ByteDance Practice on Go Network Library](https://www.cloudwego.io/blog/2021/10/09/bytedance-practices-on-go-network-library/)
