---
date: 2022-06-21
title: "字节跳动开源 Go HTTP 框架 Hertz 设计实践"
projects: ["Hertz"]
linkTitle: "字节跳动开源 Go HTTP 框架 Hertz 设计实践"
keywords: ["Go", "HTTP", "Hertz", "架构设计", "功能特性"]
description: "本文介绍了字节跳动开源 Go HTTP 框架 Hertz 的项目起源、架构设计、功能特性以及性能表现。"
author: <a href="https://github.com/CloudWeGo" target="_blank">CloudWeGo</a>
---

## 01 前言

[Hertz][Hertz] 是字节跳动服务框架团队研发的超大规模的企业级微服务 HTTP 框架，具有高易用性、易扩展、低时延等特点。在经过了字节跳动内部一年多的使用和迭代后，如今已在 CloudWeGo 正式开源。
目前，[Hertz][Hertz] 已经成为了字节跳动内部最大的 HTTP 框架，线上接入的服务数量超过 1 万，峰值 QPS 超过 4 千万。除了各个业务线的同学使用外，也服务于内部很多基础组件，
如：函数计算平台 FaaS、压测平台、各类网关、Service Mesh 控制面等，均收到不错的使用反馈。在如此大规模的场景下，[Hertz][Hertz] 拥有极强的稳定性和性能，在内部实践中某些典型服务，
如框架占比较高的服务、网关等服务，迁移 [Hertz][Hertz] 后相比 Gin 框架，资源使用显著减少，CPU 使用率随流量大小降低 30%—60%，时延也有明显降低。

[Hertz][Hertz] 坚持 **内外维护一套代码** ，为开源使用提供了强有力的保障。通过开源， [Hertz][Hertz] 也将丰富云原生的 Golang 中间件体系，完善 CloudWeGo 生态矩阵，
为更多开发者和企业搭建云原生化的大规模分布式系统，提供一种现代的、资源高效的的技术方案。

本文将重点关注 [Hertz][Hertz] 的**架构设计**与 **功能特性** 。

## 02 项目缘起

最初，字节跳动内部的 HTTP 框架是对 Gin 框架的封装，具备不错的易用性、生态完善等优点。随着内部业务的不断发展，高性能、多场景的需求日渐强烈。
而 Gin 是对 Golang 原生 net/http 进行的二次开发，在按需扩展和性能优化上受到很大局限。因此，为了满足业务需求，更好的服务各大业务线，
2020 年初，字节跳动服务框架团队经过内部使用场景和外部主流开源 HTTP 框架 Fasthttp、Gin、Echo 的调研后，开始基于自研网络库 [Netpoll][Netpoll] 开发内部框架 [Hertz][Hertz]，
让 [Hertz][Hertz] 在面对企业级需求时，有更好的性能及稳定性表现，也能够满足业务发展和应对不断演进的技术需求。

## 03 架构设计

[Hertz][Hertz] 设计之初调研了大量业界优秀的 HTTP 框架，同时参考了近年来内部实践中积累的经验。为了保证框架整体上满足：1. 极致性能优化的可能性；2. 面对未来不可控需求的扩展能力，
[Hertz][Hertz] 采用了 4 层分层设计，保证各个层级功能内聚，同时通过层级之间的接口达到灵活扩展的目标。整体架构图如图 1 所示。

![image](/img/blog/Go_HTTP_Hertz/Hertz_Architectural.png)

<p align="center">
图1  Hertz 架构图
</p>

[Hertz][Hertz] 从上到下分为：应用层、路由层、协议层和传输层，每一层各司其职，同时公共能力被统一抽象到公共层（Common），做到跨层级复用。
另外，同主库一同发布的还有作为子模块的 Hz 脚手架，它能够协助使用者快速搭建出项目核心骨架以及提供实用的构建工具链。

### 应用层

应用层是和用户直接交互的一层，提供丰富易用的 API，主要包括 Server、Client 和一些其他通用抽象。Server 提供了注册 HandlerFunc、Binding、Rendering 等能力；Client 提供了调用下游和服务发现等能力；
以及抽象一个 HTTP 请求所必须涉及到的请求（Request）、响应（Response）、上下文（RequestContext）、中间件（Middleware）等等。 [Hertz][Hertz] 的 Server 和 Client 都能够提供中间件这样的扩展能力。

