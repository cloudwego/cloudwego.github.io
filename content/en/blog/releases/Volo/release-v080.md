---
title: "Volo Release 0.8.0"
linkTitle: "Release v0.8.0"
projects: ["Volo"]
date: 2023-10-23
description: >
---

In Volo 0.8.0, we mainly refactored the Service trait and all previous places that used async_trait by using two newly stabilized features: AFIT (Async Fn In Trait) and RPITIT (Return Position Impl Trait In Traits). This not only brings a slight performance improvement, but also significantly enhances the usability of writing Service, as you can directly write async fn call.

## Break Change

### Service trait refactoring

In the latest nightly, Rust's two highly anticipated heavyweight features, AFIT (Async Fn In Trait) and RPITIT (Return Position Impl Trait In Traits), have been stabilized, which means that in two months, we can use volo in stable rust.

Here's a brief introduction to these two features:

#### RPITIT

RPITIT means that we can now write impl trait in the return position of a function inside a trait, whereas previously we could only write it in regular functions, such as:

```rust
fn fetch(key: FastStr) -> impl Future<Output = Result<Item>>
```

Now, we can write it directly inside a trait:

```rust
trait Fetcher {
    fn fetch(&self, key: FastStr) -> impl Future<Output = Result<Item>>;
}
```

#### AFIT

AFIT's feature is that we can now define async fn directly in a trait (essentially syntactic sugar for RPITIT) and no longer need to use the #[async_trait] macro, for example:

```rust
trait Fetcher {
    async fn fetch(&self, key: FastStr) -> Result<Item>;
}
```

In fact, it's just syntactic sugar, and the compiler will convert this async fn into the form of RPITIT mentioned above.

For more information, please refer to: https://github.com/rust-lang/rust/pull/115822

#### New Service definition

The original definition of the new Service Trait is as follows:

```rust
pub trait Service<Cx, Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;

    /// Process the request and return the response asynchronously.
    fn call<'s, 'cx>(
        &'s self,
        cx: &'cx mut Cx,
        req: Request,
    ) -> impl Future<Output = Result<Self::Response, Self::Error>> + Send;
}
```

A more understandable definition is as follows, and you can understand it directly:

```rust
pub trait Service<Cx, Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;

    /// Process the request and return the response asynchronously.
    async fn call<'s, 'cx>(
        &'s self,
        cx: &'cx mut Cx,
        req: Request,
    ) -> Result<Self::Response, Self::Error>;
}
```

Compared to the previous definition, the type Future associated type is removed, and the order of lifetimes in call is changed (the previous order was `call<'cx, 's>`, which was a typo when it was first written, and now it's changed back).

#### Migration Guide

1. Update Rust compiler to the latest nightly (rustup update) and all dependencies (volo, pilota, motore) to the latest version
2. Run cargo check to see where the errors are, such as "type Future is not a member", "associated type Future not found", etc. We will use the following `Service` as an example:

```rust
impl<Cx, Req, S> Service<Cx, Req> for LogService<S>
where
    S: Service<Cx, Req> + Send + 'static + Sync,
    Cx: Context<Config = volo_grpc::context::Config> + 'static + Send,
    Req: Send + 'static,
{
    type Response = S::Response;

    type Error = S::Error;

    type Future<'cx> = impl Future<Output = Result<Self::Response, Self::Error>> + 'cx;

    fn call<'cx, 's>(&'s self, cx: &'cx mut Cx, req: Req) -> Self::Future<'cx>
    where
        's: 'cx,
    {
        async move {
            let tick = quanta::Instant::now();
            let ret = self.inner.call(cx, req).await;
            let elapsed = quanta::Instant::now().duration_since(tick);
            tracing::info!(rpc_type = "rpcAccess", cost = elapsed.as_micros() as i64);
            ret
        }
    }
}
```

3. Remove the line with `type Future`
4. Swap the lifetimes in `fn call<'cx, 's>` and remove the `where` statement below
5. Add `async` before `fn call`, then change `Self::Future<'cx>` to `Result<Self::Response, Self::Error>`, and remove the `async move` in the function body
6. The final modified `Service` is as follows:

```rust
impl<Cx, Req, S> Service<Cx, Req> for LogService<S>
where
    S: Service<Cx, Req> + Send + 'static + Sync,
    Cx: Context<Config = volo_grpc::context::Config> + 'static + Send,
    Req: Send + 'static,
{
    type Response = S::Response;

    type Error = S::Error;

    async fn call<'s, 'cx>(&'s self, cx: &'cx mut Cx, req: Req) -> Result<Self::Response, Self::Error> {
        let tick = quanta::Instant::now();
        let ret = self.inner.call(cx, req).await;
        let elapsed = quanta::Instant::now().duration_since(tick);
        tracing::info!(rpc_type = "rpcAccess", cost = elapsed.as_micros() as i64);
        ret
    }
}
```

### Handler refactoring

In previous versions, Volo generated user handlers using async_trait for ease of use, but thanks to AFIT, we can now write async fn directly in traits, so we removed async trait (reducing one Box overhead).

Therefore, after upgrading, you may initially encounter errors like "lifetime parameters or bounds not match". In this case, simply remove the `#[async_trait]` macro.

## Complete Release Note

For the complete Release Note, please refer to: [Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.5.4...volo-0.8.0)
