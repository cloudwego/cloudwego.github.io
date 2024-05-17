---
title: "Volo v0.2.0 版本发布"
linkTitle: "Release v0.2.0"
projects: ["Volo"]
date: 2022-10-18
description: >
---

## Feature

- [[#31](https://github.com/cloudwego/volo/pull/31)] 支持 Windows。
- [[#26](https://github.com/cloudwego/volo/pull/26)] volo-grpc 增加对 service discovery 和 load balance 的支持。
- [[#45](https://github.com/cloudwego/volo/pull/45)] volo-grpc 支持 uds。
- [[#32](https://github.com/cloudwego/volo/pull/32)] volo-grpc 支持 metainfo 进行元信息传递。
- [[#30](https://github.com/cloudwego/volo/pull/30)] volo-grpc Server 增加 `layer_front` 方法。
- [[#42](https://github.com/cloudwego/volo/pull/42)] volo-thrift 支持 multiplex。

## Optimize

- [[#53](https://github.com/cloudwego/volo/pull/53)] 优化 `write_field_begin` 函数。

## Fix

- [[#34](https://github.com/cloudwego/volo/pull/34)] 修复连接超时设置。
- [[#46](https://github.com/cloudwego/volo/pull/46)] 增加对可重试错误的判断。
- [[#33](https://github.com/cloudwego/volo/pull/33)] volo-grpc 修复对 Error 类型的约束。
