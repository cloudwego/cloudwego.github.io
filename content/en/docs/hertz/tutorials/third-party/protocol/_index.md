---
title: "Protocol"
date: 2022-05-23
weight: 1
keywords: ["Websocket", "HTTP2", "HTTP3", "SSE"]
description: "Protocol extensions supported by Hertz."
---

## WebSocket

Hertz implements support for WebSocket based on `hijack`.

## HTTP2

Hertz references [net/http2](https://github.com/golang/net/tree/master/http2) to implement support for HTTP2, while also supporting both h2 and h2c.

## HTTP3

Hertz reference [quic-go](https://github.com/quic-go/quic-go) to implement support for HTTP3.

## SSE

Hertz supports SSE, allowing the server to send events to the client through simple HTTP response.
