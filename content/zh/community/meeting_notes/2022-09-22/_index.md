---
title: CloudWeGo 社区会议 9.22
linkTitle: CloudWeGo 社区会议 9.22
date: 2022-09-22
weight: 14
description: >
---

**会议主题** ：CloudWeGo 社区会议 9.22

**参会人** ：GuangmingLuo, simon0-o, liu-song, YangruiEmma, CoderPoet, li-jin-gou, wangbei98, FlyDangerFox, Authority, derek3, FGYFFFF, ppzqh, Code:Z, LemonFish, justlorain, HeyJavaBean, Yang Hong, baiyutang, rogerogers, skyenought, baize, Millione, chens

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1 ：新人自我介绍

1. 新成员名单：@wangbei98 @justlorain @Yang Hong @chens @FlyDangerFox
2. 社区新成员分别进行自我介绍，主要包含个人基本情况、开源贡献经历和后续参与社区工作内容。

---

### 议程 2：基于 Kitex 和 Hertz 的 bookinfo 全链路泳道 demo 介绍和演示 @CoderPoet

1. 地址：

- bookinfo（附演示 demo）
  https://github.com/cloudwego/biz-demo/pull/2
- xDS
  https://github.com/kitex-contrib/xds/pull/5/files
- 项目的工程架构
  github.com/CoderPoet/biz-demo/blob/feature%2Fbookinfo-proxyless-otel-demo/bookinfo/README_CN.md

2. 背景：在 biz-demo 中使用 kitex 和 hertz 重写 bookinfo 项目。实现的目的是为了以实战的方式演示如何使用 xDS 实现全链路的流量泳道。这个项目是复刻社区的 bookinfo 的部署模式，分为 Productpage、Reviews、Details 以及 Ratings，使用 kitex 和 hertz 完全重写。Productpage 是用 Hertz Server 写的，并且内嵌了 Kitex Client。 Kitex Client 集成了 xDS 的模块，主要负责与控制面的 Istiod 做交互，Istiod 可以动态地根据 xDS 下发路由规则。具体路由规则以及工程架构可点击上方链接查看。
3. 另一个 PR 对 xDS 本身做了优化，之前用 rpcinfo 的 tag 做灰度标识 Header 匹配，但不太符合日常场景，因为通常用 metadata 传递请求元数据，所以做了相应的改造。具体内容可点击查看上方链接查看。

---

### 议程 3：Hertz 新手任务介绍与 Cookbook 专项任务介绍 @li-jin-gou

1. 单测任务：github.com/cloudwego/hertz/issues/257
   相关文档：[Hertz Cookbook](https://bytedance.feishu.cn/docx/doxcn7SedWQ69Hw9RcoJmaKIdoe)

2. 目前还有 10 个单侧任务任务待领取，后续也会继续放出扩展类或文档类的 first good issue，欢迎大家积极认领。
3. Cookbook 背景：当前文档建设过于简陋，易用性方面有待加强，需要持续优化，方便新手使用。Cookbook 分为官方文档和代码示例两部分，目前代码示例待完善。具体官方文档待建设部分及其完善标准可点击上方链接查看，后续欢迎大家积极认领文档任务，官网和文档贡献也是非常核心的社区贡献，优秀的 Contributor 也可以申请成为官网 & 文档的 Committer。

---

### 议程 4：Hertz pprof 扩展介绍 @wangbei98

1. 文档：[Hertz-pprof](https://r3478qhcm9.feishu.cn/docx/doxcnnD5J1EGhKfgp5QDNF0J34b?from=from_copylink)
2. 背景：

- pprof 是一个可以对 Go 程序的 CPU 内存以及 Goroutine 运行时进行动态信息采样的工具包，采样后以数据的方式展示，从而帮助开发人员进行快速地定位问题。常见的 HTTP 框架以及 gRPC 框架都会有相应的 pprof 扩展。这个扩展的底层实现依赖于 Go 语言内部 runtime/pprof 包，进一步的在 net/http/pprof 包里面对上述的 Go 语言包进行封装，对外提供 HTTP 的服务。
- 在本项目中，为了在 Hertz 中引入 pprof 的能力，需要对 HTTP 包里面的 pprof 进一步封装。因为 HTTP 包里面 pprof 对外提供的是 http.Handler 以及 http.HandlerFunc，但是 Hertz 并不感知 HTTP 包里面的 http.Handler 以及 http.HandlerFunc，因此需要对其进行转换。具体实现过程请查看上方链接中的文档。
