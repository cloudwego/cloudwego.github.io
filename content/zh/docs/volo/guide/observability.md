---
title: "自定义日志/监控打点/trace"
linkTitle: "日志/监控打点/trace"
weight: 3
description: >
---

对于 RPC 框架来说，日志、监控和 trace 是很重要的组成部分，云原生环境下可观测性基本依赖这三件套。

Volo 框架使用的是 tracing 库来记录 Volo 自己的日志，同时也鼓励用户使用 tracing 库来输出日志和 trace 信息，这样就可以直接复用 Rust 社区现有的相关生态了，比如 tracing-opentelemetry 等库。

用户也可以通过编写自己的 Service 和 Layer 来给所有的请求加上日志信息或者监控打点信息，如：

```rust
pub struct ClientLogLayer;

impl<S> Layer<S> for ClientLogLayer {
    type Service = LogService<S>;

    fn layer(self, inner: S) -> Self::Service {
        LogService {
            inner,
        }
    }
}

#[derive(Clone)]
pub struct LogService<S> {
    inner: S,
}

impl<Cx, Req, S> Service<Cx, Req> for LogService<S>
where
    S: Service<Cx, Req> + Send + 'static + Sync,
    Cx: Context<Config = volo_thrift::context::Config> + 'static + Send,
    Req: Send + 'static,
{
    type Response = S::Response;

    type Error = S::Error;

    async fn call<'s, 'cx>(&'s self, cx: &'cx mut Cx, req: Req) -> Result<Self::Response, Self::Error> {
        let tick = quanta::Instant::now();
        let ret = self.inner.call(cx, req).await;
        let elapsed = quanta::Instant::now().duration_since(tick);

        tracing::info!(rpc_type = "rpcCall", cost = elapsed.as_micros() as i64,);
        ret
    }
}
```

监控打点信息也是类似。
