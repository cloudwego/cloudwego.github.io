---
title: "Kitex v0.2.0 版本发布"
linkTitle: "Release v0.2.0"
projects: ["Kitex"]
date: 2022-02-24
description: >
---

## Feature

- Feat(grpc): gRPC 相关配置支持通过 options 来设置，并且为了兼容旧版本默认窗口大小调整为 64K
- Feat(kerror): 为 basicError 添加新的 error 封装 func WithCauseAndExtraMsg
- Feat(rpcinfo): 添加 FreezeRPCInfo 以支持异步 context 使用
- Feat(codec): 默认编解码器支持限定包体积大小

## Bugfix

- Fix(remotecli): 修复重置的连接可能被复用的问题
- Fix(generic): 修复泛化调用的客户端不能使用继承的 service 的方法的问题
- Fix(generic): 修复泛化调用 client 侧判断 Oneway 不准确的问题

## Optimise

- Optimize(retry): 提高异常重试的重试成功率
  > 如果超时的请求先于重试的请求返回，可能会导致重试请求也失败；同时也可以避免超时请求不必要的解码处理。

## Chore

- Chore: 升级 netpoll 的版本至 v0.2.0
- Chore: 添加第三方库的license
