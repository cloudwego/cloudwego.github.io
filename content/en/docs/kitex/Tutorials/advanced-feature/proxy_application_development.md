---
title: "Proxy Application Development"
date: 2024-09-28
weight: 15
keywords: ["Proxy", "Generic Call", "Advanced Feature"]
description: "A comprehensive guide for developing proxy applications using Kitex generic calls, including server initialization, client setup, and traffic forwarding."
---

## Prerequisites

Ensure you are using **cloudwego/kitex >= v0.15.1**.

For protocol consistency, if your business scenarios require proxying different streaming protocols simultaneously (such as gRPC and ttstream), it is recommended to divide business operations by cluster for different protocols. For example, ttstream clusters should only handle ttstream protocol requests, while gRPC clusters should only handle gRPC protocol requests. Ping-pong methods like ttheader/framed are recommended to go through the ttstream cluster.

## Initialize Server

Kitex proxy receives upstream traffic through a kitex server, which is identical to the binary generic server used in the [Kitex Generic Call Guide](../generic-call/).

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

If the server only receives ttheader/framed/buffered traffic, you only need to pass in the DefaultHandler. Otherwise, for traffic involving grpc/ttstream protocols, you must also specify the StreamingHandler.

**Note**: For non-streaming methods defined in IDL, if the upstream access is through gRPC protocol, the traffic will be routed to the StreamingHandler. This is because gRPC can only obtain the actual defined streaming mode through IDL. In unknown service scenarios, it cannot obtain IDL Info, so all traffic is treated as bidirectional streaming by default. Therefore, the method signature of StreamingHandler provides generic.BidiStreamingServer type input parameter.

## Initialize Client

After determining the protocol, when receiving RPC requests, you can forward them to specific kitex generic call clients. Kitex client and IDL Service have a one-to-one correspondence, so you can usually dynamically create clients to implement traffic forwarding.

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

If the client needs to support streaming generic calls, you need to confirm the streaming call protocol. By default, the generic client generated through the above method uses TTHeaderStreaming for streaming protocols, while non-streaming messages use Framed or TTHeaderFramed. If you need to configure streaming methods to use GRPC protocol without changing the protocol of non-streaming methods, add the following client options:

```go
client.WithTransportProtocol(transport.GRPCStreaming)
```

## Traffic Forwarding

### Ping-pong Traffic Forwarding

**Recommended Best Practice**: [Proxy Implementation Example](https://github.com/cloudwego/kitex-tests/blob/main/generic/proxy/proxy.go#L136)

### Streaming Traffic Forwarding

**Recommended Best Practice**: [Streaming Proxy Implementation](https://github.com/cloudwego/kitex-tests/blob/main/generic/proxy/proxy.go#L150)