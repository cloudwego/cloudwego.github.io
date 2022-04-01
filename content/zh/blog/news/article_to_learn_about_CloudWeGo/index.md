---
date: 2022-03-28
title: "一文了解字节跳动微服务中间件 CloudWeGo"
linkTitle: "一文了解字节跳动微服务中间件 CloudWeGo"
description: >
author: <a href="https://www.infoq.cn/u/junbao/publish" target="_blank">Junbao Zhang</a>
---

云原生时代，各行各业的基础架构都在经历微服务架构转型，研发效率和稳定性是所有互联网公司需要考虑的问题。开发者想要搭建微服务，离不开配套的微服务治理，如治理平台、监控、链路跟踪、注册/发现、配置中心、服务网格等。随着 Golang 逐渐成为云原生时代的主要编程语言，基于 Golang 的微服务中间件在开源社区有着较强的诉求。

字节跳动也同样面临这些问题。2014 年，字节跳动引入 Golang 解决长连接推送业务面临的高并发问题，两年后，内部技术团队基于 Golang 推出了一个名为 Kite 的框架，同时对开源项目 Gin 做了一层很薄的封装，推出了 Ginex。字节跳动基础架构/服务框架团队负责人成国柱在 QCon 2021 的分享中表示，这两个原始框架的推出，极大推动了 Golang 在公司内部的应用。

但是由于关联技术迭代和业务诉求增加，深度耦合的 Kite 和 Thrift ，很难从网络模型或编解码层面改造优化，继续支持新特性势必会造成代码臃肿、迭代受阻问题。2019 年下半年，字节跳动技术团队开始重新设计 Golang RPC 框架，同时为了在网络通信上有更好的性能并能支持连接多路复用、感知连接状态，自研了网络库 Netpoll。

字节跳动重构 Kite 为 Kitex ，围绕性能和可扩展性设计，并在次年 10 月完成发布，投入到内部应用中。据悉，截至 2021 年 9 月，线上有 3w+ 微服务使用 Kitex，大部分服务迁移新框架后可以收获 CPU 和延迟上的收益。

“在 Kitex 得到内部广泛使用后，我们决定围绕微服务逐步把我们的实践开源出去，并且对外保持统一。”字节跳动 CloudWeGo 技术专家谈道，“但微服务相关的项目较多，每个项目单独开源对外部用户并不友好，因此我们以 CloudWeGo 作为项目名，逐步将内部整个微服务体系开源，内外统一使用开源库，各项目以开源库为主进行迭代。”

2021 年 9 月 8 日，字节跳动宣布正式开源 CloudWeGo。

## **中间件“工具箱”CloudWeGo**

CloudWeGo 是一套字节跳动内部微服务中间件集合，具备高性能、强扩展性和稳定性的特点，专注于解决微服务通信与治理的难题，满足不同业务在不同场景的诉求。此外，CloudWeGo 也重视与云原生生态的集成，支持对接 K8s 注册中心、Prometheus 监控以及 OpenTracing 链路追踪等。

