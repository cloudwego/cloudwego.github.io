---
title: "快速开始"
linkTitle: "快速开始"
weight: 1
keywords: ["Motore", "Volo", "Rust", "中间件", "快速开始"]
description: "通过一个完整的示例介绍 Motore 框架的核心概念，帮助你快速了解 Motore。"
---

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
// 1. 核心抽象：`Service` Trait (推荐方式：使用宏)
// -----------------------------------------------------------------------------

// `motore` 的核心是 `Service` trait (定义于 motore/src/service/mod.rs)。
// 它代表一个接收 `Cx` 上下文和 `Request`，并异步返回 `Response` 的服务。

// `motore-macros/src/lib.rs` 提供了 `#[motore::service]` 宏，
// 这是我们推荐的，实现 `Service` trait 最便捷的方式。
use motore::service;
use motore::service::Service;

// 我们定义一个上下文（Context）
#[derive(Debug, Clone)]
struct MyContext {
    request_id: u32,
    processing_steps: u32, // 示例：一个可写的上下文状态
}

struct MyMacroService;

// --- 使用宏 `#[service]` 实现 `Service` ---
#[service]
impl Service<MyContext, String> for MyMacroService {
    async fn call(&self, cx: &mut MyContext, req: String) -> Result<String, Infallible> {
        // --- 演示对 &mut Cx 的修改 ---
        cx.processing_steps += 1;
        
        println!("[MacroService] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);
        let res = Ok(req.to_uppercase());
        println!("[MacroService] responding req id: {}, step: {}", cx.request_id, cx.processing_steps);
        res
    }
}


// -----------------------------------------------------------------------------
// 2. 深入理解：`Service` Trait
// -----------------------------------------------------------------------------

// 其实 `#[service]` 宏在背后，
// - 自动从 `Result<String, Infallible>` 推断出：
//   - `type Response = String;`
//   - `type Error = Infallible;`
// - 自动将 `async fn call` 转换为 trait 要求的 `fn call(...) -> impl Future` 签名
// - 自动将函数体包装在 `async move { ... }` 块中

// 最后，宏把你刚才实现的 Service 转换成了 `motore/src/service/mod.rs` 中真正的核心 `Service` trait

/*
pub trait Service<Cx, Request> {
    /// Service 处理成功时返回的响应类型
    type Response;
    /// Service 处理失败时返回的错误类型
    type Error;

    /// 核心方法：处理请求并异步返回响应
    /// 注意这个签名：它 *不* 是 `async fn call`。
    /// 它是一个返回 `impl Future` 的普通函数 (RPITIT 风格)。
    fn call(
        &self,
        cx: &mut Cx,
        req: Request,
    ) -> impl std::future::Future<Output = Result<Self::Response, Self::Error>> + Send;
}
*/

// 因为它定义的是 `fn call(...) -> impl Future`，
// 如果不使用宏的话，你就得 *手动* 匹配这个签名：

use std::convert::Infallible;
use std::future::Future;

// 这是我们的“业务逻辑”服务
struct MyManualService;

// --- 不使用宏，手动实现 `Service` ---
//
// 这非常繁琐，你需要：
// 1. 明确定义 `type Response`
// 2. 明确定义 `type Error`
// 3. 编写正确的 `fn call(...) -> impl Future` 签名
// 4. 在 `call` 内部返回一个 `async move { ... }` 块
//
// 这正是 `#[service]` 宏帮你自动完成的工作！
impl Service<MyContext, String> for MyManualService {
    type Response = String;
    type Error = Infallible; // Infallible 表示这个服务永远不会失败

    // 手动实现 `call`
    fn call(
        &self,
        cx: &mut MyContext,
        req: String,
    ) -> impl Future<Output = Result<Self::Response, Self::Error>> + Send {
        // 在本例中，我们只读取上下文，不修改
        println!("[ManualService] handling req id: {}, step: {}", cx.request_id, cx.processing_steps);

        // 你必须返回一个实现了 Future 的东西，通常是一个 async 块
        async move {
            let res = Ok(req.to_uppercase());
            println!("[ManualService] responding req id: {}, step: {}", cx.request_id, cx.processing_steps);
            res
        }
    }
}

// 结论：宏极大地简化了 Service 的实现，让你专注于 `async fn` 业务逻辑。而不是 `impl Future` 的 trait 签名模板。


// -----------------------------------------------------------------------------
// 3. 中间件：`Layer` Trait
// -----------------------------------------------------------------------------

use motore::layer::Layer;

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

// 实现 `Layer` trait
impl<S> Layer<S> for LogLayer {
    type Service = LogService<S>; // 指定返回类型

