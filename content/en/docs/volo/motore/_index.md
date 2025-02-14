---
title: "Motore"
linkTitle: "Motore"
weight: 7
keywords: ["Motore", "AFIT", "RPITIT"]
Description: Motore is an async middleware abstraction powered by AFIT and RPITIT.
---

Around Motore, we build modular and reusable components for building robust networking clients and servers.

Motore is greatly inspired by [`Tower`][Tower].

## Overview

Motore uses AFIT and RPITIT to reduce the mental burden of writing asynchronous code, especially to avoid the overhead of `Box` to make people less anxious.

The core abstraciton of Motore is the `Service` trait:

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

## Getting Started

Using AFIT, we can write asynchronous code in a very concise and readable way.

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

We also provided the `#[motore::service]` macro to make writing a `Service` more async-native:

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
