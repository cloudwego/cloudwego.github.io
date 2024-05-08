---
date: 2022-11-08
title: "Kitex Proxyless 之流量路由：配合 Istio 与 OpenTelemetry 实现全链路泳道"
projects: ["Kitex"]
linkTitle: "Kitex Proxyless 之流量路由：配合 Istio 与 OpenTelemetry 实现全链路泳道"
keywords: ["CloudWeGo", "Proxyless", "流量路由", "全链路泳道", "Bookinfo"]
description: "本文主要介绍了基于 Kitex Proxyless 实现流量路由，从而在 biz-demo 中使用 Kitex 和 Hertz 重写 bookinfo 项目，实现的目的是以实战的方式演示如何使用 xDS 实现全链路的流量泳道。"
author: <a href="https://github.com/CoderPoet" target="_blank">CoderPoet</a>
---

> 导语：Kitex Proxyless 是 Kitex 服务能够不借助 envoy sidecar 直接与 istiod 交互，基于 xDS 协议动态获取控制面下发的服务治理规则，并转换为 Kitex 对应规则来实现一些服务治理功能，如流量路由。基于 Kitex Proxyless，能够实现 Kitex 无需代理就可以被 ServiceMesh 统一管理，进而实现多种部署模式下的治理规则 Spec、治理控制面、治理下发协议、异构数据治理能力的统一。本文在 biz-demo 中使用 Kitex 和 Hertz 重写 bookinfo 项目，以实战的方式演示了如何使用 xDS 实现全链路的流量泳道。

## 01 引言

### **Kitex Proxyless**

