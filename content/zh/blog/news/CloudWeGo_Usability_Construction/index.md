---
date: 2023-12-21
title: "CloudWeGo 易用性建设：提升 Go 语言云原生工程效率之路"
projects: ["CloudWeGo"]
linkTitle: "CloudWeGo 易用性建设：提升 Go 语言云原生工程效率之路"
keywords: ["CloudWeGo", "RPC", "Golang", "易用性", "工程效率"]
description: "本文介绍了 CloudWeGo 易用性建设的简单背景，以及我们针对易用性建设做了哪些工作，最后会对未来的工作进行展望。"
author: <a href="https://github.com/FGYFFFF" target="_blank">GuangyuFan</a>
---

> 本篇文章是 CloudWeGo 两周年庆典系列的第二篇。

这次分享会首先给大家同步下 CloudWeGo 易用性建设的一个简单背景，然后会介绍我们针对易用性建设做了哪些工作，最后会对未来的工作进行展望。

## 背景

CloudWeGo 是一套由字节跳动基础架构服务框架团队开源的、可快速构建企业级云原生微服务架构的中间件集合。
CloudWeGo 下的项目主要有三个特点：**高性能**、**高扩展性**以及**高可靠性**；并且，在开源后我们也更加重视易用性的建设，我们意识到易用性可以给社区带来很多用户、进而形成活跃的社区氛围，推动社区持续发展，而且易用性可帮助用户快速完成业务逻辑开发，提升效率。

针对易用性，我们在研发体验、用户体验以及社区宣传等均做了诸多工作，下面我来一一介绍。另外这次分享主要会重点介绍 [Hertz][Hertz] 的易用性建设。

## 易用性 Feature 建设

[Hertz][Hertz] 作为企业级的 HTTP 框架，易用性一直是我们非常重视的方面，因为它能够极大提升研发体验。因此，自从开源以来，我们一直非常重视用户提出的各种关于易用性的建议，并进行了总结：第一个问题是我们在一些 Feature 的使用上与常见的框架有些差别，导致迁移过来的用户可能会不习惯；
第二个问题是框架的脚手架工具较多，例如 CloudWeGo 下就有 hz 和 kitex 两个脚手架，这无疑增加了用户的学习成本；第三个问题是文档的问题，我们在 issue 和用户群的用户反馈中看出，目前我们的文档存在描述不清晰，内容缺失等问题，导致用户遇到问题，往往无法快速解决。

针对以上问题，我们开发了多种能力以快速支持用户需求。

1. **多协议支持**：首先需要介绍的是 Hertz 可支持无缝切换多协议，目前一些开源的框架已经支持了 h2/h3 协议了，因此我们基于 Hertz 协议层的拓展能力，完成了 http2/http3 的实现，并放到了 hertz-contrib 下。其使用方式非常简单，只需要在 Hertz engine 上将对应的协议注册上就可以啦。 http3 协议的支持也类似，不过我们需要将传输层指定为 Hertz 拓展的 quic 协议的传输层，其他的操作就和 http2 一样了。
   ![image](/img/blog/CloudWeGo_Usability_Construction/multi_protocols.png)
2. **Response Writer 劫持**：接下来，再给大家介绍一下 Response Writer 劫持能力。在介绍 Writer 劫持前，先说一下 Hertz 读写报文的流程(图中数字部分)，Hertz 会先在连接中读数据&解析，然后会根据请求内容进行路由匹配、业务逻辑处理、创建响应数据等，并在这些工作结束后，由框架将数据发送给对端。这么做可完全简化用户操作，不过在一些场景下却存在问题，首先是用户无法控制响应真正 flush 到对端的时机，因此在一些增量生成数据、实时性要求高的场景，用户限制较多。
   ![image](/img/blog/CloudWeGo_Usability_Construction/response_writer.png)

   因此，我们开发了 Response Writer 劫持能力，在原来写响应流程的基础之上，支持用户在业务 handler/中间件中劫持 Response Writer，提前将响应数据发回到对端，实现更加灵活的写请求方式。 我们已经基于 Response Writer 的能力实现了 handler flush、SSE、流式 Gzip 等能力，更多能力也期待大家贡献。

3. 参数绑定重构：介绍完 Writer 劫持后，再来给大家介绍一个重要的 Feature - 参数绑定。重构之前 Hertz 的参数绑定依赖了第三方的实现，这会存在以下问题：

   - 依赖第三方实现，用户的需求需要诉诸于开发者
   - 提供接口较少，迁移过来的同学会增加学习成本
   - 性能差，之前的实现适配的是标准 http 库的存储模型，Hertz 用需要多一次转换，性能差

   为解决这些问题，我们重构了参数绑定的能力，将其实现放到 Hertz 内部，作为我们应用层的一个重要实现，重构后它支持和之前一样的绑定规则和使用方法，并且性能也会完全优于之前。另外还支持了自定义 binder 和 Validator，方便用户使用其熟悉的语法。另外，我们将所有的配置统一收敛到一个结构体，使用 withOption 的形式注入到 Hertz engine 上。

