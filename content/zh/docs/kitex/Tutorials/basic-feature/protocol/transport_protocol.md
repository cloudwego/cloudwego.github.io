---
title: "传输协议"
date: 2023-10-16
weight: 1
keywords: ["Kitex", "TTHeader", "HTTP2"]
description: Kitex 支持 TTHeader、HTTP2 传输协议。
---

## 概述

通常 RPC 协议中包含 RPC 消息协议和应用层传输协议，RPC 消息协议看做是传输消息的 Payload，传输协议额外传递一些元信息通常会用于服务治理，框架的 MetaHandler 也是和传输协议搭配使用。
在微服务场景下，传输协议起到了重要的作用，如链路跟踪的透传信息通常由传输协议进行链路传递。

Kitex 目前支持两种传输协议：[TTHeader](/zh/docs/kitex/reference/transport_protocol_ttheader/)、HTTP2，但实际提供配置的 Transport Protocol 是：TTHeader、GRPC、Framed、TTHeaderFramed、PurePayload。

这里做一些说明：

- 因为 Kitex 对 Protobuf 的支持有 Kitex Protobuf 和 gRPC，为方便区分将 gRPC 作为传输协议的分类，框架会根据是否有配置 gRPC 决定使用哪个协议；
- Framed 严格意义上并不是传输协议，只是标记 Payload Size 额外增加的 4 字节头，但消息协议对是否有 Framed 头并不是强制的，PurePayload 即没有任何头部的，所以将 Framed 也作为传输协议的分类；
- Framed 和 TTHeader 也可以结合使用，所以有 TTHeaderFramed 。

消息协议可选的传输协议组合如下：

- Thrift: **TTHeader** (建议)、Framed、TTHeaderFramed
- KitexProtobuf: **TTHeader** (建议)、Framed、TTHeaderFramed
- gRPC: HTTP2

如果想自定义消息协议和传输协议参考：[编解码(协议)扩展](/zh/docs/kitex/tutorials/framework-exten/codec/)

## 配置方式

### Client

#### Thrift

1. 默认 Buffered：PurePayload
2. 指定 Framed：PurePayload 前增加 4 个字节（int32）指定 Payload Size

```go
cli := xxx.NewClient("service_name", client.WithTransportProtocol(transport.Framed))
```

3. 指定 TTHeader：

```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))

cli := xxx.NewClient("service_name", opts)
```

4. 指定 TTHeaderFramed：TTHeader | Framed (Bit OR)

```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeaderFramed))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
cli := xxx.NewClient("service_name", opts)
```

#### gRPC

client 指定 gRPC 协议：

```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.GRPC))
opts = append(opts, client.WithMetaHandler(transmeta.ClientHTTP2Handler))
cli := xxx.NewClient("service_name", client.WithTransportProtocol(transport.GRPC))
```

注意: 如果 IDL 中没有 Streaming API，则需要此选项来启用 gRPC 协议，否则 kitex 将仅发送 protobuf binary（而不是 gRPC）。

### Server

支持协议探测（在 Kitex 默认支持的协议内），无需配置传输协议。为了支持基于 header 的信息透传，需要配置 metaHandler

#### Thrift (TTHeader)

```go
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
svr, err := xxxservice.NewServer(handler, opts...)
```

#### gRPC

```go
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerHTTP2Handler))
svr, err := xxxservice.NewServer(handler, opts...)
```
