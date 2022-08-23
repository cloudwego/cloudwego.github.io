---
title: "Overview"
linkTitle: "Overview"
weight: 1
description: >

---

Motore is an async middleware abstraction powered by GAT and TAIT.

Around Motore, we build modular and reusable components for building robust networking clients and servers.

Motore is greatly inspired by [`Tower`][Tower].

## Overview

Motore uses GAT and TAIT to reduce the mental burden of writing asynchronous code, especially to avoid the overhead of `Box` to make people less anxious.

The core abstraciton of Motore is the `Service` trait:

```rust
pub trait Service<Cx, Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;
    /// The future response value.
    type Future<'cx>: Future<Output = Result<Self::Response, Self::Error>> + Send + 'cx
    where
        Cx: 'cx,
        Self: 'cx;
    /// Process the request and return the response asynchronously.
    fn call<'cx, 's>(&'s mut self, cx: &'cx mut Cx, req: Request) -> Self::Future<'cx>
    where
        's: 'cx;
}
```
## Getting Started

Combing GAT and `type_alias_impl_trait` together, we can write asynchronous code in a very concise and readable way.

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
    type Future<'cx> = impl Future<Output = Result<S::Response, Self::Error>> + 'cx;
    fn call<'cx, 's>(&'s mut self, cx: &'cx mut Cx, req: Req) -> Self::Future<'cx>
    where
        's: 'cx,
    {
        async move {
            let sleep = tokio::time::sleep(self.duration);
            tokio::select! {
                r = self.inner.call(cx, req) => {
                    r.map_err(Into::into)
                },
                _ = sleep => Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "service time out").into()),
            }
        }
    }
}
```

We also provided the `#[motore::service]` macro to make writing a `Serivce` more async-native:

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
