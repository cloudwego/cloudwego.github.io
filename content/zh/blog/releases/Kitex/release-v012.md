---
title: "Kitex v0.1.2 版本发布"
linkTitle: "Release v0.1.2"
projects: ["Kitex"]
date: 2021-12-22
description: >
---

## Hotfix

- 修复 v0.1.0 gRPC 请求优化引入的部分问题
- 修复 IDL 中未定义 package 时，gRPC 的方法信息错误问题

## 依赖更新

- 更新 netpoll-http2 依赖，解决 streaming 场景下大包（>4K）请求报错的问题

## 杂项

- 使用 GitHub 的 PR 模板，强制开发者提交 PR 时填写相关描述