目前，CloudWeGo 第一批开源了四个项目：[Kitex](https://github.com/cloudwego/kitex)、[Netpoll](https://github.com/cloudwego/netpoll)、[Thriftgo](https://github.com/cloudwego/thriftgo) 和 [netpoll-http2](https://github.com/cloudwego/netpoll-http2)，以 RPC 框架 Kitex 和网络库 Netpoll 为主。Kitex 内置了部分治理策略以及丰富的扩展接口，便于融入微服务体系中；Netpoll 主要面向对高性能有诉求的场景。

CloudWeGo 的每一个组件都可以单独使用。“很多人担心 Kitex 是一个很重的框架，其实 Kitex 没有耦合任何其他组件包括 Netpoll，Kitex 内置的一些治理能力，用户也可以选择性集成。Netpoll 作为一个网络库，其他 RPC 框架、HTTP 框架都可以单独接入使用。Thriftgo 是 Thrift IDL 解析和代码生成器，也是独立的工具，并且提供插件机制，用户可定制生成代码。”字节跳动 CloudWeGo 技术专家表示，“我们会继续开源其他内部项目，如 HTTP 框架 Hertz、基于共享内存的 IPC 通信库 ShmIPC 等，提供更多场景的微服务需求支持。”

## **CloudWeGo 的优势和局限**

微服务中间件和业务紧密联系，是整个业务架构的基础，在进行技术选型时必须慎重。业内公认的选型标准关键在于两方面：

* 能解决实际业务问题和上生产抗流量，且易用性高、可治理、成熟稳定
* 技术是开源的，且开源项目的 star 数、项目活跃度（Issue&PR）、文档更新频率、发版周期稳定可靠

CloudWeGo 的优势在于，已经在字节跳动经过大规模生产流量验证，有可以参考的稳定性和可靠性实际案例。“CloudWeGo 的特点之一是高性能，但实际上在开发之初它经常遇到性能瓶颈，于是内部专门进行了网络库、Thrift 序列化的专项优化，优化的过程会比较漫长，一个瓶颈点要花很长时间反复测试调整实现，我们也发过两篇文章[《字节跳动 Go RPC 框架 Kitex 性能优化实践》](http://www.cloudwego.io/zh/blog/2021/09/23/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8-go-rpc-%E6%A1%86%E6%9E%B6-kitex-%E6%80%A7%E8%83%BD%E4%BC%98%E5%8C%96%E5%AE%9E%E8%B7%B5/)和[《字节跳动在 Go 网络库上的实践》](http://www.cloudwego.io/zh/blog/2021/10/09/%E5%AD%97%E8%8A%82%E8%B7%B3%E5%8A%A8%E5%9C%A8-go-%E7%BD%91%E7%BB%9C%E5%BA%93%E4%B8%8A%E7%9A%84%E5%AE%9E%E8%B7%B5/)分享了优化实践。”字节跳动 CloudWeGo 技术专家表示。

据悉，与同类型项目相比，CloudWeGo 开发团队不仅考虑了高性能、强扩展性，还考虑到了易用性。“以 Kitex 为例，目前从治理功能的多样性上不及一些开源框架，从性能、扩展性、使用体验多维度综合来看，Kitex 具有一定的优势。Kitex 支持多协议，由于内部以 Thrift 为主，Kitex 对 Thrift 支持也做了性能优化，如果使用 Thrift，Kitex 将是最佳的选择。”字节跳动 CloudWeGo 技术专家告诉 InfoQ。

此外，为了遵守长期投入承诺，内外维护一套代码、统一迭代，字节跳动已经将与内部生态没有耦合的项目直接迁移到 CloudWeGo 开源库，并将内部依赖调整为开源库。而对于需要集成治理能力融入微服务体系的 Kitex，开源团队则对内外部代码做了拆分，把 Kitex 的核心代码迁移到开源库，内部库封装一层壳保证用户无感知升级，而集成内部治理特性的模块则作为 Kitex 的扩展保留在内部库。未来，字节跳动也会持续把已经在内部经过稳定性验证的新特性，迁移到开源库。

在字节跳动内部，为了便于 Kitex 融入内部的治理体系，Kitex 面向内部提供了 Byted Suite 扩展，集成内部的注册中心、配置中心、监控等，内部 ServiceMesh 已经得到了大规模落地，Kitex 会根据服务的信息判断是否是 ServiceMesh 模式，若是，Kitex 则会卸载治理组件，治理能力下沉至 Mesh 中。为了提高与 ServiceMesh 通信的性能，Kitex 单独扩展 TransHandler 模块集成内部实现的 ShmIPC，与 ServiceMesh 通信走 ShmIPC ，后续 Kitex 对 ShmIPC 的扩展以及 ShmIPC 库也会开源出来。

不过 CloudWeGo 依然有自己的局限性。字节跳动 CloudWeGo 技术专家告诉 InfoQ：CloudWeGo 功能的丰富度和多样性还不够，还需要进一步完善，字节跳动技术团队会收集外部用户的需求，评估排期支持，期待更多的开发者加入。目前 Kitex Server 性能优势明显，但 Client 相比 Server 性能表现不佳，后续会重点对 Client 进行优化。此外，基于不同的语言框架，默认场景必须能兼容互通而非性能最佳。“刚开源时得到大家的关注，看到一些压测对比显示 Kitex 性能表现一般，主要是压测场景未对齐，后续我们也会考虑面向开源尽量提供性能较优的策略。”

## **“开源”不是为了“完成 KPI ”**

目前，CloudWeGo 在社区中也比较有活力。据悉，在未被正式宣布开源前，一个月内 Kitex 收获了 1.2k stars，Netpoll 收获了 700+ stars。9 月 8 日，字节跳动正式宣布开源 CloudWeGo 后，截至 10 月初，项目整体 star 数已经超过 4800，且已被收录进 CNCF landscape。

![image](/img/blog/article_to_learn_about_CloudWeGo/image.png)

字节跳动 CloudWeGo 技术专家表示：“我们收到了来自社区的大量反馈，如很多用户对 Protobuf 的诉求较为强烈，我们已经针对这个问题，计划开展 Kitex 对 Protobuf 支持的性能优化。欢迎大家向 CloudWeGo 提交 issue 和 PR，共建 CloudWeGo。我们也为企业和组织使用 Kitex 和 Netpoll 设置了专项支持，希望 CloudWeGo 将来能真正成为通用的、可落地的微服务通信与治理开源方案。”

关于开源，字节跳动 CloudWeGo 技术专家的观点旗帜鲜明：“完成 KPI 不是这个项目开源的目的。健康的开源模式注重开放共享，共同成长和长期主义。CloudWeGo 认同个体参与、社区价值以及开源共同体带来的归属感。”

“字节跳动作为开源项目的受益者、参与者，也希望成为开源项目的推动者、主导者，将内部优秀的最佳实践反馈给开源社区，与社区共同建设、丰富基础架构领域开源生态，为广大开发者和企业在技术选型时提供更多更优的选择。”字节跳动 CloudWeGo 技术专家谈道，“我们拥抱开源的文化，倾听社区的反馈，积极响应用户的需求，并且提供友好的中英文文档和快速开发 guideline，为社区开发者快速深入了解 CloudWeGo 以及参与贡献提供便利与支持。”

**项目地址：**[https://github.com/cloudwego](https://github.com/cloudwego)

**受访嘉宾:**  字节跳动 CloudWeGo 技术专家罗广明、杨芮、马子昂

**原文链接:** [https://www.infoq.cn/article/9ixlu4kjapg3ufhymm3j](https://www.infoq.cn/article/9ixlu4kjapg3ufhymm3j)

