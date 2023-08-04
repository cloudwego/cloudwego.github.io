---
title: "Netpoll v0.2.0 版本发布"
linkTitle: "Release v0.2.0"
projects: []
date: 2022-02-22
description: >

---

## Improvement

* Feat: 添加 OnConnect 回调
* Feat: 新增 Until API
* Feat: 支持不带 timeout 的 dial

## Fix

* Fix: 修复当只设置了 onConnect 回调时，不会触发 close callback 的 bug
* Fix: 添加最大节点限制，避免异常情况下的 OOM 问题
* Fix: 修复 reset operator 时，没有 reset OnWrite 的问题
* Fix: 修复连接关闭时，写 panic 的问题
* Fix: 修复单测失败问题

## Chore

* docs: 更新 readme
