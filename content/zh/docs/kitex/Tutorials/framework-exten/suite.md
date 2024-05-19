---
title: "Suite 扩展"
date: 2021-08-26
weight: 2
description: >
---

## 介绍

Suite（套件）是一种对于扩展的高级抽象，可以理解为是对于 Option 和 Middleware 的组合和封装。
在扩展过程中，我们需要要记得两点原则：

1. Suite 套件只允许在初始化 Server、Client 的时候设置，不允许动态修改。
2. suite 套件是按设置的顺序来执行的，client 是先设置先执行，而 server 则相反。

Suite 的定义如下：

```golang
type Suite interface {
    Options() []Option
}
```

Server 端和 Client 端都是通过 WithSuite 这个方法来启用新的套件。

## 示例

```golang
type mockSuite struct{
    config *Config
}

func (m *mockSuite) Options() []Option {
    return []Option{
        WithClientBasicInfo(mockEndpointBasicInfo),
        WithDiagnosisService(mockDiagnosisService),
        WithRetryContainer(mockRetryContainer),
        WithMiddleware(mockMW(m.config)),
        WithSuite(mockSuite2),
    }
}
```

以上代码定义了一个简单的 Client suite 实现，我们可以在代码中使用 `client.WithSuite(&mockSuite{})` 来使用这个 suite 封装的所有 middleware/option。

## 总结

Suite 是一种更高层次的组合和封装，更加推荐第三方开发者基于 Suite 对外提供 Kitex 的扩展，Suite 可以允许在创建的时候，动态地去注入一些值，或者在运行时动态地根据自身的某些值去指定自己的 middleware 中的值，这使得用户的使用以及第三方开发者的开发都更加地方便，无需再依赖全局变量，也使得每个 client 使用不同的配置成为可能。
