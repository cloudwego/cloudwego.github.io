---
title: "Getting Started"
linkTitle: "Getting Started"
weight: 1
keywords: ["Motore", "Volo", "Rust", "Middleware", "Getting Started"]
description: "This document introduces the core concepts of the Motore framework through a complete example to help you quickly understand Motore."
---

```rust
/*
 * Motore: A Tower-inspired asynchronous middleware abstraction library for Rust
 *
 * Core Concepts:
 * 1. `Service`: Represents an asynchronous service (Request -> Response).
 * 2. `Layer`: Represents middleware that wraps a `Service` and returns a new `Service`.
 * 3. `Cx`: A mutable context that is passed through the entire call chain. You can use it to pass data throughout the call chain (such as database connections, tracing spans, user information, etc.). This is a major feature of Motore and one of the main differences from Tower.
 */

// -----------------------------------------------------------------------------
// 1. Core Abstraction: `Service` Trait (Recommended: Use the macro)
// -----------------------------------------------------------------------------

// The core of `motore` is the `Service` trait (defined in motore/src/service/mod.rs).
// It represents a service that receives a `Cx` context and a `Request`, and asynchronously returns a `Response`.

// `motore-macros/src/lib.rs` provides the `#[motore::service]` macro,
// which is our recommended and most convenient way to implement the `Service` trait.
use motore::service;
use motore::service::Service;

// We define a context
#[derive(Debug, Clone)]
struct MyContext {
    request_id: u32,
    processing_steps: u32, // Example: a writable context state
}

struct MyMacroService;

// --- Implement `Service` using the `#[service]` macro ---
#[service]
impl Service<MyContext, String> for MyMacroService {
    async fn call(&self, cx: &mut MyContext, req: String) -> Result<String, Infallible> {
        // --- Demonstrate modifying &mut Cx ---
        cx.processing_steps += 1;
        
        println!("[MacroService] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);
        let res = Ok(req.to_uppercase());
        println!("[MacroService] responding req id: {}, step: {}", cx.request_id, cx.processing_steps);
        res
    }
}


// -----------------------------------------------------------------------------
// 2. Deeper Dive: The `Service` Trait
// -----------------------------------------------------------------------------

// In fact, behind the scenes, the `#[service]` macro:
// - Automatically infers from `Result<String, Infallible>`:
//   - `type Response = String;`
//   - `type Error = Infallible;`
// - Automatically converts `async fn call` to the `fn call(...) -> impl Future` signature required by the trait
// - Automatically wraps the function body in an `async move { ... }` block

// Finally, the macro transforms the Service you just implemented into the real core `Service` trait in `motore/src/service/mod.rs`

/*
pub trait Service<Cx, Request> {
    /// The response type returned when the service processes successfully
    type Response;
    /// The error type returned when the service fails to process
    type Error;

    /// Core method: process the request and return the response asynchronously
    /// Note this signature: it is *not* `async fn call`.
    /// It is a regular function that returns `impl Future` (RPITIT style).
    fn call(
        &self,
        cx: &mut Cx,
        req: Request,
    ) -> impl std::future::Future<Output = Result<Self::Response, Self::Error>> + Send;
}
*/

// Because it defines `fn call(...) -> impl Future`,
// if you don't use the macro, you have to *manually* match this signature:

use std::convert::Infallible;
use std::future::Future;

// This is our "business logic" service
struct MyManualService;

// --- Manually implement `Service` without the macro ---
//
// This is very tedious. You need to:
// 1. Explicitly define `type Response`
// 2. Explicitly define `type Error`
// 3. Write the correct `fn call(...) -> impl Future` signature
// 4. Return an `async move { ... }` block inside `call`
//
// This is exactly what the `#[service]` macro does for you automatically!
impl Service<MyContext, String> for MyManualService {
    type Response = String;
    type Error = Infallible; // Infallible means this service will never fail

    // Manually implement `call`
    fn call(
        &self,
        cx: &mut MyContext,
        req: String,
    ) -> impl Future<Output = Result<Self::Response, Self::Error>> + Send {
        // In this example, we only read the context, not modify it
        println!("[ManualService] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);

        // You must return something that implements Future, usually an async block
        async move {
            let res = Ok(req.to_uppercase());
            println!("[ManualService] responding req id: {}, step: {}", cx.request_id, cx.processing_steps);
            res
        }
    }
}

// Conclusion: The macro greatly simplifies the implementation of Service, allowing you to focus on the `async fn` business logic instead of the `impl Future` trait signature boilerplate.


// -----------------------------------------------------------------------------
// 3. Middleware: The `Layer` Trait
// -----------------------------------------------------------------------------

use motore::layer::Layer;

// `Layer` (from `motore/src/layer/mod.rs`) is a factory
// that takes an inner service `S` and returns a new, wrapped service `Self::Service`.
/*
pub trait Layer<S> {
    /// The new Service type returned after wrapping
    type Service;

    /// Wraps the inner service S into a new service Self::Service
    fn layer(self, inner: S) -> Self::Service;
}
*/

// --- Implement a `Layer` (logging middleware) ---

// This is the standard pattern for a Layer: "two structs"
// 1. `LogLayer`: The Layer itself (the factory)
#[derive(Clone)]
struct LogLayer {
    target: &'static str,
}

// 2. `LogService<S>`: The new Service returned by the Layer (the wrapper)
#[derive(Clone)]
struct LogService<S> {
    inner: S, // The inner service
    target: &'static str,
}

// Implement the `Layer` trait
impl<S> Layer<S> for LogLayer {
    type Service = LogService<S>; // Specify the return type

