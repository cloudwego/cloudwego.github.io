---
title: "Netpoll v0.3.0 版本发布"
linkTitle: "Release v0.3.0"
date: 2022-11-09
description: >
---

## Feat

* [[#206](https://github.com/cloudwego/netpoll/pull/206)] feat: 连接 Flush 接口支持写超时设置。
* [[#182](https://github.com/cloudwego/netpoll/pull/182)] feat: 支持在 ipv6 only 环境下创建连接。

## Fix

* [[#200](https://github.com/cloudwego/netpoll/pull/200)] fix: 修复 #166 中的代码错误：close fd 没有正确的被 detach。
* [[#196](https://github.com/cloudwego/netpoll/pull/196)] fix: 系统 io 调用使用 int32 存储 size, 超限调用会导致 EINVAL。
* [[#179](https://github.com/cloudwego/netpoll/pull/179)] fix: 修复 buffer 长度 int32 溢出的问题。
* [[#183](https://github.com/cloudwego/netpoll/pull/183)] fix: 当 EPOLLERR 发生时，跳过检查 EPOLLOUT。

