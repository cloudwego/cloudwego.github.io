---
title: "Kitex v0.1.4 版本发布"
linkTitle: "Release v0.1.4"
projects: ["Kitex"]
date: 2022-01-18
description: >
---

## 功能优化

- 在 rpctimeout 的 middleware 的输出日志中过滤掉超时日志
- 调整默认日志级别为 Info
- 给 sentAt 变量加锁，避免单测出现 DATA RACE，实际上不会有并发问题

## Bug 修复

- 修复客户端编码失败时连接会泄漏的问题
- 修复 middleware builder 中设置 TimeoutAdjust 不生效的问题

## 工具

- 修复 protobuf 的 handler 参数名
  > kitex 会给每个 stream server 生成一个名为 "{{.ServiceName}}_{{.Name}}Server" 的 stream 类型，
  > 但是在 handler.go 中使用的是 "{{.ServiceName}}_{{.RawName}}Server

## Chore

- 删除不必要的类型转换
