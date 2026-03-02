---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.4.*-compose optimization'
weight: 4
---

## 版本概述

v0.4.0 版本主要对 Graph 编排能力进行了优化，移除了 `GetState` 方法，并为 AllPredecessor 触发模式启用了默认的 eager execution 模式。

---

## v0.4.0

**发布日期**: 2025-07-25

### Breaking Changes

- **移除 GetState 方法**：Graph 不再支持 `GetState` 方法，状态管理需要通过其他机制实现

### 新特性

- **AllPredecessor 模式默认启用 Eager Execution**：使用 AllPredecessor 触发模式的 Graph 默认采用 eager execution 策略，提升执行效率

---

## v0.4.1 - v0.4.8 主要更新

### 功能增强

- 支持使用 JSONSchema 描述工具参数 (#402)
- `ToJSONSchema()` 兼容 OpenAPIV3 到 JSONSchema 的转换 (#418)
- React Agent 新增 `WithTools` 便捷函数 (#435)
- 支持打印推理内容 (reasoning content) (#436)
- 新增 `PromptTokenDetails` 定义 (#377)

### 问题修复

- 修复子图从父图保存状态不正确的问题 (#389)
- 修复分支输入类型为 interface 且值为 nil 的处理 (#403)
- 修复 flow_react 中 `toolCallChecker` 使用错误上下文的问题 (#373)
- 修复 edge handlers 在 successor ready 时才解析的问题 (#438)
- 修复 end node 被跳过时的错误上报 (#411)
- 优化流式包装器错误处理 (#409)
