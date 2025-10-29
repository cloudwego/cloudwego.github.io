---
title: "快速开始"
linkTitle: "快速开始"
weight: 1
keywords: ["Motore", "Volo", "Rust", "中间件", "快速开始"]
description: "通过一个完整的示例介绍 Motore 框架的核心概念，帮助你快速了解 Motore。"
---
## 准备环境

教程正文本身就是能运行的 Rust 代码。你可以直接看，也可以把教程正文复制粘贴到一个新 cargo 包的 `src/main.rs` 中，然后用 IDE 看，这样就有 可以看到 rust-analyzer 的类型提示 等等诸多好处，提升本教程效果。

不要忘了在 `Cargo.toml` 文件中加入教程正文所需的依赖：
```toml
[package]
name = "hello-motore"
version = "0.1.0"
edition = "2024"

[dependencies]
motore = { version = "0"}

# Motore 依赖 tokio，我们也需要一个 tokio 运行时来执行 main 函数
tokio = { version = "1", features = ["full"] }
```

## 教程正文

```rust
/*
 * Motore: 一个受 Tower 启发的 Rust 异步中间件抽象库
 *
 * 核心理念：
 * 1. `Service`: 代表一个异步服务 (Request -> Response)。
 * 2. `Layer`: 代表中间件，它包装一个 `Service` 并返回一个新的 `Service`。
 * 3. `Cx`: 一个可变的上下文，在整个调用链中传递，你可以使用它在整个调用链中传递数据（比如数据库连接、tracing span、用户信息等），这可是 Motore 的一大特色，也是与 Tower 的主要区别之一。
 */

// -----------------------------------------------------------------------------
// 1. 实现一个 `Service`
// -----------------------------------------------------------------------------

// 我们先定义一个上下文（Context）
#[derive(Debug, Clone)]
struct MyContext {
    request_id: u32,
    processing_steps: u32, // 示例：一个可写的上下文状态
}

use motore::service::Service;
use std::convert::Infallible; 

// 这是我们的 “字符串转大写” 服务
struct ToUppercaseService;

// --- 为 ToUppercaseService 实现 Service trait---
impl Service<MyContext, String> for ToUppercaseService {
    type Response = String;
    type Error = Infallible; // Infallible 表示这个服务永远不会失败

    async fn call(&self, cx: &mut MyContext, req: String) -> Result<Self::Response, Self::Error> {
        // --- 演示对 &mut Cx 的修改 ---
        cx.processing_steps += 1;
        
        println!("[ToUppercaseService] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);
        let res = Ok(req.to_uppercase());
        println!("[ToUppercaseService] responding req id: {}, step: {}", cx.request_id, cx.processing_steps);
        res
    }
}


// -----------------------------------------------------------------------------
// 2. 实现一个 `Layer`
// -----------------------------------------------------------------------------

// `Layer` (来自 `motore/src/layer/mod.rs`) 是一个工厂，
// 它接收一个内部服务 `S` (inner)，并返回一个包装后的新服务 `Self::Service`。
/*
pub trait Layer<S> {
    /// 包装后返回的新 Service 类型
    type Service;

    /// 将内部服务 S 包装成新服务 Self::Service
    fn layer(self, inner: S) -> Self::Service;
}
*/

// --- 实现一个 `Layer` (日志中间件) ---

// 这是 Layer 的标准模式："两个 Struct"
// 1. `LogLayer`: Layer 本身 (工厂)
#[derive(Clone)]
struct LogLayer {
    target: &'static str,
}

// 2. `LogService<S>`: Layer 返回的新 Service (包装器)
#[derive(Clone)]
struct LogService<S> {
    inner: S, // 内部服务
    target: &'static str,
}

use motore::layer::Layer;
// 为 LogLayer 实现 Layer trait
impl<S> Layer<S> for LogLayer {
    type Service = LogService<S>;

    fn layer(self, inner: S) -> Self::Service {
        // 返回包装后的新 Service
        LogService {
            inner,
            target: self.target,
        }
    }
}

impl<Cx, Req, S> Service<Cx, Req> for LogService<S>
where
    // `S` 必须也是一个 Service，并且满足 Send/Sync 等约束
    S: Service<Cx, Req> + Send + Sync,
    Cx: Send + 'static,
    Req: Send + 'static,
{
    // 响应和错误类型通常与内部服务相同
    type Response = S::Response;
    type Error = S::Error;

    async fn call(&self, cx: &mut Cx, req: Req) -> Result<Self::Response, Self::Error> {
        // 在调用内部服务之前执行逻辑
        println!("[LogLayer] target: {}, enter", self.target);
        
        // 调用内部服务
        let result = self.inner.call(cx, req).await;

        // 在内部服务返回之后执行逻辑
        match &result {
            Ok(_) => println!("[LogLayer] target: {}, exit (Ok)", self.target),
            Err(_) => println!("[LogLayer] target: {}, exit (Err)", self.target),
        }
        
        result
    }
}

// -----------------------------------------------------------------------------
// 3. 拓展知识：`async fn call` 是如何工作的
// -----------------------------------------------------------------------------

// `motore` 的核心 `Service` trait (定义于 motore/src/service/mod.rs) 
// 实际上是这样定义的：
/*
pub trait Service<Cx, Request> {
    /// Service 处理成功时返回的响应类型
    type Response;
    /// Service 处理失败时返回的错误类型
    type Error;

    /// 核心方法：处理请求并异步返回响应
    ///
    /// 注意这个签名！它不是 `async fn`。
    /// 它是一个返回 `impl Future` 的普通函数。
    /// 这种语法被称为 "Return Position `impl Trait` in Trait" (RPITIT)。
    fn call(
        &self,
        cx: &mut Cx,
        req: Request,
    ) -> impl std::future::Future<Output = Result<Self::Response, Self::Error>> + Send;
}
*/

// 你可能已经注意到了：
// 为什么 `Service` trait 要求的签名是 `fn call(...) -> impl Future`，
// 而我们自己写的（在 ToUppercaseService 和 LogService 中）却是 `async fn call`？
// 这两个不一样的签名，为什么编译却能通过呢？

// 答案就是 `async fn in trait` (AFIT) 特性。

// AFIT 特性下，trait 中的 `async fn` 其实是 `fn ... -> impl Future` 的 “语法糖”。

// 当 Rust 编译器看到你试图用 `async fn call` 来实现一个
// 期望 `fn call(...) -> impl Future` 的 trait 时，
// 它会自动帮你完成这个“语法糖”的转换（转换过程被称作脱糖 -- desugars）。

// **总结一下：**
// 1.  Motore 的 `Service` trait 使用 RPITIT (`fn ... -> impl Future`) 来定义。
// 2.  Rust 编译器的 AFIT 特性，允许我们直接使用 `async fn` 来实现这个 trait。
// 3.  我们在编写服务和中间件时，既能享受 `async/await` 的便利，又能获得 `impl Trait` 带来的零成本抽象。


// -----------------------------------------------------------------------------
// 4. 通过 `ServiceBuilder` 把服务和中间件拼装到一块儿
// -----------------------------------------------------------------------------

// `ServiceBuilder` (来自 `motore/src/builder.rs`)
// 允许你将多个 Layer 叠到一个 Service 上。

use motore::builder::ServiceBuilder;
use std::time::Duration;
use motore::timeout::TimeoutLayer; // Motore 自带的 Layer

async fn run_builder() {
    // 1. 创建一个 ServiceBuilder
    let builder = ServiceBuilder::new()
        // 2. 添加 Layer。
        //    请求的执行顺序：从上到下
        //    响应的执行顺序：从下到上
        .layer(LogLayer { target: "Outer" })
        .layer(TimeoutLayer::new(Some(Duration::from_secs(1))))
        .layer(LogLayer { target: "Inner" });

    // 3. 将 Layer 栈应用到一个“最内部”的服务上
    //    这里我们使用 `ToUppercaseService` 作为最核心的业务服务
    let service = builder.service(ToUppercaseService);

    // 4. 准备上下文和请求
    //    注意：processing_steps 从 0 开始
    let mut cx = MyContext { request_id: 42, processing_steps: 0 };
    let req = "hello motore".to_string();

    // 5. 调用！
    let res = service.call(&mut cx, req).await;

    println!("\nFinal response: {:?}", res);
    
    /*
     * 预期输出：
     *
     * [LogLayer] target: Outer, enter
     * [LogLayer] target: Inner, enter
     * [ToUppercaseService] handling req id: 42, step: 1     <-- step 变为 1
     * [ToUppercaseService] responding req id: 42, step: 1
     * [LogLayer] target: Inner, exit (Ok)
     * [LogLayer] target: Outer, exit (Ok)
     *
     * Final response: Ok("HELLO MOTORE")
     */

     // 最终，原始的 cx 已经被修改
     println!("Final context steps: {}", cx.processing_steps); // 将打印 1
}

// 讲个好玩的，ServiceBuilder 也实现了 Layer trait，所以能把一个 ServiceBuilder 放在另外一个 ServiceBuilder 的 layer 方法里面：
// --- 有一堆中间件 ---
// struct LogLayer;
// struct TimeoutLayer;
// struct AuthLayer;
// struct MetricsLayer;
// struct MyCoreService;
//
// 1. 我们可以创建一个可复用的 "鉴权" 中间件栈
// let auth_stack = ServiceBuilder::new()
//     .layer(MetricsLayer)
//     .layer(AuthLayer);
//
// 2. 现在，auth_stack 是一个 ServiceBuilder<...>
//    因为 ServiceBuilder 实现了 Layer，
//    所以我们可以把整个 auth_stack 当作一个 Layer 来使用！
//
// 3. 在我们的主 ServiceBuilder 中使用 auth_stack
// let final_service = ServiceBuilder::new()
//     .layer(LogLayer)
//     .layer(auth_stack) // <-- 这一步之所以能成功，就是因为 ServiceBuilder 实现了 Layer
//     .layer(TimeoutLayer)
//     .service(MyCoreService);

// -----------------------------------------------------------------------------
// 5. 辅助工具：`service_fn`
// -----------------------------------------------------------------------------

// 有时候你不想为简单的服务创建一个新 struct。
// `motore/src/service/service_fn.rs` 提供了 `service_fn`，它能把符合要求的函数直接转换成一个 `Service`。

use motore::service::service_fn;

async fn my_handler_func(cx: &mut MyContext, req: String) -> Result<String, Infallible> {
    // --- 演示对 &mut Cx 的修改 ---
    cx.processing_steps += 10;

    println!("[service_fn] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);
    Ok(req.to_lowercase())
}


#[tokio::main]
async fn main() {
    println!("\n--- 示例 1: 运行 `run_builder` ---");

    run_builder().await;

    println!("\n--- 示例 2: 运行 `service_fn` (独立) ---");

    // `service_fn` 可以将一个符合 `async fn(&mut Cx, Req) -> Result<Res, Err>` 签名
    // 的函数或闭包，直接转换成一个 `Service`。
    let fn_service = service_fn(my_handler_func);

    // 我们也运行一下它，来证明它是工作的
    let mut cx1 = MyContext { request_id: 101, processing_steps: 0 };
    let res1 = fn_service.call(&mut cx1, "HELLO WORLD".to_string()).await;
    // 检查修改后的上下文
    println!("service_fn 响应: {:?}, context steps: {}", res1, cx1.processing_steps); // 打印 10


    println!("\n--- 示例 3: 运行 `service_fn` (在 Builder 中) ---");

    // 你也可以在 ServiceBuilder 中使用它：
    let service_from_fn = ServiceBuilder::new()
        .layer(LogLayer { target: "ServiceFn" })
        .service_fn(my_handler_func); // .service(service_fn(my_handler_func)) 的简写

    // 运行它
    let mut cx2 = MyContext { request_id: 202, processing_steps: 0 };
    let res2 = service_from_fn.call(&mut cx2, "ANOTHER EXAMPLE".to_string()).await;
    // 检查修改后的上下文
    println!("service_from_fn 响应: {:?}, context steps: {}", res2, cx2.processing_steps); // 打印 10
}
```

