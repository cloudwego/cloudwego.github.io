---
date: 2022-05-19
title: "字节微服务框架的挑战和演进"
linkTitle: "字节微服务框架的挑战和演进"
description: >
author: <a href="https://github.com/lsjbd" target="_blank">lsjbd</a>
---

2014 年以来，字节跳动内部业务的快速发展，推动了长连接推送服务，它们面临着高并发的业务需求问题，对性能和开发效率都有很高要求。当时的业务，大部分都是由 Python 开发，难以应对新出现的问题。项目负责人在一众现存的技术栈中选择了 Golang 这一门新兴的编程语言，快速解决了性能和开发效率的问题。随后，字节跳动内部开始逐渐推广使用 Golang 进行服务开发。

2016 年， 第一代 Golang RPC 框架 Kite 正式发布。Kite 是一个基于 Apache Thrift 进行包装的 RPC 框架，它在 Facebook 开源的 Thrift 之上提供了结合字节跳动内部基础设施的治理功能，同时还提供了一套简单易用的生成工具。随着 Kite 的发展，业务开始大规模使用 Golang。然而，在业务发展的过程中，由于研发专注于实现业务需求，对于框架的可维护性考量不足，Kite 逐渐背上了一些技术包袱，越来越难以满足业务在高性能和新特性方面的需求。因此我们决定对 Kite 进行重新设计，于是出现了 Kitex。

2020 年，Kitex 在内部发布了 V1.0.0，并且直接接入了 1,000+ 服务。由于 Kitex 的优秀性能和易用性，Kitex 在内部得到了大规模发展。直到 2021 年年中，字节跳动内部已有 2w+ 服务使用了 Kitex。因此，我们决定全面优化 Kitex，将其实践成果进行开源，反馈给开源社区。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3ZjQ2aTMxA3nhgEwUNNB7x3wAvkeWsWltmibcYwLskh3vVPENWVxxxnOlw/640?wx_fmt=png)

字节跳动 Golang RPC 框架的演进

### Kite 的缺陷

Kite 作为字节跳动第一代 Golang RPC 框架，主要存在以下缺陷：

1. Kite 为了快速支持业务发展需求，不可避免地耦合了部分中台业务的功能；
2. Kite 对 Go modules 支持不友好（Go modules 在 2019 年才进入语言核心）；
3. Kite 自身的代码拆分成多仓库，版本更新时推动业务升级困难；
4. Kite 强耦合了早期版本的 Apache Thrift，协议和功能拓展困难；
5. Kite 的生成代码逻辑与框架接口强耦合，成为了性能优化的天花板。

因此，业务的快速发展和需求场景的多样化，催生了新一代 Golang RPC 框架 Kitex。

### Kitex

Kitex 的架构主要包括四个部分：Kitex Tool、Kitex Core、Kitex Byted、Second Party Pkg。

* Kitex Core 是一个携带了一套微服务治理功能的 RPC 框架，它是 Kitex 的核心部分。
* Kitex Byted 是一套结合了字节跳动内部基础设施的拓展集合。通过这一套拓展集合，Kitex 能够在内部支持业务的发展。
* Kitex Tool 是一个命令行工具，能够在命令行生成我们的代码以及服务的脚手架，可以提供非常便捷的开发体验。
* Second Party Pkg，例如 netpoll， netpoll-http2，是 Kitex 底层的网络库，这两个库也开源在 CloudWeGo 组织中。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3ZjOicEs3fMjH49n4XZnod1gCsvPffdOuvBwebIIqbSBpwKxlSdyZDicomQ/640?wx_fmt=png)

Kitex 的架构设计

总的来说， Kitex 主要有五个特点：面向开源、功能丰富、灵活可拓展、支持多协议、高性能。

### 面向开源

由于之前已经体验过了 Kite 维护的各种问题，我们在立项之初就考虑到了未来可能会开源 Kitex。因此，我们设计的第一个宗旨就是不将 Kitex 和公司内部的基础设施进行强耦合或者硬编码绑定。Kitex Core 是一个非常简洁的框架，公司内部的所有基础设施都以拓展的方式注入到 Kitex Core 里。即使我们现在已经开源了，它也以这种形式存在。公司内部基础设施的更新换代，和 Kitex 自身的迭代是相互独立的，这对于业务来说是非常好的体验。同时，在 Kitex 的接口设计上，我们使用了 Golang 经典的 Option 模式，它是可变参数，通过 Option 能够提供各种各样的功能，这为我们的开发和业务的使用都带来了非常大的灵活性。

