---
date: 2023-02-24
title: "HTTP 框架 Hertz 实践入门：性能测试指南"
projects: ["Hertz"]
linkTitle: "HTTP 框架 Hertz 实践入门：性能测试指南"
keywords: ["CloudWeGo", "Hertz", "HTTP 框架", "性能测试"]
description: "本文旨在分享开发者在压测 Hertz 需要了解的场景和技术问题，并且基于当前最新版本对多个框架进行了压测对比，提供了性能参考数据，有助于用户更好地结合真实 HTTP 场景对 Hertz 进行调优，使之更贴合业务需要、发挥最佳性能。"
author: <a href="https://github.com/Duslia" target="_blank">Duslia</a>
---

## 背景

2021 年 9 月 8 日，字节跳动宣布正式开源 [CloudWeGo][CloudWeGo]。CloudWeGo 是一套字节跳动内部微服务中间件集合，具备**高性能、强扩展性和稳定性**的特点，专注于解决微服务通信与治理的难题，满足不同业务在不同场景的诉求。
2022 年 6 月 21 日，[Hertz][Hertz] 正式开源。日前，CloudWeGo 团队正式开源字节跳动最大的 HTTP 框架 Hertz。Hertz 自发布以来，得到了大量用户的关注，累计收获了 3K+ star。有很多用户自己进行了测试，感谢大家对我们的关注和支持。
本文旨在分享开发者在压测 Hertz 时需要了解的场景和技术问题。这些建议有助于用户更好地结合真实 HTTP 场景对 Hertz 进行调优，使之更贴合业务需要、发挥最佳性能。用户也可以参考官方提供的压测项目 [hertz-benchmark][hertz-benchmark] 了解更多细节。

## 微服务 HTTP 场景的特点

[Hertz][Hertz] 诞生于字节跳动大规模微服务架构实践，面向的场景自然是微服务场景，因此下面会先介绍微服务 HTTP 场景的特点，方便开发者深入理解 [Hertz][Hertz] 的设计思考。

- **HTTP 通信模型**

微服务间的通信通常以 Ping-Pong 模型为主，除了常规的吞吐性能指标外，每次 HTTP 的**平均时延**也是开发者需要考虑的点。吞吐达到瓶颈时可以通过增加机器快速解决，但对用户使用体验有显著影响的时延却没有那么容易降低。
在微服务场景下，一次调用往往需要多个微服务协作完成，即使每个节点延迟很低，最终汇聚到链路上的时延也会被放大，因此微服务场景下时延指标是开发者更应该关注的点。[Hertz][Hertz] 在保证吞吐的前提下，也针对时延做了一定优化。

- **长短连接使用**

由于 TCP 连接首次建立时需要三次握手，如果每个请求都建立新连接，这部分的开销是非常大的。因此对于时延敏感型服务，尽量使用长连接完成请求。在 HTTP 1.1 中，长连接也是默认的选项。
但是没有银弹，维持连接也需要消耗资源，长连接的水平扩展能力也不如短连接。因此，在某些场景下并不适合使用长连接，比如定时拉取配置的场景，
在这个场景下，建连时延对配置影响并不大，且当配置中心负载过高时，希望能够方便的进行水平扩容，这时短连接可能是一个更好的选择。

- **包体积大小**

一个服务的包大小取决于实际的业务场景。HTTP 场景的数据可以放在 query、path、header、body 等地方，不同位置对解析造成的影响也不一样。
HTTP 的 header 是标识符协议，在没有找到特定的标识符之前，框架并不知道 header 还有多少，因此框架需要收到全部的 header 后才能够解析完成，对框架的内存模型不很友好。
[Hertz][Hertz] 也针对 header 解析做了特殊的优化，分配足够的 buffer 空间给 header，减少 header 处理时跨包拷贝的开销。

同时在字节跳动内部线上服务的统计中，发现大部分包在 1K 以内（但是太小的包没有实际意义，比如固定返回 "hello world"），同时大包场景上不封顶，各个包大小均有涉及，所以 [Hertz][Hertz] 在最常用的 128k 以内的包的性能（吞吐和时延）进行了重点优化。

- **并发数量**

每个实例的上游可能会有很多个，不会只接受某个实例的请求；而且，HTTP 1 的连接不能够多路复用，每条连接上只能同时处理一个请求。因此 Server 需要接受多个连接同时处理。
不同服务的连接使用率也不同，比如压测服务的连接使用率很高，一个请求完成后马上就会进行下一个请求；有的服务连接使用率很低，虽然是长连接，但是只使用一次。这两者使用的连接模型并不相同，
前者应使用 goroutine per connection 的模型减少上下文的切换，后者应使用协程池减少过多 goroutine 的调度开销。[Hertz][Hertz] 也同时支持这两种场景，用户可以根据自己的业务场景选择合适的配置。

## 针对 HTTP 场景进行压测

