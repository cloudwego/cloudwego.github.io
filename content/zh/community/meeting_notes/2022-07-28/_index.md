---
title: CloudWeGo 社区会议 7.28
linkTitle: CloudWeGo 社区会议 7.28
date: 2022-07-28
weight: 11
description: >
---

**会议主题** ：CloudWeGo 社区会议 7.28

**参会人** ：li-jin-gou, liu-song, GuangmingLuo, pkumza, ag9920, lsjbd, sinnera, welkeyever, YangruiEmma, CoderPoet, stephenzhang0713, joway, Quan Hu, zstone12, Yin Xuran, bodhisatan, Suo Dianjun, Fan Guangyu, Jacob953, Zhang Guiyuan, ppzqh, HeyJavaBean, simon0-o, jayantxie, daidai21, baiyutang, rogerogers, Zhou Xinyi, skyenought, yiyun, cyyolo, baize, Sunxy88

**会前必读** ：[官网](/)；https://github.com/cloudwego

### 议程 1：Kitex & Hertz 对接 sentinel-go 方案和实现介绍 @GuangmingLuo @skyenought

1. 相关文档：ybwflbcn12.feishu.cn/docx/doxcnXcNmOMPaWasGNNQ1dib7xh
2. 基于 CloudWeGo 和 OpenSergo 项目合作的背景下，我们会从开源方面做一些合作对接。Sentinel 会作为 OpenSergo 的具体实现，服务治理的相关标准会沉淀在 OpenSergo 里面，Kitex 与 Hertz 对接 sentinel-go 的 PR 均已经被合入。与 Gin 集成方式保持一致，通过 Middleware 的形式，集成 sentinel-go 的 Entry。
3. sentinel-go 只提供了一个高度封装的方法，对外只能通过中间件的方式进行。提交到 sentinel-go 仓库里的代码后续维护情况还需进一步讨论。

---

### 议程 2：Kitex 定制框架错误处理和规范介绍 @YangruiEmma

1. Issue 地址：https://github.com/cloudwego/kitex/issues/511
2. 背景：对于用户而言，工程实践里面 RPC 异常分成两大类。

- RPC 异常。即 RPC 请求失败，对应超时、协议错误、熔断或者限流等等情况；
- RPC 层面成功，用户层面异常。用户把请求发到下游，希望根据他的处理逻辑返回状态码给上游，上游可以通过这些状态码做一些额外处理。这种情况在 RPC 层面其实是请求成功，业务错误属于业务逻辑层面。因此服务监控建议对于 RPC 错误上报为请求失败，而业务层面错误，上报为请求成功，但上报 status_code 用于识别错误码。该能力对于工程实践具有一定的价值。

起初，内部要求用户在 Thrift IDL 定义中定义全公司统一的 Base Response 字段，用户通过 Base Response 用户设置业务层面的状态码，我们把这个状态码上报，用户就可以通过监控看到业务层面出现的异常。但是考虑到开源后这套规范并不是很优雅，所以我们想定制一个通用的规范，让用户定义自己的异常。Kitex 本身支持多协议，这一套异常又不能和协议做耦合，因此我们要定义一套通用的接口。

3. 接口定义：我们会定义一个 `bizStatusError` 接口。因为 gRPC 用户常用 Status 回传 Error，gRPC 无论是 RPC 真正的框架层面异常，还是用户自定义异常，都使用 Status，其实是没有办法区分的。我们给用户提供的是 gRPC 本身就提供给用户的，即通过 Status 构造 Error，因此我们也要对应地做支持。所以用户可以按照 gRPC 的 Status 实现接口，同时也可以实现 Kitex 定义的这套接口，Kitex 会根据接口判断是否有用户自定义异常，如果是 gRPC 的 Status，我们也会按照 gRPC 的规范通过 HTTPHeader 把错误写到 Header，通过 Header 回传。
4. 用户使用：服务端可以直接通过 `bizerror` 包构造 `bizStatusError`。调用端可以通过 `bizerror.FromError` 方法判断对端返回的是不是 `bizerror`。
5. 框架实现：Thrift 和 Kitex Protobuf 对于 RPC 层面的异常是放在 Payload 里面编码的，gRPC 是统一放在 HTTPHeader 里面做编码的。因为考虑用户层面的异常，Thrift 和 Kitex Protobuf 放在 Payload 里面编码不是特别合适，所以我们考虑统一在 Header 里面做返回，不再放在 Payload 里面，Payload 里面只写 RPC 层面的异常。
6. 框架处理：具体参见 https://github.com/cloudwego/kitex/issues/511。

