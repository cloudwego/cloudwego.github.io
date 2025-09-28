---
title: "Proxy 应用开发指南"
date: 2024-09-28
weight: 15
keywords: ["Proxy", "泛化调用", "高级特性"]
description: "使用 Kitex 泛化调用开发 Proxy 应用的完整指南，包括服务端初始化、客户端设置和流量转发。"
---

## 前置环境

请确保使用 **cloudwego/kitex >= v0.15.1**。

为确保协议一致性，如果业务场景中有不同的流式协议需要同时代理，如 gRPC 和 ttstream，建议按集群对不同协议的 proxy 进行业务划分。如 ttstream 集群只处理 ttstream 协议的请求，gRPC 集群只处理 gRPC 协议的请求。ttheader/framed 这类 pingpong 方法建议走 ttstream 集群。

## 初始化服务端

Kitex proxy 接收上游流量是通过 kitex server 实现，它与 [Kitex 泛化调用指南](../generic-call/) 中二进制泛化的 server 使用别无二致。

```go
import (
    "github.com/cloudwego/kitex/server"
)

opts = append(opts, server.WithListener(ln),
    server.WithMetaHandler(transmeta.ServerTTHeaderHandler),
    server.WithMetaHandler(transmeta.ServerHTTP2Handler))

svr := server.NewServer(opts...)
err := genericserver.RegisterUnknownServiceOrMethodHandler(svr, &genericserver.UnknownServiceOrMethodHandler{
        DefaultHandler:   defaultUnknownHandler,
        StreamingHandler: streamingUnknownHandler,
})
```

如果 server 仅接收 ttheader/framed/buffered 流量，则只需传入 DefaultHandler 即可。否则，涉及 grpc/ttstream 协议的流量，还需指定 StreamingHandler。

**注意**：IDL 中定义的非流式方法，如果上游是通过 grpc 协议访问的，则流量会被路由到 StreamingHandler。这是由于 grpc 仅能通过 IDL 获取实际定义的流模式，unknown service 场景下，没法获取 IDL Info，只能将所有流量都默认视作双向流，所以 StreamingHandler 的方法签名提供的是 generic.BidiStreamingServer 类型入参。

## 初始化客户端

明确协议后，接收到 rpc 请求时，就可以转发到特定的 kitex 泛化调用 client 上了。Kitex client 和 IDL Service 是一一对应的，所以通常可以动态创建 client 来实现流量转发。

```go
import (
    "github.com/cloudwego/kitex/client/genericclient"
)

options := []client.Option{
    client.WithHostPorts(addr.String()),
    client.WithTransportProtocol(transport.TTHeader | transport.TTHeaderStreaming),
    client.WithMetaHandler(transmeta.ClientTTHeaderHandler),
    client.WithMetaHandler(transmeta.ClientHTTP2Handler),
}

// thrift binary
cli, err := genericclient.NewClient(downstreamService, generic.BinaryThriftGenericV2(serviceName), options...)
// protobuf binary
cli, err := genericclient.NewClient(downstreamService, generic.BinaryPbGeneric(serviceName, packageName), options...)
```

如果 client 要支持流式泛化调用，需要确认流式调用的协议，默认情况下，通过上述方式生成的泛化 client 的流协议是 TTHeaderStreaming，非流式消息则是 Framed 或 TTHeaderFramed。如果需要配置流式方法走 GRPC 协议，而不改变非流式方法的协议，则添加以下 client options：

```go
client.WithTransportProtocol(transport.GRPCStreaming)
```

## 流量转发

### Ping-pong 流量转发

**推荐最佳实践**：[Proxy 实现示例](https://github.com/cloudwego/kitex-tests/blob/main/generic/proxy/proxy.go#L136)

### 流式流量转发

**推荐最佳实践**：[流式 Proxy 实现](https://github.com/cloudwego/kitex-tests/blob/main/generic/proxy/proxy.go#L150)