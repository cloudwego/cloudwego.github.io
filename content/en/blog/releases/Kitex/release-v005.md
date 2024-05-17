---
title: "Kitex Release v0.0.5"
linkTitle: "Release v0.0.5"
projects: ["Kitex"]
date: 2021-09-26
description: >
---

## Feature:

- Add default ErrorHandler to wrap remote error when no ErrorHandler is specified.
- Backward metainfo is supported.
- JSON generic call is supported. Usage guide: [link](/docs/kitex/tutorials/advanced-feature/generic-call/#4-json-mapping-generic-call).

## Improvement:

- Use new netpoll API to improve throughput and reduce latency for mux.
- Backward and forward metainfo is supported for mux.
- Client will use RPCTimeout middleware when necessary.
- Add validity verification of idle connection in ConnectionPool.
- QPS limiter token will be reset when QPS limit updates.
- Reduce the deviation of QPS Limiter.

## Bugfix:

- Fix WithExitWaitTime won't set exit wait time correctly.
- Fix goroutine leak when update interval of QPS limiter.
- Use actual listen address to build registry info.

## Tool:

- Fix code generating error when no stream method in protobuf file.

## Docs:

- English is available for README and all other documents.
- Guide for generic call. [English](/docs/kitex/tutorials/advanced-feature/generic-call) | [中文](/zh/docs/kitex/tutorials/advanced-feature/generic-call/)
- Landscape and Roadmap in README.

## Dependency Change:

- github.com/cloudwego/netpoll: v0.0.3 -> v0.0.4
- github.com/bytedance/gopkg: v0.0.0-20210709064845-3c00f9323f09 -> v0.0.0-20210910103821-e4efae9c17c3
