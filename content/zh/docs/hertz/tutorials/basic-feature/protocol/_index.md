---
title: "协议"
date: 2022-05-23
weight: 7
keywords: ["TLS", "ALPN", "Websocket", "HTTP2", "HTTP3", "SSE"]
description: "Hertz 支持的协议。"
---

## TLS

Hertz Server & Client 目前只有 标准网络库 支持 TLS，[Netpoll](https://github.com/cloudwego/netpoll) 网络库的支持还在路上。
使用参考： [示例](/zh/docs/hertz/tutorials/example/#协议)

## ALPN

开启 TLS 之后，可以通过开关控制 ALPN 是否开启（依赖当前是否通过 Protocol Suite 注册了所需要的所有协议 Servers）。

## Websocket

Hertz 基于 `hijack` 的方式实现了对 WebSocket 的支持。

## HTTP2

Hertz 参考 [net/http2](https://github.com/golang/net/tree/master/http2) 实现了对 HTTP2 的支持，同时支持 h2 和 h2c。

## HTTP3

Hertz 参考 [quic-go](https://github.com/quic-go/quic-go) 实现了对 HTTP3 的支持。

## SSE

Hertz 支持 SSE，允许服务器端通过简单的 HTTP 响应向客户端发送事件。
