---
title: "传输协议"
date: 2025-05-12
weight: 1
keywords: ["Kitex", "TTHeader", "HTTP2", "Protobuf", "Thrift", "gRPC"]
description: Kitex 支持 Thrift 和 Protobuf 两种消息协议，以及 TTHeader、HTTP2 等多种传输协议。
---

## 概述

通常 RPC 协议中包含 RPC 消息协议和应用层传输协议，RPC 消息协议看做是传输消息的 Payload，传输协议额外传递一些元信息通常会用于服务治理，框架的 MetaHandler 也是和传输协议搭配使用。
在微服务场景下，传输协议起到了重要的作用，如链路跟踪的透传信息通常由传输协议进行链路传递。

### 消息协议与传输协议的基本概念

在理解 Kitex 的协议支持前，有必要明确两个概念：

- **消息协议（Message Protocol）**：定义了数据如何序列化/反序列化的格式，如 Thrift、Protobuf 等
- **传输协议（Transport Protocol）**：定义了消息如何在网络中传输，包括头部信息、元数据等，如 TTHeader、HTTP/2 等

Kitex 目前支持两种主要传输协议：[TTHeader](/zh/docs/kitex/reference/transport_protocol_ttheader/)、HTTP2，但实际提供配置的 Transport Protocol 是：TTHeader、GRPC、Framed、TTHeaderFramed、PurePayload。

这里做一些说明：

- **Protobuf 的两种使用模式**：Kitex 对 Protobuf 的支持有 Kitex Protobuf 和 gRPC 两种模式
  - **Kitex Protobuf**：仅使用 Protobuf 作为消息协议（Payload 编码），传输协议可以自由选择（如 TTHeader、Framed 等）
  - **gRPC**：完整的 gRPC 协议栈，**固定使用 Protobuf 作为消息协议**（必须使用 .proto 文件，不支持 Thrift IDL），HTTP/2 作为传输协议
  - **为什么将 gRPC 视为传输协议**：虽然 gRPC 实际上是一个完整的 RPC 框架，包含了消息协议(Protobuf)和传输协议(HTTP/2)，但在 Kitex 的配置体系中，我们将 gRPC 归类为传输协议选项，使用户能够通过简单的 `WithTransportProtocol(transport.GRPC)` 一次性启用完整的 gRPC 协议栈，而不需要分别配置 Protobuf 和 HTTP/2

- **Framed 和 PurePayload**：
  - Framed 严格意义上并不是传输协议，只是标记 Payload Size 额外增加的 4 字节头，但消息协议对是否有 Framed 头并不是强制的
  - PurePayload 即没有任何头部的，所以将 Framed 也作为传输协议的分类
  - Framed 和 TTHeader 也可以结合使用，所以有 TTHeaderFramed

### Kitex 支持的协议组合

Kitex 支持以下两种消息协议，每种协议可以搭配不同的传输协议：

#### 1. Thrift 消息协议
当使用 Thrift IDL (.thrift 文件) 时，可选的传输协议有：
- **TTHeader** (建议)：支持元数据传递，适合微服务场景
- **Framed**：轻量级，仅包含长度头
- **TTHeaderFramed**：TTHeader 和 Framed 的组合
- **PurePayload**：无头部（默认）

#### 2. Protobuf 消息协议
Kitex 支持 Protobuf 的两种使用模式：

##### (1) Kitex Protobuf 模式
当使用 Protobuf IDL (.proto 文件) 但不启用 gRPC 模式时，可选的传输协议有：
- **TTHeader** (建议)：支持元数据传递，适合微服务场景
- **Framed**：轻量级，仅包含长度头
- **TTHeaderFramed**：TTHeader 和 Framed 的组合
- **PurePayload**：无头部（默认）

##### (2) gRPC 模式
当启用 gRPC 模式时（使用 transport.GRPC）：
- **必须使用 Protobuf IDL**（.proto 文件，不支持 Thrift）
- **固定使用 HTTP/2 作为传输协议**（不可更改）

如果想自定义消息协议和传输协议参考：[编解码(协议)扩展](/zh/docs/kitex/tutorials/framework-exten/codec/)

## 传输协议配置方式

