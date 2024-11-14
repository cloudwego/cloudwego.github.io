---
title: "Putting it all together"
linkTitle: "Putting it all together"
weight: 3
---

## Putting it all together

```rust
use service_async::{
    layer::{layer_fn, FactoryLayer}, AsyncMakeService, MakeService, Param, ParamMaybeRef, ParamRef, Service
};

#[derive(Clone)]
pub struct RoutingHandler<H> {
    inner: H,
    router: Router<RouteConfig>,
}

impl<H, CX, B> Service<(Request<B>, CX)> for RoutingHandler<H>
where
    CX: ParamRef<PeerAddr>,
    H: HttpHandler<CX, B>,
    H::Body: FixedBody,
{
    type Response = ResponseWithContinue<H::Body>;
    type Error = H::Error;

    async fn call(
        &self,
        (mut request, ctx): (Request<B>, CX),
    ) -> Result<Self::Response, Self::Error> {
        let req_path = request.uri().path();
        tracing::info!("request path: {req_path}");

        let peer_addr = ParamRef::<PeerAddr>::param_ref(&ctx);
        tracing::info!("Peer Addr: {:?}", peer_addr);

        match self.router.at(req_path) {
            Ok(route) => {
                let route = route.value;
                tracing::info!("the route id: {}", route.id);
                use rand::seq::SliceRandom;
                let upstream = route
                    .upstreams
                    .choose(&mut rand::thread_rng())
                    .expect("empty upstream list");

                rewrite_request(&mut request, upstream);

                self.inner.handle(request, ctx).await
            }
            Err(e) => {
                debug!("match request uri: {} with error: {e}", request.uri());
                Ok((generate_response(StatusCode::NOT_FOUND, false), true))
            }
        }
    }
}


pub struct RoutingHandlerFactory<F> {
    inner: F,
    routes: Vec<RouteConfig>,
}

#[derive(thiserror::Error, Debug)]
pub enum RoutingFactoryError<E> {
    #[error("inner error: {0:?}")]
    Inner(E),
    #[error("empty upstream")]
    EmptyUpstream,
    #[error("router error: {0:?}")]
    Router(#[from] matchit::InsertError),
}

impl<F: MakeService> MakeService for RoutingHandlerFactory<F> {
    type Service = RoutingHandler<F::Service>;
    type Error = RoutingFactoryError<F::Error>;

    fn make_via_ref(&self, old: Option<&Self::Service>) -> Result<Self::Service, Self::Error> {
        let mut router: Router<RouteConfig> = Router::new();
        for route in self.routes.iter() {
            router.insert(&route.path, route.clone())?;
            if route.upstreams.is_empty() {
                return Err(RoutingFactoryError::EmptyUpstream);
            }
        }
        Ok(RoutingHandler {
            inner: self
                .inner
                .make_via_ref(old.map(|o| &o.inner))
                .map_err(RoutingFactoryError::Inner)?,
            router,
        })
    }
}

impl<F> RoutingHandler<F> {
    pub fn layer<C>() -> impl FactoryLayer<C, F, Factory = RoutingHandlerFactory<F>>
    where
        C: Param<Vec<RouteConfig>>,
    {
        layer_fn(|c: &C, inner| {
            let routes = c.param();
            RoutingHandlerFactory { inner, routes }
        })
    }
}

fn rewrite_request<B>(request: &mut Request<B>, upstream: &Upstream) {
    // URI rewrite logic
}
```
