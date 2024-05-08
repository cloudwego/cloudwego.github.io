---
date: 2022-09-20
title: "高性能 RPC 框架 CloudWeGo-Kitex 内外统一的开源实践"
projects: ["Kitex"]
linkTitle: "高性能 RPC 框架 CloudWeGo-Kitex 内外统一的开源实践"
keywords:
  [
    "Kitex",
    "CloudWeGo",
    "RPC",
    "开源",
    "Kite",
    "Golang",
    "Thrift",
    "Protobuf",
    "gRPC",
    "xDS",
  ]
description: "本文介绍了高性能 RPC 框架 CloudWeGo-Kitex 的起源与发展历史，以及开源一年以来的功能特性变更、社区共建生态成果、企业落地实践等方面。"
author: <a href="https://github.com/YangruiEmma" target="_blank">YangruiEmma</a>
---

## 由内至外 - 开源过渡

很多同学可能刚刚了解 CloudWeGo，先介绍一下 CloudWeGo 和 [Kitex][Kitex] 的关系。

### CloudWeGo 和 Kitex

[Kitex][Kitex] 是 CloudWeGo 开源的第一个微服务框架，它是一个 **支持多协议的 Golang RPC 框架** ，从网络库、序列化库到框架的实现**基本完全自研**的。
特别地，[Kitex][Kitex] 对 gRPC 协议的支持使用了 gRPC 官方的源码，但是我们对 gRPC 的实现做了 **深度且定制的优化** ，所以 [Kitex][Kitex] 支持的 gRPC 协议性能优于 gRPC 官方框架。
同时这也是 [Kitex][Kitex] 与目前已经开源的、支持 gRPC 协议的其他 Golang 框架的主要差异。如果用户想使用 gRPC 又对性能有很高的要求，那么 [Kitex][Kitex] 框架将会是一个很不错的选择。

