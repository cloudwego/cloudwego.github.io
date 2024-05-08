---
title: "Server"
linkTitle: "Server"
weight: 6
description: >
---

cwgo 工具支持通过 IDL(thrift/protobuf) 生成 HTTP Server 或 RPC Server 的代码，方便用户开发。

cwgo 默认提供了 MVC Template 生成 Server 代码，[RPC Tpl](https://github.com/cloudwego/cwgo/tree/main/tpl/kitex/server/standard)，[HTTP Tpl](https://github.com/cloudwego/cwgo/tree/main/tpl/hertz/standard)。若默认模板不满足用户的需求，可参考[模板拓展](/zh/docs/cwgo/tutorials/templete-extension/)自定义自己的模板。

cwgo Server 支持在一个端口同时启用 HTTP 服务和 RPC 服务，详见[hex用法示例](https://github.com/cloudwego/hertz-examples/tree/main/hex)。
