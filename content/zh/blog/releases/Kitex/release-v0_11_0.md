---
title: "Kitex Release v0.11.0"
linkTitle: "Release v0.11.0"
projects: ["Kitex"]
date: 2024-09-12
description: >
---

> 建议直接升级 Kitex 版本到 v0.11.3, 因为我们对 v0.11.0 里的一些性能问题进行了优化

## **重要变更介绍**

### 新特性
1. **重试：新增混合重试功能**：支持同时开启「失败重试」+「Backup Request」两种策略，能够在降低长尾请求的同时提高请求的重试成功率，详见 [请求重试](/zh/docs/kitex/tutorials/service-governance/retry/)
2. **自定义 Payload 校验**：为避免硬件故障或数据篡改导致收发的数据不一致，Kitex 提供了对 Payload 报文的校验功能，并支持自定义扩展，使用方式参见: [payload 校验](/zh/docs/kitex/tutorials/advanced-feature/payload_validator/)

### 功能优化
1. **Frugal ARM 性能优化**：Frugal 支持了基于反射的高性能编解码，升级到 Frugal v0.2.0 即可
2. **Kitex Tool 代码生成提速**：提供了 `-rapid` 参数，可以无需安装 Thriftgo ，且速度略有提高。下个版本之后将作为默认行为。
3. **多 Service 多 Handler 生成**：从该版本开始，Kitex Tool 支持为每个 service 生成 handler 并统一注册到 server，详见 [多 Service 多 Handler 生成](/zh/docs/kitex/tutorials/advanced-feature/multi_service/multi_handler/)
4. **Streaming JSON 泛化[试用阶段]**：JSON 泛化调用支持了 streaming 流式接口（仅限 client），目前正在持续优化中，并未正式发布，有兴趣可以试用，详见 [Generic Streaming](/docs/kitex/tutorials/advanced-feature/generic-call/generic_streaming/)

### 其他
1. 支持版本 Go 1.18~1.23，最低支持变为 Go 1.18，如果你的 Go 版本过低，编译时会有提示：`note: module requires Go 1.18`
2. 逐步移除对 Apache Thrift 的依赖，将对 Thrift 编解码相关的逻辑逐步收敛到 github.com/cloudwego/gopkg/thrift 库中


## **详细变更**

