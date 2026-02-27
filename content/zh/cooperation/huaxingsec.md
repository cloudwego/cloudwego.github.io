---
type: docs
title: "华兴证券：混合云原生架构下的 Kitex 实践"
linkTitle: "华兴证券"
weight: 1
---

> 2022 年 6 月，CloudWeGo 社区邀请到了来自字节跳动、森马电商和华兴证券的资深开发者，向社区分享 CloudWeGo 的最新企业落地实践。本文为 **华兴证券研发工程师 张天** 分享内容。

## 案例介绍

<div  align="center">
<img src="/img/usedby/huaxing.png" width = "400"  alt="huaxingsec" />
</div>
<br/><br/>

本文将从以下 4 个方面介绍华兴证券基于 Kitex 在多机房 K8s 集群下的实践经验，包括：

1. 针对 Kitex 的可观测性系统搭建经验；
2. 服务压力测试中遇到的问题以及解决方案；
3. Kitex 的不同连接类型在 K8s 同集群/跨集群调用下的一些问题和解决方案；
4. 实践中遇到的其他问题以及解决方案；

## Kitex 的可观性系统搭建

### 华兴证券 CloudWeGo-Kitex 使用情况

去年 6 月 1 日，华兴证券相关研发团队成立。Kitex 在 7 月 12 日发布了首个版本，10 天后就引入了 Kitex。

选择 Kitex 的原因是：团队早期成员比较了解 Kitex，为了快速支撑业务迭代和验证，选择最熟悉的框架，不但使用上比较习惯，对性能和功能方面也比较有把握。

后来也支撑了华兴证券 APP 的快速上线，大约 4 个月之后就上线了 APP 的第一个版本。

![huaxing1](/img/users/huaxingsec/huaxing1.png)

下图是业务的微服务调用关系图，一共有三十多个微服务，调用链路数超过 70。服务分别部署在两个机房。核心业务比如交易、行情等部署在私有机房。
非核心的业务，比如资讯、股票信息等部署在阿里的金融云，这样能够更好地利用金融云已有的基础设施比如 MySQL、Kafka 等，作为初创团队，能够降低整体的运维压力。
考虑到性能以及安全方面的因素，两个机房之间专门拉了专线。服务之间存在一些跨机房的依赖。跨机房调用会产生很多问题，后文会详细说明。

![huaxing2](/img/users/huaxingsec/huaxing2.png)

### Tracing 选型

服务数多了之后，我们需要一套链路追踪系统来描绘调用链路每个环节的耗时情况。考虑到 Kitex 原生支持 Opentracing，为减少集成成本，我们调研了符合 Opentracing 规范的产品。

排除掉收费的、客户端不支持 Go 之后，就剩阿里云的链路追踪产品和 Uber 公司出品的 Jaeger，考虑到私有机房也要部署，最终选择了 Jaeger。

### Kitex 接入 Tracing

选定方案之后，开始对 Kitex 的这个功能进行测试，结果发现当时去年 9 月初的 Kitex 版本并不支持跨服务的 Tracing，原因是调用的时候，没有把 Trace 信息发送给下游，如图所示，
这样上下游是两个孤立的 Trace（OpenTracing 规范里称为 Span），于是就无法通过一个 TraceID 去串起整条链路。当时任务比较急，于是我们没有等 Kitex 官方的实现，决定自研。

![huaxing3](/img/users/huaxingsec/huaxing3.png)

为了自研，我们结合 Kitex 的源码，梳理出客户端和服务端的流程。可以看出 Kitex 的上下游都内置了 Tracer 的 Hook。这里我们要解决的问题是，如何把 Span 信息进行跨服务传输？

![huaxing4](/img/users/huaxingsec/huaxing4.png)

经调研，实现透传有三种方案。

第一种是在消息层搞一个 Thrift 协议的拓展，把 Trace 信息塞进去。原因是 Thrift 本身没有 Header 结构，只能进行协议的拓展。好在 Kitex 支持自定义的协议拓展，因此具备可行性，然而开发成本较高，所以没选择这种方案。

第二种是在 IDL 里增加通用参数，在字段里存 Trace 信息。缺点是业务无关的字段要在 IDL 里，对性能有一定的影响。毕竟需要通过 Kitex 的中间件，通过反射来提取。

第三种是利用了 Kitex 提供的传输层透传能力，对业务没有侵入性。最后选择了这一种方案。

![huaxing5](/img/users/huaxingsec/huaxing5.png)