## 学到了什么

-  Motore 的核心设计：Service、Layer 和可变的 Cx 上下文
-  Rust 的 AFIT 和 RPITIT 特性，以及他们在 Motore 的应用
-  使用 ServiceBuilder 把 Service、Layer 组装到一起

## What's Next?

恭喜你，阅读到了这里！至此，我们已经学会 Motore 的基本使用了，祝愿它能让你在 Volo 的世界里遨游时更加如鱼得水～

接下来可以看看本教程中没有讲到，但实际上 Motore 有的一些功能：

1. 教程只提到了 `Service<Cx, Request>`，但 Motore 还提供了一些重要的 `Service` 变体：例如 没有上下文的 [`UnaryService<Request>`](https://deepwiki.com/cloudwego/motore/2.1-service-trait#unaryservice-variant)、用于类型擦除的 [`BoxService<Cx, T, U, E>`](https://deepwiki.com/cloudwego/motore/2.1-service-trait#type-erasure-with-boxservice)。
1. Motore 针对 Layer 和 ServiceBuilder 提供了更多高级工具：例如 神似 service_fn 的 [layer_fn](https://deepwiki.com/cloudwego/motore/4.2-layer-combinators#layerfn-implementation) 、支持 `Option<Layer<...>>` 的 [option_layer](https://deepwiki.com/cloudwego/motore/2.3-service-builder#conditional-layer-application)（以及支撑这个功能的 [`Either<A, B>` 枚举](https://deepwiki.com/cloudwego/motore/6-utilities#either-type)）、作为 Layer 形式的 [map_err](https://deepwiki.com/cloudwego/motore/2.3-service-builder#convenience-methods-for-common-middleware)。
1. 通过 `ServiceExt` Trait，Motore 为 `Service` [提供了](https://deepwiki.com/cloudwego/motore/4.1-service-combinators#serviceext-trait-and-combinator-overview) 类似 `Future` 的方法，能让你在 Service 上调用 `.map_err()` `.map_response()`。

1. 与 Tower 生态双向兼容： Motore 不仅受 `Tower` 启发，还为其[提供了完整的**双向**适配层](https://deepwiki.com/cloudwego/motore/5.1-tower-integration)。

1. Motore 提供了一个专门的 [`MakeConnection<Address>` Trait](https://deepwiki.com/cloudwego/motore/6-utilities#makeconnection-trait) 用于抽象“连接”的创建。

1. Motore 包 [默认启用了 `service_send` feature](https://deepwiki.com/cloudwego/motore/1.1-project-structure#feature-flag-configuration)。它要求所有 `Service` 返回的 `Future` 都满足 `Send` 约束。`motore-macros` 也会检查这个 feature。如果禁用它，Motore 可以在单线程环境中使用（例如 `tokio::main(flavor = "current_thread")`），而不需要 `Send` 约束。
