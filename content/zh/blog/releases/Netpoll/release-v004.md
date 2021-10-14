---
title: "Netpoll v0.0.4 版本发布"
linkTitle: "Release v0.0.4"
date: 2021-09-16
weight: 4
description: >
  
---

## 优化:

- 默认支持 TCP_NODELAY。
- 支持在一个循环中读写。
- 返回 nocopy rw 的真实报错。
- 更改了循环策略的默认数量。
- 重新定义了 EventLoop.Serve arg: Listener -> net.Listener。
- 在 DisableGopool 中增加了API。
- 删除了读锁。
- 连接 Flush API 调整为阻塞（同步）的。

## Bug 修复:

- 设置剩余待读取大小。

