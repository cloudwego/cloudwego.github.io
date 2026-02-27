---
date: 2022-05-09
title: "CloudWeGo-SA-2022-2"
linkTitle: "CloudWeGo-SA-2022-2"
description: Netpoll Panic
---

## 简介

修复当“对端关闭 & 本端 user Close” 同时发生时出现 Panic 的问题

## 严重级别

Middle

## 描述

修复极端场景下的并发问题：

场景：“对端关闭 & 本端 user Close” 同时发生，并且 c.onClose 执行的是 lock(User)，同时 poller 也执行到了 p.detaches (三个条件同时满足)

这时候会有两个 goroutine 同时执行 op.Control(PollDetach)，因此 op.unused 会被执行两次。

当程序比较闲时，有可能 c.onClose 已经执行完 close callback 了，freeop 并且已经被复用，又变成 inuse 状态；而这时候 p.detaches 里的 op.unused 才开始执行；这样就会把一个新连接的 operator 错误的置成 0 ，导致后续的 op.do 全失败，变成死循环。

## 解决办法

poller 不再异步执行 detach，以保证不会和 c.onClose 并发，改动是性能无损的。

## 影响组件

netpoll-v0.2.2

kitex-v0.3.0

## CVE

无

## 参考链接

- https://github.com/cloudwego/netpoll/issues/149
- https://github.com/cloudwego/netpoll/pull/142
