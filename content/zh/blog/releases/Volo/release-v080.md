---
title: "Volo 0.8.0 版本发布"
linkTitle: "Release v0.8.0"
projects: ["Volo"]
date: 2023-10-23
description: >
---

Volo 0.8.0 版本中，我们主要使用了 AFIT（Async Fn In Trait） 和 RPITIT（Return Position Impl Trait In Traits） 这两个刚刚 stabilized 的 feature 重构了 Service trait 和之前所有用了 async_trait 的地方，除了会有略微的性能提升外，更重要的是，接下来写 Service 可以直接写 async fn call 了，易用性会有较大的提升。

## Break Change

### Service trait 重构

在最新的 nightly 中，Rust 备受瞩目的两个重量级 feature AFIT（Async Fn In Trait）和 RPITIT（Return Position Impl Trait In Traits）已经稳定了，也就意味着两个月后，我们就可以在 stable rust 中使用 volo 了。

这里先简单介绍一下这两个 feature：

#### RPITIT

RPITIT 的意思是，我们可以在 trait 里面，在函数返回的地方写 impl trait 了，之前我们只能在普通的函数里面写，比如：

```rust
fn fetch(key: FastStr) -> impl Future<Output = Result<Item>>
```

而现在，我们可以直接在 trait 里面写了：

```rust
trait Fetcher {
    fn fetch(&self, key: FastStr) -> impl Future<Output = Result<Item>>;
}
```

#### AFIT

AFIT 的功能就是，我们可以直接在 trait 里面定义 async fn 了（其实本质上是 RPITIT 的语法糖），并且不需要使用 #[async_trait] 这个宏了，比如：

```rust
trait Fetcher {
    async fn fetch(&self, key: FastStr) -> Result<Item>;
}
```

实际上，也就是一个语法糖，编译器会将这个 async fn 转换成上述的 RPITIT 的形式。

如需了解更多，可以参考：https://github.com/rust-lang/rust/pull/115822

#### Service 新定义

新版 Service Trait 的原始定义如下：

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

一个更容易理解的定义是这样的，大家直接这么理解即可：

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

与之前的定义对比，去掉了 type Future 关联类型，同时修改了 call 中生命周期的顺序（之前的顺序为`call<'cx, 's>`，是一开始写的时候 typo 写反了，趁这个机会改回来）。

#### 迁移指南

1. Rust 编译器更新到最新 nightly（rustup update）及所有依赖（volo、pilota、motore）升级到最新版
2. cargo check 看看哪里报错，可能会遇到比如`type Future is not a member`、`associated type Future not found`等类似错误，我们以如下`Service`为例：

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

3. 把`type Future`这行直接去掉
4. 把`fn call<'cx, 's>`中的生命周期位置对调，并去掉下面的`where`语句
5. 在`fn call`前面加个`async`，然后把`Self::Future<'cx>`这部分，改成`Result<Self::Response, Self::Error>`，并去掉函数体里面的`async move`
6. 最终改完的`Service`如下：

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

### Handler 重构

之前版本中，Volo 生成的用户的 handler 为了易用性使用了 async_trait，但得益于 AFIT，现在我们可以直接在 trait 中写 async fn 了，因此我们去掉了 async trait（可以减少一次 Box 开销）。

因此，升级后可能一开始会遇到类似“lifetime parameters or bounds not match”的错误，遇到这种问题直接去掉`#[async_trait]`宏即可。

## 完整 Release Note

完整的 Release Note 可以参考：[Volo Changelog](https://github.com/cloudwego/volo/compare/volo-0.5.4...volo-0.8.0)
