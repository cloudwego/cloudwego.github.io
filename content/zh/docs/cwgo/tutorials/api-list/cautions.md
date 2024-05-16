---
title: "注意事项"
linkTitle: "注意事项"
weight: 3
description: >
---

使用 `api-list` 命令时的注意事项。

## 解析的项目代码注意事项

- `*server.Hertz`, `*route.Engine`, `*route.Group` 只能是 **局部变量**

  即变量只能在该 **函数参数** 或 **函数内部** 中声明

- 调用 `Group()` 及 **路由注册函数** 中传入的 **relativePath** 必须是 **字符串字面量**，不能是 **变量**
