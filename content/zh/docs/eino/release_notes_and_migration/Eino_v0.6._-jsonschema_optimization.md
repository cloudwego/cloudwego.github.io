---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 'Eino: v0.6.*-jsonschema optimization'
weight: 6
---

## 版本概述

v0.6.0 版本专注于依赖优化，移除了 kin-openapi 依赖和 OpenAPI3.0 相关定义，简化了 JSONSchema 模块的实现。

---

## v0.6.0

**发布日期**: 2025-11-14

### Breaking Changes

- **移除 kin-openapi 依赖** (#544)：
  - 删除了对 `kin-openapi` 库的依赖
  - 移除了 OpenAPI 3.0 相关的类型定义
  - 简化了 JSONSchema 模块的实现

### 迁移指南

如果你的代码中使用了 OpenAPI 3.0 相关的类型定义，需要：

1. 检查是否有直接使用 `kin-openapi` 相关类型的代码
2. 将 OpenAPI 3.0 类型替换为标准 JSONSchema 类型
3. 使用 `schema.ToJSONSchema()` 方法获取工具参数的 JSONSchema 定义

---

## v0.6.1 主要更新

### 问题修复

- 常规 bug 修复和稳定性改进