透传方案定了之后，整体的流程就清晰了。首先客户端会在 metaHandler.write 里通过 CTX 获取当前 Span，提取并写入 spanContext 到 TransInfo 中。

然后服务端，在 metaHandler.Read 里读取 spanContext 并创建 ChildOf 关系的 Span，中间件结束时 span.finish()，最后为了防止产生孤立 Trace，New 服务端时不使用 Kitex 提供的 Tracing 的 Option。

这里是因为同一个服务可能分别作为 Kitex 上下游，Tracer 如果共用，需要分别加特殊逻辑，实现上有点复杂。

![huaxing6](/img/users/huaxingsec/huaxing6.png)

### Tracing 基础库

为了充分利用 Tracing 的能力，除了 Kitex，我们在基础库中也增加了 Gin、Gorm、Redis、Kafka 等组件的 Tracing。

下面展示实际的一条链路。功能是通过短信验证码进行登录。先是作为 HTTP 服务的 API 入口，然后调用了一个短信的 RPC 服务，RPC 服务里面通过 Redis 来检查验证码。
通过之后调用用户服务，里面可能进行一些增加用户的 MySQL 操作。最后把用户登录事件发给 Kafka，然后运营平台进行消费，驱动一些营销活动。可以看出最耗时的部分是关于新增用户的一堆 MySQL 操作。

![huaxing7](/img/users/huaxingsec/huaxing7.png)

### 对错误的监控

Tracing 一般只关注调用耗时，然而一条链路中可能出现各种错误：

1. Kitex

- Kitex RPC 返回的 err（Conn Timeout、Read Timeout 等）；
- IDL 里自定义的业务 Code（111: 用户不存在）。

  2.HTTP

- 返回的 HTTP 状态码（404、503）；
- JSON 里的业务 Code（-1: 内部错误）。

![huaxing8](/img/users/huaxingsec/huaxing8.png)

如何对这类错误进行监控？主要有以下三种方案：

1. 打日志 + 日志监控，然后通过监控组件，这种方案需要解析日志，所以不方便；

2. 写个中间件上报到自定义指标收集服务，这种方案优点是足够通用，但是需要新增中间件。同时自定义指标更关注具体的业务指标；

3. 利用 Tracing 的 Tag，这种方案通用且集成成本低。

具体实现如下：

- Kitex 的 err、以及 HTTP 的状态码，定义为系统码；
- IDL 里的 Code 以及 HTTP 返回的 JSON 里的 Code，定义成业务码；
- Tracing 基础库里提取相应的值，设置到 span.tag 里；
- Jaeger 的 tag-as-field 配置里加上相应的字段（原始的 Tags，为 es 里的 Nested 对象，无法在 Grafana 里使用 Group By）。

### 监控告警

在增加错误监控的基础上，我们构建了一套监控告警系统体系。

这里重点看一下刚才的链路追踪相关的内容。首先每个业务容器会把指标发送到 Jaeger 服务里。Jaeger 最终把数据落盘到 es 中。然后我们在 Grafana 上配置了一堆看板以及对应的告警规则。

触发报警时，最终会发送到我们自研的 alert-webhook 里。

自研的部分首先进行告警内容的解析，提取服务名等信息，然后根据服务的业务分类，分发到不同的飞书群里，级别高的报警会打加急电话。这里也是用到了飞书的功能。

![huaxing9](/img/users/huaxingsec/huaxing9.png)

Grafana 里我们配置了各类型服务调用耗时、错误码一体化看板，描述了一个服务的方方面面的指标。包括日志监控、错误码监控、QPS 和调用耗时、容器事件监控、容器资源监控等。

![huaxing10](/img/users/huaxingsec/huaxing10.png)

下图展示了飞书告警卡片。包括 RPC 调用超时、系统码错误、业务码错误。

这里我们做了两个简单的工作，一个是带上了 TraceID，方便查询链路情况。另一个是把业务码对应的含义也展示出来，研发收到报警之后就不用再去查表了。

![huaxing11](/img/users/huaxingsec/huaxing11.png)

本章小结

- 完成了 Tracing 接入 Kitex，实现跨服务传递；
- 对 Tracing 基础库扩展了其他类型中间件（Gin、Gorm、Redis、Kafka）的支持；
- 对 Tracing 基础库增加了系统码、错误码实现对错误的监控；
- 配置了全方位的服务指标看板；
- 结合 es、Grafana、飞书以及自研告警服务，搭建了针对微服务的监控告警系统。

这样我们就完成了可观测性体系的搭建。

