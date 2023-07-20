---
title: "Netpoll v0.4.0 版本发布"
linkTitle: "Release v0.4.0"
date: 2023-06-14
description: >
---

## Feature:

- [[#249](https://github.com/cloudwego/netpoll/pull/249)] feat: 添加Detach函数来支持从连接的poller中删除连接

## Optimize:

- [[#250](https://github.com/cloudwego/netpoll/pull/250)] optimize: 优化WriteDirect实现，避免remainLen为0时panic和重复创建冗余的LinkBufferNode.

## Bugfix:

- [[#256](https://github.com/cloudwego/netpoll/pull/256)] fix: 调用 openPoll 失败时关闭已经创建的 poll 
- [[#251](https://github.com/cloudwego/netpoll/pull/251)] fix: err to e0
- [[#226](https://github.com/cloudwego/netpoll/pull/226)] fix: 在关闭连接前 poller 读取所有未读的 data
- [[#237](https://github.com/cloudwego/netpoll/pull/237)] fix: shard queue 状态关闭错误
- [[#189](https://github.com/cloudwego/netpoll/pull/189)] fix: 当 readv syscall return 0, nil 时关闭连接

## Refactor

- [[#233](https://github.com/cloudwego/netpoll/pull/233)] refactor: 简化 race 和 norace event loop
