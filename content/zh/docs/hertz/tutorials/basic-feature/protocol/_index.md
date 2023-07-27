---
title: "协议"
date: 2022-05-23
weight: 7
description: >

---

## TLS

Hertz Server & Client 目前只有 标准网络库 支持 TLS，[Netpoll](https://github.com/cloudwego/netpoll) 网络库的支持还在路上。
使用参考： [Hertz 示例](/zh/docs/hertz/tutorials/example/) 和 [Hertz 配置](/zh/docs/hertz/reference/config/)

## ALPN

开启 TLS 之后，可以通过开关控制 ALPN 是否开启（依赖当前是否通过 Protocol Suite 注册了所需要的所有协议 Servers）

## Websocket

Hertz 基于`hijack`的方式实现了对 WebSocket 的支持。

## HTTP2

内部生产环境已在使用，如有需求可提 issue，敬请期待。