### Feature:
[[#1509](https://github.com/cloudwego/kitex/pull/1509)] feat(retry): support Mixed Retry which integrating Failure Retry and Backup Request

[[#1478](https://github.com/cloudwego/kitex/pull/1478)] feat: customized payload validator

[[#1514](https://github.com/cloudwego/kitex/pull/1514)] feat(grpc): server returns cancel reason

[[#1513](https://github.com/cloudwego/kitex/pull/1513)] feat(tool): support updating import path for PkgInfo

[[#1425](https://github.com/cloudwego/kitex/pull/1425)] feat(tool): support generating multiple handlers for multiple services

[[#1491](https://github.com/cloudwego/kitex/pull/1491)] feat(grpc): add GetTrailerMetadataFromCtx

[[#1492](https://github.com/cloudwego/kitex/pull/1492)] feat: add GetCallee to kitexutil to get the service name of callee

[[#1479](https://github.com/cloudwego/kitex/pull/1479)] feat(tool): embed thriftgo into kitex tool

### Optimize:

[[#1485](https://github.com/cloudwego/kitex/pull/1485)] optimize: add cachekey to discovery event for debug

### Fix:

[[#1525](https://github.com/cloudwego/kitex/pull/1525)] fix: move json-iterator back to support marshal `map[any]any`

[[#1471](https://github.com/cloudwego/kitex/pull/1471)] fix(streaming): resolve ctx diverge in server-side streaming

[[#1515](https://github.com/cloudwego/kitex/pull/1515)] fix(gRPC): pass error when client transport is closed

[[#1501](https://github.com/cloudwego/kitex/pull/1501)] fix(generic): judge business error directly

[[#1503](https://github.com/cloudwego/kitex/pull/1503)] fix: return an unknown service/method exception to client correctly under multi_service server scenario

[[#1487](https://github.com/cloudwego/kitex/pull/1487)] fix(generic): fix a generic serviceInfo compatible issue

[[#1489](https://github.com/cloudwego/kitex/pull/1489)] fix(codec): wrap trans error for apache thrift read error

[[#1486](https://github.com/cloudwego/kitex/pull/1486)] fix(trans/netpoll): log when panic in onConnRead

[[#1476](https://github.com/cloudwego/kitex/pull/1476)] fix: fix GetServerConn interface assert for streamWithMiddleware

[[#1481](https://github.com/cloudwego/kitex/pull/1481)] fix(gonet): adjust gonet server read timeout to avoid read error

[[#1466](https://github.com/cloudwego/kitex/pull/1466)] fix: allow HEADERS frame with empty header block fragment

### Refactor:

[[#1512](https://github.com/cloudwego/kitex/pull/1512)] refactor: thrift and generic codec uses bufiox interface for encoding and decoding

[[#1490](https://github.com/cloudwego/kitex/pull/1490)] refactor: optimized apache codec without reflection

[[#1483](https://github.com/cloudwego/kitex/pull/1483)] refactor: use github.com/cloudwego/gopkg/protocol/thrift/apache

[[#1474](https://github.com/cloudwego/kitex/pull/1474)] refactor: rm apache thrift in internal/mocks

[[#1470](https://github.com/cloudwego/kitex/pull/1470)] refactor: rm apache thrift in pkg/generic & netpollmux

[[#1450](https://github.com/cloudwego/kitex/pull/1450)] refactor(generic): remove apache thrift.TProtocol from generic

[[#1441](https://github.com/cloudwego/kitex/pull/1441)] refactor: deprecate bthrift, use cloudwego/gopkg

[[#1455](https://github.com/cloudwego/kitex/pull/1455)] refactor(test): perf optimize and log loc correct

### Tests:

[[#1469](https://github.com/cloudwego/kitex/pull/1469)] test: replace judgement of mem stats of client finalizer by closed count check

### Perf:

[[#1527](https://github.com/cloudwego/kitex/pull/1527)] perf(grpc): bdp ping rate limit

[[#1511](https://github.com/cloudwego/kitex/pull/1511)] perf(thrift): encodeBasicThrift write logic didn't use kitex BinaryProtocol

[[#1504](https://github.com/cloudwego/kitex/pull/1504)] perf(grpc): zero allocation in hot path

[[#1497](https://github.com/cloudwego/kitex/pull/1497)] perf: add option to enable spancache for fastpb

[[#1495](https://github.com/cloudwego/kitex/pull/1495)] perf(thrift): use kitex BinaryProtocol replace apache BinaryProtocol for apache thrift codec

### Chore:

[[#1532](https://github.com/cloudwego/kitex/pull/1532)] chore: update dependency

[[#1522](https://github.com/cloudwego/kitex/pull/1522)] chore(generic): make generic streaming APIs internal

[[#1465](https://github.com/cloudwego/kitex/pull/1465)] chore(generic): add an external method to create service info for generic streaming client

[[#1468](https://github.com/cloudwego/kitex/pull/1468)] build: adapt to go1.23rc2

[[#1482](https://github.com/cloudwego/kitex/pull/1482)] chore(generic): add generic base using gopkg base

[[#1463](https://github.com/cloudwego/kitex/pull/1463)] chore: fix grpc keepalive test by start server responsiblly

[[#1462](https://github.com/cloudwego/kitex/pull/1462)] chore(test): fix xorshift64 in consist_test.go

[[#1454](https://github.com/cloudwego/kitex/pull/1454)] chore(ci): speed up multiple ci processes 8min -> 1min


