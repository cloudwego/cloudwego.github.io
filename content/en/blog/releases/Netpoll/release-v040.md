---
title: "Netpoll Release v0.4.0"
linkTitle: "Release v0.4.0"
projects: []
date: 2023-06-14
description: >
---

## Feature:

- [[#249](https://github.com/cloudwego/netpoll/pull/249)] feat: add Detach function to support detach connection from its poller

## Optimize:

- [[#250](https://github.com/cloudwego/netpoll/pull/250)] optimize: WriteDirect implementation to avoid panic and duplicate creation of redundant LinkBufferNode when remainLen is 0

## Bugfix:

- [[#256](https://github.com/cloudwego/netpoll/pull/256)] fix: close the poll that has already been created when calling the openPoll fails
- [[#251](https://github.com/cloudwego/netpoll/pull/251)] fix: err to e0
- [[#226](https://github.com/cloudwego/netpoll/pull/226)] fix: poller read all data before connection close
- [[#237](https://github.com/cloudwego/netpoll/pull/237)] fix: shard queue state closed mistake
- [[#189](https://github.com/cloudwego/netpoll/pull/189)] fix: close connection when readv syscall return 0, nil

## Refactor

- [[#233](https://github.com/cloudwego/netpoll/pull/233)] refactor: simplify race and norace event loop