    fn layer(self, inner: S) -> Self::Service {
        // 返回包装后的新 Service
        LogService {
            inner,
            target: self.target,
        }
    }
}

// --- 手动实现 `LogService` 的 `Service` trait ---
//
// 同样，这很繁琐。
impl<Cx, Req, S> Service<Cx, Req> for LogService<S>
where
    // `S` 必须也是一个 Service，并且满足 Send/Sync 等约束
    S: Service<Cx, Req> + Send + Sync,
    S::Response: Send,
    S::Error: Send,
    Cx: Send, // LogService 是通用的，它不关心 Cx 的具体类型
    Req: Send, 
{
    // 响应和错误类型通常与内部服务相同
    type Response = S::Response;
    type Error = S::Error;

    fn call(
        &self,
        cx: &mut Cx,
        req: Req,
    ) -> impl Future<Output = Result<Self::Response, Self::Error>> + Send {
        println!("[LogLayer] (Manual) target: {}, enter", self.target);
        
        // 必须返回 async 块
        async move {
            // 在调用内部服务之前执行逻辑
            
            // 调用内部服务
            let result = self.inner.call(cx, req).await;

            // 在内部服务返回之后执行逻辑
            match &result {
                Ok(_) => println!("[LogLayer] (Manual) target: {}, exit (Ok)", self.target),
                Err(_) => println!("[LogLayer] (Manual) target: {}, exit (Err)", self.target),
            }
            
            result
        }
    }
}

// -----------------------------------------------------------------------------
// 4. 使用宏实现 `Layer` 的 `Service` 部分
// -----------------------------------------------------------------------------

// 我们可以对 `LogService<S>` 的 `impl` 块也使用宏
// (注意：`Layer` trait 的 `impl` 块保持不变，宏只用于 `Service` trait)

#[derive(Clone)]
struct LogServiceMacro<S> {
    inner: S,
    target: &'static str,
}

// （`impl Layer` 部分省略，和上面一样，它返回 `LogServiceMacro<S>`）

// --- 使用宏实现 `LogService` ---
#[service]
impl<Cx, Req, S> Service<Cx, Req> for LogServiceMacro<S>
where
    S: Service<Cx, Req> + Send + Sync, // 内部服务约束
    Cx: Send + 'static,
    Req: Send + 'static,
{
    // 再次，我们只需要写 `async fn`
    // 宏会自动推断 `Response = S::Response` 和 `Error = S::Error`
    async fn call(&self, cx: &mut Cx, req: Req) -> Result<S::Response, S::Error> {
        println!("[LogLayer] (Macro) target: {}, enter", self.target);
        
        // 逻辑完全相同，但代码更清晰
        let result = self.inner.call(cx, req).await;
        
        match &result {
            Ok(_) => println!("[LogLayer] (Macro) target: {}, exit (Ok)", self.target),
            Err(_) => println!("[LogLayer] (Macro) target: {}, exit (Err)", self.target),
        }
        
        result
    }
}

// -----------------------------------------------------------------------------
// 5. 组合：`ServiceBuilder`
// -----------------------------------------------------------------------------

use motore::builder::ServiceBuilder;
use motore::timeout::TimeoutLayer; // Motore 自带的 Layer (motore/src/timeout.rs)
use std::time::Duration;

// `ServiceBuilder` (来自 `motore/src/builder.rs`)
// 允许你将多个 Layer 组合到一个 Service 上。

async fn run_builder() {
    // 1. 创建一个 ServiceBuilder
    let builder = ServiceBuilder::new()
        // 2. 添加 Layer。
        //    请求的执行顺序：从上到下
        //    响应的执行顺序：从下到上
        .layer(LogLayer { target: "Outer" })
        .layer(TimeoutLayer::new(Some(Duration::from_secs(1)))) // Motore 默认提供的一个 Layer
        .layer(LogLayer { target: "Inner" });

    // 3. 将 Layer 栈应用到一个“最内部”的服务上
    //    这里我们使用 `MyMacroService` 作为最核心的业务服务
    let service = builder.service(MyMacroService);

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
     * [LogLayer] (Manual) target: Outer, enter
     * [LogLayer] (Manual) target: Inner, enter
     * [MacroService] handling req id: 42, step: 1   <-- step 变为 1
     * [MacroService] responding req id: 42, step: 1
     * [LogLayer] (Manual) target: Inner, exit (Ok)
     * [LogLayer] (Manual) target: Outer, exit (Ok)
     *
     * Final response: Ok("HELLO MOTORE")
     */

     // 最终，原始的 cx 已经被修改
     println!("Final context steps: {}", cx.processing_steps); // 将打印 1
}

// -----------------------------------------------------------------------------
// 6. 辅助工具：`service_fn`
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
-  #[motore::service] 的用处
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
