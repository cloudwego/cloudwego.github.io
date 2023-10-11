---
title: "Transport Protocol"
date: 2022-07-20
weight: 3
keywords: ["Kitex", "TTHeader", "HTTP2"]
description: Kitex supports transport protocols of TTHeader、HTTP2.
---

An RPC protocol generally includes a transport protocol in the application layer and a message protocol that tells how to access the payload. 
Transport protocols come with rich mechanisms that let you deal with additional metadata, which can be helpful for service governance. 
And Kitex allows you to read or write metadata through a protocol based on MetaHandler. The capability of carrying metadata enables us to track requests in their entirety 
as it travels across services of a distributed system, and thus makes transport protocol indispensable in Microservices.

Kitex already supports [TTHeader](../../../reference/transport_protocol_ttheader/) and HTTP2. Available options for transport protocol are TTHeader、GRPC、Framed、TTHeaderFramed、PurePayload.

Some clarifications:

- Kitex supports Protobuf in two ways: Kitex Protobuf and gRPC. We include gRPC as a transport protocol to make it easy to distinguish. Internally, Kitex will identify the protocol based on whether gRPC was configured.
- Framed is not technically a transport protocol. It was just there for marking the extra 4 bytes header in Payload Size. But the message protocol does not enforce the need for Framed Header. 
  For instance, PurePayload doesn't have any Header. Therefore, we also include Framed as an option for the transport protocol.
- Framed and TTHeader could be used together, which leads to TTHeaderFramed.

Here are the available combination options of transport protocols and message protocols in Kitex:

- Thrift: **TTHeader**(recommend), Framed, TTHeaderFramed
- KitexProtobuf: **TTHeader**(recommend), Framed, TTHeaderFramed
- gRPC: HTTP2

If you want to use custom implementations for the message or transport protocol, you can find help here [Extension of Codec](/docs/kitex/tutorials/framework-exten/codec/).

## Configuration

You can configure the transport protocol when initializing the client:

```go
// client option
client.WithTransportProtocol(transport.XXX)
```

Kitex Server supports protocol detection for all supported protocols and doesn't require explicit configuration.

## Usage

### Thrift + TTHeader

```go
// client side
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
cli, err := xxxservice.NewClient(targetService, opts...)

// server side no need to config transport protocol
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerTTHeaderHandler))
cli, err := xxxservice.NewServer(handler, opts...)
```

### gRPC

```go
// client side
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.GRPC))
opts = append(opts, client.WithMetaHandler(transmeta.ClientHTTP2Handler))
cli, err := xxxservice.NewClient(targetService, opts...)


// server side no need to config transport protocol
var opts []server.Option
opts = append(opts, server.WithMetaHandler(transmeta.ServerHTTP2Handler))
cli, err := xxxservice.NewServer(handler, opts...)

```
