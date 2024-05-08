---
title: "Kitex v0.0.8 版本发布"
linkTitle: "Release v0.0.8"
projects: ["Kitex"]
date: 2021-11-05
description: >
---

## 优化

- 使用分片 ring 减少连接池的锁开销。
- 装填 TTHeader 中的上游服务信息到 rpcinfo 中，用于在 decode 出错时输出来源信息。
- Unlink uds 调整至 CreateListener 中。
- event.go 和 ring_single.go 中的 Mutex 改为 RWMutex。

## Bug 修复

- 修复 netpollmux shard index 溢出的问题。
- 移除 `WithCircuitBreaker` option 里对参数的反射，避免 data-race。
- 在重试场景下， 修复 rpc finish 错误导致的小概率失败的问题，并且加上了熔断 sample 的校验。
- 修复 endpoint_test.go 中的一处单测错误。
- 修改 conn_wrapper.go 中 longconn 变量命名为 conn.。

## 生成工具

- 代码生成工具支持透传thrift-go插件参数。

## 文档

- 将 README 中的性能结果改为引用 kitex-benchmark 仓库的数据。

## 依赖变化

- github.com/tidwall/gjson: v1.8.0 -> v1.9.3
