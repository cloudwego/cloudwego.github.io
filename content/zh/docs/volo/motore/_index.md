---
title: "Motore"
linkTitle: "Motore"
weight: 7
keywords: ["Motore", "AFIT", "RPITIT"]
Description: Motore 是一个使用了 AFIT 和 RPITIT 特性的中间件抽象层。
---

基于 Motore，我们编写了一些模块化并且可复用的，用来编写 client 和 server 的组件。

Motore 深受[`Tower`][Tower] 启发。

## 简介

Motore 使用 AFIT 和 RPITIT 来减轻编写异步代码的精神负担，尤其是为了避免 `Box` 的开销而导致的负担，以减少使用者的焦虑。

Motore 最核心的抽象是 `Service` trait：

```rust
pub trait Service<Cx, Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;

    /// Process the request and return the response asynchronously.
    async fn call<'s, 'cx>(&'s mut self, cx: &'cx mut Cx, req: Request) -> Result<Self::Response, Self::Error>;
}
```

## 快速上手

使用 AFIT，我们可以以非常简洁易读的方式编写异步代码：

```rust
pub struct Timeout<S> {
    inner: S,
    duration: Duration,
}
impl<Cx, Req, S> Service<Cx, Req> for Timeout<S>
where
    Req: 'static + Send,
    S: Service<Cx, Req> + 'static + Send,
    Cx: 'static + Send,
    S::Error: Send + Sync + Into<BoxError>,
{
    type Response = S::Response;
    type Error = BoxError;

    async fn call<'s, 'cx>(&'s mut self, cx: &'cx mut Cx, req: Req) -> Result<Self::Response, Self::Error> {
        let sleep = tokio::time::sleep(self.duration);
        tokio::select! {
            r = self.inner.call(cx, req) => {
                r.map_err(Into::into)
            },
            _ = sleep => Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "service time out").into()),
        }
    }
}
```

我们还提供了`#[motore::service]`宏以使编写 `Service` 更加像编写原生异步 Rust：

```rust
use motore::service;
pub struct S<I> {
    inner: I,
}
#[service]
impl<Cx, Req, I> Service<Cx, Req> for S<I>
where
   Req: Send + 'static,
   I: Service<Cx, Req> + Send + 'static,
   Cx: Send + 'static,
{
    async fn call(&mut self, cx: &mut Cx, req: Req) -> Result<I::Response, I::Error> {
        self.inner.call(cx, req).await
    }
}
```

[Tower]: https://github.com/tower-rs/tower
