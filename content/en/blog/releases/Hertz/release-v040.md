---
title: "Hertz Release v0.4.0"
linkTitle: "Release v0.4.0"
projects: ["Hertz"]
date: 2022-10-28
description: >
---

## Feature

- [[#289](https://github.com/cloudwego/hertz/pull/289)] feat: render support IndentedJSON.
- [[#304](https://github.com/cloudwego/hertz/pull/304)] feat: support errors format for the recovery middleware.
- [[#278](https://github.com/cloudwego/hertz/pull/278)] feat: add compile tag for json implementation.
- [[#239](https://github.com/cloudwego/hertz/pull/239)] feat: add retry extension for client.
- [[#265](https://github.com/cloudwego/hertz/pull/265)] feat: add closeNoResetBuffer method for standard network.
- [[#258](https://github.com/cloudwego/hertz/pull/258)] feat: errors support format.

## Optimize

- [[#295](https://github.com/cloudwego/hertz/pull/295)] optimize: ignore flushing error when connection is closed or reset.
- [[#322](https://github.com/cloudwego/hertz/pull/322)] optimize: modify the default log of the recovery middleware.
- [[#266](https://github.com/cloudwego/hertz/pull/266)] optimize(hlog): distinguish systemlogger and defaultlogger.
- [[#280](https://github.com/cloudwego/hertz/pull/280)] optimize: add listening log when using standard lib.

## Refactor

- [[#318](https://github.com/cloudwego/hertz/pull/318)] refactor: add SetRetryIf to remain compatible.

## Test

- [[#299](https://github.com/cloudwego/hertz/pull/299)] test: enrich ut for pkg/protocol/header.go.
- [[#290](https://github.com/cloudwego/hertz/pull/290)] test: enrich ut for pkg/app/server/option.go.
- [[#274](https://github.com/cloudwego/hertz/pull/274)] test: increase internal/bytesconv unit test statement coverage.
- [[#285](https://github.com/cloudwego/hertz/pull/285)] test: enrich unit tests for pkg/protocol/request.go.
- [[#271](https://github.com/cloudwego/hertz/pull/271)] test: ut supplementary for pkg/network.
- [[#264](https://github.com/cloudwego/hertz/pull/264)] test: add ut for hertz/pkg/common/adaptor.
- [[#267](https://github.com/cloudwego/hertz/pull/267)] test(pkg/common/config): pkg/common/config test coverage.

## Docs

- [[#328](https://github.com/cloudwego/hertz/pull/328)] docs: add lark extension to readme.md.
- [[#325](https://github.com/cloudwego/hertz/pull/325)] docs: update performance data in README and README_cn.
- [[#307](https://github.com/cloudwego/hertz/pull/307)] docs(README): add hertz extensions list.

## Style

- [[#316](https://github.com/cloudwego/hertz/pull/316)] style: remove empty comments for license.

## Chore

- [[#272](https://github.com/cloudwego/hertz/pull/272)] chore: upgrade sonic version.
- [[#310](https://github.com/cloudwego/hertz/pull/310)] chore: change license header style to avoid format error of buildtag from CI check.