## 服务压力测试中遇到的问题以及解决方案

完成了监控告警体系之后，我们希望对服务进行压测，来找出性能瓶颈。第二部分介绍一下服务压测中遇到的问题和解决方案。

### Kitex v0.0.8：连接超时问题

首先我们发现，QPS=150 左右，Kitex 出现连接建立超时的错误。当时我们检查了下 CPU、网络、内存等均没有达到限制。先是怀疑连接池大小不太够，于是测了下 10 和 1000，如上图所示，结果在报错数目上没有区别。
另外观察到的一个现象是，压测期间出现接近 5000 的 Time Wait 状态。

![huaxing12](/img/users/huaxingsec/huaxing12.png)

5000 的限制，是因为达到了 `tcp_max_tw_buckets` 的设置的值。超过这个值之后，新的处于 Time Wait 状态的连接会被销毁，这样最大值就保持在 5000 了。
于是我们尝试进行排查，但没有思路，于是去翻看 Kitex 的 Issue，发现有人遇到相同的问题。

![huaxing13](/img/users/huaxingsec/huaxing13.png)

原来，v0.0.8 版本的 Kitex，在使用域名的方式来新建 Client 的时候，会导致连接池失效。因为把连接放回连接池时，用的 Key 是解析之后的 IP，而 GET 的时候，用的是解析前的域名，这样根本 Get 不到连接，于是不停创建短连接。
这样的两个后果是：建立连接比较耗时，另一方面请求执行完毕之后都会关闭掉连接，于是导致了大量的 Time Wait。

![huaxing14](/img/users/huaxingsec/huaxing14.png)

为了进行验证，我把测试服务改成了 IP 访问，然后比较了 IP 访问和域名访问以及不同连接池大小的情况。可以看出：IP 访问（连接池有效），但是连接池比较小的情况，出现减少的 Timeout。
连接池 100，Timeout 消失。而中间的域名访问的情况下，出现大量 Timeout。

![huaxing15](/img/users/huaxingsec/huaxing15.png)

### Kitex v0.1.3：连接池问题修复

看代码得知在 Kitex v0.1.3 修复了这个问题。

![huaxing16](/img/users/huaxingsec/huaxing16.png)

于是我们打算升级 Kitex 的版本，因为当时已经上了生产环境，在升级基础组件之前，需要进行验证，看一下不同连接池大小状态下的表现。还是域名模式，QPS 为 150 的情况下，随着连接池大小的增加，Timeout 的情况逐渐变少到消失。

![huaxing17](/img/users/huaxingsec/huaxing17.png)

继续进行压测，我们发现 QPS=2000 的时候又出现了报错。结合监控，发现原因是连接建立的时候超过了默认的 50ms。

![huaxing18](/img/users/huaxingsec/huaxing18.png)

我们讨论了几种解决方案：

1. 修改超时配置。然而，交易日的 9:30-9:35 有⼀堆集中交易请求，突发的流量，耗时长了体验不好，可能会影响 APP 收入，我们希望系统性能保持稳定。
2. 进行连接耗时的优化。然而 Kitex 已经使用了 Epoll 来处理创建连接的事件，作为使用方，进一步优化的难度和成本都太大。
3. MaxidleTimeout 参数改成无限大？比如先创建一个足够大的池，然后随着用户请求，池变得越来越大，最终稳定下来。但是每次服务升级之后，这个池就空了，需要慢慢恢复。
4. 进行连接预热。

![huaxing19](/img/users/huaxingsec/huaxing19.png)

其实连接预热就相当于压测结束之后立马趁热再压一次，如图，可以发现 QPS=2000 的情况下，几乎都走了连接池，没有报错。因此，如果服务启动时能够进行连接预热，就可以省下建立连接的时间，使服务的性能保持稳定。

![huaxing20](/img/users/huaxingsec/huaxing20.png)

当时 CloudWeGo 团队针对我们公司建了企业用户交流群，于是我们就向群里的 Kitex 研发提了连接预热的需求。其开发之后提供了连接预热个数的选项。我们也进行了测试。按照 QPS=2000 进行测试，

- WARM_UP_CONN_NUM=0：大约 1s 报错；
- WARM_UP_CONN_NUM=100：大约 4s 报错；

![huaxing21](/img/users/huaxingsec/huaxing21.png)

- WARM_UP_CONN_NUM=1000：大约 4s 报错，但可以看出一开始都无需新建连接；
- WARM_UP_CONN_NUM=2000：无报错。

