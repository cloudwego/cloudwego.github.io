---
Description: ""
date: "2025-01-20"
lastmod: ""
tags: []
title: Eino Dev 插件安装指南
weight: 1
---

## 背景 & 简介

> [Eino: 概述](/zh/docs/eino/overview)

**Eino 是 Go AI 集成组件的研发框架**，提供常用的 **AI 组件**以及集成组件**编排能力**。为了更好的辅助开发者使用 Eino，我们提供了「**Eino Dev**」插件，助力 AI 应用高效开发  🚀。

<a href="/img/eino/eino_dev_ability_introduction_page.png" target="_blank"><img src="/img/eino/eino_dev_ability_introduction_page.png" width="100%" /></a>

## 如何安装

### 版本安装依赖

   <table>
   <tr><td><strong>Plugin Version</strong></td><td><strong>GoLand IDE Version</strong></td><td><strong>VS Code Version</strong></td><td><strong>eino-ext/devops  Version</strong></td></tr>
   <tr><td>1.1.0</td><td>2023.2+</td><td>1.97.x</td><td>0.1.0</td></tr>
   <tr><td>1.0.7      </td><td>2023.2+</td><td>-</td><td>0.1.0</td></tr>
   <tr><td>1.0.6      </td><td>2023.2+</td><td>-</td><td>0.1.0</td></tr>
   <tr><td>1.0.5     </td><td>2023.2+</td><td>-</td><td>0.1.0</td></tr>
   <tr><td>1.0.4</td><td>2023.2+</td><td>-</td><td>0.1.0</td></tr>
   </table>

**Plugin** **Version**：插件版本信息

**Goland IDE Version**： Goland IDE 可支持的最小版本

**VS Code Version**： VS Code 可支持的最小版本

**Eino-Ext/devops  Version**： [eino-ext/devops](https://github.com/cloudwego/eino-ext/tree/main/devops) 调试模块对应的合适版本

### 安装

#### GoLand

<table><tbody><tr>
<td><li>进入 <strong>GoLand</strong>，点击<strong>设置</strong>，选择<strong> </strong><strong>Plugin</strong><strong>s</strong></li>
<a href="/img/eino/eino_install_page.png" target="_blank"><img src="/img/eino/eino_install_page.png" width="100%" /></a>
</td><td><li>在 <strong>Marketplace</strong> 中搜索 <strong>E</strong><strong>ino</strong><strong> Dev</strong> 插件并安装</li>
<a href="/img/eino/eino_install_page_2_page.png" target="_blank"><img src="/img/eino/eino_install_page_2_page.png" width="100%" /></a>
</td></tr></tbody></table>

#### VS Code

- 在 VS Code 中点击「Extension 图标」，进入插件市场，搜索 Eino Dev，安装即可

<a href="/img/eino/JKDUbMAnDoZa4TxUXafcCXO4nqg.png" target="_blank"><img src="/img/eino/JKDUbMAnDoZa4TxUXafcCXO4nqg.png" width="100%" /></a>

## 功能简介

> 💡
> **插件安装完毕** ✅，**接下来就可以体验插件提供的调试与编排能力了** ～

<table><tbody><tr>
<td><li>Goland</li>
右侧边栏找到「<strong>Eino Dev</strong>」图标并点击：
<a href="/img/eino/WuuYbKYoHo6slixKBLbcPSf6n8f.png" target="_blank"><img src="/img/eino/WuuYbKYoHo6slixKBLbcPSf6n8f.png" width="100%" /></a>
</td><td><li>VS Code</li>
在底部找到「<strong>Eino Dev</strong>」并点击：
<a href="/img/eino/SFfAbLJPiosHNMxx7zfcFD2mn1g.png" target="_blank"><img src="/img/eino/SFfAbLJPiosHNMxx7zfcFD2mn1g.png" width="100%" /></a>
</td></tr></tbody></table>

### Graph 编排

详情 👉：[Eino Dev 可视化编排插件功能指南](/zh/docs/eino/core_modules/devops/visual_orchestration_plugin_guide)

<table><tbody><tr>
<td>
<a href="/img/eino/eino_orchestration_index_page.png" target="_blank"><img src="/img/eino/eino_orchestration_index_page.png" width="100%" /></a>
</td><td>
<a href="/img/eino/eino_orchestration_show_nodes_2_page.png" target="_blank"><img src="/img/eino/eino_orchestration_show_nodes_2_page.png" width="100%" /></a>
</td></tr></tbody></table>

### Graph 调试

详情 👉：[Eino Dev 可视化调试插件功能指南](/zh/docs/eino/core_modules/devops/visual_debug_plugin_guide)

<table><tbody><tr>
<td>
<a href="/img/eino/eino_debug_run_page.png" target="_blank"><img src="/img/eino/eino_debug_run_page.png" width="100%" /></a>
</td><td>
<a href="/img/eino/eino_debug_test_run_of_mock_data_page.png" target="_blank"><img src="/img/eino/eino_debug_test_run_of_mock_data_page.png" width="100%" /></a>
</td></tr></tbody></table>
