---
title: "Kitex v0.1.0 版本发布"
linkTitle: "Release v0.1.0"
projects: ["Kitex"]
date: 2021-12-13
description: >
---

## 功能

### 泛化调用

- IDL 解析支持多 Service
- 暴露 SetSeqID 方法便于二进制泛化场景 server 侧使用
- 泛化 client 支持关闭，规避内存泄漏问题

### 日志

- 修改日志风格，使用 "key=value" 列出信息
- 使用 klog 作为全局的日志输出工具
- 使用全局的 default logger
- 日志打印更多 context 信息，例如 logId，方便问题排查
- go func 传入服务信息用于 recover panic 后输出关键信息方便问题排查

### Option

- 增加 NewThriftCodecDisableFastMode 方法，来关闭 FastWrite 和 FastRead
- Kitex server 支持端口复用
- 默认 RPC 超时设置为 0（在后续 PR 中，revert 了该变更）

### Proxy

- Proxy 增加 ContextHandler 接口用于传递初始化ctx给 mwbuilder
- 注册 lbcache 的 Dump 给 diagnosis，用于问题诊断
- 将 PRCConfig 传递给 proxy.Config

## 优化

- 减少了对象的堆分配
- 优化多路复用性能
- 优化 grpc 编解码性能，通过 Release 时释放(Close) LinkBuffer
- 在计算 backup request 的消耗(cost)时，区分 ErrRPCFinish
- 多路复用分片队列逻辑移动至 netpoll/mux，并重命名分片字典
- 优化Fast api中容器类型的长度编码逻辑

## Bug 修复

- 修复 server 端 WithErrorHandler 配置不生效问题
- 调整 lbcache 中的 Balancer 初始化逻辑
- 修复 TraceCtl 可能为 nil 的问题(仅影响单测)
- 设置默认的 rpc timeout, 并支持设置 WithRPCTimeout(0) 来关闭超时中间件
- 修复 default logger 使用错误的 call depth
- 重命名 BackwardProxy 为 ReverseProxy
- 修复 grpc 场景下的 panic
- 修复 grpc 场景下的潜在风险（keepalive 超时导致 panic）
- 修复 void 方法中的异常缺失
- 修复实例变更时 dump 信息不正确问题。

## 文档

- 修复失效的中文链接
- 将全部 doc 移至官网 cloudwego.io

## Netpoll API Change:

- 适应 netpoll.Writer.Append 的 API 改动，返回值从 2个 变为 1个

## 依赖变化

- github.com/cloudwego/netpoll: v0.0.4 -> v0.1.2
