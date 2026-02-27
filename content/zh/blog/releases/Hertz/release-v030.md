---
title: "Hertz v0.3.0 版本发布"
linkTitle: "Release v0.3.0"
projects: ["Hertz"]
date: 2022-08-29
description: >
---

## Feature

- [[#182](https://github.com/cloudwego/hertz/pull/182)] feat: 添加服务注册 & 服务发现 & 负载均衡。
- [[#6]](https://github.com/hertz-contrib/registry/pull/6) feat: 添加 zookeeper 服务注册与发现的扩展。
- [[#7]](https://github.com/hertz-contrib/registry/pull/7) feat: 添加 nacos 服务注册与发现的扩展。
- [[#8]](https://github.com/hertz-contrib/registry/pull/8) feat: 添加 Consul 服务注册与发现的扩展。
- [[#9]](https://github.com/hertz-contrib/registry/pull/9) feat: 添加 polaris 服务注册与发现的扩展。
- [[#14]](https://github.com/hertz-contrib/registry/pull/14) feat: 添加 etcd 服务注册与发现的扩展。
- [[#15]](https://github.com/hertz-contrib/registry/pull/15) feat: 添加 servicecomb 服务注册与发现的扩展。
- [[#16]](https://github.com/hertz-contrib/registry/pull/16) feat: 添加 eureka 服务注册与发现的扩展。

## Refactor

- [[#175](https://github.com/cloudwego/hertz/pull/175)] refactor: 区别全局默认 dialer 和 client 局部 dialer（指定了 dialer 的 client 不再受全局 dialer 改变而改变）修改全局 dialer 影响面较大，标记 deprecated，后续统一到 client 初始化时传参指定 dialer 方式修改局部 dialer，以及移除了功能完全被 dialer 覆盖的 dialFunc 扩展。

## Optimize

- [[#205](https://github.com/cloudwego/hertz/pull/205)] optimize: 更改默认返回值。

## Test

- [[#174](https://github.com/cloudwego/hertz/pull/174)] test: 修正 TestRouterMiddlewareAndStatic 单测。

## Fix

- [[#190](https://github.com/cloudwego/hertz/pull/190)] fix: 修改同名的路由组。
- [[#192](https://github.com/cloudwego/hertz/pull/192)] fix: 修复 handler 中的引用相同包名的问题，并把获取 unique 变量名的方法单独提出来。
- [[#208](https://github.com/cloudwego/hertz/pull/208)] fix: 当服务停止时修复取消注册失败。
- [[#202](https://github.com/cloudwego/hertz/pull/202)] fix: 获取到了错误的 IPv6 本地回环地址。
- [[#196](https://github.com/cloudwego/hertz/pull/196)] fix: 修复 typo。
- [[#155](https://github.com/cloudwego/hertz/pull/155)] fix: 修复thrift的命名方式，struct name 与 thriftgo 的 namestyle 保持一致。
- [[#169](https://github.com/cloudwego/hertz/pull/169)] fix: 修复 thrift 的 namespace 尾缀包含".thrift"的问题。
- [[#184](https://github.com/cloudwego/hertz/pull/184)] fix: 修复使用标准网络库劫持连接时的超时错误。
- [[#162](https://github.com/cloudwego/hertz/pull/162)] fix: 修复 IDL 中定义的路由最后一级为"/"时的报错。

## Chore

- [[#189](https://github.com/cloudwego/hertz/pull/189)] 回滚 [cloudwego/hertz#162](https://github.com/cloudwego/hertz/pull/162) 的修改。
- [[#203](https://github.com/cloudwego/hertz/pull/203)] AddMissingPort 函数增加对裸 v6 地址的处理。
- [[#186](https://github.com/cloudwego/hertz/pull/186)] 支持 codecov。