![huaxing22](/img/users/huaxingsec/huaxing22.png)

本章小结如下：

- Kitex v0.0.8：域名模式下存在连接池失效问题，v0.1.3 中修复；
- Kitex v0.1.3：可进一步通过连接预热功能提高系统性能。

## Kitex 的不同连接类型在 K8s 同集群/跨集群调用下的一些问题和解决方案

### 长连接的问题：跨集群调用

第三部分我们讨论一下 Kitex 的不同连接类型在 K8s 同集群/跨集群调用下的一些问题和解决方案。

首先是长连接跨集群调用下的问题。服务在跨集群调用时，其源 IP: 端口为宿主机的，数量有限，而目的 IP: 端口为下游集群的 LB，一般是固定的。

那么，当长连接池数目比较大（比如数千），且上游较多（各种服务、每个都多副本，加起来可能数十个）的情况下，请求高峰时段可能导致上游宿主机的源端口不够用。同集群内跨机器调用走了 vxlan，因此没有这个问题。

解决方案有两类：

- 硬件方案：机器；
- 软件方案：对于下游为 Kitex 服务，改用 Mux 模式（这样少量连接就可以处理大量并发的请求）。下游不是 Kitex 框架，因为 Mux 是私有协议，不支持非 Kitex。此时可考虑增加下游服务的 LB 数量，比如每个 LB 上分配多个端口。

比较起来，改造成 Mux 模式成本最低。

### 连接多路复用的问题：滚动升级

但是多路复用模式，在 K8s 场景下，存在一个滚动升级相关的问题。我们先介绍下 Service 模式， K8s 的 Service 模式采用了 IPVS 的 Nat 模式（DR 和隧道模式不支持端口映射），链路为：

上游容器←→ClusterIP（服务的虚拟 IP）←→下游容器

然后我们看看滚动升级流程：

1. 新容器启动。
2. 新容器 Readiness Check 通过，之后做两件事情：
   - 更新 Endpoints 列表：新增新容器，删除旧容器；
   - 发送 sigTerm 到旧容器的 1 号进程。
3. 由于更新了 Endpoints 列表，Endpoints 列表发生更新事件，立即回调触发规则更新逻辑（syncProxyRules）：
   - 添加新容器到 IPVS 的 rs，权重为 1；
   - 如果此时 IPVS 的旧容器的中 ActiveConn + InactiveConn > 0（即已有连接还在），旧容器的权重会改成 0，但不会删除 rs。

经过步骤 3 之后，已有的连接仍然能够正常工作（因为旧容器 rs 未删），但新建的连接会走到新的容器上（因为旧容器权重 =0）。

在 Service 模式下，上游通过一个固定的 IP: 端口来访问下游，当下游滚动升级的时候，上游看到的地址并未变化，即无法感知到滚动升级。于是，下游即使有优雅退出，但上游并不知道下游开始优雅退出了。之后可能的情况是：

1. 下游发现连接繁忙，一直没有主动关闭，导致 K8s 配置的优雅升级时间超时，强制 Kill 进程，连接关闭，上游报错。
2. 下游发现连接空闲，主动关闭，然而客户端在关闭之前恰好拿到了连接（且认为可用），然后发起请求，实际上由于连接关闭，发起请求失败报错。

针对此问题，解决方案如下：

1. 同集群调用：改用 Headless Service 模式（结合 DNSResolver）：通过 DNS 列表的增删来感知下游变动；
2. 跨集群调用：借鉴 HTTP2 的 GOAWAY 机制。

![huaxing23](/img/users/huaxingsec/huaxing23.png)

具体，可采用如下方式：

1. 收到 sigTerm 的下游直接告诉上游（通过之前建立的 Conn1），同时下游继续处理发来的请求。
2. 上游收到关闭信息之后：
   - 新请求通过新建 Conn2 来发；
   - 已有的请求仍然通过 Conn1，且处理完了之后，等下游优雅关闭 Conn1。

这种方式的优点是同集群跨集群均可使用，缺点是需要 Kitex 框架支持。在我们找 Kitex 团队讨论之后，他们也提供了排期支持本需求。

### 连接多路复用的滚动升级测试：Headless Service 模式

在 Kitex 团队开发期间，我们测下 Kitex 已有版本对 Headless Service 模式下的滚动升级功能。

测试方案如下：

