---
title: "协议"
date: 2022-05-23
weight: 1
keywords: ["TLS", "ALPN", "Websocket", "HTTP2", "HTTP3", "SSE"]
description: "Hertz 支持的协议扩展。"
---

## Websocket

Hertz 基于 `hijack` 的方式实现了对 WebSocket 的支持。

## HTTP2

Hertz 参考 [net/http2](https://github.com/golang/net/tree/master/http2) 实现了对 HTTP2 的支持，同时支持 h2 和 h2c。

## HTTP3

Hertz 参考 [quic-go](https://github.com/quic-go/quic-go) 实现了对 HTTP3 的支持。

## SSE

Hertz 支持 SSE，允许服务器端通过简单的 HTTP 响应向客户端发送事件。
