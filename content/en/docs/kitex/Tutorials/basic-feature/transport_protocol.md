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
### Client
#### Thrift
1. Buffered: PurePayload (by default)
2. configure Framed: prepend a 4-byte (int32) length before the Thrift pure payload
```go
cli := xxx.NewClient("service_name", client.WithTransportProtocol(transport.Framed))
```
3. configure TTHeader: the protocol for Byted Mesh (Service Mesh 协议 )
```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeader))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))

cli := xxx.NewClient("service_name", opts)
```
4. configure TTHeaderFramed: TTHeader | Framed (Bit OR)
```go
var opts []client.Option
opts = append(opts, client.WithTransportProtocol(transport.TTHeaderFramed))
opts = append(opts, client.WithMetaHandler(transmeta.ClientTTHeaderHandler))
cli := xxx.NewClient("service_name", opts)
```

#### gRPC
client configures gRPC protocol：
```go
cli := xxx.NewClient("service_name", client.WithTransportProtocol(transport.GRPC))
```

### Server
Multi-protocol is supported by default. Metahandlers should be configured to enable transparent information transmission.

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

