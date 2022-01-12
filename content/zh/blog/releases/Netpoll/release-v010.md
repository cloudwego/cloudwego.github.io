---
title: "Netpoll v0.1.0 版本发布"
linkTitle: "Release v0.1.0"
date: 2021-12-01
description: >
  
---
## 优化

- 添加 mux.ShardQueue 以支持连接多路复用
- 在单个 LinkBuffer Node 上输入以提高性能
- 修复 waitReadSize 的逻辑错误并改善了 input trigger
- 改善了当 waitRead 和 inputAck 存在竞争时导致的超时问题
- 统一并简化了 conn lock

## 问题修复

- 确保 EventLoop 对象不会在服务返回之前结束

## Chore

- 更新了 readme
- 更新了 issue 模板

## Breaking Change

- 移除了 Append 和 WriteBuffer 返回的参数 n
