---
title: "Protocol"
date: 2022-05-23
weight: 7
description: >

---

## TLS
Hertz Server & Client currently only supports TLS for the standard network library, and the support for the [Netpoll](https://github.com/cloudwego/netpoll) network library is still on the way.
Usage Reference: [Hertz Example](/docs/hertz/tutorials/example/) and [Hertz Config](/docs/hertz/reference/config/)

## ALPN
ALPN can be switched on or off with a switch after TLS is enabled.(depending on whether all required protocol Servers are currently registered via Protocol Suite)

## WebSocket
Hertz implements support for WebSocket based on `hijack`.

## HTTP2
HTTP2 is already in use in internal production environments, so please look forward to hearing from us. Please feel free to raise an issue if you need it.
