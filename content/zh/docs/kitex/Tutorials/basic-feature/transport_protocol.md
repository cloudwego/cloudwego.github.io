---
title: "传输协议"
date: 2022-06-17
weight: 3
description: >
---

通常 RPC 协议中包含 RPC 消息协议和应用层传输协议，RPC 消息协议看做是传输消息的 Payload，传输协议额外传递一些元信息通常会用于服务治理，框架的 MetaHandler 也是和传输协议搭配使用。在微服务场景下，传输协议起到了重要的作用，如链路跟踪的透传信息通常由传输协议进行链路传递。

Kitex 目前支持两种传输协议：TTHeader、HTTP2，但实际提供配置的 Transport Protocol 是：TTHeader、GRPC、Framed、TTHeaderFramed、PurePayload。

这里做一些说明：

- 因为 Kitex 对 Protobuf 的支持有 Kitex Protobuf 和 gRPC，为方便区分将 gRPC 作为传输协议的分类，框架会根据是否有配置 gRPC 决定使用哪个协议；
- Framed 严格意义上并不是传输协议，只是标记 Payload Size 额外增加的 4 字节头，但消息协议对是否有 Framed 头并不是强制的，PurePayload 即没有任何头部的，所以将 Framed 也作为传输协议的分类；
- Framed 和 TTHeader 也可以结合使用，所以有 TTHeaderFramed 。


消息协议可选的传输协议组合如下：

* Thrift: **TTHeader**(建议)、Framed、TTHeaderFramed
* KitexProtobuf: **TTHeader**(建议)、Framed、TTHeaderFramed
* gRPC: HTTP2

如果想自定义消息协议和传输协议参考：[编解码(协议)扩展](../../framework-exten/codec)

### 配置项

Client 初始化时通过 `WithTransportProtocol` 配置传输协议：

```go
// client option
client.WithTransportProtocol(transport.XXX)
```

Server 支持协议探测（在 Kitex 默认支持的协议内），无需配置传输协议。

## 使用示例

### Thrift + TTHeader

```go
// client side
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
// use TTHeader meta handler. >= v0.3.4 ClientTTHeaderHandler is added by default, don't need to do setup
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
cli, err := xxxservice.NewClient(targetService, opts...)

// server side no need to config transport protocol
var opts []server.Option
// use TTHeader meta handler. >= v0.3.4 ServerTTHeaderHandler is added by default, don't need to do setup
opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
cli, err := xxxservice.NewServer(handler, opts...)
```


### gRPC

```go
// client side
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.GRPC))
// use HTTP2 meta handler. >= v0.3.4 ClientHTTP2Handler is added by default, don't need to do setup
opts = append(opts, client.WithMetaHandler(transmeta.ClientHTTP2Handler))
cli, err := xxxservice.NewClient(targetService, opts...)


// server side no need to config transport protocol
var opts []server.Option
// use HTTP2 meta handler. >= v0.3.4 ServerHTTP2Handler is added by default, don't need to do setup
opts = append(opts, server.WithMetaHandler(transmeta.ServerHTTP2Handler))
cli, err := xxxservice.NewServer(handler, opts...)
```