应用层中一个非常重要的抽象就是对 Server HandlerFunc 的抽象。早期，[Hertz][Hertz] 路由的处理函数 （HandlerFunc）中并没有接收标准的 context.Context，我们在大量的实践过程中发现，
业务方通常需要一个标准的上下文在 RPC Client 或者日志、Tracing 等组件间传递，但由于请求上下文（RequestContext）生命周期局限于一次 HTTP 请求之内，而以上提到的场景往往存在异步的传递和处理，
导致如果直接传递请求上下文，会导致出现一些数据不一致的问题。为此我们做了诸多尝试，但是因为核心原因在于请求上下文（RequestContext）的生命周期无法优雅的按需延长，
最终在各种设计权衡下，我们在路由的处理函数签名中增加一个标准的上下文入参，通过分离出生命周期长短各异的两个上下文的方式，从根本上解决各种因为上下文生命周期不一致导致的异常问题，即：

![image](/img/blog/Go_HTTP_Hertz/RequestContext.png)

### 路由层

路由层负责根据 URI 匹配对应的处理函数。

起初，[Hertz][Hertz] 的路由基于 [httprouter][httprouter] 开发，但随着使用的用户越来越多，[httprouter][httprouter] 渐渐不能够满足需求，主要体现在 [httprouter][httprouter] 不能够同时注册静态路由和参数路由，
即 `/a/b`， `/:c/d` 这两个路由不能够同时注册；甚至有一些更特殊的需求，如 `/a/b`、`/:c/b` ，当匹配 `/a/b` 路由时，两个路由都能够匹配上。

[Hertz][Hertz] 为满足这些需求重新构造了路由树，用户在注册路由时拥有很高的自由度：支持静态路由、参数路由的注册；支持按优先级匹配，如上述例子会优先匹配静态路由 `/a/b`；支持路由回溯，
如注册 `/a/b`、`/:c/d`，当匹配 `/a/d` 时仍然能够匹配上；支持尾斜线重定向，如注册 `/a/b`，当匹配 `/a/b/` 时能够重定向到 `/a/b` 上。
[Hertz][Hertz] 提供了丰富的路由能力来满足用户的需求，更多的功能可以参考 [Hertz 配置文档](/zh/docs/hertz/reference/config/)。

### 协议层

协议层负责不同协议的实现和扩展。

[Hertz][Hertz] 支持[协议的扩展](/zh/docs/hertz/tutorials/framework-exten/protocol/)，用户只需要实现下面的接口便可以按照自己的需求在引擎（Engine）上扩展协议，
同时也支持通过 ALPN 协议协商的方式注册。[Hertz][Hertz] 首批只开源了 HTTP1 实现，未来会陆续开源 HTTP2、QUIC 等实现。
协议层扩展提供的灵活性甚至可以超越 HTTP 协议的范畴，用户完全可以按需注册任意符合自身需求的协议层实现，并且加入到 [Hertz][Hertz] 的引擎中来，同时，也能够无缝享受到传输层带来的极致性能。

![image](/img/blog/Go_HTTP_Hertz/Server.png)

### 传输层

传输层负责底层的网络库的抽象和实现。

[Hertz][Hertz] 支持底层网络库的扩展。[Hertz][Hertz] 原生完美适配 [Netpoll][Netpoll]，在时延方面有很多深度的优化，非常适合时延敏感的业务接入。[Netpoll][Netpoll] 对 TLS 能力的支持有待完善，而 TLS 能力又是 HTTP 框架必备能力，
为此 [Hertz][Hertz] 底层同时支持基于 Golang 标准网络库的实现适配，同时支持网络库的一键切换，用户可根据自己的需求选择合适的网络库进行替换。如果用户有更加高效的网络库或其他网络库需求，也完全可以根据需求自行扩展。

**网络库的扩展**：
[网络库扩展](/zh/docs/hertz/tutorials/framework-exten/network-lib/)

### Hz 脚手架

