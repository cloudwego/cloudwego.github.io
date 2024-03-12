---
title: "Netpoll v0.5.0 版本发布"
linkTitle: "Release v0.5.0"
projects: ["Netpoll"]
date: 2023-09-26
description: >
---

## Optimize

1. [[#274](https://github.com/cloudwego/netpoll/pull/274)] optimize: 添加初始 bookSize 到 8KB 以减少连接最初读取时的开销
2. [[#273](https://github.com/cloudwego/netpoll/pull/273)] optimize: 当读取一个已经关闭连接时，忽略 EOF 错误

## Fix

1. [[#283](https://github.com/cloudwego/netpoll/pull/283)] fix: 保护 operator 不被 detach 两次
2. [[#280](https://github.com/cloudwego/netpoll/pull/280)] fix: 修复 detach operator race 问题
3. [[#278](https://github.com/cloudwego/netpoll/pull/278)] fix: OnRequest 应该等待所有 readable 数据都被消费完毕
4. [[#276](https://github.com/cloudwego/netpoll/pull/276)] fix: 缺少 import 库引入的编译错误
5. [[#238](https://github.com/cloudwego/netpoll/pull/238)] fix: 当 server 的 OnRequest panic 时，应该关闭连接

## Docs

1. [[#243](https://github.com/cloudwego/netpoll/pull/243)] docs: 移除过时信息
