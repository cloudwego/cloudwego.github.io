---
title: "Config & context management"
linkTitle: "Config & context management"
weight: 1
description: "This doc covers how to manage configuration and context"
---

## Configuration Management

When building a service-oriented application using the `monolake-services` crate, you'll need to define the necessary configuration fields in your main `ServerConfig` struct. These fields will be used by the service factories to construct the services that make up your application.

The specific fields you'll need to add will depend on the services you're using. For example, if you're implementing a routing HTTP service, you'll probably want to add a routes field to hold the routing configuration.

To configure the routing service, you'll need to add the routes field to your `ServerConfig` struct. This field will hold the RouteConfig structures that define the routing rules.
```rust
pub struct ServerConfig {
    pub name: String,
    // ... other config fields, used by other services
    pub routes: Vec<RouteConfig>,
}
```

When creating the [FactoryStack](https://docs.rs/service-async/0.2.4/service_async/stack/struct.FactoryStack.html) to build your service chain, you'll need to ensure that the ServerConfig struct is used as the configuration parameter. To do this, you'll need to implement the Param trait for the fields that the RoutingHandlerFactory expects to access, in this case, the Vec<RouteConfig>.

```rust
impl Param<Vec<RouteConfig>> for ServerConfig {
    fn param(&self) -> Vec<RouteConfig> {
        self.routes.clone()
    }
}
```

By implementing this Param trait, you're ensuring that the necessary configuration data, specifically the routes field, is available to the `RoutingHandlerFactory` when it constructs the `RoutingHandler` service.

This approach applies to any service you're implementing using the monolake-services crate. You'll need to add the required configuration fields to your ServerConfig struct and implement the appropriate Param traits to make the data accessible to the service factories.

## Context Management

Before creating the RoutingHandler service, you need to define the request context using the [certain_map](https://docs.rs/certain-map/latest/certain_map/) crate. This context will hold the data that the RoutingHandler expects to be available, such as the peer address.

The certain_map crate provides a way to define a typed map that ensures the existence of specific items at compile-time. This is particularly useful when working with service-oriented architectures, where different services may depend on certain pieces of information being available in the request context.

```rust
certain_map::certain_map! {
    #[derive(Debug, Clone)]
    #[empty(EmptyContext)]
    #[full(FullContext)]
    pub struct Context {
        peer_addr: PeerAddr,
    }
}
```

In this example, the Context struct has a single field: peer_addr of type `PeerAddr`. It's important to note that the fields in the Context struct should correspond to the data that the `RoutingHandler` service expects to be available. In this case, the RoutingHandler requires the peer_addr information to be set in the context.

By defining the Context using the certain_map crate, you can ensure that the necessary data is available at compile-time, preventing runtime errors and simplifying the implementation of your services.

In this example, we assume that some other service in the service chain, such as the ContextService, is responsible for setting the peer_addr field in the Context. The RoutingHandler will then rely on this information being available when it is called.
