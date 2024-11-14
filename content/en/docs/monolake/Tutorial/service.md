---
title: "Creating Service and Factory"
linkTitle: "Creating Service and Factory"
weight: 2
---

## Defining the Service and Factory
The `RoutingHandlerFactory` is responsible for creating and updating the `RoutingHandler` service instances. This factory implements the AsyncMakeService trait, allowing it to be used in a FactoryStack for service composition.

Let's start by defining the `RoutingHandler` service itself:
```rust
pub struct RoutingHandler<H> {
    inner: H,
    router: Router<RouteConfig>,
}
```
The `RoutingHandler` is responsible for matching incoming request paths against a set of predefined routes, selecting an appropriate upstream server, and forwarding the request to that server. It contains two fields:
    1. inner: The inner handler that processes requests after routing.
    2. router: A `matchit::Router` containing the routing configuration.

Now, let's look at the implementation of the RoutingHandlerFactory:
```rust
use monolake_services::http::handlers::route::{RoutingHandlerFactory, RouteConfig};
use service_async::{Param};

impl<F: AsyncMakeService> AsyncMakeService for RoutingHandlerFactory<F>
where
    F::Error: Into<AnyError>,
{
    type Service = RoutingHandler<F::Service>;
    type Error = RoutingFactoryError<F::Error>;

    async fn make_via_ref(
        &self,
        old: Option<&Self::Service>,
    ) -> Result<Self::Service, Self::Error> {
        let mut router: Router<RouteConfig> = Router::new();
        for route in self.routes.iter() {
            router.insert(&route.path, route.clone())?;
            if route.upstreams.is_empty() {
                return Err(RoutingFactoryError::EmptyUpstream);
            }
        }
        Ok(RoutingHandler {
            inner: self.inner.make_via_ref(old.map(|o| &o.inner)).await?,
            router,
        })
    }
}
```

In this implementation, the RoutingHandlerFactory takes two parameters:
1. inner: This is the inner service factory that the RoutingHandler will use to handle the requests after routing.
2. routes: This is the vector of `RouteConfig` instances that define the routing rules.

The AsyncMakeService implementation for the RoutingHandlerFactory defines how to create a new RoutingHandler instance. It first creates a Router from the configured RouteConfig instances, and then creates the RoutingHandler by calling the make_via_ref method in the inner service factory.

Note that in this case, we don't rely on any state from the previous RoutingHandler instance, as the routing configuration is fully defined by the RouteConfig instances. If the inner service factory had some stateful resources (like a connection pool) that needed to be preserved, we could clone those resources when creating the new RoutingHandler. For a more detailed example involving resource transfer, see [UpstreamHandler](https://github.com/cloudwego/monolake/blob/fd2cbe1a8708c379d6355b3cc979540ec49fdb4f/monolake-services/src/http/handlers/upstream.rs#L338), which involves transfer of a HTTP connection pool from the previous UpstreamHandler instance.

To integrate the `RoutingHandler` into a service stack, we can use the layer function provided by the `RoutingHandler` type:

```rust
use monolake_services::http::handlers::route::RoutingHandler;
use service_async::{layer::FactoryLayer};

impl RoutingHandler<H> {
    pub fn layer<C>() -> impl FactoryLayer<C, H, Factory = RoutingHandlerFactory<H>>
    where
        C: Param<Vec<RouteConfig>>,
    {
        service_async::layer::layer_fn(|c: &C, inner| {
            RoutingHandlerFactory::new(c.param(), inner)
        })
    }
}
```

The layer function creates a FactoryLayer that can be used in a FactoryStack to add the RoutingHandler to the service chain. The FactoryLayer trait is a key component of the service_async crate, allowing you to wrap and compose service factories in a modular and extensible way.

In this implementation, the layer function takes a configuration parameter C that implements the Param<Vec<RouteConfig>> trait. This ensures that the necessary routing configuration is available when creating the RoutingHandlerFactory. The layer function then creates the RoutingHandlerFactory by passing the Vec<RouteConfig> and the inner service factory to the RoutingHandlerFactory::new function.


## Adding the FactoryLayer in the FactoryStack

Finally, to integrate the RoutingHandler into a service stack, you can use the FactoryStack and the RoutingHandler::layer function:

```rust
use monolake_services::http::handlers::{
    route::RoutingHandler,
    ContentHandler, ConnectionPersistenceHandler, UpstreamHandler,
};
use service_async::{layer::FactoryLayer, stack::FactoryStack, Param};

let stacks = FactoryStack::new(config)
    .replace(UpstreamHandler::factory(Default::default()))
    .push(ContentHandler::layer())
    .push(RoutingHandler::layer())
    .push(ConnectionPersistenceHandler::layer());
```

In this example, we create a FactoryStack and add the RoutingHandler::layer to the stack, along with other handlers like ContentHandler and ConnectionPersistenceHandler. The FactoryStack will compose these layers into a complete service chain, allowing the RoutingHandler to be integrated seamlessly.