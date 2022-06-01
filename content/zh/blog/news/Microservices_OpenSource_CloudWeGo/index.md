---
date: 2022-05-26
title: "从 CloudWeGo 谈云原生时代的微服务与开源"
linkTitle: "从 CloudWeGo 谈云原生时代的微服务与开源"
description: >
author: <a href="https://github.com/GuangmingLuo" target="_blank">GuangmingLuo</a>
---

# 从 CloudWeGo 谈云原生时代的微服务与开源

> 本文整理自罗广明在 DIVE 全球基础软件创新大会 2022 的演讲分享，主题为《从 CloudWeGo 谈云原生时代的微服务与开源》。

## **01 项目创造的思考与哲学**

我们团队经常会被人问到，你们为什么创造一个新的项目？我认为这是一个哲学问题。

纵观整个开源社区，每个时间段都会有各种各样的项目被重复地创造出来，这其中的大部分项目很快便销声匿迹了，只有一部分项目能够存活下来。当旁观者看到这样一番景象时，渐渐地，越来越多的人停留于项目搜寻，而放弃了成为项目创作者的机会。久而久之，我们开始忧虑下一代是否还会有新的项目可以使用？难道未来在同一领域，一个项目就能统一整个市场？

其实，在程序员的世界里，参考旧的项目来创造新的项目一点都不可耻。创造不仅意味着思考、权衡与设计，更需要我们贡献项目的特殊与差异。这其中涌现了很多后起之秀，正是他们促成了开源社区的多样性。“每一行代码都是一次精心的设计”是我们对优秀创造者的最佳赞誉。而一项优秀的代码设计往往包含两个最基本的特性：正确性和可维护性。同时，这两种特性恰恰又对应了两种不同的人格。

第一种人格，设计者与实现者，其驾驭是相对简单的，只要功能实现，通过测试，运行正确就算完成了。然而，第二种人格，阅读者和维护者，却要求更高的代码质量，更明晰的代码结构和更好的扩展性。只有同时具备这两种人格，开发者才能游刃有余地创造出一个优秀的项目。

优秀的项目被创造出来意味着什么呢？千千万万的用户可以评估并且使用它。这也从侧面表明了开源本身可以避免更多项目被重复地创造出来。

## **02 CloudWeGo 简介**

CloudWeGo 是字节跳动基础架构团队开源出来的项目，它是一套可快速构建**企业级**云原生架构的中间件集合，它专注于微服务通信与治理，具备**高性能**、**可扩展**、**高可靠**的特点，且关注**易用性**。

CloudWeGo 在第一阶段开源了四个项目：

