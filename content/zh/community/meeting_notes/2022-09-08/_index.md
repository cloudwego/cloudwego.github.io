---
title: CloudWeGo 社区会议 9.8
linkTitle: CloudWeGo 社区会议 9.8
date: 2022-09-08
weight: 13
description: >
---

**会议主题** ：CloudWeGo 社区会议 9.8

**参会人** ：GuangmingLuo, PureWhiteWu, ag9920, lsjbd, simon0-o, liu-song, ylck, CoderPoet, li-jin-gou, pkumza, jasondeng1997, Li Zheming, debug-LiXiwen, joway, Jacob953, Code:Z, HeyJavaBean, jayantxie, baiyutang, rogerogers, warthecatalyst, skyenought, baize, yiyun, Millione, ruokeqx

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1：CloudWeGo - Rust 开源项目集介绍 @PureWhiteWu

1. 地址：github.com/cloudwego/volo
2. Volo 是 CloudWeGo-Rust 开源项目集最主要的一个项目，里面包含三部分。一个是同名的 volo,包含了很多通用逻辑，Volo 里面还有一个 gRPC 框架和一个 Thrift 框架，它们的共同部分放在 volo 里面，我们可以用它扩展出很多不同的序列化协议和不同的 Transport 框架。Thrift 框架可以和 Kitex 完全兼容互调。gRPC 框架也是可以和业界的 Tonic、Kitex gRPC 等兼容。
3. Volo 里面抽象了一个 Motoro 库，这个库采用了 GAT 和 TAIT 特性。
4. Pilota 是纯 Rust 实现的一个高性能、可扩展、使用 Thrift 与 Protobuf 的编解码以及序列化的实现，不依赖 Protoc。它里面的设计很大程度上是和一个真正的编译器差不多的，设计了自己的 ir 层和 codegen 部分。想学习编译器的同学可以研究一下。
5. 除了以上三个最主要的项目，还有一些相关项目。Metainfo 是用来传递元信息的基础库，Volo-rs 组织用来存放 Volo 相关的生态库，也欢迎大家一起贡献。如果有对 Volo 感兴趣的同学，可以直接加入用户群，随时在群里提问。

---

### 议程 2：CloudWeGo Community Membership 新变化 @PureWhiteWu

1. 地址：https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md
2. 背景：首先，随着 CloudWeGo 子项目的扩充，每个子项目可能都有一些不同的维护者，因此以整个组织的形式管理这些权限或直接在仓库里面加权限不再合适；其次，之前 Member 和 Committer 混在一起，晋升层级较少，社区同学晋升空间有限。Approver 和 Maintainer 也需要更明确的定义。
3. 我们的出发点是为了将在社交媒体平台上写文章宣传 CloudWeGo、但没有代码贡献的同学，与代码贡献者给区分开来，给予他们 Member 的身份，认可他们作为 CloudWeGo 社区的重要成员做出的贡献。同时对于提交代码的同学，他们也有了更加明确的权限和晋升路径的定义。这次规则更新既明确了晋升路径和晋升机制，又明确了每个层级的权利和要求。感兴趣的同学可以点击地址查看详细信息。

---

### 议程 3：Hertz 的 ReverseProxy 扩展介绍 @skyenought

1. PR 地址：https://github.com/cloudwego/cloudwego.github.io/pull/337
2. Hertz 的反向代理分 Server 和 Client，原生 Go 的 SDK 里面拥有反向代理功能，社区也有反向代理的需求，目前在文档建设阶段，准备开源。具体内容可以点击 PR 地址查看。