以上 3 个就是 [Hertz][Hertz] 比较重要的易用性建设方面的 Feature。

## 生态建设

接下来给大家介绍一下 Hertz 相关的[生态建设](https://github.com/hertz-contrib)。

目前我们将一些通用的能力以中间件的形式提供给了大家，这样开发者可以更好的关注业务逻辑了，只需要调用中间件就可以使用这些通用的能力。
截止当前，我们已经提供了包括认证/授权、安全、性能、HTTP 通用能力、治理观测拓展能力等各类超过 20 个中间件拓展，基本可满足大部分的业务需求。

![image](/img/blog/CloudWeGo_Usability_Construction/middleware_1.png)

![image](/img/blog/CloudWeGo_Usability_Construction/middleware_2.png)

当然，我们也会继续投入这些中间件生态的建设，也欢迎大家来参与到我们的社区开发中来。

## 脚手架优化

下面我来针对脚手架工具的优化进行介绍。

### Hz

在开源的时候，Hertz 的脚手架工具 [hz](/zh/docs/hertz/tutorials/toolkit/) 已经提供基于 IDL 生成 server 的能力，也就是图中的 3、4、5 部分我们已经支持了，目前可以根据 IDL 的接口定义来自动生成路由注册、handler 代码等功能；
但是作为一个通信框架，我们也需要完成 client 端的生成工作，也就是图中的 1、2、6 过程，因此 hz 在开源后支持了生成 client 代码的能力。

![image](/img/blog/CloudWeGo_Usability_Construction/hz.png)

Client 端生成的目的主要是可以屏蔽掉初始化 Hertz client 、发送请求等一系列固定的操作、为用户提供一个类似 HTTP 请求一键发送的能力，并能够和 hz 生成的 server 直接进行通信。

## 用户体验优化

### 文档优化

自从开源来，CloudWeGo 下的项目一直都注重文档的问题，但是每次都是哪里有问题修哪里，无法全面解决问题

因此，我们参与 CCF GLCC 项目发起了文档优化专项的工作，在该专项中我们主要做了以下工作：

1. 全方位地对文档进行重新体验，包括代码、图片、内容等，并记录相关问题
2. 根据记录的相关问题，我们有专人来对文档进行优化，解决了一些逻辑混乱、描述不清晰等问题，并着重优化了 新人教程、Hertz 核心能力等常用文档。根据反馈，优化后的文档已经可以解决基本所有常见问题
3. 此外，我们还对文档格式、目录结构进行了统一的调整，提供更好的视觉体验
   目前，该优化专项目前已在 CloudWeGo 其他项目下进行，也欢迎大家多多给我们反馈文档的问题。

### 示例代码库

其次，我们提供了丰富的示例代码库。

目前，我们提供了 [hertz-example](https://github.com/cloudwego/hertz-examples)、[kitex-example](https://github.com/cloudwego/kitex-examples) 代码库，这里包含了所有常用 Feature 的可执行的使用实例，并且定期更新、维护。

另外，为了使得业务更快地能使用 CloudWeGo 项目完成业务逻辑开发，我们提供了若干个真实场景的 demo，目前提供了如下的 demo，其中下面的几个业务代码都是使用了 Hertz 和 Kitex 进行开发或者重构，大家可以在此基础上拓展自己的业务逻辑，完成业务的快速上线。

1. [Bookinfo](https://github.com/cloudwego/biz-demo/tree/main/bookinfo): 使用 Hertz+Kitex 重新实现 IstioBookinfo
2. [Easy Note](https://github.com/cloudwego/biz-demo/tree/main/easy_note): 使用 Hertz+Kitex 微服务的形式实现一个笔记服务
3. [Book Shop](https://github.com/cloudwego/biz-demo/tree/main/book-shop): 使用 Hertz+Kitex 实现一个电商示例
4. [Open Payment Platform](https://github.com/cloudwego/biz-demo/tree/main/open-payment-platform): 使用 Hertz+Kitex 实现支持多商户的开放式支付平台

### CSG 活动

我们还定期举办 CSG 活动，CSG 活动旨在帮助开发者了解框架的源码以及最佳用法。

截止目前，CSG 活动已经举办了 5 期，分别带大家了解了 Hertz/kitex/volo 框架的诸多源码和最佳实践，帮助开发者更好的了解和使用框架。大家可以在 [cloudwego/community](https://github.com/cloudwego/community) 仓库的 issue 查看往期活动的 issue 介绍与回放。


[Hertz]: https://github.com/cloudwego/hertz
