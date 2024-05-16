---
title: "Hertz v0.3.2 版本发布"
linkTitle: "Release v0.3.2"
projects: ["Hertz"]
date: 2022-09-20
description: >
---

## Feature

- [[#198](https://github.com/cloudwego/hertz/pull/198)] feat: 添加获取 Hertz client dialer 名称的方法。
- [[#251](https://github.com/cloudwego/hertz/pull/251)] feat: Hertz server 启动日志添加网络库的名称。

## Refactor

- [[#238](https://github.com/cloudwego/hertz/pull/238)] refactor: 重构 Hertz client 初始化 HostClient 和 TLSHostClient 的逻辑。

## Optimize

- [[#226](https://github.com/cloudwego/hertz/pull/226)] optimize: 使用 "warning" 日志提示非法的 http 状态码。

## Fix

- [[#249](https://github.com/cloudwego/hertz/pull/249)] fix: 修复 Hertz server 优雅退出时无法执行完全部 hook 函数的问题。
- [[#232](https://github.com/cloudwego/hertz/pull/232)] fix: 修复路由尾斜线重定向在边缘情况失效的问题。

## Chore

- [[#217](https://github.com/cloudwego/hertz/pull/217)] chore: 更新提交 PR 时的填写模板。
