---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: v0.5.*-ADK implementation
weight: 5
---

## 版本概述

v0.5.0 是一个重要的里程碑版本，引入了 **ADK (Agent Development Kit)** 框架。ADK 提供了一套完整的智能体开发工具集，支持 Agent 编排、预置 Agent、会话管理、中断恢复等核心能力。

---

## v0.5.0

**发布日期**: 2025-09-10

### 重大新特性

#### ADK 框架 (#262)

ADK 是一套面向智能体开发的完整解决方案，主要包括：

- **ChatModelAgent**：基于大语言模型的基础智能体实现
  - 支持 MaxIterations 配置
  - 支持工具调用
  - 流式输出支持
- **Agent as Tool**：支持将 Agent 封装为工具供其他 Agent 调用
- **预置多智能体模式**：
  - **Supervisor**：监督者模式，由一个主 Agent 协调多个子 Agent
  - **Sequential**：顺序执行模式，Agent 按序执行并继承上下文
  - **Plan-Execute-Replan**：计划-执行-重规划模式
- **会话管理**：
  - Session 事件存储与管理
  - Session Values 支持
  - History Rewriter 历史重写能力
- **中断与恢复**：
  - 支持 Agent 执行中断
  - 支持从检查点恢复执行
  - Deterministic Transfer 中断恢复支持
- **Agent 运行选项**：
  - `WithSessionValues` 支持传入会话级别变量
  - Agent CallOption 扩展

---

## v0.5.1 - v0.5.15 主要更新

### 功能增强

- **DeepAgent 预置实现** (#540)：支持深度 Agent 模式
- **Agent 中间件支持** (#533)：允许通过中间件扩展 Agent 行为
- **全局回调支持** (#512)：内置 Agent 支持全局 Callbacks
- **MessageRewriter 配置** (#496)：React Agent 支持消息重写
- **BreakLoopAction 定义** (#492)：支持循环 Agent 中断
- **取消中断支持** (#425)：支持取消正在进行的中断操作
- **多模态支持**：
  - Message 新增多模态输出内容 (#459)
  - 默认提示模板支持多模态 (#470)
  - Format 函数支持 UserInputMultiContent (#516)

### 问题修复

- 修复 ChatModelAgent 的 max step 计算 (#549)
- 修复 Session 仅存储有输出的事件 (#503)
- 修复 Sequential Agent 报错时退出问题 (#484)
- 修复 Workflow 仅在最后一个事件执行 action (#463)
- 修复 ChatModelAgent return directly tool panic (#464)
- 修复 Go 1.25 编译错误 (#457)
- 修复空 slice 和空字段序列化问题 (#473)