### 使用贴近自己的场景

Github 上的压测项目有很多，网络上也有很多性能测试报告，但是这些项目和测试不一定贴合自己。举个极端一点的例子，在真实场景中你会写一个项目无论 Client 发什么 Server 都只回 **`hello world`** 吗？很遗憾，很多的压测项目就是这么做的。

在进行压测前，应考虑自己真正的使用场景，比如：

- **长短连接的使用** ：使用长连接还是短连接更符合自己的场景。
- **连接使用率的估算** ：如果使用长连接，且连接使用率很高（大部分场景），则使用默认配置即可；如果连接使用率很低，可以添加配置：**`server.WithIdleTimeout(0)`**，将 goroutine per connection 的模型修改为协程池模型，并进行对比测试。
- **数据位置及大小的确定** ：上面提到不同位置（如 query、header、body 等）及大小的数据对框架可能造成影响，如果所有框架的性能都比较一般，可以考虑换一个数据传输位置。
- **并发数的确定** ：有的服务属于轻业务重框架，这个时候框架的并发可能会很高；有的服务属于重业务轻框架，这个时候框架的并发可能会很低。

如果只是想看一下框架的性能，可以使用常规的场景：**长连接、较高连接使用率、1k body、100 并发**等。[hertz-benchmark][hertz-benchmark] 仓库默认的压测配置也是如此。
同时 [hertz-benchmark][hertz-benchmark] 仓库也开发给用户 header、body、并发数的配置，用户可以方便的修改这些配置完成贴合自己的压测。

### 确定压测对象

衡量一个 RPC 框架的性能需要从两个视角分别去思考：Client 视角与 Server 视角。在大规模的业务架构中，上游 Client 不见得使用的也是下游的框架，而开发者调用的下游服务也同样如此，如果再考虑到 Service Mesh 的情况就更复杂了。

一些压测项目通常会把 Client 和 Server 进程混部进行压测，然后得出**整个框架**的性能数据，这其实和线上实际运行情况很可能是不符的。

如果要压测 Server，应该给 Client 尽可能多的资源，把 Server 压到极限，反之亦然。如果 Client 和 Server 都只给了 4 核 CPU 进行压测，会导致开发者无法判断最终得出来的性能数据是哪个视角下的，更无法给线上服务做实际的参考。

### 使用独占 CPU

虽然线上应用通常是多个进程共享 CPU，但在压测场景下，Client 与 Server 进程都处于极端繁忙的状况，此时共享 CPU 会导致大量上下文切换，从而使得数据缺乏可参考性，且容易产生前后很大波动。

所以我们建议是将 Client 与 Server 进程隔离在不同 CPU 或者不同独占机器上进行。如果还想要进一步避免其他进程产生影响，可以再加上 nice -n -20 命令调高压测进程的调度优先级。

另外如果条件允许，相比云平台虚拟机，使用真实物理机会使得测试结果更加严谨与具备可复现性。

## 性能数据参考

在满足上述要求的前提下，我们基于当前最新版本对多个框架进行了压测对比，压测代码在 [hertz-benchmark][hertz-benchmark] 仓库。
在充分压满 Server 的目标下，[Hertz][Hertz] 的 P99 延迟在所有压测框架中最低，吞吐也是属于第一梯队，且在持续优化中。

- CPU: AMD EPYC 7Y83 64-Core Processor 2.7GHz
  - 运行限定 server 4-CPUs，client 16-CPUS
- OS：Debian GNU/Linux 10 (buster)
- Go 1.19
- [hertz v0.3.2](https://github.com/cloudwego/hertz/releases/tag/v0.3.2)，[fasthttp v1.40.0](https://github.com/valyala/fasthttp/releases/tag/v1.40.0)，
  [gin v1.8.1](https://github.com/gin-gonic/gin/releases/tag/v1.8.1)，[fiber v2.38.1](https://github.com/gofiber/fiber/releases/tag/v2.38.1)

![image](/img/blog/Hertz-benchmark/1.png)

<p align="center">四个框架的吞吐和时延比较</p>

![image](/img/blog/Hertz-benchmark/2.png)

<p align="center">三个框架的吞吐和时延比较</p>

## 结语

作为一个超大规模企业级的微服务 HTTP 框架，[Hertz][Hertz] 在设计之初就更倾向于解决大规模微服务场景下的各种问题。在推广过程中也遇到了各种各样的服务，踩了各种各样的坑，也是基于以上经验写了本文。
欢迎广大开发者基于本文提供的测试指南，针对自己的实际场景选择合适的工具。更多问题，请在 GitHub 上提 [Issue](https://github.com/cloudwego/hertz/issues) 交流。

[CloudWeGo]: https://github.com/cloudwego
[Hertz]: https://github.com/cloudwego/hertz
[hertz-benchmark]: https://github.com/cloudwego/hertz-benchmark
