---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: v0.7.*-interrupt resume refactor
weight: 7
---

## 版本概述

v0.7.0 是 Eino 框架的一个**重要里程碑版本**，核心亮点是对 **Human in the Loop (HITL) / Interrupt-Resume 能力进行了架构级重构**，提供了更强大、更灵活的中断恢复机制。同时引入了 Skill 中间件、ChatModel 重试机制、多模态工具支持等核心能力。

---

## v0.7.0

**发布日期**: 2025-11-20

### 🔥 核心变更：Interrupt-Resume 架构重构 (#563)

v0.7.0 对中断恢复机制进行了架构级重构，代码变更量巨大（+7527/-1692 行），涉及 28 个文件的重大改动。

#### 新增核心模块

- **compose/resume.go**：提供类型安全的恢复状态获取 API
  - `GetInterruptState[T]`：获取上次中断的持久化状态
  - `GetResumeContext`：检查当前组件是否为恢复目标
- **internal/core/interrupt.go**：中断信号核心定义
  - `InterruptSignal`：支持嵌套的中断信号结构
  - `InterruptState`：支持状态和层级特定负载
  - `InterruptConfig`：中断配置参数
- **internal/core/address.go**：组件地址系统
- **internal/core/resume.go**：恢复逻辑核心实现

#### 重构的核心模块

- **adk/interrupt.go**：ADK 层中断处理重构 (+238 行)
- **compose/interrupt.go**：编排层中断处理重构 (+256 行)
- **adk/workflow.go**：工作流 Agent 支持中断恢复 (+510 行重构)
- **compose/graph_run.go**：Graph 执行时中断恢复支持
- **compose/tool_node.go**：工具节点中断支持

#### 新增恢复策略

支持两种恢复策略：

1. **隐式 "Resume All"**：单一"继续"按钮恢复所有中断点
2. **显式 "Targeted Resume"**：独立恢复特定中断点（推荐）

#### Agent Tool 中断改进

- 使用 `GetInterruptState` 替代手动状态管理
- 支持 `CompositeInterrupt` 组合中断
- Agent Tool 正确传递内部中断信号

### 其他改进

- **ADK 序列化增强** (#557)：修复 checkpoint 中 gob 序列化缺失类型注册
- **DeepAgent 优化** (#558)：无子 Agent 时自动移除 task tool
- **ChatModelAgent 改进** (#552)：无工具配置时正确应用 compose option
- **Plan-Execute 增强** (#555)：无工具调用时正确报错
- **MultiAgent 修复** (#548)：修复默认 summary prompt 无法使用的问题

---

## v0.7.1 - v0.7.36 主要更新

### Interrupt-Resume 持续增强

基于 v0.7.0 的架构重构，后续版本持续完善中断恢复能力：

#### 工具中断 API (#691)

- **新增工具中断 API**：支持在工具执行时触发中断
- **扩展 isResumeTarget**：支持后代目标识别

#### 嵌套 Agent 中断恢复 (#647, #672)

- **嵌套预置/工作流 Agent**：支持任意层级的 Agent 包装器中断恢复
- **Wrapped FlowAgents**：正确处理 deterministic transfer 跳过

#### Checkpoint 增强

- **节点输入持久化** (#634)：checkpoint 中持久化 rerun 节点输入
- **Graph 恢复改进** (#695)：恢复时 OnStart 中正确启用 ProcessState
- **序列化修复** (#608, #606)：修复数组/切片反序列化 panic

#### 工具错误处理 (#583)

- 工具错误处理器不再包装 interrupt error

### 重大新特性

#### Skill 中间件 (#661)

- 将可复用能力封装为 Skill
- 中间件方式扩展 Agent 能力
- 优化 Skill 提示词 (#724)

#### ChatModel 重试机制 (#635)

- ChatModelAgent 支持调用失败自动重试
- 可配置 ModelRetryConfig (#648)
- 新增 WillRetryError 支持错误链检查 (#707)

#### 多模态工具支持 (#760)

- compose 模块增强工具接口
- 支持多模态输入输出

#### 嵌套 Graph 状态访问 (#584)

- 嵌套 Graph 可访问父 Graph 状态

### 功能增强

- **Execute Backend & Tool** (#682)
- **OutputKey 配置** (#711)：存储最终答案到 SessionValues
- **嵌套 Runner 共享会话** (#645)
- **Agent 事件发送** (#620, #791)
- **ToJSONSchema 确定性输出** (#630)
- **Token 用量详情** (#629)

### 问题修复

- AfterChatModel 返回修改后消息 (#717, #792)
- 循环 Agent BreakLoopAction 中断 (#814)
- 子 Agent 报错中止循环 Agent (#813)
- 流式执行命令无输出错误 (#790)
- DeepAgent 自动指令渲染 (#726)
- Graph 重复跳过上报 (#694)
- Graph unique successors (#693)

### 文档与工程

- 重写 README 聚焦 ADK (#748, #686, #719)
- 启用 golangci-lint (#602)
- 新增代码风格指南 (#673)
