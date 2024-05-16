---
title: "Kitex v0.7.2 版本发布"
linkTitle: "Release v0.7.2"
projects: ["Kitex"]
date: 2023-09-27
description: >
---

## 重要变更介绍

### 功能

**1. 重试: 限制重试请求占比**

该特性优化了备用请求的可用性：如某个请求超过重试等待时间，会触发一个备用请求，但如果该请求在RPC超时阈值之内，最终可以正常处理，因而不会被当做失败请求，这会在偶发网络异常时导致大量重试请求，增加服务端压力甚至引起雪崩。

建议更新现有代码：

1. 使用 `retry.NewRetryContainerWithPercentageLimit()` 来构造 RetryContainer，限制重试请求占比；
2. 在 Client 初始化时添加选项 `client.WithCloseCallbacks(container.Close)`，以便在 client 被回收时释放相关资源。

### 优化

**1. gRPC**

- unary 请求发送 END_STREAM flag
- 修复 grpc streaming 吞吐下降与压缩器选择逻辑

**2. 长连接池**

如果没有指定 `MaxIdleGlobal` 则默认不限制，简化长连接池的使用配置。

### 其他

- 更新 netpoll 至 [v0.5.0](https://github.com/cloudwego/netpoll/releases/tag/v0.5.0)
- 升级 frugal 到 [v0.1.8](https://github.com/cloudwego/frugal/releases/tag/v0.1.8)，支持在 go1.21 编译时使用 frugal (注: frugal 旧版本不支持 go1.21)

---

## 详细变更

### Feature:

- [[#1117](https://github.com/cloudwego/kitex/pull/1117)] feat(retry): support retry percentage limit

### Optimize:

- [[#1033](https://github.com/cloudwego/kitex/pull/1033)] optimize: no need to check svcInfo twice
- [[#1115](https://github.com/cloudwego/kitex/pull/1115)] optimize: rm outdated framed suggestion
- [[#1095](https://github.com/cloudwego/kitex/pull/1095)] optimize: add K_METHOD in serviceinline ctx
- [[#1107](https://github.com/cloudwego/kitex/pull/1107)] optimize(connpool): set maxIdleGlobal to no limit if not set

### Fix:

- [[#1116](https://github.com/cloudwego/kitex/pull/1116)] fix: use the last rpcinfo to trace
- [[#1104](https://github.com/cloudwego/kitex/pull/1104)] fix: move limiter handler to the last of the inbound handler to get rpcinfo in custom limiter
- [[#1103](https://github.com/cloudwego/kitex/pull/1103)] fix: reset all fields of netpoll byte buffer when recycle it
- [[#1106](https://github.com/cloudwego/kitex/pull/1106)] fix(grpc): fix grpc streaming tps decreasing and the selection logic of compressor
- [[#1114](https://github.com/cloudwego/kitex/pull/1114)] fix(gRPC): client send END_STREAM flag in unary call (#1066)
- [[#1096](https://github.com/cloudwego/kitex/pull/1096)] fix(tool): add backquote to handle filepath string invalid syntax under windows os
- [[#1098](https://github.com/cloudwego/kitex/pull/1098)] fix(tool): fix import for codegen template when using slim and unknown fields

### Tests:

- [[#1124](https://github.com/cloudwego/kitex/pull/1124)] test: fix codegen script
- [[#1122](https://github.com/cloudwego/kitex/pull/1122)] test: add codegen test
- [[#1119](https://github.com/cloudwego/kitex/pull/1119)] test(connpool): modify the idleTimeout

## Chore:

- [[#1133](https://github.com/cloudwego/kitex/pull/1133)] chore: update version v0.7.2
- [[#1125](https://github.com/cloudwego/kitex/pull/1125)] chore: upgrade netpoll to v0.5.0
- [[#1123](https://github.com/cloudwego/kitex/pull/1123)] perf: replace concurrent string builder with lock
- [[#1118](https://github.com/cloudwego/kitex/pull/1118)] perf: optimize remote addr setter interface to reduce lock cost of Address()
- [[#1110](https://github.com/cloudwego/kitex/pull/1110)] chore: upgrade netpoll to v0.4.2 pre-release
- [[#1061](https://github.com/cloudwego/kitex/pull/1061)] chore: netpoll pre release v0.4.2
- [[#1100](https://github.com/cloudwego/kitex/pull/1100)] chore: enable frugal on go1.21
