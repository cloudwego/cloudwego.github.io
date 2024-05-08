---
title: CloudWeGo 社区会议 6.16
linkTitle: CloudWeGo 社区会议 6.16
date: 2022-06-16
weight: 8
description: >
---

**会议主题** ：CloudWeGo 社区会议 6.16

**参会人** ：YangruiEmma, joway, yccpt, CoderPoet, GuangmingLuo, simon0-o, yiyun, bodhisatan, Jacob953, cyyolo, HeyJavaBean, Skyenought, Quan Hu, ppzqh, ZhangHanAA, Suo Dianjun, Yin Xuran

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1 ：Hertz 项目介绍 @Yin Xuran

1. **项目地址：** https://github.com/cloudwego/hertz/blob/develop/README_cn.md
2. **项目背景：** Hertz 之前，字节跳动内部使用的 HTTP 框架是基于 Gin 进行了一层封装。存在的问题：Gin 出现 Bug 无法修复；难以迭代支持一些 Feature；随着业务发展性能不足逐渐显现，且难以改变。
3. **Hertz 定位 ：**

- 超大规模企业级实现，拥有极强的稳定性。
- 微服务框架。完善 CloudWeGo 的生态矩阵，让 CloudWeGo 成为云原生最佳的解决方案之一，从而向客户推广。
- 开箱即用的框架。包括比如搭积木的能力，用户可以按需组装模块；可能会生成一些 Client 代码，可以方便用户 Benchmark 或者帮助用户去调试，甚至生成一些生产上的代码。
- “三高”的框架。高扩展性、高易用性和高性能。

4. **内部使用情况：** 是内部最大的 HTTP 框架，在内部线上有 1w+ 的服务峰值，QPS 4000w+。某些典型服务迁移 Hertz 后，相比 Gin 框架，CPU 使用率降低 30%—60%。
5. **Roadmap：**

- 无缝接入微服务体系。支持 xDS API，从 Istio 动态获取服务配置。
- 有更完善的生态。如 CORS、Trace、Metrics 、反向代理、Session 等。
- 支持多协议。Hertz 目前只开源了 HTTP1 的部分，未来还会开源其他协议，如：HTTP2、Websocket、ALPN 等。
- 更高的性能。结合用户需求，持续迭代。

6. **6.21** 官宣后会开放新手任务，以及社区参与指南，欢迎大家参与 Hertz 社区贡献。

---

### 议程 2 ：Hertz Swagger & JWT Middleware @bodhisatan

1. 项目地址：https://github.com/hertz-contrib/swagger；https://github.com/hertz-contrib/jwt
2. 贡献了 Hertz 的两个插件，Swagger 和 JWT。Fork 了 Gin 排名比较高的对应的仓库，然后对赫兹做适配，争取让开发者比较方便的从 Gin 切换到 Hertz。过程中需要看一些赫兹的接口源码，保证 Hertz 和 Gin 的表现相同。
3. 对 Hertz 源码感兴趣的初学者可以从这里入手，建议社区也可以考虑把一些 Gin 里面常见的中间件以 First-good-issue 的形式开放。

---

### 议程 3：CloudWeGo “全新”社区页面介绍 @Skyenought @yiyun

1. 地址：/zh/community/
2. 参考 Google Kubernetes 社区实现，从社区获得相应的图片和文字描述，进行组合。目前上线了中文页面，后续根据社区要求进行改动，比如不定时更新的近期活动可以拆成模板，方便更新。

---

### 议程 4：CCF 活动进展同步 & CloudWeGo Meetup 预告 @yiyun

1. 目前已经有 126 个同学加入社区，竞争 5 个 Issue。同学反馈问题是给到高校群体的开发任务量比较少，因此 Hertz 开源建设中，后续会开放出大量的新手任务，如小型的开发任务、文档类的整理任务、活动类任务等。
2. 已有近 26 位同学参与 Issue 选拔。后续也会有社区的导师持续地跟进开发，11 月底活动结束。

---

### 议程 5：Q & A

**Q**：社区 Committer 的申请要求是什么？

**A**：相关链接：https://github.com/cloudwego/community/blob/main/COMMUNITY_MEMBERSHIP.md

对社区有贡献的同学可以在 Issue 上面提出申请，相关人员会确认是否同意这个同学成为 Committer。一般来讲贡献比较多的同学会被提名，然后让这个同学自己在 Issue 上面申请。当然，如果同学个人觉得自己贡献比较多，也可以自己提名。如果大家同意会在下面回复，同意的人数足够多就可以加入。

---

#### 相关资讯：

6 月 21 日，Hertz 正式官宣开源！
官宣链接：https://mp.weixin.qq.com/s/D1Pol8L9F_5-Yte_k4DH8A

技术解读：https://mp.weixin.qq.com/s/RC-BJOTEO7WaEemG96yR6w

5 月 26 日 — 6 月 24 日，CloudWeGo - GLCC 开源编程夏令营开始报名，活动报名链接：https://mp.weixin.qq.com/s/owd13tN5XfKPQs7DeONWng

6 月 25 日，CloudWeGo & 稀土掘金 Meetup 活动直播，邀请到来自字节跳动、森马电商和华兴证券的资深开发者，向社区分享 CloudWeGo 的最新企业落地实践。
活动链接：https://mp.weixin.qq.com/s/D93dk-9dw2pQocI4anBXfg
