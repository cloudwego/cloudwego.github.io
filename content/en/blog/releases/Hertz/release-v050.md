---
title: "Hertz Release v0.5.0"
linkTitle: "Release v0.5.0"
projects: ["Hertz"]
date: 2023-01-12
description: >
---

In version 0.5.0 of Hertz, in addition to regular iterative optimization, we also brought several important features.

## Network layer and protocol layer support stream-based interface

> https://github.com/cloudwego/hertz/pull/467

In the Hertz v0.5.0 version, we have further enhanced the scalability of the Hertz transport layer & protocol layer, supporting the seamless connection of the stream-based transport layer protocol QUIC, and the [HTTP3 protocol](https://github.com/cloudwego/hertz/issues/458) built on top of it.
In addition, on this basis, we have added and improved functions such as "ALPN" (application layer protocol negotiation), "QUIC/TLS parallel monitoring" (QUIC/TLS parallel monitoring), "Alt-Svc" (alternative service).

### Major Changes

#### Transport layer

On the basis of ensuring compatibility performance, we have added an abstract stream-based network connection interface `StreamConn`, and adjusted the interaction logic between the transport layer and the protocol layer to achieve the correct protocol layer for the distribution of connection types Processing (protocol server).
For scenarios that need to monitor TCP (TLS) and UDP (QUIC) at the same time, we provide a `WithAltTransporter` option, which facilitates passing the backup transporter to the main transporter, and facilitates the ability to monitor QUIC/TLS in parallel.

#### Protocol Layer

Support adding a stream-based protocol layer implementation (protocol server) `StreamServer`, so as to build a corresponding processing protocol (HTTP/3) on top of the newly added stream-based transport layer extension.
In order to facilitate the configuration of alternative service meta-information for a main protocol (HTTP/3), `ProtocolSuite` exposes the `SetAltHeader` interface.
At the same time, we also designed the ALPN capability for `StreamConn`, so as to provide the ability of protocol negotiation in QUIC.

#### Common layer

At the same time, we have added an auxiliary function that can convert with the Golang standard Handler in the general layer, so as to quickly port the implementation based on the Golang standard Handler to Hertz. The [QUIC & HTTP/3 extension](https://github.com/hertz-contrib/http3) based on [quic-go](https://github.com/lucas-clemente/quic-go) provided later /pull/1), the capabilities provided by this function are used.

#### Feature Status

The Hertz core library capability has been released, and the specific implementation will be released in the form of [extension package](https://github.com/hertz-contrib/http3/pull/1), welcome to try~

For more detailed design instructions, please refer to: [Hertz supports QUIC & HTTP/3](/zh/blog/2023/08/02/hertz-%E6%94%AF%E6%8C%81-quic-http/3/)

## Scaffolding tools support generating hertz client code

> https://github.com/cloudwego/hertz/pull/471

In the v0.5.0 version of the scaffolding tool (Hz), we support the function of automatically generating the hertz client code based on IDL, and realize the one-click call of the HTTP request in the form of an RPC call.
Instructions:

> For details, see: https://github.com/cloudwego/hertz-examples/tree/main/hz_client

1. Define the IDL

```go
namespace go toutiao.middleware.hzClient
struct QueryReq {
     1: string QueryValue (api. query="query1");
}
struct Resp {
     1: string Resp;
}
service Hertz121 {
     Resp QueryMethod(1: QueryReq request) (api.get="/query", api. handler_path="get");
}(
     api.base_domain="http://127.0.0.1:8888";
)
```

2. Generate code

Based on the above IDL, the server and client codes can be generated separately:

Server:

```go
hz new --idl=psm.thrift --handler_by_method -t=template=slim
```

Client:

```go
hz client --idl=psm.thrift --model_dir=hertz_gen -t=template=slim --client_dir=hz_client
```

3. Call the client code to initiate an HTTP request to realize the intercommunication between the client end and the server end

## Full Release Note

The complete Release Note can refer to:

- Hertz: https://github.com/cloudwego/hertz/releases/tag/v0.5.0
- Hz(scaffolding): https://github.com/cloudwego/hertz/releases/tag/cmd%2Fhz%2Fv0.5.0