- Kitex 版本 v0.1.3；
- 上下游均为 Mux 模式；
- 上游的加了个自定义 DNSResolver，刷新时间为 1s，加日志打印解析结果；
- 下游的退出信号处理，收到 sigTerm 之后特意 Sleep 10s（用来排除这个 Case：服务端发现连接空闲关闭了，但客户端在关闭之前恰好拿到连接，接着认为未关闭，实际上已经关闭，而客户端发起了请求，于是导致报错）；
- QPS=100 恒定压上游，然后触发下游滚动升级。

实测报错如下图：

![huaxing24](/img/users/huaxingsec/huaxing24.png)

时序分析如下：

- 旧下游收到 sigTerm，开始 Sleep 10s；
- 上游解析到旧下游的 IP，向旧下游发起请求；
- DNS 规则更新：旧上游 IP 解析项消失，新下游解析项出现；
- 上游请求报错；
- 旧下游sleep完成，开始退出逻辑。

可见报错时旧下游还未执行退出逻辑，排除旧下游主动关闭连接。请求旧下游期间，且此时解析到新容器 IP（移除了旧容器 IP），报错是因为还没到退出逻辑的时候。因此推测，解析条目变化导致了报错。

根据推测，结合代码（Kitex 客户端部分）分析，可能出现以下并发问题：

- 【协程1】客户端从 Mux池里取出 conn1，即将发起请求（所以没有机会再检查 conn1 状态了）；
- 【协程2】DNS 更新，移除了 IP，于是 Clean 方法中关闭了 conn1；
- 【协程1】客户端用 conn1 发起请求，导致报错 conn closed。

![huaxing25](/img/users/huaxingsec/huaxing25.png)

于是我们向 CloudWeGo 提了 Issue，他们很快修复了这个问题。

![huaxing26](/img/users/huaxingsec/huaxing26.png)

### 连接多路复用的滚动升级测试：Service 模式

同样地，在 Service 模式中，测试方案如下：

- Kitex 版本使用 Feature 分支：mux-graceful-shutdown；
- 上下游均为 Mux 模式、服务发现使用 Service 模式；
- 恒定 QPS=200 压上游，20s 触发下游滚动升级；
- 另外写个服务打印期间的 IPVS 的日志；
- 下游的退出信号处理，收到 SigTerm 之后特意 sleep 10s（保证 ipvs 规则已更新）。

测试结果如下：
报错：INFO[0050] "{\"code\":-1,\"message\":\"remote or network error: conn closed\"}"。

时序分析为：

1. 旧下游收到 sigTerm，开始 sleep 10s。
2. IPVS规则变化：
   - 新下游 weight=1，ac=0，inac=0；
   - 旧下游 weight=0，ac=2，inac=0。
3. 旧下游 sleep 完成，进入最长为 15s（WithExitWaitTime）的优雅退出。
4. 上游请求报错。
5. 旧下游打印了最后一条日志。
6. IPVS 规则变化：
   - 新下游 weight=1，ac=2，inac=0 => ac=2 说明上游新建连接到新容器；
   - 旧下游 weight=0，ac=0，inac=2 => inac=2 表示连接关闭。
7. IPVS 规则变化：旧下游的规则被移除。

![huaxing27](/img/users/huaxingsec/huaxing27.png)

因此我们得出结论，报错发生在优雅退出期间。最后一条日志时刻大于报错时刻，因此，排除 K8s 的问题，确认 Conn Closed 是由 Kitex 导致的。
之后我们和 Kitex 研发团队沟通了分析结果，找到了 Root Cause，是因为假设了新的下游会有一个新的地址（但实际中 Service 模式都是一个地址），导致新请求取到了老请求的连接并进行关闭。对此进行了修复：

![huaxing28](/img/users/huaxingsec/huaxing28.png)

### 连接多路复用的问题：下游扩容

如果⽤ Service 模式（上游看到的下游就是体现为⼀个 IP），创建的 TCP 连接会在最开始固定的几个下游 POD 上，之后如果扩容增加 POD，新创建的 POD 就不会路由到了，导致扩容实际上无效。

解决方案如下：

1. 同集群调用：可用 Headless Service 模式，由于 DNS 解析能够得到所有 POD，路由没问题。
2. 跨集群调用：不在同集群内， Headless Service 模式无效，考虑如下方案：

- 方案1：修改服务发现机制。
  优点：Kitex 无需改动。
  缺点：增加依赖项（服务发现组件）。
- 方案2：下游先升级，之后上游 Redeploy 一下，让连接分布到下游的各种实例上。
  优点：Kitex 无需改动。
  缺点：上游可能很多，逐个 Redeploy 非常不优雅。
