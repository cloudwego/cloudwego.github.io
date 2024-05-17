---
title: "Kitex v0.1.3 版本发布"
linkTitle: "Release v0.1.3"
projects: ["Kitex"]
date: 2021-12-30
description: >
---

## 功能优化

- JSON 泛化调用场景，向服务端传递 Base 信息，从而服务端可获取 Caller 等信息

## Bug 修复

- 修复 streaming 的 metric 上报（server侧）丢失 method 信息的问题
- 修复 JSON 和 HTTP 泛化中 base64 和 binary 的不兼容改动
- 修复 gRPC 流控相关的问题，该问题会导致 client 侧出现持续超时

## CI

- 增加场景测试

## Chore

- 更新了 [ROADMAP](https://github.com/cloudwego/kitex/blob/develop/ROADMAP.md)