### Kitex 的功能特性

#### 治理能力

Kitex 内置了丰富的服务治理能力，例如超时熔断、重试、负载均衡、泛化调用、数据透传等功能。业务或者外部的用户使用 Kitex 都是可以开箱即用的。如果你有非常特殊的需求，你也可以通过我们的注入点去进行定制化操作，比如你可以自定义中间件去过滤或者拦截请求，定义跟踪器去注入日志、去注入服务发现等。在 Kitex 中，几乎一切跟策略相关的东西都是可以定制的。

以服务发现为例，Kitex 的核心库里定义了一个 Resolver interface 。任何一个实现了这四个方法的类型都可以作为一个服务发现的组件，然后注入到 Kitex 来取代 Kitex 的服务发现功能。在使用时，客户端只需要创建一个 Resolver 的对象，然后通过 client.WithResolver 注入客户端，就可以使用自己开发的服务发现组件。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zj4HtP0OCBkfAOcoMQfDksAsBnzYu1eJCAQhZDpuIBX4WGxNpO1WC9Hw/640?wx_fmt=png)

Kitex 的一个创新之处是使用 Suite 来打包自定义的功能，提供一键配置基础依赖的体验。

它能在什么地方起作用呢？例如，一个外部企业想要启用或者接入 Kitex， 它不可能拥有字节跳动内部的所有基础设施。那么企业在使用的时候肯定需要定制化，他可能需要定义自己的注册中心、负载均衡、连接池等等。如果业务方要使用这些功能的话，就需要加入非常非常多的参数。而 Suite 可以通过一个简单的类一次性包装这些功能，由此，业务方使用时，仍然是以单一的参数的方式添加，十分方便。又例如，我现在开发一个叫 mysuite 的东西，我可能提供一个特殊的服务发现功能，提供了一个拦截的中间件，还有负载均衡功能等。业务方使用时，不需要感知很多东西去配置，只需要添加一个 suite 就足够了，这点非常方便一些中台方或者第三方去做定制。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zj3VZd1hichuS28bj2ib9ArjTbGVib7G4dc6KFoIKpvsujCAqsIibXuMc5Vw/640?wx_fmt=png)

示例

#### 多协议

Kitex 网络层基于高性能网络库 Netpoll 实现。在 Netpoll 上，我们构建了 Thrift 和 netpoll-http2；在 Thrift 上，我们还做了一些特殊的定制，例如，支持 Thrift 的泛化调用，还有基于 Thrift 的连接多路复用。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3ZjNJW8IQvN3wEowpBDvvHicKCQwjcCuc95uSf4P3icJhLza1AL0Iz3V6fg/640?wx_fmt=png)

多协议

#### 代码生成工具

和 Kitex 一同出现的，还有我们开发的一个简单易用的命令行工具。如果我们写了一个 IDL， 只需要提供一个 module 参数和一个服务名称，Kitex 就会为你生成服务代码脚手架。

目前 Kitex 支持了 Protobuf 和 Thrift 这两种 IDL 的定义。命令行工具内置丰富的选项，可以进行项目代码定制；同时，它底层依赖 Protobuf 官方的编译器，和我们自研的 Thriftgo 的编译器，两者都支持自定义的生成代码插件。

### Kitex 的性能表现

字节跳动内部 RPC 框架使用的协议主要都是基于 Thrift，所以我们在 Thrift 上深耕已久。结合自研的 netpoll 能力，它可以直接暴露底层连接的 buffer。在此基础上，我们设计出了 FastRead/FastWrite 编解码实现，测试发现它具有远超过 apache thrift 生成代码的性能。整体而言，Kitex 的性能相当不错，今年 1 月份的数据如下图所示，可以看到，Kitex 在使用 Thrift 作为 Payload 的情况下，性能优于官方 gRPC，吞吐接近 gRPC 的两倍；此外，在 Kitex 使用定制的 Protobuf 协议时，性能也优于 gRPC。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zj99Am8Dic4FDibk4eoyNjIMul9tKQr5ACrRibkMwR2uicTSGJsaqQZPFHlw/640?wx_fmt=png)

Kitex/gRPC 性能对比（2022 年 1 月数据）

### Kitex：一个 demo

下面简单演示一下 Kitex 是如何开发一个服务的。

