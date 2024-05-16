---
title: CloudWeGo 社区会议 6.2
linkTitle: CloudWeGo 社区会议 6.2
date: 2022-6-2
weight: 7
description: >
---

**会议主题** ：CloudWeGo 社区会议 6.2

**参会人** ：YangruiEmma, baiyutang, joway, yccpt, Huang Yuting, CoderPoet, li-jin-gou, GuangmingLuo, simon0-o, yiyun, JZK-Keven, bodhisatan, Jacob953, cyyolo, debug-LiXiwen, baize, zstone12, You Gaoming, HeyJavaBean, jayantxie, Skyenought

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1 ：新人介绍

1. 新成员名单：Skyenought, zstone12, You Gaoming
2. 社区新成员分别进行自我介绍，主要包含个人基本情况、开源贡献经历和后续参与社区工作内容。

---

### 议程 2 ：Frugal 项目介绍 @simon0-o

1. 相关文档：https://mp.weixin.qq.com/s/b17bSqx9y5AIH3WEx1haog

---

### 议程 3：Integrate Polaris Go SDK to Support Their Service Governance Ability 任务介绍 @jayantxie

1. 地址：https://github.com/cloudwego/kitex/issues/421
   已认领 Issue @debug-LiXiwen
2. 继注册发现能力之后，再以 Polaris 为服务治理中心，集成服务治理能力。熔断部分会在 Kitex 中注入 Middleware，通过 Middleware 上报每次请求结果。上报时需要 Polaris 实例，所以需要转换一下，这个转换可以通过缓存用 Key 去做查找。
3. 此 PR 已经支持外部限流器的实现。可以通过扩展接口传入外部实现的限流器，对接 Polaris 的限流功能。
4. 关于动态路由和负载均衡，通过扩展 Kitex LoadBalancer 实现。在 Polaris LoadBalancer 里，通过服务发现的实例去构造 Kitex 的实例，在LoadBalancer 接口里把这个实例转换成 Polaris 的实例，再把它写到缓存里。每一次 Pick 时，从 Pick 里找到调用 Polaris 动态路由的 API 对应的子集，再从这些子集里调用负载均衡的 API ，拿到对应实例。这个实例需要转成 Kitex 的 Instance， 所以也需要通过 Key 做查找操作。扩展 Next Picker 只会在第一次选择时执行这个逻辑。
5. 新建 Polaris 仓库，把原有 Registry-Polaris 仓库代码复制过去，后续只维持新仓库。

---

### 议程 4：Kitex 源码分析活动进展介绍 @yiyun

1. 第一期 5.19 — 6.30 进程近半，现有参与人数 93 人，开始撰写及提交笔记 10 人左右。6.1 晚第一次活动会议，讨论过后开了“百人共享”，共同整理 Kitex 基础教程。
2. 相关文档：[Kitex前传：RPC框架那些你不得不知的故事](https://cloudwego.feishu.cn/docs/doccnSvZ2NZJomRljYWAJG3hCWd?from=from_copylink) 。后续对这些感兴趣同学，可以直接联系逸云，加到 CloudWeGo study group 完成这个教程。

---

### 议程 5：社区开放性讨论 & QA @GuangmingLuo

1. 希望有更多感兴趣的同学帮助官网做一些优化，尤其是 Community 内容展示和主页。有前端背景或者对开源项目的前端技术、网站建设感兴趣同学可以联系广明。

---

#### 相关资讯：

**Kitex** v0.3.2 已发布！

[https://github.com/cloudwego/kitex/releases/tag/v0.3.2](https://github.com/cloudwego/kitex/releases/tag/v0.3.2)
