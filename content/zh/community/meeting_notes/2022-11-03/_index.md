---
title: CloudWeGo 社区会议 11.3
linkTitle: CloudWeGo 社区会议 11.3
date: 2022-11-3
weight: 16
description: >
---

**会议主题** ：CloudWeGo 社区会议 11.3

**参会人** ：GuangmingLuo, Cheng Guozhu, welkeyever, YangruiEmma, liu-song, Chen Rui, li-jin-gou, joway, liuq19, Duslia, bodhisatan, L2ncE, Code:Z, justlorain, CarlCao17, HeyJavaBean, jayantxie, Yang Hong, baiyutang, skyenought, rogerogers, cyyolo, cloudwegoIce, chens, Bai Yang

**会前必读** ：[官网](/) ; https://github.com/cloudwego

### 议程一：Kitex 生成代码定制默认注入自定义 Suite 介绍 @jayantxie

1. 官网链接：[Extend the Templates of Service Generated Code](/docs/kitex/tutorials/code-gen/template_extension/)
2. 目前字节内部的治理逻辑会封装到 Suite 里面，通过直接生成代码的方式提供给用户，用户在启动的时候就不用手动地引入 Suite Option。为了方便外部用户在生成代码里面扩展这个功能，我们也提供了这样一个功能。用户在生成代码时，可以通过 `-template-extension` 传入一个 `extensions.json` 文件，这个文件可以把 Suite 的代码注入到生代码里。`extensions.json` 是一个 JSON 文件，实现的是 [TemplateExtension](https://pkg.go.dev/github.com/cloudwego/kitex/tool/internal_pkg/generator#TemplateExtension) 的对象，这个对象里面有一些已经完成定义、可以注入到特定位置的代码。
3. Example: /docs/kitex/tutorials/code-gen/template_extension/#example 如果 Client 端需要注入一个 Suite，可以通过 `extend_option` 加一行代码，把用户自定义 package 里面的 Suite 注入进来，我们生成的代码里面就自动包含了这个 Suite，方便用户使用。具体字段含义是，通过 `import_paths` 导入包，`extend_file` 主要功能是可以在生成代码里面提供一些全局的工具函数，如果用户需要提供公共方法，那么可以在这里注入。Server 端与之类似，比如需要公司内限流之类的功能，也可以通过封装到 Server Suite 里面注入代码即可实现，业务不用再导入对应的包。

---

### 议程二：Kitex 自定义异常介绍 @jayantxie

1. Issue 地址：https://github.com/cloudwego/kitex/issues/511

官网：/zh/docs/kitex/tutorials/basic-feature/bizstatuserr/

2. 背景：这是在 Kitex v0.4.3 提供的功能。我们内部对于用户自定义的异常和 RPC 异常做了区分，因此希望把这个功能提供给外部用户使用，能够将 RPC 错误和业务的错误区分开。在出现故障或排查问题的时候，可以方便找到是链路侧的故障还是业务侧的故障。因此我们对 Kitex 异常处理重新做了实现。
3. 我们内置 `BizStatusErrorIface` 提供用户实现自定义异常接口，框架同时提供默认实现，用户只需要在 `ServiceHandler` 里返回 Error，就可以在 Kitex 处理的时候把它编码到 TTheader 或 grpc trailer 中。封装完成后通过 Server 传递到 Client 端，Kitex 在解码的时候会对 TTheader 或 trailer 里面字段做特殊处理，把它转成业务 Error，再返回给 Client。这种方式在中间件处理或治理采集时直接跳过了用户自定义异常的处理。因此我们通过在业务 handler 里面直接返回 `BizStatusErrorIface` 不会触发熔断和链路异常等情况，它仅用于用户之间业务 Error 的传递。
4. TTheader 用法说明：https://github.com/cloudwego/kitex/pull/613/files 因为对外我们没有默认封装使用的 MetaHandler 和协议，自定义异常又借助于 TTheader 或 grpc Handler 的实现，所以 TTheader 协议的用户需要在 Server 里面初始化的时候，手动地初始化 TTheader 的 MetaHandler。在 Client 初始化的时候，同样指定 TTheader 协议，然后加载 TTheader 的 MetaHandler，这样才可以解析对应的字段。在 Server 使用的时候如果遇到业务异常，可以直接在 Handler 里面返回 Error。它主要包含的信息有：`StatusCode` 业务的状态码；`StatusMessage` 业务侧信息。Client 侧提供了对 Error 的识别，收到 Error 后，可以通过 `kerrors.FromBizStatusError` 把它转换成业务异常。收到业务异常后，我们就可以对不同的状态码做特殊的处理。
5. grpc 的用法与之类似，grpc在 `StatusError` 里面提供了 Details 功能，所以我们在业务异常里面同样也提供了这个功能。用法可以参考代码示例：https://github.com/cloudwego/kitex/blob/develop/pkg/kerrors/bizerrors.go#L73。
6. 补充：这个功能对于 Thrift 更建议的用法是 IDL 里面定义一个 Exception，这样用户可以很明确地构造它定义的 Exception。我们做这个支持不可能耦合于 Thrift 协议，PB 的 IDL 是没有这个能力的，因此提供了这样比较通用的方式。@YangruiEmma

---

### 议程三：Hertz Lark 扩展库介绍 @li-jin-gou

1. 项目地址：https://github.com/hertz-contrib/lark-hertz

飞书开放平台文档：https://open.feishu.cn/document/ukTMukTMukTM/uETO1YjLxkTN24SM5UjN

Go SDK 说明文档：https://github.com/larksuite/oapi-sdk-go/blob/v3_main/README.md

2. 背景：飞书开放平台有一个 Go SDK 说明文档，最初里面卡片和消息的回调配置介绍只有 Gin 框架的。有同学反馈找不到 Hertz 如何集成的说明，实际 Hertz 有这部分的能力，但是一直是内部的代码没有开源出来。之前用户通过这个平台点到 Go SDK 说明文档，并不能很方便地能找到对于 Hertz 的支持。所以和 Lark 负责 Go SDK 的同学说明情况后，和他们一起把 Lark 集成 Hertz 的能力开源出来。这个仓库目前放在了 Hertz 扩展库里面。如果大家感兴趣可以体验一下，在处理事件消息回调的情况下使用这个扩展会比较方便。
3. 使用场景：处理卡片和消息事件行为的回调。基于 oapi-sdk-go 做了一层封装，方便用户使用框架接入 SDK。关注 Hertz 的同学也更方便找到相关的内容。
