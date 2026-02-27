---
title: "Kitex Release v0.7.2"
linkTitle: "Release v0.7.2"
projects: ["Kitex"]
date: 2023-09-27
description: >
---

## **Introduction to Key Changes**

### Features

**1. Retry: limit perncetage of retry requests**

The feature improves the usability of backup requests: if a request exceeds the retry delay threshold, a backup request will be sent; but if the request succeeds within the timeout threshold, it will not be treated as an error. Therefore large amount of backup requests may be sent due to a network jitter, which increases the pressure on the server and could even cause an avanlache.

It's recommended to update your current implementation:

1. Initialize a RetryContainer with `retry.NewRetryContainerWithPercentageLimit()` to limit the percentage of retry requests;
2. Add an option `client.WithCloseCallbacks(container.Close)` when initializing a client, in order to release relevant resources when the client is recycled.

### Optimizations

**1. gRPC**

- Send END_STREAM flag in unary call
- Fix grpc streaming tps decreasing and the selection logic of compressor

**2. Long Connection Pool**

If `MaxIdleGlobal` is not set, it is not limited by default, simplifying the configuration of long connection pools.

### Miscellaneous

- Upgrade netpoll to [v0.5.0](https://github.com/cloudwego/netpoll/releases/tag/v0.5.0)
- Upgrade frugal to [v0.1.8](https://github.com/cloudwego/frugal/releases/tag/v0.1.8), enable frugal when compiled on go1.21 (note: old versions of frugal are not adapted to go1.21)

---

## Full Release Log

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
