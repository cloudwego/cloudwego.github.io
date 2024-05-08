---
title: "Hertz v0.5.0 版本发布"
linkTitle: "Release v0.5.0"
projects: ["Hertz"]
date: 2023-01-12
description: >
---

Hertz 0.5.0 版本中，除了常规迭代优化之外，我们还带来了多个重要 feature。

## 网络层和协议层支持基于流的接口

> https://github.com/cloudwego/hertz/pull/467

在 Hertz v0.5.0 版本中，我们进一步加强了 Hertz 传输层 & 协议层可扩展能力，支持无缝对接基于流的传输层协议 QUIC，以及在此之上构建的 [HTTP3 协议。](https://github.com/cloudwego/hertz/issues/458)
此外，我们在此基础上还增加和完善了 "ALPN"(应用层协议协商)、"QUIC/TLS parallel monitoring"(QUIC/TLS并行监听)、"Alt-Svc"(备选服务) 等功能。

### 主要变更

#### 传输层

我们在保证兼容性能的基础之上增加了一个针对基于流（stream-based）的网络连接接口抽象`StreamConn`，同时调整传输层和协议层的交互逻辑，实现针对连接类型的分发正确的协议层处理（protocol server）。
针对需要同时监听监听 TCP（TLS）以及 UDP(QUIC)的场景我们提供了一个`WithAltTransporter`选项，方便将备用 transporter 传递到主 transporter 中，便于实现 QUIC/TLS 并行监听的能力。

#### 协议层

支持添加基于流的协议层实现（protocol server）`StreamServer`，以便于在新增的基于流的传输层扩展之上构建对应处理协议（HTTP/3）。
为了便捷的实现为某个主协议（HTTP/3）配置备选服务元信息，`ProtocolSuite`对外暴露`SetAltHeader`接口。
同时，我们也为`StreamConn`设计了 ALPN 能力，以便于在 QUIC 内提供协议协商的能力。

#### 通用层

同时我们在通用层中新增了能够与 Golang 标准 Handler 进行转换的辅助函数，以便于快速的将基于 Golang 标准 Handler 实现移植到 Hertz 中来。在之后提供的基于 [quic-go](https://github.com/lucas-clemente/quic-go) 的 [QUIC & HTTP/3 扩展](https://github.com/hertz-contrib/http3/pull/1)中，就用到了这个函数提供的能力。

#### Feature 状态

Hertz 核心库能力已经发布，具体实现后续将以[扩展包](https://github.com/hertz-contrib/http3/pull/1)的形式发布，欢迎试用~

更多详细的设计说明可以参考：[Hertz 支持 QUIC & HTTP/3](/zh/blog/2023/08/02/hertz-%E6%94%AF%E6%8C%81-quic-http/3/)

## 脚手架工具支持生成 hertz client 代码

> https://github.com/cloudwego/hertz/pull/471

在脚手架工具(Hz)的 v0.5.0 的版本，我们支持了基于 IDL 自动生成 hertz client 代码的功能，并实现了类 RPC 调用形式的 HTTP 请求一键调用。
使用方法：

> 具体详见：https://github.com/cloudwego/hertz-examples/tree/main/hz_client

1. 定义 IDL

```go
namespace go toutiao.middleware.hzClient

struct QueryReq {
    1: string QueryValue (api.query="query1");
}


struct Resp {
    1: string Resp;
}

service Hertz121 {
    Resp QueryMethod(1: QueryReq request) (api.get="/query", api.handler_path="get");
}(
    api.base_domain="http://127.0.0.1:8888";
)
```

2. 生成代码

可基于上述 IDL，分别生成 server 和 client 端代码：

server：

```go
hz new --idl=psm.thrift --handler_by_method -t=template=slim
```

client：

```go
hz client --idl=psm.thrift --model_dir=hertz_gen -t=template=slim --client_dir=hz_client
```

3. 调用 client 代码发起 HTTP 请求，实现 client 端和 server 端的互通

## 完整 Release Note

完整的 Release Note 可以参考：

- Hertz: https://github.com/cloudwego/hertz/releases/tag/v0.5.0
- Hz(脚手架): https://github.com/cloudwego/hertz/releases/tag/cmd%2Fhz%2Fv0.5.0
