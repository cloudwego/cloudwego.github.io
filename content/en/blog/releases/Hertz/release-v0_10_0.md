---
title: "Hertz Release v0.10.0"
linkTitle: "Release v0.10.0"
projects: ["Hertz"]
date: 2025-05-21
description: >
---

The Hertz v0.10.0 release adds two features and some fixes.

1. Integrate SSE functionality. Refer to [SSE](/docs/hertz/tutorials/basic-feature/sse) for usage.
2. Added http.Handler adaptor, extending Hertz using the official net/http ecosystem. Refer to [Adaptor](/docs/hertz/tutorials/basic-feature/http-adaptor) for usage.

## Feature
1. [[#1327](https://github.com/cloudwego/hertz/pull/1327)] feat(adaptor): new HertzHandler for http.Handler
2. [[#1349](https://github.com/cloudwego/hertz/pull/1349)] feat(sse): SetLastEventID
3. [[#1343](https://github.com/cloudwego/hertz/pull/1343)] feat(sse): reader supports cancel stream
4. [[#1341](https://github.com/cloudwego/hertz/pull/1341)] feat(server): detect request race
5. [[#1339](https://github.com/cloudwego/hertz/pull/1339)] feat(sse): add LastEventID helpers
6. [[#1335](https://github.com/cloudwego/hertz/pull/1335)] feat(protocol): new sse pkg
7. [[#1322](https://github.com/cloudwego/hertz/pull/1322)] feat: std transport sense client connection close

## Fix
1. [[#1340](https://github.com/cloudwego/hertz/pull/1340)] fix: only use netpoll & sonic on amd64/arm64 linux/darwin
2. [[#1333](https://github.com/cloudwego/hertz/pull/1333)] fix(protocol): unexpected set resp.bodyStream
3. [[#1329](https://github.com/cloudwego/hertz/pull/1329)] fix(client): stream body for sse instead of timeout
4. [[#1332](https://github.com/cloudwego/hertz/pull/1332)] fix(server): Shutdown checks ExitWaitTimeout
5. [[#1316](https://github.com/cloudwego/hertz/pull/1316)] fix: prioritize custom validator

## Tests
1. [[#1336](https://github.com/cloudwego/hertz/pull/1336)] test(protocol): fix hardcoded listen addr

## Chore
1. [[#1353](https://github.com/cloudwego/hertz/pull/1353)] chore: update netpoll dependency
2. [[#1337](https://github.com/cloudwego/hertz/pull/1337)] chore(hz): update hz tool v0.9.7
3. [[#1328](https://github.com/cloudwego/hertz/pull/1328)] ci: disable codecov annotations
