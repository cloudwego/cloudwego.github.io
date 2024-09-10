---
title: "快速开始"
linkTitle: "快速开始"
weight: 1
keywords: ["Volo", "Thrift", "快速开始", "安装"]
description: "Volo-Thrift 开发环境准备、快速上手与基础教程。"
---

## Part 1. 创建一个 Thrift Server

Volo-Thrift 是一个 RPC 框架，既然是 RPC，底层就需要两大功能：

1. Serialization 序列化
2. Transport 传输

IDL 全称是 `Interface Definition Language`，接口定义语言。

### 1.1 Why IDL

如果我们要进行 RPC，就需要知道对方的接口是什么，需要传什么参数，同时也需要知道返回值是什么样的，就好比两个人之间交流，需要保证在说的是同一个语言、同一件事。
这时候，就需要通过 IDL 来约定双方的协议，就像在写代码的时候需要调用某个函数，我们需要知道函数签名一样。

Thrift IDL 是一套跨语言的全栈式 RPC 解决方案，具体的语法可以看参考 [thrift-missing-guide](https://diwakergupta.github.io/thrift-missing-guide/) 或官方 [Thrift interface description language](http://thrift.apache.org/docs/idl)。

### 1.2 编写 IDL

为了创建一个 Thrift 项目，我们需要先编写一个 Thrift IDL。

在你的工作目录下，我们先执行以下命令：

```bash
mkdir volo-example && cd volo-example
```

```bash
mkdir idl && touch idl/volo_example.thrift
```

随后，使用您喜欢的文本编辑器输入以下内容：

```thrift
namespace rs volo.example

struct Item {
    1: required i64 id,
    2: required string title,
    3: required string content,

    10: optional map<string, string> extra,
}

struct GetItemRequest {
    1: required i64 id,
}

struct GetItemResponse {
    1: required Item item,
}

service ItemService {
    GetItemResponse GetItem (1: GetItemRequest req),
}
```

保存退出后，我们执行以下命令：

```bash
volo init volo-example idl/volo_example.thrift
```

**这里我们使用`init`命令，后面跟了我们项目的名字，意思是需要生成模板代码。在末尾，需要指定一个 IDL 表示 server 使用的 IDL。**

如果只需要增加一个 IDL（如 client 的 IDL）而不需要生成模板的话，如：

```bash
volo idl add idl/volo_example.thrift
```

| 插播一个广告，volo 工具还支持从 git 下载 IDL 并生成代码哦，如：

```bash
volo idl add -g git@github.com:org/repo.git -r main /path/to/your/idl.thrift
```

| 感兴趣可以直接输入 volo 看详细用法~ 接下来回到正题~

这时候，我们整个目录的结构如下：

```bash
.
├── Cargo.toml
├── idl
│   └── volo_example.thrift
├── rust-toolchain.toml
├── src
│   ├── bin
│   │   └── server.rs
│   └── lib.rs
└── volo-gen
    ├── Cargo.toml
    ├── build.rs
    ├── src
    │   └── lib.rs
    └── volo.yml
```

然后，我们打开 `src/lib.rs`，在 impl 块中加入方法的实现，最终的代码应该是这样的：

```rust
pub struct S;

#[volo::async_trait]
impl volo_gen::volo::example::ItemService for S {
    // 这部分是我们需要增加的代码
    async fn get_item(
        &self,
        _req: volo_gen::volo::example::GetItemRequest,
    ) -> core::result::Result<volo_gen::volo::example::GetItemResponse, volo_thrift::AnyhowError>
    {
        Ok(Default::default())
    }
}
```

然后执行：

```bash
cargo update && cargo build
```

这时候，就会发现 [OUT_DIR 目录](https://doc.rust-lang.org/cargo/reference/environment-variables.html#environment-variables-cargo-sets-for-build-scripts)下多出来一个 volo_gen.rs 的文件了。

然后执行以下命令，即可把我们的 server 端跑起来：

```bash
cargo run --bin server
```

至此，我们已经能把我们的 server 跑起来啦！

## Part 2. 编写 Client 端

上一节中，我们编写完成了 server 端，现在让我们来编写我们的 client 端并调用我们的 server 端。

首先，创建一个文件 `src/bin/client.rs`，输入以下内容：

```rust
use lazy_static::lazy_static;
use std::net::SocketAddr;

lazy_static! {
    static ref CLIENT: volo_gen::volo::example::ItemServiceClient = {
        let addr: SocketAddr = "[::1]:8080".parse().unwrap();
        volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example")
            .address(addr)
            .build()
    };
}

#[volo::main]
async fn main() {
    tracing_subscriber::fmt::init();
    let req = volo_gen::volo::example::GetItemRequest { id: 1024 };
    let resp = CLIENT.get_item(req).await;
    match resp {
        Ok(info) => tracing::info!("{:?}", info),
        Err(e) => tracing::error!("{:?}", e),
    }
}
```

然后，在 `Cargo.toml` 文件中加入所需的依赖，加入后的文件如下：

```toml
[package]
name = "volo-example"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
anyhow = "1"
async-trait = "0.1"
lazy_static = "1"
tokio = { version = "1", features = ["full"] }
tracing = "0.1"
tracing-subscriber = "0.3"

pilota = "*"
volo =  "*"        # we recommend to use the latest framework version for new features and bug fixes
volo-thrift =  "*"  # we recommend to use the latest framework version for new features and bug fixes

volo-gen = { path = "./volo-gen" }

[profile.release]
opt-level = 3
debug = true
debug-assertions = false
overflow-checks = false
lto = true
panic = 'unwind'
incremental = false
codegen-units = 1
rpath = false

[workspace]
members = ["volo-gen"]
resolver = "2"
```

接着，**新建一个 terminal**，执行以下命令，把我们的 server 端跑起来：

```bash
cargo run --bin server
```

最后，我们再回到当前目录，执行以下命令，即可看到执行成功：

```bash
cargo run --bin client
```

大功告成！

## Part 3. 添加一个中间件

接下来，让我们来看下如何给 Volo 添加一个中间件。

例如，我们需要一个中间件，打印出我们收到的请求、返回的响应以及消耗的时间，那我们可以在 `lib.rs` 中写这么一个 Service：

```rust
#[derive(Clone)]
pub struct LogService<S>(S);

#[volo::service]
impl<Cx, Req, S> volo::Service<Cx, Req> for LogService<S>
where
    Req: std::fmt::Debug + Send + 'static,
    S: Send + 'static + volo::Service<Cx, Req> + Sync,
    S::Response: std::fmt::Debug,
    S::Error: std::fmt::Debug,
    Cx: Send + 'static,
{
    async fn call(&self, cx: &mut Cx, req: Req) -> Result<S::Response, S::Error> {
        let now = std::time::Instant::now();
        tracing::debug!("Received request {:?}", &req);
        let resp = self.0.call(cx, req).await;
        tracing::debug!("Sent response {:?}", &resp);
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
    let addr: SocketAddr = "[::1]:8080".parse().unwrap();
    volo_gen::volo::example::ItemServiceClientBuilder::new("volo-example")
        .layer_outer(LogLayer)
        .address(addr)
        .build()
};

// server.rs
volo_gen::volo::example::ItemServiceServer::new(S)
    .layer_front(LogLayer)
    .run(addr)
    .await
    .unwrap();
```

这时候，在 info 日志级别下，我们会打印出请求的耗时；在 debug 日志级别下，我们还会打出请求和响应的详细数据。

## Part 4. What's Next?

恭喜你，阅读到了这里！ 至此，我们已经基本学会了 Volo 的大部分使用了，可以使用 Volo 来开启我们愉快的 Rust 之旅啦～

接下来，你可能需要选择合适的组件，组装在一起，和你的系统进行对接。

Volo 维护的相关生态会集中在：https://github.com/volo-rs 中，我们正在努力打造我们的生态，也非常欢迎大家一起参与～

如果有比较急缺的组件，也欢迎在官方仓库：https://github.com/cloudwego/volo 的 issue 中提出，我们也会优先支持社区最急缺的组件。

同时，欢迎加入我们的飞书用户群，交流 Volo 的使用心得～

<div  align="center">
<img src="/img/docs/feishu_group_volo.png" width = "400"  alt="Volo_feishu" />
</div>
<br/><br/>

期待你使用 Volo 创造出属于你的独一无二的作品～
