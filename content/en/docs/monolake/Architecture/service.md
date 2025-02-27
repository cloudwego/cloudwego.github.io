---
title: "Service"
linkTitle: "Service"
weight: 2
description: "Overview of Monolake's service architecture, factory patterns, and how they enable modular and composable network services"
---

## Services

<style>
.figure-caption {
    text-align: center;
}
</style>

{{< figure src="/img/docs/monolake_service.jpeg" width="1000" height="600" caption="Service Architecture" class="figure-caption" >}}

The Service pattern is a fundamental abstraction in network programming, popularized by the Tower library in the Rust ecosystem. At its core, a Service represents an asynchronous function that processes requests and returns responses. This pattern is particularly powerful for building networking applications as it enables:

- **Composability**: Services can be layered and combined
- **Middleware**: Common functionality like timeout, rate limiting can be implemented as wrapper services
- **Protocol Agnosticism**: The pattern works across different protocols (HTTP, Thrift, etc.)
- **Testability**: Services can be easily mocked and tested in isolation

## Improved Service Trait
<div class="code-compare">
  <div class="code-block">
    <h4>Tower's Service Trait</h4>
{{< highlight rust >}}
pub trait Service<Request> {
    type Response;
    type Error;
    type Future: Future<Output = Result<Self::Response, Self::Error>>;

    // Required methods
    fn poll_ready(
        &mut self,
        cx: &mut Context<'_>,
    ) -> Poll<Result<(), Self::Error>>;
    fn call(&mut self, req: Request) -> Self::Future;
}
{{< /highlight >}}
  </div>
  <div class="code-block">
    <h4>Monolake Service Trait</h4>
{{< highlight rust >}}
pub trait Service<Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;
    /// Process the request and return the response asynchronously.
    fn call(&self, req: Request) -> impl Future<Output = Result<Self::Response, Self::Error>>;
}
{{< /highlight >}}
  </div>
</div>

<style>
.code-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.code-block {
  min-width: 0;
}

.code-block h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}
</style>


## New Service Trait

<div class="code-compare">
  <div class="code-block">
    <h4>Async Service trait</h4>
{{< highlight rust >}}
impl<S, Req> tower::Service<Req> for SomeStruct<S>
where
    // ...
{
    type Response = // ...;
    type Error = // ...;
    type Future = Pin<Box<dyn Future<Output = ...> + Send + 'static>>;
    
    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }
    
    fn call(&mut self, req: Req) -> Self::Future {
        let client = self.client.clone();
        Box::pin(async move {
            client.get(req).await;
            // ...
        })
    }
}
{{< /highlight >}}
  </div>
  <div class="code-block">
    <h4>Trait implementation</h4>
{{< highlight rust >}}
impl<R, T> Service<R> for DelayService<T>
where
    T: Service<R>,
{
    type Response = T::Response;
    type Error = T::Error;

    async fn call(&self, req: R) -> Result<Self::Response, Self::Error> {
        monoio::time::sleep(self.delay).await;
        self.inner.call(req).await
    }
}
{{< /highlight >}}
  </div>
</div>

<style>
.code-compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.code-block {
  min-width: 0;
}

.code-block h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}
</style>

Tower framework's [Service trait](https://docs.rs/tower/latest/tower/trait.Service.html), while powerful, presents some challenges:

1. Limited Capture Scope: As a future factory used serially and spawned for parallel execution, Tower's Service futures cannot capture &self or &mut self. This necessitates cloning and moving ownership into the future.


2. Complex Poll-Style Implementation: Tower's Service trait is defined in a poll-style, requiring manual state management. This often leads to verbose implementations using Box<Pin<...>> to leverage async/await syntax.

Monolake's [service_async](https://docs.rs/service-async/0.2.4/service_async/index.html) crate leverages [impl Trait](https://doc.rust-lang.org/reference/types/impl-trait.html) to introduce a new [Service trait](https://docs.rs/service-async/0.2.4/service_async/trait.Service.html), designed to simplify implementation and improve performance:

1. Efficient Borrowing: By using impl Trait in the return position, futures can now capture &self, eliminating unnecessary cloning.


