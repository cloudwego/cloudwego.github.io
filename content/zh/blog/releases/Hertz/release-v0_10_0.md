---
title: "Hertz Release v0.10.0"
linkTitle: "Release v0.10.0"
projects: ["Hertz"]
date: 2025-05-21
description: >
---

Hertz v0.10.0 版本新增两项功能并修复了一些问题。

1. 集成 SSE 功能。使用方法请参阅 [SSE](/docs/hertz/tutorials/basic-feature/sse)。
2. 添加 http.Handler 适配器，使用官方 net/http 生态系统扩展 Hertz。使用方法请参阅 [Adaptor](/docs/hertz/tutorials/basic-feature/http-adaptor)。

## Feature
1. [[#1327](https://github.com/cloudwego/hertz/pull/1327)] feat(adaptor): 为 http.Handler 添加新的 HertzHandler
2. [[#1349](https://github.com/cloudwego/hertz/pull/1349)] feat(sse): SetLastEventID
3. [[#1343](https://github.com/cloudwego/hertz/pull/1343)] feat(sse): reader 支持取消流
4. [[#1341](https://github.com/cloudwego/hertz/pull/1341)] feat(server): 检测请求 race
5. [[#1339](https://github.com/cloudwego/hertz/pull/1339)] feat(sse): 添加 LastEventID helper
6. [[#1335](https://github.com/cloudwego/hertz/pull/1335)] feat(protocol): 新的 sse 包
7. [[#1322](https://github.com/cloudwego/hertz/pull/1322)] feat: server 使用标准 go net 传输时感知客户端连接关闭

## Fix
1. [[#1340](https://github.com/cloudwego/hertz/pull/1340)] fix:仅在 amd64/arm64 linux/darwin 上使用 netpoll 和 sonic
2. [[#1333](https://github.com/cloudwego/hertz/pull/1333)] fix(protocol): 非预期的设置 resp.bodyStream
3. [[#1329](https://github.com/cloudwego/hertz/pull/1329)] fix(client): sse 场景下自动切换为 stream body 模式
4. [[#1332](https://github.com/cloudwego/hertz/pull/1332)] fix(server): server 关闭时检查 ExitWaitTimeout
5. [[#1316](https://github.com/cloudwego/hertz/pull/1316)] fix: 优先使用自定义 validator

## Tests
1. [[#1336](https://github.com/cloudwego/hertz/pull/1336)] test(protocol): 修复硬编码的监听地址

## Chore
1. [[#1353](https://github.com/cloudwego/hertz/pull/1353)] chore：更新 netpoll 依赖
2. [[#1337](https://github.com/cloudwego/hertz/pull/1337)] chore(hz): 更新 hz 工具 v0.9.7
3. [[#1328](https://github.com/cloudwego/hertz/pull/1328)] ci: 禁用 codecov 注释
