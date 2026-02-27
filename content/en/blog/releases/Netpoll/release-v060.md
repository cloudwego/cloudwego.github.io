---
title: "Netpoll Release v0.6.0"
linkTitle: "Release v0.6.0"
projects: ["Netpoll"]
date: 2024-03-04
description: >
---

## Feature

1. [[#306](https://github.com/cloudwego/netpoll/pull/306)] feat: lazy init pollers to avoid create any poller goroutines if netpoll is not used
2. [[#303](https://github.com/cloudwego/netpoll/pull/303)] feat: add WithOnDisconnect callback
3. [[#300](https://github.com/cloudwego/netpoll/pull/300)] feat: netpoll exception implement net.Error interface
4. [[#294](https://github.com/cloudwego/netpoll/pull/294)] feat: add SetRunner option

## Fix

1. [[#307](https://github.com/cloudwego/netpoll/pull/307)] fix: ctx race when disconnect callback run with connect callback
2. [[#304](https://github.com/cloudwego/netpoll/pull/304)] fix: connection leak when poller close connection but onRequest callback just finished
3. [[#296](https://github.com/cloudwego/netpoll/pull/296)] fix: stop timer when read triggered by err

## Chore

1. [[#302](https://github.com/cloudwego/netpoll/pull/302)] ci: bump the version of actions/checkout and actions/setup-go
