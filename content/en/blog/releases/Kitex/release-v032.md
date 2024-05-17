---
title: "Kitex Release v0.3.2"
linkTitle: "Release v0.3.2"
projects: ["Kitex"]
date: 2022-06-02
description: >
---

## Feature

- [[#473](https://github.com/cloudwego/kitex/pull/473)] feat(grpc): support short connection for gRPC unary.
- [[#431](https://github.com/cloudwego/kitex/pull/431)] feat(limiter): extend outside limiter implementation and fix problems of rate limiter of multiplexed server.

## Optimize

- [[#465](https://github.com/cloudwego/kitex/pull/465)] optimize(ttheader): set remote address for client-side after decoding TTHeader.
- [[#466](https://github.com/cloudwego/kitex/pull/466)] optimize(mux): wrap ErrReadTimeout with ErrRPCTimeout in mux scenario.
- [[#425](https://github.com/cloudwego/kitex/pull/425)] optimize(limiter): promise tokens of the first second don't exceed limit significantly.

## Bugfix

- [[#485](https://github.com/cloudwego/kitex/pull/485)] fix(grpc): fix the incorrect integer conversion.
- [[#474](https://github.com/cloudwego/kitex/pull/474)] fix(trans): fix detection handler panic when conn inactive early.
- [[#445](https://github.com/cloudwego/kitex/pull/445)] fix(retry): race problems of callTimes in retry and some fields of rpcStats.
- [[#471](https://github.com/cloudwego/kitex/pull/471)] fix(retry): callCosts race in backup request.

## Test

- [[#404](https://github.com/cloudwego/kitex/pull/404)] test: add unit test for pkg/retry.
- [[#439](https://github.com/cloudwego/kitex/pull/439), [#472](https://github.com/cloudwego/kitex/pull/472)] test: add unit test for pkg/remote/remotecli.
- [[#462](https://github.com/cloudwego/kitex/pull/462), [#457](https://github.com/cloudwego/kitex/pull/457)] test: add unit test for pkg/remote/trans/nphttp2/grpc.
- [[#420](https://github.com/cloudwego/kitex/pull/420)] test: add ut for pkg/remote/trans/nphttp2.

## Refactor

- [[#464](https://github.com/cloudwego/kitex/pull/464)] refactor(ttheader): change protocol id of Kitex Protobuf in TTHeader and promise the change is compatible with the old version.

## Chore

- [[#453](https://github.com/cloudwego/kitex/pull/453), [#475](https://github.com/cloudwego/kitex/pull/475)] chore: upgrade netpoll and bytedance/gopkg.
- [[#458](https://github.com/cloudwego/kitex/pull/458)] chore: fix ci reviewdog and pr ut didn't run.
- [[#454](https://github.com/cloudwego/kitex/pull/454)] chore: use self-hosted ci to optimize speed.
- [[#449](https://github.com/cloudwego/kitex/pull/449)] chore: fix github issue template.

## Style

- [[#486](https://github.com/cloudwego/kitex/pull/486)] style(trans): add comment for detection trans handler.

## Docs

- [[#482](https://github.com/cloudwego/kitex/pull/482)] docs: update FAQ of readme.

## Dependency Change

- github.com/cloudwego/netpoll: v0.2.2 -> v0.2.4
