---
title: "代码示例"
linkTitle: "代码示例"
weight: 1
description: >

---

## Server

### 启动hertz
- [hello](https://github.com/cloudwego/hertz-examples/tree/main/hello) ：启动一个 hertz "hello world"应用的示例

### 配置
- [config](https://github.com/cloudwego/hertz-examples/tree/main/config) ：配置 hertz server 的示例

### 协议
- [Protocol](https://github.com/cloudwego/hertz-examples/tree/main/protocol) ：hertz 使用 http1、tls 等协议的示例

### 路由
- [Route](https://github.com/cloudwego/hertz-examples/tree/main/route) ：注册路由、使用路由组、参数路由的示例

### 中间件
- [CORS](https://github.com/cloudwego/hertz-examples/tree/main/middleware/CORS) ：使用 CORS 中间件的示例
- [basic_auth](https://github.com/cloudwego/hertz-examples/tree/main/middleware/basicauth) ：使用 basic auth 中间件的示例
- [custom](https://github.com/cloudwego/hertz-examples/tree/main/middleware/custom) ：自定义中间件的示例

### 参数绑定及验证
- [binding](https://github.com/cloudwego/hertz-examples/tree/main/binding) ：参数绑定及验证的示例

### 获取参数
- [parameters](https://github.com/cloudwego/hertz-examples/tree/main/parameter) ：获取 query、form、cookie 等参数的示例

### 文件
- [file](https://github.com/cloudwego/hertz-examples/tree/main/file) ：文件上传、文件下载、静态文件服务的示例

### Render
- [render](https://github.com/cloudwego/hertz-examples/tree/main/render) ：render body 为 json、html、protobuf 等的示例

### 重定向
- [redirect](https://github.com/cloudwego/hertz-examples/tree/main/redirect) ：重定向到内部/外部 URI 的示例

### 流式读/写
- [streaming](https://github.com/cloudwego/hertz-examples/tree/main/streaming) ：使用 hertz server 流式读/写的示例

### 优雅退出
- [graceful_shutdown](https://github.com/cloudwego/hertz-examples/tree/main/graceful_shutdown) ：hertz server 优雅退出的示例

### 单元测试
- [unit_test](https://github.com/cloudwego/hertz-examples/tree/main/unit_test) ：使用 hertz 提供的接口不经过网络传输编写单元测试的示例

### 链路追踪
- [tracer](https://github.com/cloudwego/hertz-examples/tree/main/tracer) ：hertz 使用 Jaeger 进行链路追踪的示例

### 监控
- [monitoring](https://github.com/cloudwego/hertz-examples/tree/main/monitoring) ：hertz 使用 Prometheus 进行指标监控的示例


## Client

### 发送请求
- [send_request](https://github.com/cloudwego/hertz-examples/tree/main/client/send_request) ：使用 hertz client 发送 http 请求的示例

### 配置
- [client_config](https://github.com/cloudwego/hertz-examples/tree/main/client/config) ：配置 hertz client 的示例

### TLS
- [tls](https://github.com/cloudwego/hertz-examples/tree/main/protocol/tls) ：hertz client 发送 tls 请求的示例

### 添加请求内容
- [add_parameters](https://github.com/cloudwego/hertz-examples/tree/main/client/add_parameters) ：使用 hertz client 添加请求参数的示例

### 上传文件
- [upload_file](https://github.com/cloudwego/hertz-examples/tree/main/client/upload_file) ：使用 hertz client 上传文件的示例

### 中间件
- [middleware](https://github.com/cloudwego/hertz-examples/tree/main/client/middleware) ：使用 hertz client middleware 的示例

### 流式读响应
- [streaming_read](https://github.com/cloudwego/hertz-examples/tree/main/client/streaming_read) ：使用 hertz client 流式读响应的示例

### 正向代理
- [forward_proxy](https://github.com/cloudwego/hertz-examples/tree/main/client/forward_proxy) ：使用 hertz client 配置正向代理的示例