与 [Hertz][Hertz] 一并开源的还有一个易用的命令行工具 Hz，用户只需提供一个 IDL，根据定义好的接口信息，Hz 便可以一键生成项目脚手架，让 [Hertz][Hertz] 达到开箱即用的状态；
Hz 也支持基于 IDL 的更新能力，能够基于 IDL 变动智能地更新项目代码。目前 Hz 支持了 Thrift 和 Protobuf 两种 IDL 定义。命令行工具内置丰富的选项，可以根据自己的需求使用。
同时它底层依赖 Protobuf 官方的编译器和自研的 Thriftgo 的编译器，两者都支持自定义的生成代码插件。如果默认模板不能够满足需求，完全能够按需定义。

未来，我们将继续迭代 Hz，持续集成各种常用的中间件，提供更高层面的模块化构建能力。给 [Hertz][Hertz] 的用户提供按需调整的能力，通过灵活的自定义配置打造一套满足自身开发需求的脚手架。

### Common 组件

Common 组件主要存放一些公共的能力，比如错误处理、单元测试能力、可观测性相关能力（Log、Trace、Metrics 等）。对于服务可观测性的能力，[Hertz][Hertz] 提供了默认的实现，用户可以按需装配；
如果用户有特殊的需求，也可以通过 [Hertz][Hertz] 提供的接口注入。比如对于 Trace 能力，[Hertz][Hertz] 提供了默认的实现，也提供了将 [Hertz][Hertz] 和 [Kitex][Kitex] 串起来的 Example。如果想注入自己的实现，也可以实现下面的接口：

![image](/img/blog/Go_HTTP_Hertz/Common.png)

**Example**：
https://github.com/cloudwego/hertz-examples/blob/main/tracer/README.md

## 04 功能特性

### 中间件

[Hertz][Hertz] 除了提供 Server 的中间件能力，还提供了 Client 中间件能力。用户可以使用中间件能力将通用逻辑（如：日志记录、性能统计、异常处理、鉴权逻辑等等）和业务逻辑区分开，让用户更加专注于业务代码。
Server 和 Client 中间件使用方式相同，使用 Use 方法注册中间件，中间件执行顺序和注册顺序相同，同时支持预处理和后处理逻辑。

Server 和 Client 的中间件实现方式并不相同。对于 Server 来说，我们希望减少栈的深度，同时也希望中间件能够默认的执行下一个，用户需要手动终止中间件的执行。
因此，我们将 Server 的中间件分成了两种类型，即不在同一个函数调用栈（该中间件调用完后返回，由上一个中间件调用下一个中间件，如图 2 中 B 和 C）和在同一个函数调用栈的中间件（该中间件调用完后由该中间件继续调用下一个中间件，如图 2 中 C 和 Business Handler）。

![image](/img/blog/Go_HTTP_Hertz/Middleware.png)

<p align="center">
图2  中间件链路
</p>

其核心是需要一个地方存下当前的调用位置 index，并始终保持其递增。恰好 RequestContext 就是一个存储 index 合适的位置。
但是对于 Client，由于没有合适的地方存储 index，我们只能退而求其次，抛弃 index 的实现，将所有的中间件构造在同一调用链上，需要用户手动调用下一个中间件。

### 流式处理