* [**Kitex**](https://github.com/cloudwego/kitex)：高性能、强可扩展的 Golang RPC 框架
* [**Netpoll**](https://github.com/cloudwego/netpoll)：高性能、I/O 非阻塞、专注于 RPC 场景的网络框架
* [**Thriftgo**](https://github.com/cloudwego/thriftgo)：Golang 实现的 thrift 编译器，支持插件机制和语义检查
* [**Netpoll-http2**](https://github.com/cloudwego/netpoll-http2)：基于 Netpoll 的 HTTP/2 实现

除了这几个主要项目外，CloudWeGo 紧随其后陆续开源了 [**Kitex-benchmark**](https://github.com/cloudwego/kitex-benchmark)、[**Netpoll-benchmark**](https://github.com/cloudwego/netpoll-benchmark)、[**Thrift-gen-validator**](https://github.com/cloudwego/thrift-gen-validator)、[**Kitex-examples**](https://github.com/cloudwego/kitex-examples) 、[**Netpoll-examples**](https://github.com/cloudwego/netpoll-examples)等项目。

鉴于文章篇幅有限，下文将重点介绍 CloudWeGo 核心项目 Kitex。

从**演进历史**来看，2014 年，字节跳动技术团队引入 Golang 解决长连接推送业务面临的高并发问题，两年后，内部技术团队基于 Golang 推出了一个名为 Kite 的框架，同时对开源项目 Gin 做了一层很薄的封装，推出了 Ginex。这两个框架极大推动了 Golang 在公司内部的应用。此后，围绕性能和可扩展性设计，字节跳动重构 Kite，并在次年 10 月完成并发布Kitex，投入到内部应用中。据悉，截至 2021 年 9 月，线上有 3w+ 微服务使用 Kitex，大部分服务迁移新框架后可以收获 CPU 和延迟上的收益。

![image](/img/blog/Microservices_Open_CloudWeGo/Framework.PNG)

从**架构**上看，Kitex 主要分为两部分。其中 Kitex Core 是它的的主干逻辑，定义了框架的层次结构、接口，还有接口的默认实现。最上面 Client 和 Server 是对用户暴露的，包含 Option 配置以及其初始化的逻辑；中间的 Modules 模块是框架治理层面的功能模块和交互元信息，而 Remote 模块是与对端交互的模块，包括编解码和网络通信。另一部分 Kitex Tool 则是对应生成代码相关的实现，生成代码工具就是编译这个包得到的，里面包括 IDL 解析、校验、代码生成、插件支持、自更新等。

从**功能与特性**这两个角度来看，主要可以分为以下七个方面：

![image](/img/blog/Microservices_Open_CloudWeGo/Functions_Features.PNG)

* **高性能**：网络传输模块 Kitex 默认集成了自研的网络库 Netpoll，性能相较使用 go net 有显著优势；除了网络库带来的性能收益，Kitex 对 Thrift 编解码也做了深度优化。关于性能数据可参考 [kitex-benchmark](https://github.com/cloudwego/kitex-benchmark)。
* **扩展性**：Kitex 设计上做了模块划分，提供了较多的扩展接口以及默认的扩展实现，使用者也可以根据需要自行定制扩展，更多扩展能力参见 CloudWeGo [官网文档](https://www.cloudwego.io/zh/docs/kitex/tutorials/framework-exten/)。Kitex 也并未耦合 Netpoll，开发者也可以选择其它网络库扩展使用。
* **消息协议**：RPC 消息协议默认支持 Thrift、Kitex Protobuf、gRPC。Thrift 支持 Buffered 和 Framed 二进制协议；Kitex Protobuf 是 Kitex 自定义的 Protobuf 消息协议，协议格式类似 Thrift；gRPC 是对 gRPC 消息协议的支持，可以与 gRPC 互通。除此之外，使用者也可以扩展自己的消息协议。
* **传输协议**：传输协议封装消息协议进行 RPC 互通，传输协议可以额外透传元信息，用于服务治理，Kitex 支持的传输协议有 TTHeader、HTTP2。TTHeader 可以和 Thrift、Kitex Protobuf 结合使用；HTTP2 目前主要是结合 gRPC 协议使用，后续也会支持 Thrift。
* **多消息类型**：支持 PingPong、Oneway、双向 Streaming。其中 Oneway 目前只对 Thrift 协议支持，双向 Streaming 只对 gRPC 支持，后续会考虑支持 Thrift 的双向 Streaming。
* **服务治理**：支持服务注册/发现、负载均衡、熔断、限流、重试、监控、链路跟踪、日志、诊断等服务治理模块，大部分均已提供默认扩展，使用者可选择集成。
* **Kitex 内置代码生成工具，可支持生成 Thrift、Protobuf 以及脚手架代码**。原生的 Thrift 代码由本次一起开源的 Thriftgo 生成，Kitex 对 Thrift 的优化由 Kitex Tool 作为插件支持。Protobuf 代码由 Kitex 作为官方 protoc 插件生成 ，目前暂未单独支持 Protobuf IDL 的解析和代码生成。

简单总结一下，CloudWeGo 不仅仅是一个开源的项目，也是一个真实的、超大规模的**企业级**最佳实践。它源自企业，所以天生就适合在企业内部落地；它源自开源，最终也拥抱了开源，从 Go 基础库，到 Go 网络库和 Thrift 编译器，再到上层的服务框架，以及框架拥有的所有企业级治理能力，均对外开放开源。

![image](/img/blog/Microservices_Open_CloudWeGo/Enterprise.PNG)

## **03 CloudWeGo 的微服务治理**

微服务架构是当前软件开发领域的技术热点。大系统终究会拆解成小系统，“合久必分，分而治之”，传统行业的系统架构大多都是庞大的单体架构，微服务是架构发展过程中一个非常自然的演变状态。

那么，什么是微服务治理呢？众说纷纭，业界没有达成一个共识。广义上，服务治理关注服务生命周期相关要素，包括服务的架构设计、应用发布、注册发现、流量管理，监控与可观测性、故障定位、安全性等；又或将其分为架构治理、研发治理、测试治理、运维治理、管理治理。狭义上，服务治理技术包括服务注册与发现、可观测性、流量管理、安全、控制。后续主要是从狭义上服务治理的角度出发，展开介绍 CloudWeGo-Kitex 相关的思考和探索。

### **服务注册与发现**

Kitex 并不提供默认的服务注册发现，体现了框架的**中立**特征。Kitex 支持自定义注册模块和发现模块，使用者可自行扩展集成其他注册中心和服务发现实现，该扩展分别定义在 Pkg/Registry 和 Pkg/Discovery 下。

Kitex 服务注册扩展接口如下所示，更多详情可以查看官网框架扩展 -> [服务注册扩展](https://www.cloudwego.io/zh/docs/kitex/tutorials/framework-exten/registry/)。

![image](/img/blog/Microservices_Open_CloudWeGo/Service_registry.png)

Kitex 服务发现扩展接口如下所示，更多详情可以查看官网框架扩展 -> [服务发现扩展](https://www.cloudwego.io/zh/docs/kitex/tutorials/framework-exten/service_discovery/)。

![image](/img/blog/Microservices_Open_CloudWeGo/Service_discovery.png)

截止日前，Kitex 已经通过社区开发者的支持，完成了 ETCD、ZooKeeper、Eureka、Consul、Nacos、Polaris 多种服务发现模式，当然也支持 DNS 解析以及 Static IP 直连访问模式，建立起了强大且完备的社区生态，供用户按需灵活选用。

![image](/img/blog/Microservices_Open_CloudWeGo/Community_ecology.PNG)

特别鸣谢 @li-jin-gou @liu-song @baiyutang @duduainankai @horizonzy @Hanson 等几位社区贡献者对上述服务发现扩展库的实现与支持。更多代码详情可以查看 [https://github.com/kitex-contrib](https://github.com/kitex-contrib) 。

### **熔断**

前面介绍了 Kitex 服务注册与发现机制，这一点对于业务接入框架非常重要，缺少这一环节微服务之间无法实现互通。那么熔断对于微服务有什么作用呢？

在微服务进行 RPC 调用时，下游服务难免会出错，当下游出现问题时，如果上游继续对其进行调用，既妨碍了下游的恢复，也浪费了上游的资源。为了解决这个问题，可以设置一些动态开关，当下游出错时，手动的关闭对下游的调用，然而更好的办法是使用熔断器，自动解决这个问题。

Kitex 提供了熔断器的实现，但是没有默认开启，需要用户主动开启后即可使用。

Kitex 大部分服务治理模块都是通过 Middleware 集成，熔断也是一样。Kitex 提供了一套 CBSuite，封装了服务粒度的熔断器和实例粒度的熔断器。

* **服务粒度熔断**：按照服务粒度进行熔断统计，通过 WithMiddleware 添加。服务粒度的具体划分取决于 Circuit Breaker Key，即熔断统计的 Key，初始化 CBSuite 时需要传入 **GenServiceCBKeyFunc**。默认提供的是 `circuitbreaker.RPCInfo2Key`，该 Key 的格式是 `fromServiceName/toServiceName/method`，即按照方法级别的异常做熔断统计。
* **实例粒度熔断**：按照实例粒度进行熔断统计，主要用于解决单实例异常问题，如果触发了实例级别熔断，框架会自动重试。

**熔断器的思路很简单根据 RPC 成功或失败的情况，限制对下游的访问**。通常熔断器分为三个时期：CLOSED、OPEN、HALFOPEN。当RPC 正常时，为 CLOSED；当 RPC 错误增多时，熔断器会被触发，进入 OPEN；OPEN 后经过一定的冷却时间，熔断器变为 HALFOPEN；HALFOPEN 时会对下游进行一些有策略的访问，然后根据结果决定是变为 CLOSED，还是 OPEN。总的来说三个状态的转换大致如下图：

![image](/img/blog/Microservices_Open_CloudWeGo/Conversion.png)

关于 Kitex 熔断器实现的更多细节和原理，可以查看官网基本特性 -> [熔断器](https://www.cloudwego.io/zh/docs/kitex/tutorials/basic-feature/circuitbreaker/)章节。

### **限流**

如果说熔断是从客户端出发保护调用链，以防止系统雪崩，那么限流则是一种保护服务端的措施，防止上游某个 Client 流量突增导致 Server 过载。

Kitex 支持限制最大连接数和最大 QPS。在初始化 Server 的时候，增加一个 Option：

![image](/img/blog/Microservices_Open_CloudWeGo/Server.png)

其中 `MaxConnections` 表示最大连接数，MaxQPS` 表示最大 QPS，此外，Kitex 还提供了动态修改限流阈值的能力。

Kitex 分别使用了 ConcurrencyLimiter 和 RateLimiter 对最大连接数和最大 QPS 进行限流，其中 ConcurrencyLimiter 采用了简单的计数器算法，RateLimiter 采用了“令牌桶算法”。

限流状态的监控也是重要的一环，Kitex 定义了 `LimitReporter` 接口，用于限流状态监控，例如当前连接数过多、QPS 过大等。如有需求，用户需要自行实现该接口，并通过 `WithLimitReporter` 注入。

![image](/img/blog/Microservices_Open_CloudWeGo/LimitReporter.png)

### **请求重试**

Kitex 提供三类重试：超时重试、Backup Request，建连失败重试。其中建连失败是网络层面问题，由于请求未发出，框架会默认重试，下面重点介绍前两类重试的使用。需要注意的是，因为很多的业务请求不具有**幂等性**，这两类重试不会作为默认策略，用户需要按需开启。

* **超时重试**：错误重试的一种，即客户端收到超时错误的时候，发起重试请求。
* **Backup Request**：客户端在一段时间内还没收到返回，发起重试请求，任一请求成功即算成功。Backup Request 的等待时间 `RetryDelay` 建议配置为 TP99，一般远小于配置的超时时间 `Timeout`。

![image](/img/blog/Microservices_Open_CloudWeGo/Timeout.png)

服务中的长尾请求增加了服务的整体延迟，而长尾请求占比很低，如上图所示，一个真实服务的延迟分布，能明显看出长尾现象，最大延迟 60ms，而 99% 服务可以在 13ms 返回。当请求延迟达到 13ms 的时候就已经进入长尾请求，这个时候我们可以再发出一条请求，这条请求大概率会在 13ms 内返回，任意一次请求返回我们就认为请求成功，即通过增加适当的负载，大大减少了响应时间的波动。关于超时重试和 Backup Request 的优缺点以及适用场景，可见下表：

![image](/img/blog/Microservices_Open_CloudWeGo/Backup_Request.PNG)

### **负载均衡**

Kitex 默认提供了两种负载均衡算法实现：

* **WeightedRandom**：这个算法使用的是基于权重的随机策略，也是 Kitex 的默认策略。它会依据实例的权重进行加权随机，并保证每个实例分配到的负载和自己的权重成比例。
* **ConsistentHash**：一致性哈希主要适用于对上下文（如实例本地缓存）依赖程度高的场景，如希望同一个类型的请求打到同一台机器，则可使用该负载均衡方法。

ConsistentHash 在使用时，需要注意如下事项：

* 下游节点发生变动时，一致性哈希结果可能会改变，某些 Key 可能会发生变化；
* 如果下游节点非常多，第一次冷启动时 Build 时间可能会较长，如果 RPC 超时短的话可能会导致超时；
* 如果第一次请求失败，并且 Replica 不为 0，那么会请求到 Replica 上；而第二次及以后仍然会请求第一个实例。

### **可观测性**

框架自身不提供监控打点实现，提供了 `Tracer` 接口，用户可以根据需求实现该接口，并通过 `WithTracer` Option 注入到框架中。

![image](/img/blog/Microservices_Open_CloudWeGo/Tracer.png)

Kitex 的监控打点、Metrics 上报以及链路追踪，都可以通过上述接口进行扩展。

目前 [kitex-contrib](https://github.com/kitex-contrib) 组织下提供了 [Prometheus](https://github.com/kitex-contrib/monitor-prometheus) 的监控扩展，[OpenTracing](https://github.com/kitex-contrib/tracer-opentracing) 的链路追踪扩展，以及 [OpenTelemetry](https://github.com/kitex-contrib/obs-opentelemetry) 可观测性全家桶（Metrics + Tracing + Logging）扩展实现，用户可以按需接入相应的扩展。

### **微服务框架与服务网格**

**服务框架**是传统微服务技术的核心所在。早期微服务技术中的服务注册、发现、调用、治理、观测都离不开服务框架。这也带来了一些问题，比如业务研发者需要感知并使用服务框架的服务治理能力，框架版本升级困难，框架越来越重难于维护等等。

**服务网格（Service Mesh）** 是将无侵入服务治理定义的更为深入的微服务架构方案，被称为第二代微服务架构。通过将微服务治理能力以独立组件（Sidecar）整合并下沉到基础设施，服务网格可以实现应用业务逻辑与服务治理逻辑完全分离，这也使支持**多语言**、**热升级**等高阶特性变得顺理成章。

![image](/img/blog/Microservices_Open_CloudWeGo/Service_Mesh.png)

进入云原生时代，随着服务网格技术的逐步发展，我们也要用发展的眼光进行架构规划和设计，微服务框架和服务网格未来必定会是并存的，统一组成服务治理体系。在字节跳动，服务治理体系就是由服务框架和服务治理组成。以 Golang 服务为例，CloudWeGo 提供业务强相关、强侵入的服务治理，字节 Service Mesh 提供业务弱相关、弱侵入的服务治理，相互搭配，相互协商，既解决了业务开发所需的脚手架和开发模式，又让服务治理的接入更加容易。

与此同时，在服务网格和服务框架同时使用的场景下，服务框架必须要支持灵活卸载治理能力，服务网格也需要保证功能的稳定性。在未来技术的演进方向上，服务框架也主要专注于编解码、通信效率、多协议支持等方面，而服务网格则可以深入更多无侵入的服务治理功能研发中。

此外，在大规模场景下，针对服务治理新功能的研发需求决策，我们往往还需要考虑以下因素：

* **性能:** 大部分业务很在意，也是团队一直努力的重点；
* **普遍性**:需要评估是不是所有业务都需要的能力；
* **简洁**: 通俗说，我们不太希望引入太多的线上问题或者太复杂的使用说明文档；
* **ROI**：功能迭代、产品升级需要考虑整体投资回报率。

## **04 CloudWeGo 的开源之路**

![image](/img/blog/Microservices_Open_CloudWeGo/Library.png)

字节内部版本的 Kitex 是依赖于开源版本的 Kitex，因此可以理解为 Kitex 内外同源，不存在两个 Kitex。

### **开源的原因**

回到开篇的问题，为什么要创造一个新的项目，并且开源 CloudWeGo 呢？

首先，CloudWeGo 里面的项目都是在字节内部经过大规模落地实践验证的，开源后每个功能的迭代也都是第一时间在内部使用验证过的，是一个真正的企业级落地项目，开源用户和字节内部业务使用的是同一套服务框架；其次，CloudWeGo 提供的功能，尤其是协议支持和服务治理，都是能解决真实业务痛点的，每一行代码优化都能实实在在地提升用户服务的性能；最后，CloudWeGo 的研发也借鉴了一些知名开源项目的设计思路，同时也依赖一些开源项目的实现，我们把 CloudWeGo 开源出去也是为了回馈社区，给开源社区贡献一份力量。

CloudWeGo 在设计之初，就同时考虑了正确性和可维护性，除了代码逻辑的正确性，高质量的代码、明晰的代码结构和优良的扩展性一直都是 CloudWeGo 追求的方向和实践的信条。

CloudWeGo 服务于用户、需求驱动，为用户提供开箱即用的服务框架及相关中间件，希望可以服务于更多企业和独立开发者，避免用户重复创造。

### **开源的历程**

![image](/img/blog/Microservices_Open_CloudWeGo/Course.PNG)

CloudWeGo 自 2021 年 9 月 8 日正式对外官宣，主要子项目 Kitex 先后发布 v0.1.0 和 v0.2.0，支持了许多新的功能，对性能、代码、文档也相继做了许多优化。截止到 2022 年 4 月，距离首次官宣 7 个月，仅 CloudWeGo-Kitex 就收获了 **4000** 个 Star，累计近 **50** 个 Contributors，达到了一个新的里程碑，这很有趣，并且十分振奋人心，不是吗？

CloudWeGo 团队自开源之初就非常重视社区建设，“**Community Over Code**” 也是 CloudWeGo 社区所遵循的文化和目标。

从搭建用户群，建设官网和文档，积极维护项目 Issue，及时处理新的 PR，再到我们与贡献者的深入沟通和对他们的培养，每一个动作都体现我们的决心。为了推进社区建设规范化和标准化，CloudWeGo 团队先后创建了 Community 仓库用来定义社区成员晋升机制以及存档社区材料。

为了践行公开透明和开源开放的开源文化，搭建开放的对话与交流平台，CloudWeGo 组织了社区双周例会，在例会上同步社区近期计划并积极听取社区成员的建议，与社区贡献者讨论相关技术方案实现。

截止目前，通过社区 Maintainer 的培养、Contributor 的主动申请、社区管理委员会的投票审批，已经正式通过了 5 位 Committer 的加入申请，极大地壮大了 CloudWeGo 社区核心力量，他们为社区的发展作出了重大贡献。

### **后续的规划**

CloudWeGo 在 2021 年底收录进入 CNCF Landscape，丰富了 CNCF 在 RPC 领域的生态，给全球用户在做技术选型时提供了一套新的选择。

尽管取得了一些小小的成绩，但是 CloudWeGo 仍旧还是一个年轻的项目，开源贵在持之以恒、长期建设，CloudWeGo 团队也会持续完善，继续向前。

从社区建设方面来看，CloudWeGo 团队将继续提供更多新人友好的 Good-first-issue，坚持组织社区例会，定期举办开源技术沙龙，提供更易于理解的技术文档，另外也将继续欢迎更多新的开发者参与到社区建设中来。

从开源规划来看，HTTP 框架 Hertz 开源在即，还有更多中间件小工具、扩展库也都在持续开源中。此外，CloudWeGo 主创团队还研发了一套 Rust RPC 框架，正在内部落地实践验证中，在不久的将来，也将对外开源。

![image](/img/blog/Microservices_Open_CloudWeGo/Plan.png)

从功能研发计划来看，以 CloudWeGo-Kitex 为例，将继续以内外部用户需求为驱动力，持续开发新的功能并迭代完善已有的功能。其中，包括支持连接预热、自定义异常重试、对 Protobuf 支持的性能优化，支持 xDS 协议等。


从开源生态来看，目前 CloudWeGo-Kitex 已经完成了诸多开源项目的对接，未来也将会按需支持更多开源生态。此外，CloudWeGo 也在和国内外主流公有云厂商进行合作对接，提供开箱即用、稳定可靠的微服务托管与治理产品的基座；CloudWeGo 也积极与国内外软件基金会开展合作和交流，探索新的合作模式。

CloudWeGo 未来可期，我们期待更多用户使用我们的项目，也期待有更多开发者可以加入共建 CloudWeGo 社区，共同见证云原生时代一个初生但了不起的微服务中间件和开源项目。
