---
title: "Hertz v0.7.0 版本发布"
linkTitle: "Release v0.7.0"
projects: ["Hertz"]
date: 2023-09-26
description: >
---

Hertz v0.7.0 版本中，除了常规迭代优化之外，我们还带来了一个重要 feature。

## 参数绑定重构

在 Hertz v0.7.0 版本中，我们重构了 hertz 参数绑定

> https://github.com/cloudwego/hertz/pull/541

### 重构说明

在 Hertz v0.7.0 版本中，我们重构了参数绑定能力，将参数绑定能力收敛到框架本身，以更好地支持用户的需求。本次重构主要有以下特点：

- 功能一致：
  - Binder：重构后在 Hertz 内部实现了一个默认的 Binder，其功能与重构前完全对齐，并将重构前的绑定能力以拓展的形式实现在 hertz-contrib 下
  - Validator： 仍使用 go-tagexpr 作为默认实现，保证功能一致
- 配置收敛：
  - 重构前：参数绑定的行为大多通过全局参数的形式进行配置，可能导致多个组件出现配置冲突
  - 重构后：以 BindConfig 和 ValidateConfig 的结构通过 'WithOption' 的形式注入到 Hertz Engine 中，既能统一配置形式，又能避免配置冲突的问题
- 可自定义 Binder 和 Validator：
  - 自定义 Binder：可使用 "WithCustomBinder" 来注入自定义的 Binder，目前已有拓展 hertz-contrib/binding/go_tagexpr
  - 自定义 Validator：可使用 "WithCustomValidator" 来注入自定义的 Validator，目前已经将 go-playground/validator 进行了拓展
- 性能提升：重构后绑定性能较之前有提升，详见后文压测数据

### 使用方法

```go
package main

import (
    "github.com/cloudwego/hertz/pkg/app/server/binding"
    "github.com/cloudwego/hertz/pkg/app/server"
)

func main() {
    bindConfig := binding.NewBindConfig()
    bindConfig.LooseZeroMode = true
    h := server.New(server.WithBindConfig(bindConfig))
    ...
    h.Spin()
}
```

### 压测数据

https://github.com/cloudwego/hertz-benchmark/tree/main/binding

完整的 Release Note 可以参考：

- Hertz: https://github.com/cloudwego/hertz/releases/tag/v0.7.0
- Hz(脚手架): https://github.com/cloudwego/hertz/releases/tag/cmd%2Fhz%2Fv0.7.0
