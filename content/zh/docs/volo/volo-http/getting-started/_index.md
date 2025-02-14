---
title: "快速开始"
linkTitle: "快速开始"
weight: 2
keywords: ["Volo", "Http", "快速开始", "安装"]
description: "Volo-HTTP 快速上手与基础教程。"
---

## 准备开发环境

1. 如果您之前未搭建过 Rust 开发环境，可以参考[Install Rust](https://www.rust-lang.org/tools/install)
2. 推荐使用最新版本的 Rust，或保证 Rustc >= 1.80.0
3. 如果您未安装过 `volo-cli`，请参考[快速开始](https://www.cloudwego.io/zh/docs/volo/cli/getting-started/)

## 创建一个 Server

> 以下示例 `volo-cli` 版本为 **0.10.3**, volo-http 版本为 **0.2.14**

1. 使用 **volo-cli** 创建 http 项目脚手架

   ```bash
   mkdir -p volo-http-example
   cd volo-http-example
   volo http init volo-http-example
   ```

   脚手架创建完成后的目录结构如下:

   ```bash
   $ tree
   .
   ├── Cargo.toml
   └── src
       ├── bin
       │   └── server.rs
       └── lib.rs
   ```

   `src/lib.rs` 文件内容如下:

   ```rust
   use volo_http::server::route::{get, Router};

   async fn index_handler() -> &'static str {
       "It Works!\n"
   }

   pub fn example_router() -> Router {
        Router::new().route("/", get(index_handler))
   }
   ```

   可以看出，当 server 启动后，使用 `GET` 方法请求 `/` 路径期望得到 `It Works!` 的响应

2. 运行 `cargo run` 启动服务端，在终端看到 `Listening on [::]:8080` 后, 表示 Server 就成功跑起来了。
   
   我们通过 `curl` 进行验证

   ```bash
   $ curl -v http://localhost:8080/
   * Host localhost:8080 was resolved.
   * IPv6: ::1
   * IPv4: 127.0.0.1
   *   Trying [::1]:8080...
   * Connected to localhost (::1) port 8080
   > GET / HTTP/1.1
   > Host: localhost:8080
   > User-Agent: curl/8.6.0
   > Accept: */*
   >
   < HTTP/1.1 200 OK
   < content-length: 10
   < date: Sun, 01 Sep 2024 16:52:55 GMT
   <
   It Works!
   * Connection #0 to host localhost left intact
   ```

## What's Next?

恭喜你，阅读到了这里！ 至此，我们已经基本学会了 Volo-HTTP 的使用了，可以使用 Volo-HTTP 来开启我们愉快的 Rust 之旅啦～

接下来，你可能需要选择合适的组件，组装在一起，和你的系统进行对接。

Volo 维护的相关生态会集中在：<https://github.com/volo-rs> 中，我们正在努力打造我们的生态，也非常欢迎大家一起参与～

如果有比较急缺的组件，也欢迎在官方仓库：<https://github.com/cloudwego/volo> 的 issue 中提出，我们也会优先支持社区最急缺的组件。

同时，欢迎加入我们的飞书用户群，交流 Volo 的使用心得～

<div align="center">
<img src="/img/docs/feishu_group_volo.png" width="400" alt="Volo_feishu" />
</div>
<br/><br/>

期待你使用 Volo 创造出属于你的独一无二的作品～