首先，定义 IDL。这里使用 Thrift 作为 IDL 的定义，编写一个名为 Demo 的 service。方法 Test 的参数是 String，它的返回也是 String。编写完这个 demo.thrift 文件之后，就可以使用 Kitex 在命令行生成指定的生成代码。如图所示，只需要传入 module name，service name 和目标 IDL 就行了。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3ZjlPbmzSwCgicJZ8N4PrwpJ9RSMfhcGvqnwib3Olf0MORGrARBU7e5MDDA/640?wx_fmt=png)

定义 IDL

随后，我们需要填充业务逻辑。文件中除了第 12 行，全部代码都是 Kitex 命令行工具生成的。通常一个 RPC 方法需要返回一个 Response，例如这里需要返回一个字符串，那么我们给 Response 赋值即可。接下来需要通过 go mod tidy 把依赖拉下来，然后用 build.sh 构建，就可以启动服务了。Kitex 默认的接听端口是 8888。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3ZjBKCKl4W1b27Z4Z3cIqPOGagMheIGHx1L3HMqoEibADr1Wf5icdJGTeHA/640?wx_fmt=png)

定义 Handler 方法

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zjic9pzwaXI2YRl0Sm57BvYENVY1VUicpq1njmkKwsUrxMH9WML9R2FJHA/640?wx_fmt=png)

编译、运行

对于刚刚启动的服务端，我们可以写一个简单的客户端去调用它。服务端写完之后，写客户端也是非常方便的。这里同样是 import 刚刚生成的生成代码，创建 Client、指定服务名字、构成相应的参数，填上“Hello，word！” ，然后就可以调用了。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zj24rWJ5DTbLXP7ytuiaCAX5Y0pLfBicOnicEPqsydMeogppfIpUI62qALw/640?wx_fmt=png)

编写 Client

## Kitex 在字节内部的落地

### 与内部基础设施的集成

谈到落地，第一步就是 Kitex 和字节跳动内部的基础设施进行结合。字节跳动内部的所有基础设施都是以依赖的方式注入到 Kitex 的。我们将日志、监控、tracing 都定义为 tracer，然后通过 WithTracer 这个 Option 将其注入到 Kitex 里；服务发现是 WithResolver；Service Mesh 则是 WtihProxy 等。字节跳动内部的基础设施都是通过 Option 被注入到 Kitex 的，而且所有的 Option 都是通过前面说的 Suite 打包，简单地添加到业务的代码里完成。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3ZjaqKeH0IMI4fCMaibsiaGiaYyFwShSoRtuhJc8E5wlqSLia5rn5lopBEbuQ/640?wx_fmt=png)

与内部基础设施的集成

### 内部落地的经典案例：合并部署

这里介绍一个内部落地的经典案例：合并部署。其背景是，在开发微服务时，由于业务拆分和业务场景的多样化，微服务容易出现过微的情况。当服务数量越来越多，网络传输和序列化开销就会越来越大，变得不可忽视。因此，Kitex 框架需要考虑如何减小网络传输和序列化的开销。

字节跳动基础架构经过一系列的探索和实践，最终推出了合并部署的机制。**它的思路**是：将有强依赖关系的服务进行同机部署，减少它们之间的调用开销。理论上说起来比较简单，实际过程中需要非常多的组件进行配合。

**Kitex 的做法**是：首先，它会依赖一套中心化的部署调度和流量控制；其次，我们开发了一套基于共享内存的通信协议，它可以使得我们两个不同的服务在同一台机器部署时，不需要通过网络进行数据传输，直接通过共享内存，减少额外的数据拷贝。

在服务合并部署的模式下，我们需要特殊的服务发现和连接池的实现、定制化的服务启动和监听逻辑。这些在 Kitex 框架里都是通过依赖注入的方式给添加进来的。Kitex 服务在启动过程中会感知到我们 PaaS 平台提供的指定的环境变量。当它察觉到自己需要按合并部署的方式启动之后，就会启动一个预先注入的特定 Suite，随后将相应的功能全都添加进来再启动，就可以执行我们的合并部署。

那么，它的效果如何呢？在 2021 年的实践过程中，我们对抖音的某个服务约 30% 的流量进行了合并，服务端的 CPU 的消耗减少了 19%， TP99 延迟下降到 29%，效果相当显著。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zj0SrjMxnbdED92dTETR0VQuyWfhMNHU6HZWUkEkz3L7eJIjtaO28x6w/640?wx_fmt=png)

内部落地的经典案例：合并部署

### 微服务框架推进的痛点

* 升级慢

