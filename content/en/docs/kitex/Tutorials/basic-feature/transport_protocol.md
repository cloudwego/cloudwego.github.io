---
title: "Transport Protocol"
date: 2022-07-20
weight: 3
description: >
---

Usually the RPC protocol contains RPC message protocol and application layer transport protocol, the RPC message protocol is seen as the Payload of the transport message, the transport protocol passes some additional meta information usually used for service governance, the framework of MetaHandler, link tracking of transmissions information. In the microservice scenario, transport protocols play an important role, such as link tracking of transmissions information is usually passed by the transport protocol for the link.

Kitex currently supports two transport protocols: TTHeader, HTTP2, but the actual Transport Protocols provided with configuration are: TTHeader, GRPC, Framed, TTHeaderFramed, PurePayload. Here: Because kitex supports protobuf, including kitex protobuf and grpc, to facilitate the distinction between gRPC as the classification of transport protocols, the framework will decide which protocol to use according to whether there is a configuration of gRPC; Framed is not strictly speaking a transport protocol, but only an additional 4-byte header to mark the Payload Size, but the message protocol is not mandatory for whether there is a Framed header or not. Framed is not strictly speaking a transport protocol, but the message protocol is not mandatory for Framed headers, PurePayload does not have any header, so Framed is also classified as a transport protocol.


The following combinations of transport protocols are available for the messaging protocol：

* Thrift: **TTHeader**(Recommendation)、Framed、TTHeaderFramed
* KitexProtobuf: **TTHeader**(Recommendation)、Framed、TTHeaderFramed
* gRPC: HTTP2

If you want to customize the message protocol and transport protocol reference：[Extension of Codec](../../framework-exten/codec)

### Configuration items

Client initializes with `WithTransportProtocol` to configure the transport protocol：

```go
// client option
client.WithTransportProtocol(transport.XXX)
```

Server supports protocol detection (within the protocols supported by Kitex by default) without the need to configure the transport protocol.

## Usage examples

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