继 [Kitex][Kitex] 开源后，今年 CloudWeGo 又陆续开源了 Golang HTTP 框架 [Hertz](https://github.com/cloudwego/hertz)，Rust RPC 框架 [Volo](https://github.com/cloudwego/volo)，同时围绕这些微服务框架和微服务的一些通用能力，
我们还开源了一些高性能的基础库。关于更多 CloudWeGo 开源的子项目，可以进入 CloudWeGo [官网](/zh/)详细了解。

[CloudWeGo 官网](/)

![image](/img/blog/1st_RPC_Kitex/1.png)

根据社区同学反馈，在一些开源群里大家会讨论 [Kitex][Kitex] 会不会是一个字节跳动的开源 KPI 项目呢？它的稳定性、持续性能够得到保障吗？我可以负责任地讲，[Kitex][Kitex] 不是一个 KPI 项目，它是来自字节跳动内部大规模实践的真实项目。
在 [Kitex][Kitex] 开源后始终保持内外统一，基于内外代码的统一我们保证了 [Kitex][Kitex] 的持续迭代。为了进一步消除大家的顾虑，下面具体介绍一下 [Kitex][Kitex] 的诞生和开源历程。

![image](/img/blog/1st_RPC_Kitex/2.png)

### Kitex 发展历史

2014 年，字节跳动开始引入 Golang。2015 年，字节跳动内部的服务化开启。在 RPC 调用的场景选择了 Thrift 协议，在内部开始支持 RPC 框架。2016 年，第一个 Golang RPC 框架 Kite 正式发布。
通常在一个公司高速发展的初期，基础能力都是为了快速支持需求落地，面对的需求场景也较单一，设计上不会有较多考量，其实这也是合理的，因为探索阶段并不完全清楚还需要支持哪些场景，过多的考虑反而会出现过度设计的问题。

但是，随着业务场景复杂化，需求也会多样化，而且接入服务及调用量逐年增长，Kite 已经不足以支持后续的迭代，在线上服役三年多后，2019 年我们开启了新的项目 [Kitex][Kitex]，2020 年初发布了正式版本，在 2020 年底字节内部已经有 1w+ 服务接入 Kitex。

从 2014 年到 2020 年，Golang 已经是字节跳动内部主要的业务开发语言，应该是业界 Golang 应用最多的公司。我们的服务框架支持着数万个 Golang 微服务的可靠通信，
经过数量众多的微服务和海量流量的验证，我们已经有了较为成熟的微服务最佳实践，于是考虑将内部的实践开源出去丰富云原生社区的 Golang 产品体系。
在 2021年，我们以 CloudWeGo 品牌正式开源了第一个服务框架 [Kitex][Kitex]。截至今年 8 月，[Kitex][Kitex] 已经为字节跳动内部 **6w+** 的服务提供支持， **峰值 QPS 达到上亿级别** 。

![image](/img/blog/1st_RPC_Kitex/3.png)

大家或许还有疑问，完整的微服务体系离不开基础的云生态，无论在公有云、私有云，都需要搭建额外的服务以很好地支持微服务的治理，比如治理平台、注册中心、配置中心、监控、链路跟踪、服务网格等，而且还存在一些定制的规范。
字节跳动自然也有完善的内部服务支持微服务体系，但这些服务短期还无法开源，那 CloudWeGo 如何内外维护一套代码，统一迭代呢？

关于这个问题，我们看一下 [Kitex][Kitex] 的模块划分。[Kitex][Kitex] 的模块分为三个部分：中间是 [Kitex][Kitex] 主干部分 **Kitex Core** ，它定义了框架的层次结构、接口核心逻辑的实现以及接口的默认实现；
左边的 **Kitex Tool** 则是与生成代码相关的实现，我们的生成代码工具就是编译这个包得到的，其中包括 IDL 的解析、校验、代码生成、插件支持等。
不过为了便于用户使用同时提供更友好的扩展，主要能力也做了拆分作为基础库独立开源，如 Thriftgo、Thrift-validator 插件、Fastpb；
右边的 **Kitex Byted** 是对字节内部基础能力集成的扩展实现，我们在开始就将内部的能力作为扩展收敛到一个 package 下。

![image](/img/blog/1st_RPC_Kitex/4.png)

如此，我们就可以将 [Kitex][Kitex] Core 和 Tool 部分开源出去。我们将代码做了拆分，[Kitex][Kitex] 的核心代码和工具部分迁移到开源库，集成内部扩展的模块作为 [Kitex][Kitex] 的扩展保留在内部库，同时内部库封装一层壳保证内部用户可以无感知地升级。

那么 [Kitex][Kitex] 的开源就只是代码拆分这么简单吗？显然不是。2021 年 2 月，我们开始筹备 [Kitex][Kitex] 的开源，虽然基于 [Kitex][Kitex] 的扩展性，我们可以与内部基础设施集成的能力解耦，但是 [Kitex][Kitex] 仍然依赖内部的一些基础库，如果要开源必须先开源基础库的能力。
所以我们首先做了依赖库的梳理，与相关的同学合作首先开源了 **bytedance/gopkg** 库。这个库由 CloudWeGo 与字节跳动的语言团队合作维护，里面包含也了对 Golang 标准库能力的增强，感兴趣的同学可以关注使用。

bytedance/gopkg: https://github.com/bytedance/gopkg

![image](/img/blog/1st_RPC_Kitex/5.png)

在 gopkg 库开源后，我们调整代码进行开源适配。2021 年 7 月，[Kitex][Kitex] 正式开源，在内部发布中版本使用开源库。
但 [Kitex][Kitex] 毕竟支持了内部几万的微服务，我们必须要确保内部服务在这个变更后可以平滑过渡，所以在开源初我们没有对外官宣，在确认稳定性后，**2021 年 9 月，[Kitex][Kitex] 正式对外官宣开源** 。

介绍了 [Kitex][Kitex] 诞生、开源的历程，希望能够解除外部同学关于“Kitex 会不会是一个 KPI 项目？”的顾虑。

### 开源的价值

第一部分的最后，简单讲一下开源能为我们带来的价值。 **[Kitex][Kitex] 不是为了开源而实现的，但它的实现是面向开源的。** [Kitex][Kitex] 本身是一个经过内部大规模实现的项目，
我们希望 [Kitex][Kitex] 开源后能帮助更多用户在内部快速搭建微服务，同时开源能让我们收集更多社区和企业的反馈，也能吸引外部开发者共建，
促进 [Kitex][Kitex] 面向多元场景支持的演进，丰富产品能力，然后能在更多场景和企业得到落地，这是一个正向循环，互利共赢的过程。

![image](/img/blog/1st_RPC_Kitex/6.png)

## 开源一年变更回顾

### 框架的衡量指标

在介绍 [Kitex][Kitex] 开源一年变更前，先分享一下框架的衡量指标，这是大家在选择一个框架时要考虑的。

- **扩展性**

如果一个框架与内部能力强耦合，就无法移植到其他平台，或框架的支持场景单一也无法进行扩展，这样的框架很难得到外部的使用。

- **易用性**

框架的易用性体现在两个方面。第一是面向**业务开发者** ，如果一个框架在使用过程中需要让用户关注很多框架的细节，那么对研发效率要求很高的团队可能无法接受。
第二是面向**框架的二次开发者** ，他们需要对框架做一些定制支持，如果框架提供的扩展能力过于宽泛，扩展成本很高，或者可扩展的能力不够多，那么这个框架也是存在局限性的。

- **功能的丰富度**

虽然基于扩展性可以对框架进行定制，但不是所有开发者都有足够的精力做定制开发，如果框架本身对各种扩展能力提供了不同选择的支持，对于开发者来说只需要根据自己的基础设施进行组合就能在自己的环境中运行。

- **高性能**

前面三点是初期选择框架需要重点关注的指标，但随着服务规模和资源消耗变大，性能就成了不容忽视的问题。从长期的角度来说，选择框架的时候一定要关注性能，否则后续只能面临框架替换的问题，或者被迫对这个框架做定制维护。

关于以上四点框架的衡量指标，虽然 [Kitex][Kitex] 目前还没做到最好，但是这四个要素都是 [Kitex][Kitex] 设计和实现中一直在兼顾的，我们不会顾此失彼。

### 功能特性

下面就几个开源一年来重要的功能特性进行介绍。

#### Proxyless

Proxyless 是 [Kitex][Kitex] 面向开源场景提供的支持。在 [Kitex][Kitex] 开源初期，我们内部讨论过是否要支持 xDS 对接 [Istio][Istio]，对于外部用户来说，使用 [Istio][Istio] 可以快速搭建一套基本的微服务架构，
解决服务发现、流量路由、配置下发等问题，但是如果使用完整的 [Istio][Istio] 的解决方案，就要引入 Envoy，这会增加运维成本，而且直接使用官方的 Envoy 方案对性能有损，会引入额外的 CPU 开销且增加延迟。
**如果 [Kitex][Kitex] 能直接对接 [Istio][Istio]，既能让用户享受到部分 [Istio][Istio] 的能力，又可以避免 Envoy 带来的性能损失和部署运维成本。** 但是在开源初期，我们没有看到很明确的用户诉求，因此没有对此做高优的支持。

![image](/img/blog/1st_RPC_Kitex/7.png)

后来 gRPC 官方也发布了 Proxyless 的支持，同时 [Istio][Istio] 的官方也将 Proxyless 作为使用 [Istio][Istio] 的一种方式。[Kitex][Kitex] 现在也已完成支持，目前主要是对接服务发现，
xDS 支持的扩展单独开源到了 [kitex-contrib/xds](https://github.com/kitex-contrib/xds) 库中，后续还会完善。大家可以根据 README 了解如何使用 [Kitex][Kitex] 对接 [Istio][Istio]。

#### JSON 和 Protobuf 泛化调用支持

之前，[Kitex][Kitex] 支持了应用在网关场景的 HTTP 泛化，以及支持了应用在一些通用服务场景的 Map 和二进制泛化。开源后，根据用户的需求反馈又新增了 JSON 和 Protobuf 的泛化。

Protobuf 的泛化也是应用在 API 网关的场景。原来的 HTTP 泛化传输的数据格式是 JSON，但是 JSON 的序列化体积大、效率低，对性能有影响，所以很多移动端的接口选择使用 Protobuf 传输数据，因此增加了 Protobuf 泛化的支持。

![image](/img/blog/1st_RPC_Kitex/8.png)

**目前 [Kitex][Kitex] 的泛化主要针对后端的 Thrift 服务，无论是 Protobuf、Map 还是 JSON，[Kitex][Kitex] 都会在调用端结合 IDL 解析，将这些数据映射编码为 Thrift 包发给后端服务。**

那么为什么把泛化放在调用端而不是服务端呢？大家广泛了解的泛化都是服务端对泛化请求做了解析处理，当然调用端也要相应地提供泛化的 Client。
但是泛化面向的是通用服务，泛化使用成本其实是比较高的，它并不适用于普通的 RPC 场景，而通用服务面向的是所有后端的服务，有 Golang/Java/C++/Python/Rust，如果每一种语言框架都支持泛化，成本是非常高的。
就算各个语言都对泛化做了支持，框架版本收敛又是一个漫长的过程，对于通用服务来说，对接所有的服务就显得不太现实。综合以上原因，泛化放在调用端支持。

#### 重试能力增强

去年开源时，[Kitex][Kitex] 已经支持了重试功能。之前支持的重试有两类，一个是超时重试，一个是 Backup Request。

对于超时来重试来说，我们只会对超时这一种异常进行重试，但为了进一步提高请求成功率，用户希望对其他的异常也进行重试，或者用户可能会定义一些用户请求的状态码，结合用户状态码进行重试，
在这种情况下，显然我们只支持超时重试是不满足用户需求的。基于这个背景， **Kitex 新增了指定结果重试** ，用户可以指定其他异常或指定某一类 Response，框架会结合用户指定的结果进行重试。

其次，用户在配置重试时，如果通过代码配置的方式设置重试，它会对整个 Client 的所有 RPC 方法生效，但是用户希望针对不同的 RPC 方法应用不同的重试策略，甚至同一个方法也希望可以采用不同的重试策略，
因为不同链路上发起的同一个方法的请求对指标要求也会不同。比如有些想使用 Backup Request 减少延迟，有些想做异常重试提高成功率，对于这种情况， **[Kitex][Kitex] 新的版本支持了请求粒度配置重试** 。

下图是使用示例。以请求粒度重试配置为例，比如 RPC 方法是 `Mock`，那么我们在发起 RPC 调用的时候，在后面可以配置一个 `callopt` 指定重试策略，此次请求就会使用这个重试策略。

![image](/img/blog/1st_RPC_Kitex/9.png)

#### Thrift Validator

Thrift-gen-validator 是 Thriftgo 的一个工具插件，它可以根据 Thrift IDL 中定义的注解描述约束给对应的 `struct` 生成 `IsValid() error` 方法，校验值的合法性。
通常做 RPC 调用的时候，用户可能会对一些字段校验合法性，用户如果直接写这些校验代码，投入的成本会很高。所以我们就提供了注解支持， **只要用户在 IDL 中根据规范定义注解，Kitex 就可以帮助用户生成校验代码** 。

下图是代码生成的命令和一个 IDL 注解定义示例，在生成代码的时候指定 Thrift Validator 的插件，我们的插件工具就会解析注解，为用户生成这一套合法性校验的代码。
目前我们也将 Thrift Validator 的功能贡献给了 Apache Thrift。

![image](/img/blog/1st_RPC_Kitex/10.png)

### 性能优化

介绍完几个重要的功能特性，再介绍几个在性能上的优化特性。

#### Thrift 高性能编解码

**[Frugal][Frugal] 是一个无需生成编解码代码、基于 JIT 的高性能动态 Thrift 编解码器。** 虽然我们针对官方 Thrift 编解码已经做了优化，支持了 FastThrift，这个在我们开源前发布的优化实践里也有介绍，
但我们希望能有进一步的性能提升，参考我们开源的高性能 JSON 库 Sonic 的设计，实现了 Thrift JIT 编解码器。下图中的表格是 [Frugal][Frugal] 结合 [Kitex][Kitex] 与 FastThrift 的性能对比。

![image](/img/blog/1st_RPC_Kitex/11.png)

可以看到在大部分场景 RPC 性能表现都较优。除了性能上的优势，[Frugal][Frugal] 还有另一个优势是无需生成编解码生成代码。Thrift 的生成代码比 Protobuf 繁重，一个复杂的 IDL 代码生成文件可以达到几万行，
而这些代码本来对用户来说无需关注，却需要由用户来维护。[Frugal][Frugal] 只需要生成结构体代码，不需生成编解码代码，就大大解决了这个问题。

关于如何在 [Kitex][Kitex] 中使用 [Frugal][Frugal]，可以参考仓库的 [Readme](https://github.com/cloudwego/frugal#readme)。当然用户也可以单独使用 [Frugal][Frugal] 作为 Thrift 高性能编解码器，[Kitex][Kitex] 后续也会考虑默认使用 [Frugal][Frugal]。

#### Protobuf 高性能编解码

虽然我们内部主要支持 Thrift，但开源之后我们发现外部用户对于 Protobuf 或 gRPC 的关注会更多，所以参考 [Kitex][Kitex] FastThrift 的优化思路，重新实现了 Protobuf 的生成代码。
在 v0.4.0 版本，如果用户使用 [Kitex][Kitex] 的工具生成 Protobuf 的代码，就会默认生成 [Fastpb][Fastpb] 的编解码代码，在发起 RPC 调用的时候，[Kitex][Kitex] 也会默认使用 [Fastpb][Fastpb]。

下面列出的是 [Fastpb][Fastpb] 与官方 Protobuf 序列化的性能对比，可以看到无论是编码还是解码，在效率和内存分配上，[Fastpb][Fastpb] 都远远优于官方 Protobuf 序列化库。

- FastWrite: **(ns/op) ↓67.8% ，(B/op) ↓83.9%**
- FastRead: **(ns/op) ↓41.5% ，(B/op) ↓4.5%**

#### gRPC 性能优化

开源初期，我们对 gRPC 整体稳定性和性能的关注是比较少的。因为内部使用的场景不是很多。开源后收到了很多外部同学的反馈，
所以我们针对 gRPC 做了一个专项的问题治理以及性能优化。今年中旬我们已经把相关的优化正式提交到开源库，在 v0.4.0 版本发布。

Kitex v0.4.0: https://mp.weixin.qq.com/s/ezifbQkHcZQP6MygmJABYA

下图中左侧是优化前 Kitex-gRPC 和官方 gRPC 框架对 **Unary 请求**的压测吞吐对比，在并发比较低的情况下，[Kitex][Kitex] 的吞吐并不具有优势，
使用 [Fastpb][Fastpb] 的时候，[Kitex][Kitex] 的吞吐表现会好一些，但低并发的吞吐依然低于官方 gRPC。在优化之后，吞吐对比如右图所示。**相比优化前吞吐提升 46% - 70%，相比官方 gRPC 框架，吞吐高 51% - 70%。**

![image](/img/blog/1st_RPC_Kitex/13.png)

下图中右侧是优化后 **Unary 请求**的延迟对比，在吞吐比官方 gRPC 高出很多的情况下，[Kitex][Kitex] 的延迟也显著低于官方的 gRPC。同时就 [Kitex][Kitex] 自身而言，在优化后延迟表现也好了很多。

![image](/img/blog/1st_RPC_Kitex/14.png)

我们再看下 **Streaming 请求**的压测性能对比，优化前 Streaming 请求的表现同样在低并发的情况下，相对 gRPC 框架没有优势。
经过优化后，[Kitex][Kitex] 吞吐显著高于官方 gRPC，如下图，同时低并发下吞吐高但延迟持平，增加并发后能看到延迟出现分叉。所以在性能上， [Kitex][Kitex] 支持的 gRPC 协议相对官方有明显的优势。

![image](/img/blog/1st_RPC_Kitex/15.png)

虽然在部分功能上，[Kitex][Kitex] 还没有完全对齐，但是目前已经可以满足大部分的场景需求，我们后续也会继续进行功能对齐。

## 社区共建完善生态及企业落地

### 社区共建的 Kitex 扩展生态

开源后，我们很欣慰得到了很多开发者的关注，坦白说内部团队精力有限，无法快速建立起面向外部用户的 [Kitex][Kitex] 扩展生态。但是一年以来借助社区的力量，
[Kitex][Kitex] 在 **服务注册/发现**、 **可观测性**、**服务治理**几部分的扩展得到了很多补充，尤其是服务注册/发现相关的扩展，目前开源的主流注册中心都已完成对接，
虽然在功能丰富度上我们还有待加强，但结合已有的支持，对于外部用户已经具备了搭建微服务架构的能力。

![image](/img/blog/1st_RPC_Kitex/16.png)

衷心感谢积极参与 CloudWeGo 社区建设的同学们！关于 [Kitex][Kitex] 相关的生态支持，大家可以进入 [kitex-contrib](https://github.com/kitex-contrib) 了解更多的开源仓库。

### 对接外部企业，协助落地

我们开源的初衷是为了助力其他外部企业快速地搭建企业级的云原生架构。开源后，森马、华兴证券、贪玩游戏、禾多科技先后主动与我们联系，反馈使用问题、提出需求，
的确让我们发现了一些和内部场景不一样的问题，需要我们去关注、支持和优化，我们很开心 [Kitex][Kitex] 能在这些企业内部得到应用。
在今年 6 月 25 日的 CloudWeGo Meetup 中，森马和华兴证券的研发同学也分享了他们使用 [Kitex][Kitex] 的内部实践。

森马：https://mp.weixin.qq.com/s/JAurW4P2E3NIduFaVY6jew

华兴证券：https://mp.weixin.qq.com/s/QqGdzp-7rTdlxedy6bsXiw

![image](/img/blog/1st_RPC_Kitex/17.png)

除了以上企业，还有一些公司也私下向我们咨询过使用问题，我们非常感谢这些企业用户的支持，以及向我们提出的反馈信息。
如第一部分所讲，收集社区和企业的反馈可以促进 [Kitex][Kitex] 面向多元场景支持的演进，企业用户如果有相关需求，欢迎联系我们。

### 如何使用 Kitex 与内部基础设施集成

这里再简单介绍下如何使用 [Kitex][Kitex] 与大家的内部基础设施集成。以字节内部为例，内部仓库里有开源库中的扩展实现，集成内部的能力，
在 bytedSuite 中，我们针对不同场景对 [Kitex][Kitex] 进行初始化。如下面的代码示例，用户只需要在构造 Client 和 Server 时增加一个 option 配置就可以完成集成，
不过为了让用户完全不需关注内部能力的集成，我们将该配置放在了生成的脚手架代码中，关于配置如何内嵌在生成代码中，后续我们也会开放出来，方便外部的框架二次开发者能以同样的方式为业务开发同学提供集成能力。

![image](/img/blog/1st_RPC_Kitex/18.png)

## 总结和展望

### 总结

本次分享主要介绍了以下内容：

- [Kitex][Kitex] 如何保持内外统一地从内部应用较广的框架转为开源框架；
- 开源一年以来发布了哪些重要的功能特性，做了哪些性能优化；
- 借助社区的力量现在 [Kitex][Kitex] 的周边生态如何、企业落地情况以及如何使用 [Kitex][Kitex] 优雅地集成内部能力。

### 展望

- 与社区同学共建，持续丰富社区生态；
- 结合工程实践，为微服务开发者提供更多便利；
- 完善好 BDThrift 生态，持续优化 Protobuf/gRPC；
- 更多特性支持或开源，ShmIPC、QUIC、Protobuf 泛化…

[Kitex]: https://github.com/cloudwego/kitex
[Frugal]: https://github.com/cloudwego/frugal
[Fastpb]: https://github.com/cloudwego/fastpb
[Istio]: https://github.com/istio/istio