> [Kitex][Kitex] 是字节开源的 Golang RPC 框架，已经原生支持了 xDS 标准协议，支持以 Proxyless 的方式被 ServiceMesh 统一纳管。
>
> - 详细设计见：
>   [Proposal: Kitex support xDS Protocol · Issue #461 · cloudwego/kitex](https://github.com/cloudwego/kitex/issues/461)
> - 具体使用方式见[官方文档](/zh/docs/kitex/tutorials/advanced-feature/xds/)

**[Kitex][Kitex] Proxyless** 简单来说就是 [Kitex][Kitex] 服务能够不借助 envoy sidecar 直接与 istiod 交互，基于 xDS 协议动态获取控制面下发的服务治理规则，并转换为 [Kitex][Kitex] 对应规则来实现一些服务治理功能（例如本文的重点：**流量路由**）。

基于 **[Kitex][Kitex] Proxyless**，让我们实现 [Kitex][Kitex] 能够无需代理就可以被 ServiceMesh 统一管理，进而实现多种部署模式下的**治理规则 Spec、治理控制面、治理下发协议、异构数据治理能力**的统一。

![image](/img/blog/Kitex_Proxyless/1.png)

### 流量路由

> 流量路由是指，能够将流量**根据其自身特定的元数据标识路由**到指定目的地。

流量路由属于服务治理中比较核心的能力之一，也是 [Kitex][Kitex] Proxyless 优先支持的场景之一。

[Kitex][Kitex] 基于 xDS 实现**流量路由**的方案大致如下：

![image](/img/blog/Kitex_Proxyless/2.png)

具体流程：

1. 增加一个 **xDS Router MW** 来负责 Pick Cluster（路由），并 watch 目标服务的 LDS 及 RDS。
2. 感知 LDS 变化，并提取目标服务的 LDS 中的 Filter Chain 及其 inline RDS。
3. 感知 RDS 变化，根据 **`VirtualHost`** 和 **`ServiceName`** 来匹配（支持前缀、后缀、精确、通配），获取目标服务的路由配置。
4. 遍历处理匹配到的 RDS 中的路由规则，路由规则主要分为两部分（参考：[路由规范定义](https://github.com/envoyproxy/envoy/blob/v1.13.1/api/envoy/api/v2/route/route_components.proto#L349)）：

- **Match** （支持前缀、后缀、精确、通配等），目前版本我们支持以下两种即可：

  - Path（必须项）：从 `rpcinfo` 提取 `Method` 进行匹配；
  - HeaderMatcher（可选项）：从 metainfo 中提取对应元数据 KeyValue，并进行匹配。

- **Route：**

  - **Cluster** ：标准 Cluster。
  - **WeightedClusters（权重路由）** ：MW 内根据权重来选择 cluster。
  - 将选择到的 Cluster 写入 `EndpointInfo.Tag`，用于之后的服务发现。

可以看到，流量路由其实是一个根据一定规则选择对应 SubCluster 的流程。

## 02 全链路泳道

基于流量路由能力，我们可以延伸出很多使用场景，如：A/B 测试、金丝雀发布、蓝绿发布等等，以及本文重点：**全链路泳道**。

全链路泳道可以理解成是对一组服务实例按照一定方式进行拆分（例如部署环境），并基于全链路灰度路由能力，让流量能够精准按照规则在指定服务实例泳道中流动（逻辑上如同游泳场中的泳道）。

在 Istio 中我们一般会通过 DestinationRule 的 subset 对实例进行分组，将一个服务拆分成不同子集（例如：按照版本、区域等属性拆分），然后配合 VirtualService 来定义对应的路由规则，将流量路由到对应子集中，从而完成泳道中的单跳路由能力。

不过单单只有流量路由能力，还不足以实现**全链路泳道**，因为当一个请求跨越多个服务的时候，我们需要有一个比较好的机制能够准确识别出该流量，并基于这个特征来为每一跳流量配置路由规则。

如下图所示：假设我们要实现一个用户的请求能够精确灰度到 service-b 的 v1 版本。最先想到的做法可能是所有请求都带上 `uid = 100` 的请求头，然后配置对应 VirtualService 来根据 header 里的 `uid = 100` 匹配。

![image](/img/blog/Kitex_Proxyless/3.png)

但这样的做法有几个明显的缺点：

1. **不够通用**：以具体某个业务属性标识（如：uid）作为流量路由匹配规则，我们需要将这个业务属性手动在全链路里透传，这本身对业务侵入性较大，需要业务配合改造。并且当我们要使用其他业务属性的时候，又需要全链路业务都改造一遍，可想而知，是非常不通用的做法。
2. **路由规则容易频繁变动，容易造成规则臃肿**：以具体某个业务属性标识（如：uid）作为流量路由匹配规则，假设我们要换一个业务属性，或者给其他用户设置路由规则的时候，得去改造原有的路由规则，或者针对不同业务属性重复定义多套路由规则，很容易就会造成路由臃肿，以至于难以维护。

因此，要实现全链路的流量路由统一，我们还需要额外借助一个更通用的**流量染色**与**染色标识全链路透传**能力。

### 流量染色

> 流量染色是指对请求流量打上特殊标识，并在整个请求链路中携带这个标识，而所谓的全链路泳道，就是整个链路基于统一的灰度流量染色标识来设置流量路由规则，使得流量能够精准控制在不同泳道中。

通常我们会在网关层进行流量染色，通常会根据原始请求中的元数据，来进行一定规则（条件、比例）转换成对应的染色标识。

- **按条件染色**：当请求元数据满足一定条件之后，就给当前请求打上染色标识，如：请求头中 `uid = 100`、cookie 匹配等等。
- **按比例染色**：按照一定比例，给请求打上染色标识。

有了一套统一的流量染色机制之后，我们配置路由规则的时候，就不需要关心具体的业务属性标识了，只需要根据**染色标识**来配置即可。

将具体的业务属性抽象成条件染色规则，使其更通用，即使业务属性发生了变化，路由规则也无需再频繁变动了。

### 染色标识全链路透传

> 染色标识通常会依靠 Tracing Baggage 来透传，Baggage 是用于在整个链路中传递业务自定义 KV 属性，例如传递流量染色标识、传递 AccountID 等业务标识等等。

![image](/img/blog/Kitex_Proxyless/4.png)

要实现流量染色标识在全链路透传，我们通常会借助 Tracing Baggage 机制，在全链路中传递对应染色标识，大部分 Tracing 框架都支持 Baggage 概念机能力，如：OpenTelemetry、Skywalking、Jaeger 等等。

有了一套通用的全链路透传机制，业务方就只需要接入一遍 tracing 即可，无需每次业务属性标识发生变化就配合改造一次。

下面会借助一个**具体的工程案例**介绍，来介绍并演示如何基于 [Kitex][Kitex] Proxyless 和 OpenTelemetry Baggage 实现全链路泳道功能。

## 03 案例介绍：Bookinfo

> 该案例是使用 [Hertz](https://github.com/cloudwego/hertz)、[Kitex][Kitex] 重写经典的 [Istio Bookinfo](https://istio.io/latest/zh/docs/examples/bookinfo/) 项目：
>
> - 使用 istiod 来作为 **xDS server**，作为 CRD 配置和下发的入口；
> - 使用 wire 来实现**依赖注入**；
> - 使用 opentelemetry 来实现**全链路追踪**；
> - 使用 [Kitex-xds](https://github.com/kitex-contrib/xds) 和 opentelemetry baggage 来实现 **proxyless** 模式下的全链路泳道;
> - 使用 arco-design 和 react 实现一个 **[Bookinfo](https://github.com/cloudwego/biz-demo/blob/main/bookinfo/README_CN.md) UI**。

### 架构

整体架构与 [Bookinfo](https://github.com/cloudwego/biz-demo/blob/main/bookinfo/README_CN.md) 保持一致，分为四个单独的微服务：

- `productpage.` 这个微服务会调 `details` 和 `reviews` 两个微服务；
- `details.` 这个微服务中包含了书籍的信息；
- `reviews.` 这个微服务中包含了书籍相关的评论。它还会调用 `ratings` 微服务；
- `ratings.` 这个微服务中包含了由书籍评价组成的评级信息。

`reviews` 微服务有 3 个版本：

- v1 版本会调用 `ratings` 服务，并使用 1 颗 ⭐️ 显示评分；
- v2 版本会调用 `ratings` 服务，并使用 5 颗 ⭐️⭐️⭐️⭐️⭐️⭐️ 显示评分；
- v3 版本不会调用 `ratings` 服务。

![image](/img/blog/Kitex_Proxyless/5.png)

### 泳道示意图

整体区分成 2 个泳道：

- **基准泳道**：未被染色的流量会被路由到基准泳道中。
- **分支泳道**：被染色的流量会被路由到 reviews-v2 ->ratings-v2 的分支泳道中。

![image](/img/blog/Kitex_Proxyless/6.png)

### 流量染色

网关统一负责对流量进行染色，例如请求 header 中 uid=100 的流量都统一进行染色，为请求携带上 `env=dev` 的 **baggage**。

![image](/img/blog/Kitex_Proxyless/7.png)

染色方式可以根据不同的网关实现具体选择，例如当我们选择 istio ingress 作为网关的时候，我们可以借助 `EnvoyFilter` + `Lua` 的方式来编写网关染色规则。

### 为服务实例打标

1. 为对应 **workload** 打上对应 version 标识。

> 以 reviews 为例，只需要给对应 pod 打上 version: v1 的 label 即可。

![image](/img/blog/Kitex_Proxyless/8.png)

2. 基于 **DestinationRule** 为服务设置一系列的 subsets：

> - Productpage: v1
> - Reviews: v1、v2、v3
> - Ratings: v1、v2

![image](/img/blog/Kitex_Proxyless/9.png)

### 流量路由规则

网关已经将请求头中携带了 `uid=100` 的流量进行了染色，自动带上了 `env=dev` 的 baggage，因此我们只需要根据 header 进行路由匹配即可，下面是具体的路由规则配置示例：

![image](/img/blog/Kitex_Proxyless/10.png)

### 查看效果

#### 基准泳道

入口流量请求头中不带 `uid=100` 的请求，会自动路由到基准泳道服务，reviews v1 和 v3 服务间轮询，展示的效果是评分为 0 或 1 随机。

![image](/img/blog/Kitex_Proxyless/11.png)

#### 分支泳道

1. 我们这边通过浏览器 mod-header 插件，来模拟入口流量请求头中携带了 `uid=100` 的场景。

![image](/img/blog/Kitex_Proxyless/12.png)

2. 再点击刷新按钮，可以发现请求打到了分支泳道，流量泳道功能成功生效。

![image](/img/blog/Kitex_Proxyless/13.png)

## 04 总结与展望

至此我们已经基于 **[Kitex][Kitex] Proxyless** 与 **OpenTelemetry** 实现了一个完整的全链路泳道，并且无需借助 Envoy sidecar，就能基于 Isito 标准治理规则 Spec，来为 Kitex 设置对应的路由规则了。

当然，除了满足**流量路由**能力之外，**[Kitex][Kitex] Proxyless** 也在持续迭代优化，满足更多数据面治理能力需求。Proxyless 作为一种 ServiceMesh 数据面探索和实践，除了能够丰富网格数据面部署形态之外，也希望可以不断打磨 **[Kitex][Kitex]**，增强其在开源生态兼容方面的能力，打造一个开放包容的微服务生态体系。

## 05 相关项目链接

下面是该案例涉及的项目清单：

- biz-demo: https://github.com/cloudwego/biz-demo
- kitex: https://github.com/cloudwego/kitex
- hertz: https://github.com/cloudwego/hertz
- kitex-xds: https://github.com/kitex-contrib/xds
- kitex-opentelemetry: https://github.com/kitex-contrib/obs-opentelemetry
- hertz-opentelemetry: https://github.com/hertz-contrib/obs-opentelemetry

该完整案例已提交在 [biz-demo][biz-demo] 仓库中，感兴趣的同学可以前往查阅。[biz-demo][biz-demo] 会包含一些基于 [CloudWeGo](https://github.com/cloudwego) 技术栈且具备一定业务场景的完整 Demo，初衷是能够为企业用户在生产中使用提供有价值的参考，非常欢迎更多同学能够参与到 [CloudWeGo](https://github.com/cloudwego) 相关场景与案例的贡献中来，一起来做一些有意思的尝试。

[Kitex]: https://github.com/cloudwego/kitex
[biz-demo]: https://github.com/cloudwego/biz-demo
