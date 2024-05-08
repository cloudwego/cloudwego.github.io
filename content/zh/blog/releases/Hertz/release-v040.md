---
title: "Hertz v0.4.0 版本发布"
linkTitle: "Release v0.4.0"
projects: ["Hertz"]
date: 2022-10-28
description: >
---

## Feature

- [[#289](https://github.com/cloudwego/hertz/pull/289)] feat: render 支持 IndentedJSON。
- [[#304](https://github.com/cloudwego/hertz/pull/304)] feat: recovery 中间件支持用户自定义错误输出格式。
- [[#278](https://github.com/cloudwego/hertz/pull/278)] feat: 增加编译 tag 控制实际使用的 json 库。
- [[#239](https://github.com/cloudwego/hertz/pull/239)] feat: 给 client 扩展复杂重试能力。
- [[#265](https://github.com/cloudwego/hertz/pull/265)] feat: 在标准网络库扩展上添加 CloseNoResetBuffer 方法。
- [[#258](https://github.com/cloudwego/hertz/pull/258)] feat: 支持 `errors` 的格式化。

## Optimize

- [[#295](https://github.com/cloudwego/hertz/pull/295)] optimize: 服务端忽略客户端主动断连的写错误。
- [[#322](https://github.com/cloudwego/hertz/pull/322)] optimize: 修改 recovery 中间件的默认日志。
- [[#266](https://github.com/cloudwego/hertz/pull/266)] optimize(hlog): 区分系统日志和默认日志，提供更自由的 logger 定制化能力。
- [[#280](https://github.com/cloudwego/hertz/pull/280)] optimize: 使用标准库时 listen 前添加日志。

## Refactor

- [[#318](https://github.com/cloudwego/hertz/pull/318)] refactor: 添加 SetRetryIf 保持兼容。

## Test

- [[#299](https://github.com/cloudwego/hertz/pull/299)] test: 提高对 `hertz/pkg/protocol/header` 的单测覆盖率。
- [[#290](https://github.com/cloudwego/hertz/pull/290)] test: 为 `pkg/app/server/option.go` 补充单元测试。
- [[#274](https://github.com/cloudwego/hertz/pull/274)] test: 增加 internal/bytesconv 包测试覆盖率，覆盖率从 1.68% 提高到了 82.35%。
- [[#285](https://github.com/cloudwego/hertz/pull/285)] test: 给 `pkg/protocol/request.go` 文件单测覆盖率 51.31% 提高到 85.3%。
- [[#271](https://github.com/cloudwego/hertz/pull/271)] test: 为 `pkg/network` 补充单元测试。
- [[#264](https://github.com/cloudwego/hertz/pull/264)] test: 增加对 `hertz/pkg/common/adaptor` 的单测，覆盖率从 76.6% 提高到了 92.3%。
- [[#267](https://github.com/cloudwego/hertz/pull/267)] test(pkg/common/config): 增加 pkg/common/config 包测试覆盖率。

## Docs

- [[#328](https://github.com/cloudwego/hertz/pull/328)] docs: 添加 lark 扩展到 readme.md。
- [[#325](https://github.com/cloudwego/hertz/pull/325)] docs: 更新 README 和 README_cn 的性能数据。
- [[#307](https://github.com/cloudwego/hertz/pull/307)] docs(README): 将 Hertz 扩展添加到 readme 列表中。

## Style

- [[#316](https://github.com/cloudwego/hertz/pull/316)] style: 去掉 license 顶层的空注释。

## Chore

- [[#272](https://github.com/cloudwego/hertz/pull/272)] chore: 更新 sonic 版本。
- [[#310](https://github.com/cloudwego/hertz/pull/310)] chore: 修改注释信息为行注释避免 buildtag 格式问题的导致 ci 报错。
