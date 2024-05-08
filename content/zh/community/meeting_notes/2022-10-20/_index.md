---
title: CloudWeGo 社区会议 10.20
linkTitle: CloudWeGo 社区会议 10.20
date: 2022-10-20
weight: 15
description: >
---

**会议主题** ：CloudWeGo 社区会议 10.20

**参会人** ：cloudwegoIce, ag9920, YangruiEmma, CoderPoet, li-jin-gou, Ivnszn, liuq19, FGYFFFF, ppzqh, I2ncE, Code:Z, HeyJavaBean, jayantxie, Yang Hong, baiyutang, skyenought, rogerogers, cyyolo, Bai Yang, chens, Millione

**会前必读** ：[官网](/) ; https://github.com/cloudwego

### 议程 1：CloudWeGo-Volo 0.2.0 新发版介绍 @Millione

1. 相关链接：[Volo v0.2.0 正式发布：新增支持 Windows](https://mp.weixin.qq.com/s?__biz=Mzg2MTc0Mjg2Mw==&mid=2247490708&idx=3&sn=ae6d24cc1fa426b44c1ec774e8e0cc41&chksm=ce132ef4f964a7e2b469e34278e0dc7100e06e2e3df874e219b195896545778e6f11aa763602#rd)
2. **Volo 已经正式支持 Windows**。在 Volo 的共性方面，首先是关于错误处理，修复了对 Error 类型的约束，即在实现中间件时，对于 gRPC 以及 Thrift 返回的 Error 需要实现一个转换方法，就能转换到框架的 Error 类型中。这样有助于我们做整体的服务治理，还有一些错误判断之类的逻辑功能。
3. 如果分为 Thrift 和 gRPC，**volo-thrift** 正式支持了 multiplex，与 Ping-pong 模型不同的是不需要发 Request 之后，再等收到一个 Response 才能继续发下一个 Request，multiplex 可以多发多收，用户使用时也只需要指定开启这个特性，使用起来基本无感；最后，在 Thrift 方面，还优化了 write_field_begin 函数，主要是把这个函数内联到我们的框架里面编译，这样在某些场景下有较好的编码优化。
4. 在 gRPC 方面，**volo-grpc** 支持 uds，因为不需要经过 TCP 等协议开销，在同机上面的跨进程 gRPC 调用会更快，同时在使用 Service Mesh 场景时有好的兼容；同时，volo-grpc 支持 metainfo 进行元信息传递，这个主要是用来在 Client 和Server 端之间进行一些字段信息的传递，之前 gRPC 支持放进 Request Metadata 中，但后续大家都使用 metainfo 可以统一用户在 Thrift 和 gRPC 的使用体验；volo-grpc 增加对 service discovery 和 load balance 的支持，这是 RPC 框架需要的一些能力，这个提供了一些接口，大家如果想实现某些东西，可以根据接口更好地接入。
5. 除此之外，还有两个改动之处。第一，之前 Rust 在编辑器里有一个 Bug，导致我们的 Nightly 版本一直锁定在 7 月 31 号。目前已被修复，Nightly 版本也不需要限定，在文件里面指定最新版本的 Nightly 即可。第二，在 gRPC 方面接口方法有所增加，还有一些参数名字有所改动。

相关地址：https://github.com/cloudwego/volo/blob/main/rust-toolchain.toml

6. 如果大家想参与共建 Volo，可以多关注 Issue，我们也可以提供解释说明。在 gRPC 方面，Volo 的功能还有欠缺，所以大家可以做的贡献是比较多的。

相关地址：https://github.com/cloudwego/volo/issues

---

### 议程二：Kitex 新增 metainfo 示例代码分享 @baiyutang

1. PR: https://github.com/cloudwego/kitex-examples/pull/42
2. 背景：9 月初有同学提关于 metadata 元信息的问题，很多人不太清楚具体用法。
3. 基于背景做了两方面的优化。第一，优化文档；第二，做了代码的示例。文档强调“必须使用支持元信息的透传的底层协议才可用”。代码层面在 Kitex-examples 里做了一个 metainfo 示例。元信息的传递分两类：正向 & 反向，正向的是从客户端传到服务端。并且传递的信息分两种，一种是只传递到它请求的那个服务端，另一种是持续地往后传递。因此我在客户端设置了两个元信息，第一个是假设它请求的第一个服务能接收到，第二个是假设后续的所有的服务都能接收到，并且在服务端都做了判断。如用户想了解用法，通过示例就可以运行起来，优化了框架的使用体验。

---

### 议程三：Hertz Playbook 进展 & 新晋 Committer 介绍 @li-jin-gou

1. 当前文档建设的易用性方面有待加强，需要持续优化，方便新手使用。Hertz Playbook 建设正在进行中，大部分文档优化的任务已经分配出去，目前大部分处于 PR 状态，其余任务如果大家感兴趣的话可以联系 @li-jin-gou。
2. @I2ncE 自我介绍，目前已正式成为 Hertz Committer。

---

### 议程四：CSG 3 期 Rust Volo & Monoio 项目学习，活动介绍和进度分享 @cloudwegoIce

1. Issue: https://github.com/cloudwego/community/issues/45
2. CSG 三期是关于 8 月新开源的 Volo 框架以及 Volo 生态的一些项目，同时还有关注度非常高的 Monoio，都会在第三期里面进行相关的源码解读。第一期直播已经结束，可以关注 **CloudWeGo 公众号**回复 **“Volo"** 查看回放地址。
3. 第三期的第二和第三场直播会和 Rustcc 社区合作，我们会也把自己的优质项目推到 Rust 基金会和 Rust 中文社区，和他们做比较深度的合作。后续也会有一些新的 Volo 生态和 Rust 生态的 Committer 和 Contributor 加入到我们的社区例会和社区组织中。欢迎大家持续关注。
