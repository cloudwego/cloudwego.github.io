---
title: "Hertz Release v0.7.0"
linkTitle: "Release v0.7.0"
projects: ["Hertz"]
date: 2023-09-26
description: >
---

In version 0.7.0 of Hertz, in addition to regular iterative optimization, we also brought several important features.

## Refactor Binding

In version 0.7.0 of Hertz，we refactored the binding feature for Hertz

> https://github.com/cloudwego/hertz/pull/541

### Description Of Refactoring

In version 0.7.0 of Hertz，we refactored the binding feature for Hertz to better support user requirements。This refactoring has the following characteristics:

- Consistent functionality:
  - Binder: After the refactoring, we have implemented a default Binder within Hertz, which has the same functionality as before. The previous binding capabilities have been implemented as extensions under hertz-contrib.
  - Validator: We are still using go-tagexpr as the default implementation to ensure consistent functionality.
- Converged configuration:
  - Before the refactoring, the behavior of parameter binding was mostly configured through global parameters, which could lead to conflicts when multiple components were configured.
  - After the refactoring, the binding and validation configurations are injected into the Hertz Engine through `BindConfig` and `ValidateConfig` struct using the 'WithOption' function. This not only unifies the configuration format but also avoids configuration conflicts.
- Customizable Binder and Validator:
  - Custom Binder: You can use "WithCustomBinder" to inject your own custom Binder. We have already provided an extension called hertz-contrib/binding/go_tagexpr.
  - Custom Validator: You can use "WithCustomValidator" to inject your own custom Validator. We have also extended go-playground/validator for this purpose.
- Performance improvements: The refactoring has resulted in improved binding performance compared to the previous version. Please refer to the benchmark data below for more details.

### Usage

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

### Benchmark Data

https://github.com/cloudwego/hertz-benchmark/tree/main/binding

## Full Release Note

The complete Release Note can refer to:

- Hertz: https://github.com/cloudwego/hertz/releases/tag/v0.7.0
- Hz(scaffolding): https://github.com/cloudwego/hertz/releases/tag/cmd%2Fhz%2Fv0.7.0