2. Zero-Cost Abstractions: Utilizing impl Trait instead of Box<dyn...> allows for more inline code optimization, especially for operations not crossing await points.

## Service Factories & MakeService Trait

In complex systems, creating and managing services often requires more flexibility than a simple constructor can provide. This is where the concept of Service factories comes into play. A Service factory is responsible for creating instances of services, potentially with complex initialization logic or state management.

The [`MakeService`](https://docs.rs/service-async/0.2.4/service_async/trait.`MakeService`.html) trait is the cornerstone of our Service factory system. It provides a flexible way to construct service chains while allowing state migration from previous instances. This is particularly useful when services manage stateful resources like connection pools, and you need to update the service chain with new configurations while preserving existing resources.

```rust
pub trait MakeService {
    type Service;
    type Error;
    
    fn make_via_ref(&self, old: Option<&Self::Service>) -> Result<Self::Service, Self::Error>;
    fn make(&self) -> Result<Self::Service, Self::Error> {
        self.make_via_ref(None)
    }
}
```

Key features of ``MakeService``:

- make_via_ref method allows creating a new service while optionally referencing an existing one.
- Enables state preservation and resource reuse between service instances.
- make method provides a convenient way to create a service without an existing reference.

This approach allows for efficient updates to service chains, preserving valuable resources when reconfiguring services.

## FactoryLayer & FactoryStack

{{< figure src="/img/docs/monolake_factory_stack.png" width="1000" height="600" caption="Service Architecture" >}}

To enable more complex service compositions, we introduce the FactoryLayer trait, which defines how to wrap one factory with another, creating a new composite factory. Factories can define a layer function that creates a factory wrapper, similar to the Tower framework's Layer but with a key distinction, our layer creates a Factory that wraps an inner Factory, which can then be used to construct the entire Service chain.

[FactoryStack](https://docs.rs/service-async/0.2.4/service_async/stack/struct.FactoryStack.html) is a powerful abstraction that allows for the creation of complex service chains. It manages a stack of service factories, providing methods to push new layers onto the stack and to create services from the assembled stack.The FactoryStack works by composing multiple FactoryLayers together. Each layer in the stack wraps the layers below it, creating a nested structure of factories. When you call make or make_async on a FactoryStack, it traverses this structure from the outermost layer to the innermost, creating the complete service chain.

## Service Lifecycle Management

At the core of the threading model is the concept of a "worker" - a dedicated thread that is responsible for executing service-related tasks. The framework includes a centralized "worker manager" component that is responsible for spawning and coordinating these worker threads. 
Service Lifecycle Management

The monolake framework also introduces a sophisticated service lifecycle management system to handle the deployment, updating, and removal of network services. This system supports two primary deployment models:
1. Two-Stage Deployment:
  - Staging: In this model, a new service instance is first "staged" or prepared, potentially reusing state from an existing service. This allows for careful validation and testing of the new service before deployment.
  - Deployment: Once the new service is staged, it can be deployed to replace the existing service. This process ensures a smooth transition, minimizing downtime and preserving valuable state.
2. Single-Stage Deployment:
  - In this simpler model, a new service is created and deployed in a single operation. While less complex, this approach does not provide the same level of state preservation and service continuity as the two-stage deployment model.

The service lifecycle management system is designed to provide a high degree of control and flexibility over the deployment and updating of network services. This enables seamless service versioning, rolling updates, and state preservation, ensuring that the network services running on the monolake framework can be maintained and improved over time without disrupting the overall system's availability.

## Putting it all together

This example demonstrates the practical application of the `MakeService`, [FactoryLayer](https://docs.rs/service-async/0.2.4/service_async/layer/trait.FactoryLayer.html), and [FactoryStack](https://docs.rs/service-async/0.2.4/service_async/stack/struct.FactoryStack.html) concepts. It defines several services (SvcA and SvcB) and their corresponding factories. The FactoryStack is then used to compose these services in a layered manner. The Config struct provides initial configuration, which is passed through the layers. Finally, in the main function, a service stack is created, combining SvcAFactory and SvcBFactory. The resulting service is then called multiple times, showcasing how the chain of services handles requests and maintains state.

```rust
use std::{
    convert::Infallible,
    sync::atomic::{AtomicUsize, Ordering},
};

use service_async::{
    layer::{layer_fn, FactoryLayer},
    stack::FactoryStack,
    AsyncMakeService, BoxedMakeService, BoxedService, MakeService, Param, Service,
};

#[cfg(unix)]
use monoio::main as main_macro;
#[cfg(not(unix))]
use tokio::main as main_macro;

// ===== Svc*(impl Service) and Svc*Factory(impl NewService) =====

struct SvcA {
    pass_flag: bool,
    not_pass_flag: bool,
}

// Implement Service trait for SvcA
impl Service<()> for SvcA {
    type Response = ();
    type Error = Infallible;

    async fn call(&self, _req: ()) -> Result<Self::Response, Self::Error> {
        println!(
            "SvcA called! pass_flag = {}, not_pass_flag = {}",
            self.pass_flag, self.not_pass_flag
        );
        Ok(())
    }
}

struct SvcAFactory {
    init_flag: InitFlag,
}

struct InitFlag(bool);

impl MakeService for SvcAFactory {
    type Service = SvcA;
    type Error = Infallible;

    fn make_via_ref(&self, old: Option<&Self::Service>) -> Result<Self::Service, Self::Error> {
        Ok(match old {
            // SvcAFactory can access state from the older service
            // which was created.
            Some(r) => SvcA {
                pass_flag: r.pass_flag,
                not_pass_flag: self.init_flag.0,
            },
            // There was no older service, so create SvcA from
            // service factory config.
            None => SvcA {
                pass_flag: self.init_flag.0,
                not_pass_flag: self.init_flag.0,
            },
        })
    }
}

struct SvcB<T> {
    counter: AtomicUsize,
    inner: T,
}

impl<T> Service<usize> for SvcB<T>
where
    T: Service<(), Error = Infallible>,
{
    type Response = ();
    type Error = Infallible;

    async fn call(&self, req: usize) -> Result<Self::Response, Self::Error> {
        let old = self.counter.fetch_add(req, Ordering::AcqRel);
        let new = old + req;
        println!("SvcB called! {old}->{new}");
        self.inner.call(()).await?;
        Ok(())
    }
}

struct SvcBFactory<T>(T);

impl<T> MakeService for SvcBFactory<T>
where
    T: MakeService<Error = Infallible>,
{
    type Service = SvcB<T::Service>;
    type Error = Infallible;

    fn make_via_ref(&self, old: Option<&Self::Service>) -> Result<Self::Service, Self::Error> {
        Ok(match old {
            Some(r) => SvcB {
                counter: r.counter.load(Ordering::Acquire).into(),
                inner: self.0.make_via_ref(Some(&r.inner))?,
            },
            None => SvcB {
                counter: 0.into(),
                inner: self.0.make()?,
            },
        })
    }
}

// ===== impl layer fn for Factory instead of defining manually =====

impl SvcAFactory {
    fn layer<C>() -> impl FactoryLayer<C, (), Factory = Self>
    where
        C: Param<InitFlag>,
    {
        layer_fn(|c: &C, ()| SvcAFactory {
            init_flag: c.param(),
        })
    }
}

impl<T> SvcBFactory<T> {
    fn layer<C>() -> impl FactoryLayer<C, T, Factory = Self> {
        layer_fn(|_: &C, inner| SvcBFactory(inner))
    }
}


// ===== Define Config and impl Param<T> for it =====
#[derive(Clone, Copy)]
struct Config {
    init_flag: bool,
}

impl Param<InitFlag> for Config {
    fn param(&self) -> InitFlag {
        InitFlag(self.init_flag)
    }
}

#[main_macro]
async fn main() {
    let config = Config { init_flag: false };
    let stack = FactoryStack::new(config)
        .push(SvcAFactory::layer())
        .push(SvcBFactory::layer());

    let svc = stack.make_async().await.unwrap();
    svc.call(1).await.unwrap();
    svc.call(2).await.unwrap();
    svc.call(3).await.unwrap();
}
```
