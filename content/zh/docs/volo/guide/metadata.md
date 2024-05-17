---
title: "元信息传递"
linkTitle: "元信息传递"
weight: 4
description: >
---

## 前言

基于 TTHeader，我们提供了在协议头传递一些元信息的能力。

尽管这种能力很方便，我们仍然不推荐业务使用这种能力进行大量信息的传递或者作为通用的参数传递方式，原因如下：

1. 这并不符合 API 的规范，纯粹是实现强相关的行为；
2. 这样的话，使用 Thrift / Protobuf IDL 定义并约束 RPC API 就没有意义了；
3. TTHeader 对于头部信息总大小有限制（64K），如果略大就可能导致传输直接失败，而如果大量采用这个方法进行传递，早晚有一天会达到上限，并导致所有 RPC 请求均失败；
4. 这种方式性能差，无论是实现上的性能还是传递时每一跳都会额外消耗的资源；
5. 可以想象一下如果所有业务都通过这种方式来透传字段，未来的可维护性几乎为零，且无法收敛。

## 方案介绍

针对正向传递（从上游往下游传递），我们提供了两种方式：

1. Persistent：这类元信息会沿着调用链路一直向下透传，直到被某一跳中主动删除（不推荐大量使用）
2. Transient：这类元信息仅会透传一跳，也即到当前服务的下游（首选这种方式）

针对反向传递（从下游返回给上游），我们仅提供一种方式：Transient（也就是仅会返回一跳）。我们不认为从最底层的服务一直返回并透传给最上层服务某个元信息是合理的需求和场景。
如果真的有这种需求，请直接把相关字段定义在 IDL 中并显式返回。

## 使用

Volo-Thrift 使用这个功能，需要使用 TTHeader 协议；Volo-gRPC 没有额外要求。

如果你的场景中，是由 Volo-Thrift server 生成的脚手架代码作为入口的，那么你可以直接引入对应的 Trait 并进行获取或者设置：

```rust
use metainfo::{Backward, Forward};

pub struct S;

#[volo::async_trait]
impl volo_gen::volo::example::ItemService for S {
    async fn get_item(
        &self,
        req: volo_gen::volo::example::GetItemRequest,
    ) -> Result<volo_gen::volo::example::GetItemResponse, pilota::AnyhowError>
    {
        metainfo::METAINFO.with(|mi| {
            let mut mi = mi.borrow_mut();
            println!(
                "{:?}, {:?}",
                mi.get_all_persistents(),
                mi.get_all_upstreams()
            );
            mi.set_backward_transient("test_backward", "test_backward_value");
        });
        Ok(Default::default())
    }
}
```

如果你是自己写的 main 函数并使用 client 调用，那么首先你需要把 MetaInfo 塞到 task local 中：

```rust
use lazy_static::lazy_static;
use metainfo::{Backward, Forward, MetaInfo, METAINFO};
use std::{cell::RefCell, net::SocketAddr};

use volo_example::LogLayer;

lazy_static! {
    static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
        let addr: SocketAddr = "127.0.0.1:8080".parse().unwrap();
        volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example-item")
            .layer_outer(LogLayer)
            .address(addr)
            .build()
    };
}

#[volo::main]
async fn main() {
    let mut mi = MetaInfo::new();
    mi.set_persistent("test_persistent_key", "test_persistent");
    mi.set_transient("test_transient_key", "test_transient");

    METAINFO
        .scope(RefCell::new(mi), async move {
            let req = volo_gen::volo::example::GetItemRequest { id: 1024 };
            let resp = CLIENT.get_item(req).await;
            match resp {
                Ok(info) => tracing::info!("{:?}", info),
                Err(e) => tracing::error!("{:?}", e),
            }

            METAINFO.with(|mi| {
                println!("{:?}", mi.borrow().get_all_backward_downstreams());
            })
        })
        .await;
}
```

当然，如果你的 client 调用是从 server 接收到请求之后进行的，那么不用自己进行 metainfo task local 的设置，Volo-Thrift 框架会自动帮你设置好这些值。

## 总结

简单来说，步骤分为以下几步：

1. 确定你当前有 METAINFO 的 task local（server 的方法中默认就有，不需要自己创建）；
2. 引入 metainfo 中的 trait；
3. 调用对应的方法设置、获取值。

## 第三方框架接入

如果想与其它的框架（如 HTTP 框架）集成元信息传递功能，只需要遵守 metainfo 包中定义的 header 常量字符串即可。

CloudWeGo 开源的 Kitex、Hertz 框架默认支持也支持元信息传递的规范。
