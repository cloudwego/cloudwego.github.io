---
title: "Kitex v0.3.2 版本发布"
linkTitle: "Release v0.3.2"
projects: ["Kitex"]
date: 2022-06-02
description: >
---

## Feature

- [[#473](https://github.com/cloudwego/kitex/pull/473)] 功能 (grpc): 为 Kitex gRPC unary 模式增加短连接功能。
- [[#431](https://github.com/cloudwego/kitex/pull/431)] 功能 (limiter):
  1. 支持自定义的限流实现，接口增加了请求参数的传递；
  2. 修复多路复用场景下 Server 的 QPS 限流器问题，添加基于 OnMessage 的限流；
  3. 调整默认的限流生效时机，只有使用框架 QPS 限流且非多路复用的场景下，才使用基于 OnRead 的限流。

## Optimize

- [[#465](https://github.com/cloudwego/kitex/pull/465)] 优化 (ttheader): Client 端在 TTHeader 解码结束后赋值 Remote Address (用于 Proxy 场景请求失败时获取对端地址)。
- [[#466](https://github.com/cloudwego/kitex/pull/466)] 优化 (mux): 连接多路复用场景的 ErrReadTimeout 用 ErrRPCTimeout 封装返回。Proxy 场景请求失败时获取对端地址)。
- [[#425](https://github.com/cloudwego/kitex/pull/425)] 优化 (limiter): 优化限流实现，保证第一秒的 Tokens 不会大幅超过限制。

## Bugfix

- [[#485](https://github.com/cloudwego/kitex/pull/485)] 修复 (grpc): 修复 grpc 内不恰当的 int 类型转换。
- [[#474](https://github.com/cloudwego/kitex/pull/474)] 修复 (trans): 在 detection handler 中增加检测。当 OnInactive 比 OnActive 先发生，或者 OnActive 返回 error 时，防止空指针 panic。
- [[#445](https://github.com/cloudwego/kitex/pull/445)] 修复 (retry):
  1. 修复重试中 `callTimes` 字段的 race 问题；
  2. 修复 `rpcStats` 中一些字段的 race 问题。
- [[#471](https://github.com/cloudwego/kitex/pull/471)] 修复 (retry): 修复在 backup request 中的一个 race 问题。

## Test

- [[#404](https://github.com/cloudwego/kitex/pull/404)] test: 增加 pkg/retry 的单测。
- [[#439](https://github.com/cloudwego/kitex/pull/439), [#472](https://github.com/cloudwego/kitex/pull/472)] test: 增加 pkg/remote/remotecli 的单测。
- [[#462](https://github.com/cloudwego/kitex/pull/462), [#457](https://github.com/cloudwego/kitex/pull/457)] test: 增加 pkg/remote/trans/nphttp2/grpc 的单测。
- [[#420](https://github.com/cloudwego/kitex/pull/420)] test: 增加 pkg/remote/trans/nphttp2 的单测。

## Refactor

- [[#464](https://github.com/cloudwego/kitex/pull/464)] refactor (ttheader): 修改 Kitex Protobuf 在 TTHeader 中的 protocolID，同时保证该变更与低版本的兼容性。

## Chore

- [[#453](https://github.com/cloudwego/kitex/pull/453), [#475](https://github.com/cloudwego/kitex/pull/475)] chore: 更新 netpoll 和 bytedance/gopkg 的版本。
- [[#458](https://github.com/cloudwego/kitex/pull/458)] chore: 修复了 reviewdog 失效的问题与 fork pr 单测的问题。
- [[#454](https://github.com/cloudwego/kitex/pull/454)] chore: 现在的 CI 受限于 github runner 的性能经常会失败，尝试改成 self-hosted runner 来提升性能。
- [[#449](https://github.com/cloudwego/kitex/pull/449)] chore: 更新 issue template，修改为更适合 Kitex 项目的问题模板。

## Style

- [[#486](https://github.com/cloudwego/kitex/pull/486)] style (trans): 为 detection trans handler 增加注释信息。

## Docs

- [[#482](https://github.com/cloudwego/kitex/pull/482)] docs: 在 Readme 中增加 FAQ 链接。

## Dependency Change

- github.com/cloudwego/netpoll: v0.2.2 -> v0.2.4
