---
title: "Hertz Release v0.3.0"
linkTitle: "Release v0.3.0"
projects: ["Hertz"]
date: 2022-08-29
description: >
---

## Feature

- [[#182](https://github.com/cloudwego/hertz/pull/182)] feat: add service registration & service discovery & load balancing.
- [[#6]](https://github.com/hertz-contrib/registry/pull/6) feat: add zookeeper register.
- [[#7]](https://github.com/hertz-contrib/registry/pull/7) feat: add nacos registry.
- [[#8]](https://github.com/hertz-contrib/registry/pull/8) feat: Support Hertz to use Consul for service discovery and registration.
- [[#9]](https://github.com/hertz-contrib/registry/pull/9) feat: add polaris registry.
- [[#14]](https://github.com/hertz-contrib/registry/pull/14) feat: add etcd registry.
- [[#15]](https://github.com/hertz-contrib/registry/pull/15) feat: support servicecomb.
- [[#16]](https://github.com/hertz-contrib/registry/pull/16) feat: support service registration and discovery with Netflix Eureka.

## Refactor

- [[#175](https://github.com/cloudwego/hertz/pull/175)] refactor: distinguish between global dialer and local dialer.

## Optimize

- [[#205](https://github.com/cloudwego/hertz/pull/205)] optimize: func checkPathValid returns true if the path is valid.

## Test

- [[#174](https://github.com/cloudwego/hertz/pull/174)] test: correcting TestRouterMiddlewareAndStatic.

## Fix

- [[#190](https://github.com/cloudwego/hertz/pull/190)] fix: modify the same middleware name.
- [[#192](https://github.com/cloudwego/hertz/pull/192)] fix: fix the problem of the same package name in handler.
- [[#208](https://github.com/cloudwego/hertz/pull/208)] fix: deregister failed when service shutdown.
- [[#202](https://github.com/cloudwego/hertz/pull/202)] fix: get wrong local loopback IPv6.
- [[#196](https://github.com/cloudwego/hertz/pull/196)] fix: typo.
- [[#155](https://github.com/cloudwego/hertz/pull/155)] fix: name_style_thrift.
- [[#169](https://github.com/cloudwego/hertz/pull/169)] fix: thrift namespace.
- [[#184](https://github.com/cloudwego/hertz/pull/184)] fix: hijack conn throw timeout err when using standard network lib.
- [[#162](https://github.com/cloudwego/hertz/pull/162)] fix: generate router register error.

## Chore

- [[#189](https://github.com/cloudwego/hertz/pull/189)] Revert "fix: generate router register error".
- [[#203](https://github.com/cloudwego/hertz/pull/203)] add v6 support for AddMissingPort function.
- [[#186](https://github.com/cloudwego/hertz/pull/186)] chore: support codecov.
