---
title: "Kitex Release v0.11.0"
linkTitle: "Release v0.11.0"
projects: ["Kitex"]
date: 2024-09-12
description: >
---

> Highly recommend upgrading Kitex version to v0.11.3 or higher, because there's some bugfix on v0.11.0.

## **Introduction to Key Changes**

### New Feature
1. **Mixed Retry**: Supports enabling both "Failure Retry" and "Backup Request" strategies simultaneously, which can reduce tail requests while increasing the success rate of retries, for more detail: [Retry](/docs/kitex/tutorials/service-governance/retry/)
2. **Custom Payload Validation**: To avoid inconsistencies in data transmission caused by hardware failures or data tampering, Kitex provides validation functionality for payload messages and supports custom extensions. For usage: [Payload Validator](/docs/kitex/tutorials/advanced-feature/payload_validator/).

### Feature optimization
1. **Frugal ARM Optimization**: Frugal v0.2.0 now supports a new implement by reflection
2. **Kitex Tool Improvement**: Kitex Tool provide a new param `-rapid` to integrates Thriftgo and there's a slightly improved speed.
3. **Generating Multiple Handlers for Multiple Services**：Since this version, Kitex tool provide each service with independent handler file and register them into server，for more details: [Generating Multiple Handlers for Multiple Services](/docs/kitex/tutorials/advanced-feature/multi_service/multi_handler/)
4. **Generic Streaming for JSON [on trial]**：JSON generic streaming has now support streaming (client only)，currently we're doing some optimization, you can have a try by following this doc: [Generic Streaming](/docs/kitex/tutorials/advanced-feature/generic-call/generic_streaming/)


### Others
1. Support Go 1.18~1.23. Minimum support for Golang 1.18，if your golang version is lower than 1.18, you'll see `note: module requires Go 1.18` when you compile.
2. Remove Apache Thrift，and refactor all related interface into github.com/cloudwego/gopkg/thrift.

## **Full Release Log**

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


