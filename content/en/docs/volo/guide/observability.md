---
title: "Custom Logging / Monitoring / Tracing"
linkTitle: "Logging / Monitoring / Tracing"
weight: 3
description: >
---

For RPC frameworks, logging, monitoring, and tracing are crucial components. Observability in cloud-native environments fundamentally relies on these three aspects.

The Volo framework uses the 'tracing' library to record its own logs and encourages users to employ the 'tracing' library to output logs and trace information. This approach allows for direct reuse of existing relevant Rust community ecosystems, such as libraries like 'tracing-opentelemetry'.

Users can also add logging or monitoring information to all requests by writing their own Services and Layers, such as:

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

Similarly, the process applies to monitoring information.