[Hertz][Hertz] 提供 Server 和 Client 的流式处理能力。HTTP 的文件场景是十分常见的场景，除了 Server 侧的上传场景之外，Client 的下载场景也十分常见。
为此，[Hertz][Hertz] 支持了 Server 和 Client 的流式处理。在内部网关场景中，从 Gin 迁移到 [Hertz][Hertz] 后，CPU 使用量随流量大小不同可节省 30%—60% 不等，服务压力越大，收益越大。
[Hertz][Hertz] 开启流式功能的方式也很容易，只需要在 Server 上或 Client 上添加一个配置即可，可参考 CloudWeGo 官网 Hertz 文档的 [Server 流式处理](/zh/docs/hertz/tutorials/basic-feature/engine/#流式处理) 部分和 [Client 流式处理](/zh/docs/hertz/tutorials/basic-feature/client/#流式读响应内容) 部分。

由于 [Netpoll][Netpoll] 采用 LT 的触发模式，由网络库主动将将数据从 TCP 缓冲区读到用户态，并存储到 buffer 中，否则 epoll 事件会持续触发。
因此 Server 在超大请求的场景下，由于 [Netpoll][Netpoll] 持续将数据读到用户态内存中，可能会有 OOM 的风险。HTTP 文件上传场景就是一个典型的场景，但 HTTP 上传服务又是很常见的场景，
因此我们支持标准网络库 go net，并针对 [Hertz][Hertz] 做了特殊优化，暴露出 Read() 接口，防止 OOM 发生。

对于 Client，情况并不相同。流式场景下会将连接封装成 Reader 暴露给用户，而 Client 有连接池管理，那这样连接就多了一种状态，何时关连接，何时复用连接成了一个问题。
由于框架侧并不知道该连接何时会用完，框架侧复用该连接不现实，会导致串包问题。由于 GC 会关闭连接，因此我们起初设想流式场景下的连接交由用户后，由 GC 负责关闭，这样也不会导致资源泄漏。
但是在测试后发现，由于 GC 存在一定时间间隔，另外 TCP 中主动关闭连接的一方需要等待 2RTT，在高并发场景下会导致 fd 被打满的情况。
最终我们提供了复用连接的接口，对于性能有场要求用户，在使用完连接后可以将连接重新放入连接池中复用。

## 05 性能表现

[Hertz][Hertz] 使用字节跳动自研高性能网络库 [Netpoll][Netpoll]，在提高网络库效率方面有诸多实践，参考已发布文章 **字节跳动在 Go 网络库上的实践** 。
除此之外，[Netpoll][Netpoll] 还针对 HTTP 场景进行优化，通过减少拷贝和系统调用次数提高吞吐以及降低时延。为了衡量 [Hertz][Hertz] 性能指标，我们选取了社区中有代表性的框架 Gin（net/http）和 Fasthttp 作为对比，如图 3 所示。
可以看到，[Hertz][Hertz] 的极限吞吐、TP99 等指标均处于业界领先水平。未来，[Hertz][Hertz] 还将继续和 [Netpoll][Netpoll] 深度配合，探索 HTTP 框架性能的极限。

![image](/img/blog/Go_HTTP_Hertz/Fasthttp.png)

<p align="center">
图3  Hertz 和其他框架性能对比
</p>

## 06 一个 Demo

下面简单演示一下 [Hertz][Hertz] 是如何开发一个服务的。

1. 首先，定义 IDL，这里使用 Thrift 作为 IDL 的定义（也支持使用 Protobuf 定义的 IDL），编写一个名为 Demo 的 service。这个服务有一个 API: Hello，它的请求参数是一个 query，响应是一个包含一个 RespBody 字段的 Json。

![image](/img/blog/Go_HTTP_Hertz/Hello.png)

2. 接下来我们使用 Hz 生成代码，并整理和拉取依赖。

![image](/img/blog/Go_HTTP_Hertz/Hz.png)

3. 填充业务逻辑，比如我们返回 `hello，${Name}`，那我们在 `biz/handler/example/hello_service.go` 中添加以下代码即可。

![image](/img/blog/Go_HTTP_Hertz/Hello_service.png)

4. 编译并运行项目。

![image](/img/blog/Go_HTTP_Hertz/Build.png)

到现在一个简单的 Hertz 项目已经生成，下面我们来测试一下。

![image](/img/blog/Go_HTTP_Hertz/Hertz-Examples.png)

以上 Demo 可以在 [Hertz-Examples](https://github.com/cloudwego/hertz-examples) 中查看，之后就可以愉快地构建自己的项目了。

## 07 后记

希望以上的分享能够让大家对 [Hertz][Hertz] 有一个整体上的认识。同时，我们也在不断地迭代 [Hertz][Hertz]、完善 CloudWeGo 整体生态。欢迎各位感兴趣的同学们加入我们，共同建设 CloudWeGo。

## 08 参考资料

[**Hertz Doc**](/zh/docs/hertz/)

[**字节跳动在 Go 网络库上的实践** ](/zh/blog/2020/05/24/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%9C%A8-go-%E7%BD%91%E7%BB%9C%E5%BA%93%E4%B8%8A%E7%9A%84%E5%AE%9E%E8%B7%B5/)

[Hertz]: https://github.com/cloudwego/hertz
[Kitex]: https://github.com/cloudwego/kitex
[Netpoll]: https://github.com/cloudwego/netpoll
[httprouter]: https://github.com/julienschmidt/httprouter
