---
title: "Volo 0.3.0 版本发布"
linkTitle: "Release v0.3.0"
projects: ["Volo"]
date: 2022-12-22
description: >
---

Volo 0.3.0 版本中，除了常规 bugfix 之外，我们还带来了多个重要 feature。

## Service Trait 重构

Volo 0.3.0 版本中，我们对 Service Trait 进行了重构，使得 Service Trait 的实现更加简单，同时也提供了更多的灵活性。

具体来看，我们将 Service Trait 的定义从：

```rust
pub trait Service<Cx, Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;

    /// The future response value.
    type Future<'cx>: Future<Output = Result<Self::Response, Self::Error>> + Send + 'cx
    where
        Cx: 'cx,
        Self: 'cx;

    /// Process the request and return the response asynchronously.
    fn call<'cx, 's>(&'s mut self, cx: &'cx mut Cx, req: Request) -> Self::Future<'cx>
    where
        's: 'cx;
}
```

改为了：

```rust
pub trait Service<Cx, Request> {
    /// Responses given by the service.
    type Response;
    /// Errors produced by the service.
    type Error;

    /// The future response value.
    type Future<'cx>: Future<Output = Result<Self::Response, Self::Error>> + Send + 'cx
    where
        Cx: 'cx,
        Self: 'cx;

    /// Process the request and return the response asynchronously.
    fn call<'cx, 's>(&'s self, cx: &'cx mut Cx, req: Request) -> Self::Future<'cx>
    where
        's: 'cx;
}
```

最明显的改动是，Service Trait 的方法 call() 的 self 参数由 `&mut self` 改为了 `&self`。这样做的目的是，之前依赖 `&mut self` 的话，在调用之前就得 clone 拿所有权才行，需要 Service 用户自己保证 Clone 的开销低；实际上，这个 clone 是完全没必要的，这个决策应该交给用户自己决定，如果真的有需求改变内部状态的话，自己内部加锁或者用 atomic 即可，这样可以节省 clone 的开销。

## gRPC 多 Service 支持

在这个版本中，我们还支持了 gRPC 服务端同时支持多个 Service 的场景，并且每个 Service 都可以有自己的 layer；当然，Server 也可以有全局有效的 layer。

如果某个中间件需要感知到 Request / Response 的具体类型并且做处理的，或者只针对单个 Service 的，那么可以添加为 Service 自己的 layer 即可。

这是一个 breaking change，使用之前版本的用户可能需要修改一下代码，具体来说需要从这样：

```rust
#[volo::main]
async fn main() {
    let addr: SocketAddr = "[::]:8080".parse().unwrap();
    let addr = volo::net::Address::from(addr);

    volo_gen::proto_gen::hello::HelloServiceServer::new(S)
        .run(addr)
        .await
        .unwrap();
}
```

改成这样：

```rust
use std::net::SocketAddr;

use volo_grpc::server::{Server, ServiceBuilder};

#[volo::main]
async fn main() {
    let addr: SocketAddr = "[::]:8080".parse().unwrap();
    let addr = volo::net::Address::from(addr);

    Server::new()
        .add_service(ServiceBuilder::new(volo_gen::proto_gen::hello::GreeterServer::new(S)).build())
        .run(addr)
        .await
        .unwrap();
}
```

## gRPC Compression

感谢[@tuchg](https://github.com/tuchg)在[#91](https://github.com/cloudwego/volo/pull/91)中为我们带来了 gRPC 的压缩和解压缩支持，如果对于传输大小有要求的场景，可以使用这个功能。

## Thrift Codec 重构

在之前的 Codec 设计中，Thrift 的编解码指定的方式是通过`CodecType`来指定，这样带来了两个问题：

1. 无法很轻松地扩展新的协议支持，所有的支持的协议都需要在框架中实现并硬编码到 CodecType 中；
2. 无法将 Transport 和 Serialize 协议进行解耦和排列组合，举个例子，如果我们想要支持 TCompact 协议，那么我们就需要增加多个变体：TTHeaderFramedCompact、TTheaderCompact、FramedCompact、Compact……

同时，之前的编解码没有做到 Zero Copy，性能上也有可以提升的空间。

这次的重构，一次性的解决了以上所有问题，我们不再依赖`CodecType`来指定编解码方式，而是通过`make_codec`这个接口来指定 Codec 的生成方式，这样我们就可以很轻松地扩展新的协议支持，同时也可以将 Transport 和 Serialize 协议进行解耦和排列组合。

具体可以参考一下 [codec 的文档](https://docs.rs/volo-thrift/latest/volo_thrift/codec/index.html)。

## Thrift 生成代码默认字段变更

之前的生成代码中，binary 类型会生成 Vec<u8>，string 类型会生成 String，这会导致在解码和编码的时候都需要进行一次 clone，性能损耗较大；在这个版本中，我们将这两个类型默认生成的 Rust 类型改为了 Bytes 和 [FastStr](https://docs.rs/faststr/latest/faststr/)，以此来实现全链路的 Zero Copy，因为在实践中我们观察到绝大多数 Request / Response 中的 binary 和 string 都是不会被修改的，而即使用户需要修改，也就是多一次 Clone 的代价，并不会比之前性能更差。

这是一个 breaking change，使用之前版本的用户在升级后可能会需要修改一下代码，一般来说只需要根据报错信息修改一下类型即可。

如果仍旧有需求要针对 string 生成 String 的话，可以在 thrift idl 文件中的对应字段加一个`pilota.rust_type="string"`的 annotation，如下：

```thrift
struct Item {
    1: required string name (pilota.rust_type="string");
}
```

除此之外，Pilota 还支持了其它的 Annotation，详情可以参考：[Pilota 支持的注解](/zh/docs/pilota/guide/annotation/)

## 完整 Release Note

完整的 Release Note 可以参考：https://github.com/cloudwego/volo/releases/tag/volo-0.3.0
