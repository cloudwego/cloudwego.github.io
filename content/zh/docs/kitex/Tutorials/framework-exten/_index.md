---
title: "框架扩展"
linkTitle: "框架扩展"
weight: 6
date: 2021-08-26
description: >
---

## 概述

Kitex 框架核心主要基于接口进行开发，而不受限于特定的组件。这为框架提供了很强的扩展能力，开发者可以根据具体需求，轻松集成各种第三方组件。

框架主要提供了两种基础的扩展方式：

1. Middleware 中间件：它可以在每个请求过程的前后对该请求相关的数据进行一定的操作与处理，来定制需要的功能；

2. Option 选项：它是框架提供的、数量有限的选项，每个选项都有其对应的拓展能力，各不相同。该章节会分别展开介绍常用的 Option，你也可以到 [Option](/zh/docs/kitex/tutorials/options/) 章节来查看所有的 Option 列表；

此外还有一种比较高级的拓展方式是增加 Suite 套件，Suite 是对于 Middleware 和 Option 的组合和封装，也就是添加一个 Suite 相当于添加了多个 Option 与 Middleware。