---

### 议程 3：关于 CloudWeGo 代码生成工具相关建议和方案的讨论 @lsjbd

1. Issue 地址：https://github.com/cloudwego/kitex/issues/531
2. 李纪昀提了关于 Kitex Tool 的改进建议。解答如下：

- 问题一：第一，Kitex 默认使用 go path 模式，如果没有指定 `-model` 参数，会认为当前项目是在 go path 下，之后尝试搜索 go path source 的相对路径，决定代码输出的前缀。现在 gomodule 已经使用比较广泛，我们是否可以默认在 gomodule 文件承载情况下，直接使用当前已知的 gomodule 不要求参数指定？这里的问题是我们内部还有很多项目不使用 gomodule，所以默认行为一旦改变，可能会产生很多 breaking change；第二，gomodule 不一定在当前目录，所以如果实现必须逐层向上搜索，但这可能会达不到预期的效果。
- 问题二：我们内部可能会使用一些比较奇怪的 IDL 后缀。在它开发的早期，我们其实做了限制，入口的 IDL 必须是 `.thrift` 或者 `.proto` 。所以理论上这个是可以做支持的，根据 Thrift 还是 Proto 来确定当前的 Tag，只有在其他情况下才要求它必须指定一个 Tag，所以这是可以实现的。
- 问题三：我们内部已经在考虑，即使不能合并，是否在两者的页面或者参数做一些统一的功能，此外生成代码的结构体将来是否能够复用也在研究中。
- 问题四：起初设计 Kitex 也考虑过自定义模板，其实 Kitex 本身支持模版还是比较复杂的，因为 Kitex 并不主导生成代码的过程。它底层有 Protoc 和 Thriftgo 这样两个实际的编译器在做生成代码的工作。所以 Kitex 支持自定义模版还需要考虑两个底层的编译器是否能支持自定义模版的问题。而两个编译器都支持插件，所以自定义模版的功能完全可以用插件的功能实现。

---

### 议程 4：2021-2022 Awesome Contributor 评选事宜 @yiyun

1. Issue 地址：https://github.com/cloudwego/community/issues/36
2. 背景：9 月份 CloudWeGo 开源一周年，一年内除了技术迭代，还收获了 100+ 社区贡献者，以及几百名活动布道者。希望通过 Awesome Contributor 评选，表彰和感谢他们对社区的贡献和支持，共有 100 个名额。活动奖励类型、奖励方式、具体范围、评选标准、评选时间和公示参见 Issue 地址。
3. 8 月 1 日正式开启评选。可以自荐，直接在 Issue 下面评论名单和贡献内容即可。

---

### 议程 5： Go through good-first-issue & QA @GuangmingLuo

1. Kitex good-first-issue 地址：https://github.com/cloudwego/kitex/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

一个文档翻译任务待领取，两个单测任务完成情况待审核。

2. Hertz good-first-issue 地址：https://github.com/cloudwego/hertz/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

两个任务待认领：https://github.com/cloudwego/hertz/issues/61；https://github.com/cloudwego/hertz/issues/62

（第二个任务可以考虑和 Kitex 对接远程配置中心设置一个通用方案。）

3. 业务场景 Business 仓库：https://github.com/cloudwego/biz-demo

欢迎大家提交业务案例！

---

### 相关资讯

Hertz v0.2.0 发布！

相关链接：https://mp.weixin.qq.com/s/OOlO-ng4NVgnh32D2dj8Qw
