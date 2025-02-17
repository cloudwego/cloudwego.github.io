---
title: "Hertz v0.9.0 版本发布"
linkTitle: "Release v0.9.0"
projects: ["Hertz"]
date: 2024-05-30
description: >
---

Hertz v0.9.0 版本中主要支持常规迭代与优化。

## Feature
1. [[#1101](https://github.com/cloudwego/hertz/pull/1101)] 增加一个方法能够放逐掉当前的 RequestContext（请求结束不入池）
2. [[#1056](https://github.com/cloudwego/hertz/pull/1056)] 为参数绑定提供更多的默认类型支持
3. [[#1057](https://github.com/cloudwego/hertz/pull/1057)] 当请求缺少Host短路时或者非法path时设置全局中间件

## Optimize
1. [[#921](https://github.com/cloudwego/hertz/pull/921)] 对路由进行严格排序，防止生成代码出现大量的 diff
2. [[#1037](https://github.com/cloudwego/hertz/pull/1037)] 在 trace 中过滤 shortConnErr 错误

## Fix
1. [[#1102](https://github.com/cloudwego/hertz/pull/1102)] 修复当使用 ResponseHeader.Set/Add 设置 Trailer 时，有可能会 panic 的问题
2. [[#1107](https://github.com/cloudwego/hertz/pull/1107)] 修复路由排序的失效问题

## Refactor
1. [[#1064](https://github.com/cloudwego/hertz/pull/1064)] 重构 client query 对于 enum 传递的配置形式
