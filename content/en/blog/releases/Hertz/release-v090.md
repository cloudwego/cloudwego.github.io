---
title: "Hertz Release v0.9.0"
linkTitle: "Release v0.9.0"
projects: ["Hertz"]
date: 2024-05-30
description: >
---

The Hertz v0.9.0 release mainly supports general iteration and optimization.

## Feature
1. [[#1101](https://github.com/cloudwego/hertz/pull/1101)] feat: add method to exile requestContext
2. [[#1056](https://github.com/cloudwego/hertz/pull/1056)] feat: add more default type for binding
3. [[#1057](https://github.com/cloudwego/hertz/pull/1057)] feat: add SetHandlers when fast fail for no valid host and invalid rPath

## Optimize
1. [[#921](https://github.com/cloudwego/hertz/pull/921)] optimize(hz): sort route strictly which preventing sorting inconsistencies
2. [[#1037](https://github.com/cloudwego/hertz/pull/1037)] optimize: filter shortConnErr in tracer

## Fix
1. [[#1102](https://github.com/cloudwego/hertz/pull/1102)] fix: resp set trailer will panic
2. [[#1107](https://github.com/cloudwego/hertz/pull/1107)] fix: router sort

## Refactor
1. [[#1064](https://github.com/cloudwego/hertz/pull/1064)] refactor(hz): client query enum
