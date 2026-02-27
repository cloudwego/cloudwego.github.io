---
title: "Kitex Release v0.0.4"
linkTitle: "Release v0.0.4"
projects: ["Kitex"]
date: 2021-08-26
description: >
---

## Improvement:

- Make transMetaHandler executed before customized boundHandlers to ensure the customized boundHandlers could get metainfo.
- TransError uses internal error typeID if exist.

## Bugfix:

- Not reset stats level when clear RPCInfo in netpollmux to fix metric missing bug when use netpollmux.
- Remove stale addresses in long pool.
- Add an EOF condition to eliminate a redundant warning.
- Modify error types check of service circuit breaker to fix the bug that fuse cannot be triggered.

## Tool:

- Adjust protobuf generated code of unary to support both Kitex Protobuf and gRPC.
- Upgrade version of thriftgo to fix golint style.
- Fix typo in thrift generated code.
- Fix a bug that streaming generated code missing transport option.

## Docs:

- Add Golang setup section and Golang version requirement
- Some docs are updated.
- Add some English documents.

## Dependency Change:

- Thriftgo: v0.0.2-0.20210726073420-0145861fcd04 -> v0.1.2
- Netpoll: v0.0.2 -> v0.0.3
