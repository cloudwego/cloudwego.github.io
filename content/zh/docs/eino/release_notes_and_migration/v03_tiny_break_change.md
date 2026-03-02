---
Description: ""
date: "2025-01-06"
lastmod: ""
tags: []
title: 'Eino: v0.3.*-tiny break change'
weight: 3
---

## v0.3.1-内场封板

> 发版时间：2024-12-17
>
> 后续将只维护开源版，会提供便捷迁移脚本，帮助大家从内场版本迁移至开源版本

### Features

- 精简 Eino 对外暴露的概念
  - Graph、Chain 支持 State，去除 StateGraph、StateChain
  - 去除 GraphKey 的概念
- 优化流合并时的，MultiReader 的读取性能

### BugFix

- 修复 Chain 中 AddNode 时，遗漏的 Error 检查

## v0.3.0

> 发版时间：2024-12-09

### Features

- schema.ToolInfo.ParamsOneOf 修改成指针。 支持 ParamsOneOf 为 nil 的场景
- Compile Callback  中支持返回 GenStateFn
- 支持全局的 Compile Callback

### BugFix

- CallOption DesignateNode 时，不应该执行 Graph 切面，只执行指定节点的切面
