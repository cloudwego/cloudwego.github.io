---
title: "Netpoll Release v0.3.0"
linkTitle: "Release v0.3.0"
date: 2022-11-09
description: >
---

## Feat

* [[#206](https://github.com/cloudwego/netpoll/pull/206)] feat: connection flush support write timeout.
* [[#182](https://github.com/cloudwego/netpoll/pull/182)] feat: dial in ipv6 only.

## Fix

* [[#200](https://github.com/cloudwego/netpoll/pull/200)] fix: fd not detach when close by user.
* [[#196](https://github.com/cloudwego/netpoll/pull/196)] fix: limit iovecs max to 2GB(2^31).
* [[#179](https://github.com/cloudwego/netpoll/pull/179)] fix: length overflow.
* [[#183](https://github.com/cloudwego/netpoll/pull/183)] fix: dont check epollout when epollerr.