大家可能好奇 Kitex 在字节跳动内部推广是不是很顺畅？其实并不是。作为一个相对而言比较新的框架， Kitex 和其它新生项目一样，在推广的过程中都会遇到同样的问题。特别是， Kitex 作为一个 RPC 框架，我们提供给用户的其实是一个代码的 SDK, 我们的更新是需要业务方的用户去感知、升级、部署上线，才能最终体现在他们的服务逻辑里，因此具有升级慢的问题。

* 召回慢

同时，因为代码都是由研发人员编写，如果代码出现了 bug，我们就需要及时地去感知定位问题，通知负责人去更新版本。因此，会有召回慢的问题。

* 问题排查困难

业务方的用户在写代码时，他们其实往往关注的是自己的业务逻辑，他们不会深入理解一个框架内部的实现。所以如果出现问题，他们往往会不知所措，需要依赖我们的业务同学才能进行相应的问题排查。所以会有问题排查困难的问题。

针对**升级慢**，我们有两个操作。一是，代码生成工具支持自动更新：当用户在使用时，我们会检查最新版本，然后直接将我们的版本更新到最新版本，这样可以及时把我们的框架新 feature、bug fix 直接推送到业务方；二是，用户群发版周知：我们有一个几千人的用户群，当有了新版本，我们会在用群里周知，可以最大范围的覆盖到我们的目标用户。

针对**召回慢**，我们有三个操作。一是，我们在线上建立完整的版本分布统计，监控所有服务上线部署的框架的版本；二是，我们会跟 PaaS 平台合作，在服务上线时进行卡点操作，检查它们使用的框架版本是不是有 bug，是否需要拦截；三是，针对有问题的版本，我们会及时封禁，及时推动用户更新。

针对**问题排查困难**，我们有两个操作。一是，我们积累了非常丰富的 Wiki 和问题排查手册，例如超时问题、 协议解析问题等。二是，如果遇到难以解决的问题，我们在线上服务默认开启了 Debug 端口，保证框架开发同学可以第一时间赶到现场去排查。

### Kitex 在字节内部的发展

数据显示，在 2020 年，v1.0 版本发布的初始阶段，用户的接受度比较低。直到 2020 年 6 月，线上接受 Kitex 的数量还不到 1000。随后进入快速发展的阶段，到 2021 年年初，累积接近 1w+ 的服务开始使用 Kitex。2021 年底，4w+服务使用 Kitex。

![](https://mmbiz.qpic.cn/mmbiz_png/5EcwYhllQOjcWQjQCbWdTKwy3tjjL3Zj1o4RmpqRrzekYXB3QjnSTBBYNMtB0Ric10xY0GOM0KCTI7ktLg4ywpw/640?wx_fmt=png)

### **Kitex 的开源实践**

开源工作主要包括代码、文档和社区运营三个层面。

#### **代码层面**

* 代码拆分、脱敏；
* 内部仓库引用开源仓库，避免内外多副本同时维护；
* 在开源过程中确保内部用户平滑切换、体验无损；

#### **文档层面**

* 重新梳理用户文档，覆盖方方面面；
* 建立详尽的用例仓库(CloudWeGo/Kitex-examples)。

#### **社区运营**

* 官网建设；
* 组建用户群，进行答疑解惑；
* 飞书机器人对接 Github 的 Issue 管理、PR 管理之类的业务，可以快速响应；
* 对优秀贡献者进行奖励。

在以上努力下，CloudWeGo/Kitex 仓库目前收获了 4.1k+ stars；Kitex-Contrib 获得多个外部用户贡献的仓库；CloudWeGo 飞书用户群近 950 个用户……

## 未来展望

首先，我们仍然会持续向开源社区反馈最新的技术进展。例如在 Thrift 协议上，虽然对 Thrift 的编解码已经做到非常极致的优化了，我们还在探索利用 JIT 手段来提供更多的性能提升；在 Protobuf 上，我们会补足短板，将在 Thrift 方面的优化经验迁移到 Protobuf 上，对 Protobuf 的生成代码和编解码进行优化；Kitex 后续也会进一步融入云原生社区，所以也在考虑支持 xDS 协议。其次，我们会去拓展更多的开源组件，去对接现存的云原生社区的各种常用的或者热门组件。最后，我们也会尝试去对接更多的公有云基础设施，使得用户在公有云上使用 Kitex 时能够拥有愉悦的体验。

项目官网：[https://www.cloudwego.io/](https://www.cloudwego.io/)

项目地址：[https://github.com/cloudwego](https://github.com/cloudwego )

