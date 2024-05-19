---
title: CloudWeGo 社区会议 8.11
linkTitle: CloudWeGo 社区会议 8.11
date: 2022-08-11
weight: 12
description: >
---

**会议主题** ：CloudWeGo 社区会议 8.11

**参会人** ：li-jin-gou, GuangmingLuo, pkumza, ag9920, lsjbd, sinnera, welkeyever, YangruiEmma, CoderPoet, joway, zstone12, Yin Xuran, bodhisatan, Fan Guangyu, Zhang Guiyuan, ppzqh, HeyJavaBean, simon0-o, baiyutang, rogerogers, skyenought, cloudwegoIce, cyyolo, baize, Hchenn, Ivnszn, LemonFish

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1：新人自我介绍

1. 新成员名单：@LemonFish
2. 社区新成员进行自我介绍，主要包含个人基本情况、开源贡献经历和后续参与社区工作内容。

---

### 议程 2：对接远程配置中心的方案介绍 @sinnera

1. Issue 地址：https://github.com/cloudwego/kitex/issues/574
2. 背景：Kitex 开源后一直不支持对接外面的配置中心，收到用户反馈有相关需求，比如框架内的服务治理策略以及自定义的配置都有需求对接配置中心，提供拉取和动态更新等功能。详细内容参见 Issue。
3. 相关讨论：传统配置中心都会有类似的设计，对这套配置每做一次更新，就会发布一个新版本。如果用户想指定发布版本后，在某一个特定的实例上生效，可能就会产生线上同时有不同版本的配置生效的情况。相关问题后续会具体考虑，也可以到 Issue 下参与讨论。

---

### 议程 3：fastPB 开源项目简介 @Hchenn

1. Issue 地址：github.com/cloudwego/fastpb
2. fastPB 项目是用生成代码对 PB 进行序列化和反序列化的仓库。官方的 PB 编辑码是通过反射进行的，这个项目编辑码是把所有的编码和解码具体操作通过生成代码的形式直接进行，这样就规避了反射。项目刚刚完成，具体的性能测试还在进行中。

---

### 议程 4：Hertz 服务注册、发现与负载均衡介绍 & 新手任务 @li-jin-gou

1. Demo 地址：github.com/li-jin-gou/nacos-demo
2. 背景：外部用户对 Hertz 服务注册发现呼声较高，内部的确也有这一套服务发现并且正在使用，所以开源出来。
3. 服务注册：Registry 接口的大部分逻辑是参考 Kitex 的实现，因此接口是一样的。注册和取消注册的逻辑放在 Hertz Hook Function（run hook/shutdown hook）里面，启动时注册，关闭时取消注册。
4. 服务发现：发现是配合 Client 使用的。发现接口分别是 Target/Resolve/Name，Target 就是唯一标识对应服务，这样会返回一个唯一的 Key；Resolve 通过唯一标识获取对应的实例；Name 内部用来和它对应的 Load Balance 做缓存，避免重复创建。
5. 具体使用实例：github.com/li-jin-gou/nacos-demo/tree/main/example
6. 扩展库：github.com/hertz-contrib/registry。对接 Nacos/ZK/ETCD 等其他注册中心的扩展会放到对应仓库，下周初会把文档补齐，会以 good-first-issue 的形式向社区提供。
7. 补充：Hertz Registry 扩展与 Kitex 稍有不同，把子项目都放在了同一个仓库。因为 Hertz-contrib扩展库较多，拆分后维护成本较大。因此我们决定放在一个仓库里面，以不同的子项目形式存放。欢迎社区的同学一起来参与共建！

---

### 议程 5：registry-servicecomb 注册中心扩展介绍和演示 @bodhisatan

1. 相关文档：[ServiceComb服务注册发现](https://bytedance.feishu.cn/docx/doxcn6uiqBdDaFDKjrnwFfNmnEc) （附演示视频录屏）
2. 注册关键逻辑：实现了一个 Register 接口。流程是注册服务，再注册服务实例，做一个异步的心跳保活，然后解除注册。
3. 解除注册逻辑：如果 Address 是空，直接注销服务；如果 Address 不是空，先注销实例，然后取消心跳保活，通过 Endpoints 查找实例，查找出来之后用 `instanceId` 注销 `MicroServiceInstances`。
4. 服务发现逻辑：调用了 `FindMicroServiceInstances` 找到下面所有的实例。

---

### 议程 6：CloudWeGo 一周年技术沙龙活动预告与介绍 @cloudwegoIce

1. 相关链接：https://mp.weixin.qq.com/s/x0Y7-gn9kwpoDQayS2bo3w
2. 背景：2021 年 9 月 CloudWeGo 正式开源，今年 9 月是正式开源一周年。一年内，CloudWeGo收获了 9000+ star，新增许多开源项目，还有即将新开源一个 Rust RPC 框架。我们会在开源一周年 Meetup 上介绍一年以来的开源历程。
3. 四个议题：

   - 高性能 RPC 框架 Kitex 内外统一的开源实践
   - 大规模企业级 HTTP 框架设计和实践
   - 新一代基于 Rust 语言的高性能 RPC 框架
   - 开源社区的长期主义与新变化 - CloudWeGo 开源社区实践

4. 地点及参与方式：

   - 线上：直接报名参与，群里定时放出参与链接。
   - 线下：北京字节跳动的工区，可以联系 cloudwegoIce 或刘佳同学注册报名。