    fn layer(self, inner: S) -> Self::Service {
        // Return the new, wrapped Service
        LogService {
            inner,
            target: self.target,
        }
    }
}

// --- Manually implement the `Service` trait for `LogService` ---
//
// Again, this is tedious.
impl<Cx, Req, S> Service<Cx, Req> for LogService<S>
where
    // `S` must also be a Service and satisfy constraints like Send/Sync
    S: Service<Cx, Req> + Send + Sync,
    S::Response: Send,
    S::Error: Send,
    Cx: Send, // LogService is generic, it doesn't care about the concrete type of Cx
    Req: Send, 
{
    // The response and error types are usually the same as the inner service
    type Response = S::Response;
    type Error = S::Error;

    fn call(
        &self,
        cx: &mut Cx,
        req: Req,
    ) -> impl Future<Output = Result<Self::Response, Self::Error>> + Send {
        println!("[LogLayer] (Manual) target: {}, enter", self.target);
        
        // Must return an async block
        async move {
            // Execute logic before calling the inner service
            
            // Call the inner service
            let result = self.inner.call(cx, req).await;

            // Execute logic after the inner service returns
            match &result {
                Ok(_) => println!("[LogLayer] (Manual) target: {}, exit (Ok)", self.target),
                Err(_) => println!("[LogLayer] (Manual) target: {}, exit (Err)", self.target),
            }
            
            result
        }
    }
}

// -----------------------------------------------------------------------------
// 4. Implementing the `Service` part of a `Layer` with a macro
// -----------------------------------------------------------------------------

// We can also use the macro on the `impl` block for `LogService<S>`
// (Note: the `impl` block for the `Layer` trait remains unchanged, the macro is only for the `Service` trait)

#[derive(Clone)]
struct LogServiceMacro<S> {
    inner: S,
    target: &'static str,
}

// (The `impl Layer` part is omitted, it's the same as above, returning `LogServiceMacro<S>`)

// --- Implement `LogService` using the macro ---
#[service]
impl<Cx, Req, S> Service<Cx, Req> for LogServiceMacro<S>
where
    S: Service<Cx, Req> + Send + Sync, // Inner service constraints
    Cx: Send + 'static,
    Req: Send + 'static,
{
    // Again, we just need to write `async fn`
    // The macro will automatically infer `Response = S::Response` and `Error = S::Error`
    async fn call(&self, cx: &mut Cx, req: Req) -> Result<S::Response, S::Error> {
        println!("[LogLayer] (Macro) target: {}, enter", self.target);
        
        // The logic is identical, but the code is cleaner
        let result = self.inner.call(cx, req).await;
        
        match &result {
            Ok(_) => println!("[LogLayer] (Macro) target: {}, exit (Ok)", self.target),
            Err(_) => println!("[LogLayer] (Macro) target: {}, exit (Err)", self.target),
        }
        
        result
    }
}

// -----------------------------------------------------------------------------
// 5. Composition: `ServiceBuilder`
// -----------------------------------------------------------------------------

use motore::builder::ServiceBuilder;
use motore::timeout::TimeoutLayer; // A Layer that comes with Motore (motore/src/timeout.rs)
use std::time::Duration;

// `ServiceBuilder` (from `motore/src/builder.rs`)
// allows you to compose multiple Layers onto a Service.

async fn run_builder() {
    // 1. Create a ServiceBuilder
    let builder = ServiceBuilder::new()
        // 2. Add Layers.
        //    Request execution order: top to bottom
        //    Response execution order: bottom to top
        .layer(LogLayer { target: "Outer" })
        .layer(TimeoutLayer::new(Some(Duration::from_secs(1)))) // A Layer provided by default in Motore
        .layer(LogLayer { target: "Inner" });

    // 3. Apply the Layer stack to an "innermost" service
    //    Here we use `MyMacroService` as the core business service
    let service = builder.service(MyMacroService);

    // 4. Prepare the context and request
    //    Note: processing_steps starts at 0
    let mut cx = MyContext { request_id: 42, processing_steps: 0 };
    let req = "hello motore".to_string();

    // 5. Call it!
    let res = service.call(&mut cx, req).await;

    println!("\nFinal response: {:?}", res);
    
    /*
     * Expected output:
     *
     * [LogLayer] (Manual) target: Outer, enter
     * [LogLayer] (Manual) target: Inner, enter
     * [MacroService] handling req id: 42, step: 1   <-- step becomes 1
     * [MacroService] responding req id: 42, step: 1
     * [LogLayer] (Manual) target: Inner, exit (Ok)
     * [LogLayer] (Manual) target: Outer, exit (Ok)
     *
     * Final response: Ok("HELLO MOTORE")
     */

     // Finally, the original cx has been modified
     println!("Final context steps: {}", cx.processing_steps); // Will print 1
}

// -----------------------------------------------------------------------------
// 6. Helper Utility: `service_fn`
// -----------------------------------------------------------------------------

// Sometimes you don't want to create a new struct for a simple service.
// `motore/src/service/service_fn.rs` provides `service_fn`, which can directly convert a compliant function into a `Service`.

use motore::service::service_fn;

async fn my_handler_func(cx: &mut MyContext, req: String) -> Result<String, Infallible> {
    // --- Demonstrate modifying &mut Cx ---
    cx.processing_steps += 10;

    println!("[service_fn] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);
    Ok(req.to_lowercase())
}


#[tokio::main] async fn main() {
    println!("\n--- Example 1: Running `run_builder` ---");

    run_builder().await;

    println!("\n--- Example 2: Running `service_fn` (standalone) ---");

    // `service_fn` can convert a function or closure that matches the `async fn(&mut Cx, Req) -> Result<Res, Err>` signature
    // directly into a `Service`.
    let fn_service = service_fn(my_handler_func);

    // Let's run it to prove it works
    let mut cx1 = MyContext { request_id: 101, processing_steps: 0 };
    let res1 = fn_service.call(&mut cx1, "HELLO WORLD".to_string()).await;
    // Check the modified context
    println!("service_fn response: {:?}, context steps: {}", res1, cx1.processing_steps); // prints 10


    println!("\n--- Example 3: Running `service_fn` (in a Builder) ---");

    // You can also use it in a ServiceBuilder:
    let service_from_fn = ServiceBuilder::new()
        .layer(LogLayer { target: "ServiceFn" })
        .service_fn(my_handler_func); // shorthand for .service(service_fn(my_handler_func))

    // Run it
    let mut cx2 = MyContext { request_id: 202, processing_steps: 0 };
    let res2 = service_from_fn.call(&mut cx2, "ANOTHER EXAMPLE".to_string()).await;
    // Check the modified context
    println!("service_from_fn response: {:?}, context steps: {}", res2, cx2.processing_steps); // prints 10
}
```

## What you've learned

-  Motore's core design: Service, Layer, and the mutable Cx context
-  The use of `#[motore::service]`
-  How to assemble Services and Layers using `ServiceBuilder`

## What's Next?

Congratulations on getting this far! We have now learned the basic usage of Motore. We hope it will make your journey in the world of Volo much smoother.

Next, you can check out some features of Motore that were not covered in this tutorial:

1. The tutorial only mentioned `Service<Cx, Request>`, but Motore also provides some important `Service` variants: for example, [`UnaryService<Request>`](https://deepwiki.com/cloudwego/motore/2.1-service-trait#unaryservice-variant) without a context, and [`BoxService<Cx, T, U, E>`](https://deepwiki.com/cloudwego/motore/2.1-service-trait#type-erasure-with-boxservice) for type erasure.
2. Motore provides more advanced tools for Layers and ServiceBuilder: for example, [layer_fn](https://deepwiki.com/cloudwego/motore/4.2-layer-combinators#layerfn-implementation) which is very similar to `service_fn`, [option_layer](https://deepwiki.com/cloudwego/motore/2.3-service-builder#conditional-layer-application) which supports `Option<Layer<...>>` (and the [`Either<A, B>` enum](https://deepwiki.com/cloudwego/motore/6-utilities#either-type) that supports this feature), and [map_err](https://deepwiki.com/cloudwego/motore/2.3-service-builder#convenience-methods-for-common-middleware) as a form of Layer.
3. Through the `ServiceExt` Trait, Motore [provides](https://deepwiki.com/cloudwego/motore/4.1-service-combinators#serviceext-trait-and-combinator-overview) `Future`-like methods for `Service`, allowing you to call `.map_err()` and `.map_response()` on a Service.
4. Bidirectional compatibility with the Tower ecosystem: Motore is not only inspired by `Tower`, but also [provides a complete **bidirectional** adaptation layer](https://deepwiki.com/cloudwego/motore/5.1-tower-integration) for it.
5. Motore provides a dedicated [`MakeConnection<Address>` Trait](https://deepwiki.com/cloudwego/motore/6-utilities#makeconnection-trait) to abstract the creation of "connections".
6. The Motore package [enables the `service_send` feature by default](https://deepwiki.com/cloudwego/motore/1.1-project-structure#feature-flag-configuration). It requires that all `Future`s returned by `Service` satisfy the `Send` constraint. `motore-macros` also checks this feature. If you disable it, Motore can be used in a single-threaded environment (e.g., `tokio::main(flavor = "current_thread")`) without the `Send` constraint.
