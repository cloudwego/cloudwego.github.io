---
title: "Netpoll v0.2.2 版本发布"
linkTitle: "Release v0.2.2"
date: 2022-04-28
description: >

---

## Improvement

* Fix: Loops 缩容不再全部重置
* Chore: mcache bsr 计算使用 math/bits.Len 代替，以提升性能。
* Feat: 修复 LinkBuffer Close 时没有回收 caches 的问题（不是内存泄漏）

## Fix

* Fix: 修复短链接 send&close 场景无法触发 OnRequest 回调的问题
* Fix: 修复 zcReader 读到 io.EOF 后丢失部分数据的问题
* Fix: 修复 flush 没有检查连接关闭的问题

## Doc

* Doc: 更新了用户文档
* Doc: 增加了 Reader.Slice 的定义描述
* Doc: 修复了 examples 中的死链

## Revert

* Revert: 重置了 loops 初始化数量

