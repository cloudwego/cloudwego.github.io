---
title: "Kitex Release v0.2.1"
linkTitle: "Release v0.2.1"
date: 2022-03-24
description: >

---

## Bugfix

* Fix(generic): detect circular dependency in thrift IDL when using generic call.
* Fix(tool): fix streaming import missing in protobuf combine service.
* Fix(client): fix a bug that sequence ID of oneway requests are not encoded and lower the loss rate of oneway requests.
* Fix(generic/tool): combine services may have duplicate loading of the same service.

## Optimise

* Optimize(diagnosis): lbcache is global, it doesn't need register ProbeFunc for diagnosis.
* Optimize(rpcinfo): RPCInfo.To().Tag() use instance tag instead of remoteinfo tag firstly.
* Optimize(connpool): adjust minMaxIdleTimeout to 2s.
* Optimize(hook): adding locks to onServerStart and onShutdown, acquire the corresponding lock when doing some read and write operations like RegisterStartHook and range in server.Run().
* Optimize(discovery): add error definition ErrInstanceNotFound which is used in the service discovery module.

## Refactor

* Refactor(event): delete additional atomic operations and replace them with a normal operation.
* Refactor(loadbalancer): merge BuildWeightedVirtualNodes function into buildVirtualNodes function, make it easier to maintain.

## Chore

* Docs: update readme with new blog.
* Chore: upgrade choleraehyq/pid for Go 1.18.
