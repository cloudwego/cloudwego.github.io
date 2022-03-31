---
title: "Kitex v0.2.1 版本发布"
linkTitle: "Release v0.2.1"
date: 2022-03-24
description: >

---

## Bugfix

* 在泛化调用的时候检查 IDL 是否有循环依赖。
* 修复 protobuf CombineService 缺失 streaming 引用的问题。
* 修复 oneway 请求的 sequence ID 没有被编码的问题以及降低 oneway 调用的丢包率。
* 修复 CombineServices 可能存在多次加载同一个 service 问题。

## Optimise

* 优化：lbcaches 是全局的，无需为每个 client 注册 ProbeFunc 用于诊断查询。
* 优化：优先使用服务发现的 instance tag 而不是remoteinfo tag。
* 优化(连接池)：修改默认的连接池最小空闲等待时间为 2s。
* 为 `onServerStart`和 `onShutdown`添加资源锁，当做一些如`RegisterStartHook`和 `server.Run`中的 `range`之类的读写操作时请求对应的资源锁。
* 定义「实例不存在」错误

## Refactor

* 删除额外的原子操作并用普通赋值操作替换。
* 将 buildWeightedVirtualNodes 函数合入 buildVirtualNodes 函数中，成为一个函数。

## Chore

* README 增加新博客的链接
* 升级依赖 choleraehyq/pid 以兼容Go 1.18
