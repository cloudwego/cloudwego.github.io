---
title: "Netpoll v0.1.0 版本发布"
linkTitle: "Release v0.1.0"
projects: []
date: 2021-12-01
description: >

---

## 功能:

- 增加了分片队列，用于支持连接多路复用
- 优化方案：尽可能的维护单节点 LinkBuffer 来减少 copy
- 优化方案：修复了 waitReadSize 的 bug，并优化了 input trigger 效率
- 优化方案：减少了 waitRead 和 inputAck 冲突时产生的超时错误
- 逻辑简化：简化了连接状态机


## Bug 修复:

- 修复了 eventLoop 提前 GC 的 bug

## 文档

- 更新 README，将 Performance 部分移动至 netpoll-benchmark  项目
- 更新了 reference，添加了官网信息，移除了 change log

## 重大变更

- WriteBuffer 返回值由 (n int, err error) 改为 (err error)

