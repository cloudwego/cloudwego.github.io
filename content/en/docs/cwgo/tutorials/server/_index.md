---
title: "Server"
linkTitle: "Server"
weight: 6
description: >
---

The cwgo tool supports generating code for HTTP Server or RPC Server through IDL (Thrift/protobuf), making it convenient for users to develop.

cwgo provides MVC Template to generate Server code, [RPC Tpl](https://github.com/cloudwego/cwgo/tree/main/tpl/kitex/server/standard), [HTTP Tpl](https://github.com/cloudwego/cwgo/tree/main/tpl/hertz/standard). If the default template does not meet the user's needs, you can refer to [Template Extension](/docs/cwgo/tutorials/templete-extension/)customize your own template.

cwgo Server supports enabling both HTTP and RPC services on the same port. Please refer to [hex usage](https://github.com/cloudwego/hertz-examples/tree/main/hex).
