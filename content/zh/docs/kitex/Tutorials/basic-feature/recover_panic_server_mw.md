---
title: "如何在服务端中间件里 recover panic？"
linkTitle: "如何在服务端中间件里 recover panic？"
weight: 6
description: 结论：不能。
---

## 原因

kitex 框架会自行 recover 业务 handler 里发生的 panic，并且（暂）不提供任何在此前插入 recover 逻辑或者中间件的手段。

## 获取被 recover 的 panic 详情

你可以做的是，在自己的中间件里检查是否发生过 panic，方式如下：

```
// 在中间件里调用 next(...) 之后：
ri := rpcinfo.GetRPCInfo(ctx)
if stats := ri.Stats(); stats != nil {
    if panicked, err := stats.Panicked(); panicked {
        // `err` 就是框架调用 recover() 收到的对象
    }
}
```

## FAQ