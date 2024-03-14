---
title: "Netpoll v0.6.0 版本发布"
linkTitle: "Release v0.6.0"
projects: ["Netpoll"]
date: 2024-03-04
description: >
---

## Feature

1. [[#306](https://github.com/cloudwego/netpoll/pull/306)] feat: 懒加载 pollers 以避免在 netpoll 没有被使用时，创建任何 poller goroutines
2. [[#303](https://github.com/cloudwego/netpoll/pull/303)] feat: 支持 WithOnDisconnect 回调
3. [[#300](https://github.com/cloudwego/netpoll/pull/300)] feat: netpoll exception 实现 net.Error 接口
4. [[#294](https://github.com/cloudwego/netpoll/pull/294)] feat: netpoll 支持 SetRunner 参数

## Fix

1. [[#307](https://github.com/cloudwego/netpoll/pull/307)] fix: 修复当 disconnect 与 connect 回调同时运行时，访问 ctx race 的问题
2. [[#304](https://github.com/cloudwego/netpoll/pull/304)] fix: 当对端关闭连接但是 OnRequest 回调刚刚返回时，连接可能泄漏的问题
3. [[#296](https://github.com/cloudwego/netpoll/pull/296)] fix: 当 readtrigger 被 error 触发时候，停止 timer

## Chore

1. [[#302](https://github.com/cloudwego/netpoll/pull/302)] ci: 升级 `actions/checkout` 和 `actions/setup-go` 的版本
