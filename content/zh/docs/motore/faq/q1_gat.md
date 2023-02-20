---
title: "使用 GAT，解决了什么问题？"
linkTitle: "使用 GAT，解决了什么问题？"
weight: 1
description: >

---

我们先来讲一下，我们为什么要 Context。

`tower` 中的 `Service` 签名如下

```rust
pub trait Service<Request> {
    type Response;
    type Error;
    type Future: Future<Output = Result<Self::Response, Self::Error>>;

    fn poll_ready(
        &mut self,
        cx: &mut Context<'_>
    ) -> Poll<Result<(), Self::Error>>;
    fn call(&mut self, req: Request) -> Self::Future;
}
```

在 `call` 方法中并没有 Context 这个概念，那么为什么我们在 Motore 中引入这个概念呢？

## 实现一个 Log 中间件

假设我们的需求是在 `call` 成功或者失败的时候打印 `LogId`，首先我们需要考虑 `LogId` 存放在哪儿？

我们想要使用 `Context` 来存放所有与该请求上下文有关的信息，那么 `LogId` 应该可以存放到 `Context` 中。

```rust
pub struct Context {
  log_id: String,
}
```

按照 `tower` 的设计，那么 `Context` 应该可以被放到 `Request` 中。

那么我们可以这么来实现我们的中间件。

```rust
pub struct VoloRequest<Req> {
    cx: Context,
    data: Req,
}

pub struct LogService<S> {
    inner: S,
}

impl<Req, S> Service<VoloRequest<Req>> for LogService<S> {
    // 这里省略 poll_ready 实现

    fn call(&mut self, req: VoloRequest<Req>) -> Self::Future {
        async {
            let log_id = req.cx.log_id.clone();
            let resp = self.inner.call(req).await;
            match resp {
                Ok(_) => {
                    tracing::info("log id: {}", log_id);
                },
                Err(_) => {
                    tracing::error("log id: {}", log_id);
                },
            }
            resp
        }
    }
}
```

因为我们需要把 `VoloRequest` 向之后的 `Service` 传递所有权，那么这里我们就需要把 `log_id`  clone 一下。

这里的 clone 会有潜在的开销，这个时候我们可以把 `log_id` 的类型从 `String` 改为 `Arc<String>` 来降低开销。

但是我们真的需要 clone 嘛？

我们这里打印 `log_id` 的这个需求其实只需要使用 `Context` 的引用。并且我们期望 `Context` 结构的生命周期在整个请求执行阶段都是有效的， 在 inner service 执行完之后，我们仍然可以访问 `Context` 中的数据。

所以我们尝试在 `Request` 之外引入 `Context` 这个概念，并且让 `call` 方法可以使用 `&mut Context`。

这样我们可以使用这种方式来实现我们的 `LogService`:

```rust
impl<Req, S> Service<Req> for LogService<S> {
    // 这里省略 poll_ready 实现

    fn call(&mut self, cx: &mut Context, req: Req) -> Self::Future {
        async {
            let resp = self.inner.call(cx, req).await;
            match resp {
                Ok(_) => {
                    tracing::info("log id: {}", cx.log_id);
                },
                Err(_) => {
                    tracing::error("log id: {}", cx.log_id);
                },
            }
            resp
        }
    }
}
```

## Context 的生命周期

`Service` 使用的是 `&mut Context`，那么这个引用的生命周期应该是什么呢？

`Context` 里面存放的是一个请求的上下文，那么 `Context` 的生命周期应该是请求级别的。所以我们引入了生命周期 `'cx`。

那么 `Service` `call` 方法的 `&mut self` 的生命周期又应该是什么呢？我们的 Rpc Server 是由一个又一个 `Service` 组成的。那么 `Service` 的生命周期其实应该是我们的 Rpc Server 的生命周期。

因为 `call` 方法返回的 `Future` 中可能会依赖 `Context` 中的数据，那么 `Future` 的 lifetime 至少也应该是 `'cx`。

所以最后我们的 `call` 方法的签名就会变成:

```rust
fn call<'cx, 's>(&'s mut self, cx: &'cx mut Context, req: Request) -> Future<'cx>;
```

那么我们该怎么约束返回的 `Future` 的 lifetime 为 `'cx` 呢
1. 使用 `Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + 'cx>>`
2. GAT

如果我们使用方案1的话就会存在 overhead，不可避免的需要一大堆 `Box::pin`。

**因此我们这里选择直接使用 GAT**（GAT 马上也会 stable）