- 方案3：上游定期把 Mux 给过期掉，然后新建连接。
  优点：彻底解决。
  缺点：需要 Kitex 支持。

本章小结如下：

- 首先，针对长连接模式分析了跨集群时上游源端口数问题，希望通过多路复用模式解决；
- 其次，针对多路复用模式 + K8s Headless Service 模式的优雅升级，实测报错，分析定位了原因，Kitex 研发团队及时解决了相应问题；
- 再次，针对多路复用模式 + K8s Service 模式下的优雅升级提出了方案，Kitex 团队完成了实现，迭代了一轮，测试通过；
- 最后，针对多路复用模式 + K8s Service 模式下的下游副本扩容时路由不到的问题分析了原因，提出了方案，目前方案待实现。

## 实践中遇到的其他问题以及解决方案

### RPC Timeout Context Canceled 错误

第四部分我们分析下实践中遇到的其他问题以及解决方案。研发同学发现日志出现 `contexe canceled` 的错误，分析日志发现出现频率低，一天只有几十条，属于偶发报错。

![huaxing29](/img/users/huaxingsec/huaxing29.png)

我们推测是用户手机因为某种原因关闭了进行中的连接所导致，对此进行本地验证。三个部分：首先Gin 客户端设置了 500ms 超时限制，去请求 Gin 服务端接口；
其次，Gin 服务端收到请求之后，转而去调用 Kitex 服务；最后，Kitex 服务端 sleep 1s 模拟耗时超时，保证 Gin 客户端在请求过程中关闭连接。

实测能够稳定地复现。

![huaxing30](/img/users/huaxingsec/huaxing30.png)

我们梳理了源码逻辑，客户端关闭连接之后，Gin 读取到 EOF，调用 cancelCtx，被 Kitex 客户端的 rpcTimeoutMW 捕获到，于是返回了 err。

那么问题就变成，请求未完成时，连接为何会被关闭？我们按照设备的 ID 去分析日志，发现两类情况：一类是报错对应的请求是该设备短期内的最后一条，于是考虑 APP 被手动关闭；
二是报错对应的请求非短期内的最后一条，客户端研发反馈，有些接口例如搜索，上一条请求执行中（未返回），且新的请求来时，会 Close 掉上一次请求的连接。
第二种情况比较确定，关于第一种情况，APP 被关闭时，IOS 和 Android 是否会关闭连接？客户端同学没有给出肯定的答复。

于是我们考虑实际测试一下，两端分别写一个测试的应用，持续发起请求，但是不释放连接，此时关闭 APP，分析 TCP 包。实测我们在两端上均看到了 4 次挥手的 Fin 包。所以这个问题得到了确认。

![huaxing31](/img/users/huaxingsec/huaxing31.png)

那么如何进行修复呢？我们采取在 GIN 的中间件上拦截掉 Done 方法的方式。

![huaxing32](/img/users/huaxingsec/huaxing32.png)

上线之后，再没有出现这种情况。

![huaxing33](/img/users/huaxingsec/huaxing33.png)

还有一个问题，我们在测试环境发现，跨集群调用的时候，经常出现连接被重置的问题。生产环境搜日志，无此现象。

![huaxing34](/img/users/huaxingsec/huaxing34.png)

我们分析了环境差异：

- 生产环境是专线直连；
- 测试环境，因为专线比较昂贵，机房之前通过公网访问，中间有个 NAT 设备。

我们找网络同事咨询，得知 NAT 表项的过期时间是 60s。连接过期时，NAT 设备并不会通知上下游。因此，上游调用的时候，如果 NAT 设备发现表项不存在，会认为是一个失效的连接，就返回了 rst。
于是我们的解决方案是 Kitex 上游的 MaxIdleTimeout 改成 30s。实测再未出现报错。

![huaxing35](/img/users/huaxingsec/huaxing35.png)

本章小结如下：

- Rpc Timeout：Tontext Tanceled 问题分析和解决；
- Rpc Error：Connection Reset 问题分析和解决。

## 展望

未来我们计划把 Gin 更换为更高性能（QPS/时延）的 CloudWeGo-Hertz。因为我们 K 线服务的 Response Size 比较大（~202KiB），更换后 QPS 预计可达原先的 5 倍。
同时，为回馈开源社区，我们打算贡献 Tracing 基础库的代码到 Kitex-contrib/Tracer-opentracing。欢迎持续关注 CloudWeGo 项目，加入社区一起交流。

![huaxing36](/img/users/huaxingsec/huaxing36.png)
