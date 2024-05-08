---
title: "Kitex Release v0.2.1"
linkTitle: "Release v0.2.1"
projects: ["Kitex"]
date: 2022-03-24
description: >
---

## Bugfix

- [[#383](https://github.com/cloudwego/kitex/pull/383) ] fix(generic): detect circular dependency in thrift IDL when using generic call.
- [[#359](https://github.com/cloudwego/kitex/pull/359) ] fix(tool): fix streaming import missing in protobuf combine service.
- [[#363](https://github.com/cloudwego/kitex/pull/363) ] fix(client): fix a bug that sequence ID of oneway requests are not encoded and lower the loss rate of oneway requests.
- [[#367](https://github.com/cloudwego/kitex/pull/367) ] fix(generic/tool): combine services may have duplicate loading of the same service.

## Optimise

- [[#362](https://github.com/cloudwego/kitex/pull/362) ] optimize(diagnosis): lbcache is global, it doesn't need register ProbeFunc for diagnosis.
- [[#374](https://github.com/cloudwego/kitex/pull/374) ] optimize(rpcinfo): RPCInfo.To().Tag() use instance tag instead of remoteinfo tag firstly.
- [[#355](https://github.com/cloudwego/kitex/pull/355) ] optimize(connpool): adjust minMaxIdleTimeout to 2s.
- [[#354](https://github.com/cloudwego/kitex/pull/354) ] optimize(hook): adding locks to onServerStart and onShutdown, acquire the corresponding lock when doing some read and write operations like RegisterStartHook and range in server.Run().
- [[#331](https://github.com/cloudwego/kitex/pull/331) ] optimize(discovery): add error definition ErrInstanceNotFound which is used in the service discovery module.

## Refactor

- [[#352](https://github.com/cloudwego/kitex/pull/352) ] refactor(event): delete additional atomic operations and replace them with a normal operation.
- [[#343](https://github.com/cloudwego/kitex/pull/343) ] refactor(loadbalancer): merge BuildWeightedVirtualNodes function into buildVirtualNodes function, make it easier to maintain.

## Chore

- [[#376](https://github.com/cloudwego/kitex/pull/376) ] chore: upgrade choleraehyq/pid for Go 1.18.

## Docs

- [[#364](https://github.com/cloudwego/kitex/pull/364) ] docs: update readme with new blog.