在 Kitex 中配置传输协议时，需要先确定使用的消息协议（通过 IDL 类型确定），然后再为该消息协议选择合适的传输协议。

**开发流程**：
1. 首先确定使用的 IDL 类型（Thrift 或 Protobuf）
2. 根据 IDL 类型选择对应的消息协议
3. 为选定的消息协议配置合适的传输协议

### 客户端配置

#### 基于 Thrift IDL 的客户端

当使用 `.thrift` 文件生成代码时，可选择以下传输协议：

##### 1. 默认 PurePayload
不指定传输协议时，默认使用 PurePayload（无额外头部）：

```go
cli := xxx.NewClient("service_name") // 不指定传输协议，默认使用 PurePayload
```

##### 2. Framed
指定 Framed 传输协议，在消息前增加 4 个字节（int32）指定 Payload Size：

```go
cli := xxx.NewClient("service_name", client.WithTransportProtocol(transport.Framed))
```

##### 3. TTHeader
指定 TTHeader 传输协议，支持元数据传递：

```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler)) // 元数据处理

cli := xxx.NewClient("service_name", opts...)
```

##### 4. TTHeaderFramed
同时使用 TTHeader 和 Framed：TTHeader | Framed (Bit OR)

```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeaderFramed))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
cli := xxx.NewClient("service_name", opts...)
```

#### 基于 Protobuf IDL 的客户端

当使用 `.proto` 文件生成代码时，需要根据实际通信需求和互操作性考虑选择合适的传输协议：

##### 1. Kitex Protobuf 模式
当使用纯 Protobuf 序列化而不需要 gRPC 互操作性时，可以配置以下传输协议：

```go
// 使用 TTHeader + Protobuf
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))

cli := xxx.NewClient("service_name", opts...)
```

##### 2. gRPC 模式
当需要与 gRPC 服务互通时，需要显式启用 gRPC 协议（HTTP/2 + Protobuf）：

```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.GRPC))
opts = append(opts, client.WithMetaHandler(transmeta.ClientHTTP2Handler)) // HTTP/2 元数据处理
cli := xxx.NewClient("service_name", opts...)
```

##### gRPC 模式使用说明

Kitex 对 gRPC 协议的支持遵循以下规则：

###### (1) IDL 中定义了 Streaming API 的情况
   
如果你的 `.proto` 文件包含流式 RPC（如客户端流、服务端流或双向流）：
```protobuf
service ExampleService {
  rpc ClientStream(stream Request) returns (Response);
  rpc ServerStream(Request) returns (stream Response);
  rpc BidirectionalStream(stream Request) returns (stream Response);
}
```
- Kitex **会自动启用 gRPC 协议**（因为流式 API 必须依赖 HTTP/2）
- 无需额外配置

###### (2) IDL 中只有普通 Unary RPC 的情况
   
如果你的 `.proto` 文件只包含普通单次请求 RPC：
```protobuf
service ExampleService {
  rpc UnaryCall(Request) returns (Response);
}
```
- Kitex **默认使用纯 Protobuf 二进制数据**（可搭配 TTHeader/Framed 等传输协议）
- **如果需要强制使用 gRPC 协议**（例如与标准 gRPC 服务互通），必须显式配置：
  ```go
  client.WithTransportProtocol(transport.GRPC)
  ```

### 服务端配置

Kitex 服务端支持协议探测（在 Kitex 默认支持的协议内），无需明确配置传输协议。但为了支持基于 header 的元信息透传，需要根据使用的消息协议配置对应的 MetaHandler。

#### 基于 Thrift IDL 的服务端

当使用 `.thrift` 文件生成代码时，服务端配置：

```go
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
svr, err := xxx.NewServer(handler, opts...)
```

#### 基于 Protobuf IDL 的服务端

##### 1. Kitex Protobuf 模式

当使用纯 Protobuf 序列化而不需要 gRPC 互操作性时：

```go
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
svr, err := xxx.NewServer(handler, opts...)
```

##### 2. gRPC 模式

当需要与 gRPC 客户端互通时：

```go
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerHTTP2Handler)) // HTTP/2 元数据处理
svr, err := xxx.NewServer(handler, opts...)
```
