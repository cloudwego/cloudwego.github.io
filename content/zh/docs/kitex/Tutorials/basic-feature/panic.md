---
title: "Panic 处理"
linkTitle: "Panic 处理"
weight: 8
description: "本文介绍 Kitex 对 panic 的处理说明。"
---

## 使用说明

- 业务代码使用 go 关键字创建的 goroutine 里发生的 panic，需要业务自行 recover；受限于语言提供的能力, 无法由框架 Recover；
- 为了保证服务的稳定，Kitex 框架会自动 recover 其他所有 panic。

## FAQ

### Q: 如何在 Server 中间件中 recover panic？

结论：不能；但框架提供获取该 panic 详情的方式。

Kitex 框架会自行 recover 业务 handler 里发生的 panic，并且（暂）不提供任何在此前插入 recover 逻辑或者中间件的手段。

### Q: 获取被 recover 的 panic 详情

你可以在自己的中间件里检查是否发生过 panic，方式如下：

```go
// 在中间件里调用 next(...) 之后：
ri := rpcinfo.GetRPCInfo(ctx)
if stats := ri.Stats(); stats != nil {
    if panicked, err := stats.Panicked(); panicked {
        // `err` 就是框架调用 recover() 收到的对象
    }
}
```