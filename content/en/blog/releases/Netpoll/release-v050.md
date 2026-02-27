---
title: "Netpoll Release v0.5.0"
linkTitle: "Release v0.5.0"
projects: ["Netpoll"]
date: 2023-09-26
description: >
---

## Optimize

1. [[#274](https://github.com/cloudwego/netpoll/pull/274)] optimize: increase first bookSize to 8KB to reduce overhead for connection read at begin
2. [[#273](https://github.com/cloudwego/netpoll/pull/273)] optimize: ignore EOF when read a closed connection

## Fix

1. [[#283](https://github.com/cloudwego/netpoll/pull/283)] fix: protect operator dont be detach twice
2. [[#280](https://github.com/cloudwego/netpoll/pull/280)] fix: detach operator race
3. [[#278](https://github.com/cloudwego/netpoll/pull/278)] fix: OnRequest should wait all readable data consumed when sender close connection
4. [[#276](https://github.com/cloudwego/netpoll/pull/276)] fix: compile error by miss package
5. [[#238](https://github.com/cloudwego/netpoll/pull/238)] fix: close conn when server OnRequest panic

## Docs

1. [[#243](https://github.com/cloudwego/netpoll/pull/243)] docs: rm outdated info
