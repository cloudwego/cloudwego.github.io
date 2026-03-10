---
Description: ""
date: "2026-03-02"
lastmod: ""
tags: []
title: 发布记录 & 迁移指引
weight: 8
---

# 版本管理规范

Go SDK 项目通常遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)（Semver）的规范。Semver 的版本号由三部分组成，格式为：

> 💡
> v{MAJOR}.{MINOR}.{PATCH}

- **MAJOR**：主版本号，表示有重大更新或不兼容的 API 变更。
- **MINOR**：次版本号，表示新增功能，且与之前的版本保持向后兼容。
- **PATCH**：修订号，表示向后兼容的 bug 修复。

此外，语义化版本控制也支持预发布版本和元数据标签，用于标记**预发版**、**尝鲜版**等非正式版本。其格式为：

> 💡
> v{MAJOR}.{MINOR}.{PATCH}-{PRERELEASE}+{BUILD}

- **PRERELEASE**：预发布版本标识，例如 `alpha`、`beta`、`rc`（Release Candidate）。
- **BUILD**：构建元数据（可选），通常用于标识特定的构建，例如 CI 构建号等。

**Eino 遵循以上的语义化版本版本规范，会有如下几种版本类型：**

<table>
<tr><td><strong>版本类型</strong></td><td><strong>版本号格式</strong></td><td><strong>版本说明</strong></td><td><strong>备注</strong></td></tr>
<tr><td><strong>稳定版</strong><strong>（Stable Release）</strong></td><td>格式：<li>v{MAJOR}.{MINOR}.{PATCH}</li>示例：<li>v0.1.1</li><li>v1.2.3</li></td><td><li>发布稳定版本时，确保 API 的稳定性和向后兼容性。</li><li>严格遵守语义化版本控制：只有在引入<strong>重大不兼容变化</strong>时才提升主版本号（MAJOR），新增功能时提升次版本号（MINOR），只修复 bug 时提升修订号（PATCH）。</li><li>确保在发布前进行全面的单元测试、集成测试以及性能测试。</li><li>在发布时提供详细的发布说明（Release Notes），列出重要的变更、修复、特性以及迁移指南（如有）。</li></td><td></td></tr>
<tr><td><strong>预发版</strong><strong>（Pre-release）</strong><li>Alpha</li><li>Beta</li><li>RC (Release Candidate)</li></td><td>格式：<li>v{MAJOR}.{MINOR}.{PATCH}-{alpha/beta/rc}.{num}</li>示例：<li>v0.1.1-beta.1</li><li>v1.2.3-rc.1</li><li>v1.2.3-rc.2</li></td><td><li><strong>Alpha</strong>：内部测试版，功能不一定完备，可能会有较多的 bug，不建议用于生产环境。</li><li><strong>Beta</strong>：功能基本完备，但仍可能存在 bug，适合公开测试，不建议用于生产环境。</li><li><strong>RC（Release Candidate）</strong>：候选发布版，功能完成且基本稳定，建议进行最后的全面测试。在没有严重 bug 的情况下，RC 版本会转化为稳定版。一般来说，RC 版本的最后一个版本会转换成稳定版本</li></td><td></td></tr>
<tr><td><strong>尝鲜版</strong><strong>（Canary/Experimental/Dev）</strong></td><td>格式：<li>v{MAJOR}.{MINOR}.{PATCH}-{dev}.{num}</li>示例：<li>v0.1.1-dev.1</li><li>v1.2.3-dev.2</li></td><td><li>尝鲜版是非常不稳定的版本，通常用于测试新功能或架构的早期实现。这些版本可能会包含实验性功能，甚至会在未来被移除或大幅修改。</li><li>尝鲜版一般是在仓库的实验性分支上进行</li></td><td>一般来说，在字节内部用不到此种版本类型，可能在开源社区中使用</td></tr>
</table>

# 关于 V0、V1、Vn(n>1)的一些潜在共识

<table>
<tr><td>标题</td><td>说明</td><td>备注</td></tr>
<tr><td>V0大版本内部的不稳定性</td><td><li><strong>v0.x.x</strong> 表示该库仍处于<strong>不稳定状态</strong>，可能在 MINOR 版本的迭代中，引入<strong>不兼容更改</strong>，API 发生变化，不承诺向后兼容性。</li><li>用户在使用这些版本时应该预期到 API 可能会发生变化</li><li>版本号的提升不会严格遵守语义化版本控制的规则</li><li><strong>v0.x.x</strong> 的设计目标是<strong>快速迭代</strong>，允许开发者在 API 不稳定的情况下发布库版本，并收集用户反馈。</li></td><td></td></tr>
<tr><td>V1、Vn(n>1)大版本内部的稳定性</td><td><li><strong>v1.0.0</strong> 表示该库达到了<strong>稳定状态</strong>，API 设计已经成熟，<strong>承诺向后兼容性</strong>，即未来的 <pre>v1.x.x</pre> 版本会保证不引入不兼容的更改。</li><li>严格遵循语义化版本控制</li><li><strong>不兼容的 API 变更</strong> 将需要通过<strong>主版本号</strong>（MAJOR）的提升才能发布。例如，需要将版本号提升到 <pre>v2.0.0</pre>。</li><li><strong>向后兼容的功能更新</strong> 将通过<strong>次版本号</strong>（MINOR）的提升来发布，例如 <pre>v1.1.0</pre>。</li><li><strong>向后兼容的 bug 修复</strong> 将通过<strong>修订号</strong>（PATCH）的提升来发布，例如 <pre>v1.0.1</pre>。</li></td><td></td></tr>
</table>

> 💡
> 当前因 Eino 初次发布，虽然 Eino 的 API 已初具稳态，但未经过大规模业务验证，MAJOR 版本暂时定为 V0，经过至少 50+ 业务线验证后，会提升版本至 V1

# Release Notes 文档结构

- 一个 {MAJOR}.{MINOR} 次版本单独一篇文档
  - 命名格式：“Eino: v1.2.* {标题描述}”
- {MAJOR}.{MINOR} 次版本中记录这个版本下的所有 ChangeLog
- 次版本的子目录中，可选放置每个 PATCH 的详细介绍

```
.
├── v1.0.*
│   └── bug_fix_1_x.txt
├── v0.2.*
├── v0.1.*
    ├── bug_fix_1_xxx.txt
    ├── bug_fix_2_xxxxx.txt
    └── bug_fix_3_xxxxxxx.txt
```
