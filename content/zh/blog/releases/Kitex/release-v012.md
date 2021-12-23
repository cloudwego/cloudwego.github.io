---
title: "Kitex v0.1.2 版本发布"
linkTitle: "Release v0.1.2"
date: 2021-12-22
description: >

---

## Hotfix

* 回滚 gRPC client 连接池优化的变更
* 通过 client 连接池来优化 gRPC 的性能
* 回滚 gRPC 编解码时 buffer 回收的优化
* 修复 IDL 中未定义 package 时，gRPC 的方法信息错误问题

## 依赖更新

* 更新 netpoll-http2 依赖，解决 streaming 场景下大包（>4K）请求报错的问题

## 杂项

* 使用 GitHub 的 PR 模板，强制开发者提交 PR 时填写相关描述
