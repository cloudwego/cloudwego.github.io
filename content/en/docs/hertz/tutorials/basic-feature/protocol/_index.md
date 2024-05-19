---
title: "Protocol"
date: 2022-05-23
weight: 7
keywords: ["TLS", "ALPN", "Websocket", "HTTP2", "HTTP3", "SSE"]
description: "Hertz supported protocols."
---

## TLS

Hertz Server & Client currently only supports TLS for the standard network library, and the support for the [Netpoll](https://github.com/cloudwego/netpoll) network library is still on the way.
Usage Reference: [Example](/docs/hertz/tutorials/example/#protocol)

## ALPN

ALPN can be switched on or off with a switch after TLS is enabled.(depending on whether all required protocol Servers are currently registered via Protocol Suite).

## WebSocket

Hertz implements support for WebSocket based on `hijack`.

## HTTP2

Hertz references [net/http2](https://github.com/golang/net/tree/master/http2) to implement support for HTTP2, while also supporting both h2 and h2c.

## HTTP3

Hertz reference [quic-go](https://github.com/quic-go/quic-go) to implement support for HTTP3.

## SSE

Hertz supports SSE, allowing the server to send events to the client through simple HTTP response.
