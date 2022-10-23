---
title: "Part 4. 添加一个中间件"
linkTitle: "添加一个中间件"
weight: 4
description: >

---

接下来，让我们来看下如何给 volo 添加一个中间件。

例如，我们需要一个中间件，打印出我们收到的请求、返回的响应以及消耗的时间，那我们可以在 lib.rs 中写这么一个 Service：

```rust
#[derive(Clone)]
pub struct LogService<S>(S);

#[volo::service]
impl<Cx, Req, S> volo::Service<Cx, Req> for LogService<S>
where
    Req: Send + 'static,
    S: Send + 'static + volo::Service<Cx, Req>,
    Cx: Send + 'static,
{
    async fn call(&mut self, cx: &mut Cx, req: Req) -> Result<S::Response, S::Error> {
        let now = std::time::Instant::now();
        let resp = self.0.call(cx, req).await;
        tracing::info!("Request took {}ms", now.elapsed().as_millis());
        resp
    }
}
```

随后，我们给这个 Service 包装一层 Layer：

```rust
pub struct LogLayer;

impl<S> volo::Layer<S> for LogLayer {
    type Service = LogService<S>;

    fn layer(self, inner: S) -> Self::Service {
        LogService(inner)
    }
}
```

最后，我们在 client 和 server 里面加一下这个 Layer：

```rust
use volo_example::LogLayer;

// client.rs
static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
    let addr: SocketAddr = "127.0.0.1:8080".parse().unwrap();
    volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example")
        .layer_inner(LogLayer)
        .address(addr)
        .build()
};

// server.rs
volo_gen::volo::example::ItemServiceServer::new(S)
    .layer(LogLayer)
    .run(addr)
    .await
    .unwrap();
```

这时候，在 info 日志级别下，我们会打印出请求的耗时。
