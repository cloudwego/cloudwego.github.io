---
title: "Kitex v0.2.1 版本发布"
linkTitle: "Release v0.2.1"
projects: ["Kitex"]
date: 2022-03-24
description: >
---

## Bugfix

- [[#383](https://github.com/cloudwego/kitex/pull/383) ] 修复(generic)：在泛化调用的时候检查 IDL 是否有循环依赖。
- [[#359](https://github.com/cloudwego/kitex/pull/359) ] 修复(tool)：修复 protobuf CombineService 缺失 streaming 引用的问题。
- [[#363](https://github.com/cloudwego/kitex/pull/363) ] 修复(client)：修复 oneway 请求的 sequence ID 没有被编码的问题以及降低 oneway 调用的丢包率。
- [[#367](https://github.com/cloudwego/kitex/pull/367) ] 修复(generic/tool)：修复 CombineServices 可能存在多次加载同一个 service 问题。

## Optimise

- [[#362](https://github.com/cloudwego/kitex/pull/362) ] 优化(diagnosis)：lbcaches 是全局的，无需为每个 client 注册 ProbeFunc 用于诊断查询。
- [[#374](https://github.com/cloudwego/kitex/pull/374) ] 优化(rpcinfo)：RPCInfo.To().Tag() 优先使用服务发现的 instance tag 而不是 remoteinfo tag。
- [[#355](https://github.com/cloudwego/kitex/pull/355) ] 优化(连接池)：修改默认的连接池最小空闲等待时间为 2s。
- [[#354](https://github.com/cloudwego/kitex/pull/354) ] 优化(hook)：为 `onServerStart`和 `onShutdown`添加资源锁，当做一些如`RegisterStartHook`和 `server.Run`中的 `range`之类的读写操作时请求对应的资源锁。
- [[#331](https://github.com/cloudwego/kitex/pull/331) ] 优化(discovery)：增加「实例不存在」错误定义。

## Refactor

- [[#352](https://github.com/cloudwego/kitex/pull/352) ] 重构(event)：删除额外的原子操作并用普通赋值操作替换。
- [[#343](https://github.com/cloudwego/kitex/pull/343) ] 重构(loadbalancer)：将 buildWeightedVirtualNodes 函数合入 buildVirtualNodes 函数中，成为一个函数。

## Chore

- [[#376](https://github.com/cloudwego/kitex/pull/376) ] 升级依赖 choleraehyq/pid 以兼容Go 1.18。

## Docs

- [[#364](https://github.com/cloudwego/kitex/pull/364) ] 更新 README 到新博客的链接。
